import 'dotenv/config';
import {PgBoss} from 'pg-boss';
import {lstat,readdir,rm} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {deliverNotifications} from '../src/lib/notification-delivery';
import {isolatedProcess} from '../src/lib/media-process';
import {runSchedules} from '../src/lib/scheduling';
import {db} from '../src/lib/db';
import {DeleteObjectCommand,ListObjectsV2Command} from '@aws-sdk/client-s3';
import {object,putObject,storage} from '../src/lib/storage';
const boss=new PgBoss({connectionString:process.env.DATABASE_URL!,createSchema:false});boss.on('error',e=>console.error('Queue error:',e.message));await boss.start();await boss.createQueue('media');
async function processAsset(id:string,jobId:string,leaseToken:string){
 const asset=await db.mediaAsset.findUniqueOrThrow({where:{id}});
 const data=await object(asset.key);const chunks:Uint8Array[]=[];let received=0;for await(const chunk of data.Body as AsyncIterable<Uint8Array>){received+=chunk.length;if(received>100*1024*1024)throw new Error('Stored media exceeds limit');chunks.push(chunk);}const bytes=Buffer.concat(chunks);
 if(bytes.length!==asset.size||bytes.length>100*1024*1024)throw new Error('Stored media size mismatch');
 const processed=await isolatedProcess(bytes,asset.mime);
 const outputKey='processed/'+id+'/'+leaseToken+(processed.mime==='video/mp4'?'.mp4':'.png'),posterKey='processed/'+id+'/'+leaseToken+'-poster.png';
 await putObject(outputKey,processed.output,processed.mime);await putObject(posterKey,processed.poster,'image/png');
 const responsive:{key:string;width:number;height:number;mime:string;sha256:string}[]=[];for(const variant of processed.responsive){const key='processed/'+id+'/'+leaseToken+'-'+variant.file;await putObject(key,variant.bytes,variant.mime);responsive.push({key,width:variant.width,height:variant.height,mime:variant.mime,sha256:variant.sha256});}
 await db.$transaction(async tx=>{const owned=await tx.videoJob.updateMany({where:{id:jobId,status:'running',leaseToken},data:{status:'complete',leaseToken:null,leaseUntil:null}});if(!owned.count)throw new Error('Processing lease lost');await tx.mediaAsset.update({where:{id},data:{status:'ready',outputKey,posterKey,metadata:{...processed.metadata,responsive,outputMime:processed.mime}}});});
}
await boss.work('media',{batchSize:1},async jobs=>{
  for(const task of jobs){
    const id=(task.data as {id:string}).id;
    // An allowlist also prevents old provider jobs already present in pg-boss from running.
    const leaseToken=randomUUID();
    const claim=await db.videoJob.updateMany({where:{id,kind:'process',status:'queued',attempts:{lt:3}},data:{status:'running',attempts:{increment:1},leaseToken,leaseUntil:new Date(Date.now()+360000),heartbeatAt:new Date()}});
    if(!claim.count)continue;
    const job=await db.videoJob.findUniqueOrThrow({where:{id}});
    const heartbeat=setInterval(()=>{db.videoJob.updateMany({where:{id,status:'running',leaseToken},data:{heartbeatAt:new Date(),leaseUntil:new Date(Date.now()+360000)}}).catch(()=>{});},15000);
    try{
      if(!job.assetId)throw new Error('Processing job has no asset');
      await processAsset(job.assetId,id,leaseToken);
    }catch{await db.videoJob.updateMany({where:{id,leaseToken},data:{status:'failed',leaseToken:null,leaseUntil:null,error:'Scanning, validation or isolated processing failed. Check service readiness before retrying.'}});}finally{clearInterval(heartbeat);}
  }
});
let cleanupAt=0;const cleanupCursors=new Map<string,string|undefined>();
async function cleanupOrphans(){
 if(Date.now()-cleanupAt<3600000)return;cleanupAt=Date.now();
 const spool=process.env.MEDIA_SPOOL||'/spool';for(const entry of await readdir(spool,{withFileTypes:true})){if(!entry.isDirectory()||!/^[0-9a-f-]{36}$/.test(entry.name))continue;const path=spool+'/'+entry.name,info=await lstat(path);if(info.isDirectory()&&Date.now()-info.mtimeMs>3600000)await rm(path,{recursive:true,force:true});}
 for(const Prefix of ['quarantine/intents/','quarantine/assets/','processed/']){
  const objects=await storage().send(new ListObjectsV2Command({Bucket:process.env.S3_BUCKET,Prefix,MaxKeys:100,ContinuationToken:cleanupCursors.get(Prefix)}));
  cleanupCursors.set(Prefix,objects.IsTruncated?objects.NextContinuationToken:undefined);
  for(const item of objects.Contents||[]){if(!item.Key||!item.LastModified||Date.now()-item.LastModified.getTime()<24*3600000)continue;
   const referenced=Prefix==='quarantine/intents/'?await db.uploadIntent.count({where:{key:item.Key}}):await db.mediaAsset.count({where:{OR:[{key:item.Key},{outputKey:item.Key},{posterKey:item.Key},{metadata:{path:['responsive'],array_contains:[{key:item.Key}]}}]}});
   if(!referenced)await storage().send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET,Key:item.Key}));
  }
 }
}
async function tick(){
await deliverNotifications();
try{await cleanupOrphans();
for(const intent of await db.uploadIntent.findMany({where:{expiresAt:{lt:new Date(Date.now()-24*3600000)}},take:20})){await storage().send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET,Key:intent.key}));await db.uploadIntent.delete({where:{id:intent.id}});}}catch{console.warn('Media cleanup deferred; storage unavailable.');}
try{await db.videoJob.updateMany({where:{kind:'process',status:'running',OR:[{leaseUntil:{lt:new Date()}},{leaseUntil:null}]},data:{status:'failed',leaseToken:null,leaseUntil:null,error:'Processing interrupted; lease expired. Staff may retry.'}});
for(const j of await db.videoJob.findMany({where:{kind:'process',status:'queued'},take:10}))await boss.send('media',{id:j.id},{singletonKey:j.id+':'+j.updatedAt.getTime(),retryLimit:0,expireInSeconds:360});}catch{console.warn('Media scheduling deferred.');}
await db.$transaction(async tx=>{const reservations=await tx.reservation.findMany({where:{released:false,expiresAt:{lt:new Date()},order:{status:{in:['pending_payment','cancelled']}}},take:100});for(const r of reservations){const claim=await tx.reservation.updateMany({where:{id:r.id,released:false},data:{released:true}});if(claim.count){await tx.variant.update({where:{id:r.variantId},data:{stock:{increment:r.quantity}}});await tx.order.update({where:{id:r.orderId},data:{status:'cancelled'}});}}},{isolationLevel:'Serializable'});
await runSchedules();
let processorReady=false;try{const heartbeat=await lstat((process.env.MEDIA_SPOOL||'/spool')+'/processor-heartbeat');processorReady=heartbeat.isFile()&&Date.now()-heartbeat.mtimeMs<15000;}catch{}
await db.setting.upsert({where:{key:'workerHeartbeat'},create:{key:'workerHeartbeat',value:{at:new Date().toISOString(),processorReady}},update:{value:{at:new Date().toISOString(),processorReady}}});
}
console.log('Sterlyn worker started. Unconfigured integrations remain pending.');let stopping=false;for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{stopping=true;});while(!stopping){try{await tick();}catch(e){console.error('Worker tick failed:',(e as Error).name);}await new Promise(r=>setTimeout(r,10000));}await boss.stop();await db.$disconnect();
