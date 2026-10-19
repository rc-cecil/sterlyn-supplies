import {requestCorrelationId} from './request-context';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {db} from './db';
import {staff,HttpError} from './security';
import {storage,putObject,signedUpload} from './storage';
import {GetObjectCommand,HeadObjectCommand} from '@aws-sdk/client-s3';
import {MAX_UPLOAD_BYTES,uploadMime} from './uploads';
const schema=z.object({mime:z.enum(['video/mp4','video/webm','image/png','image/jpeg','image/webp']),size:z.number().int().positive().max(MAX_UPLOAD_BYTES),name:z.string().min(1).max(200),alt:z.string().min(3).max(300)});
export async function beginUpload(input:unknown){const actor=await staff('media');const v=schema.parse(input);const intent=await db.uploadIntent.create({data:{...v,actorId:actor.id,key:'quarantine/intents/'+randomUUID(),expiresAt:new Date(Date.now()+5*60000)}});return {id:intent.id,key:intent.key,url:await signedUpload(intent.key,v.mime,v.size),expiresAt:intent.expiresAt};}
export async function finishUpload(input:unknown){const actor=await staff('media');const {id}=z.object({id:z.string()}).parse(input);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "UploadIntent" WHERE id=${id} FOR UPDATE`;
  const intent=await tx.uploadIntent.findUnique({where:{id}});
  if(!intent||intent.actorId!==actor.id)throw new HttpError(404,'Upload not found');
  if(intent.assetId)return {asset:await tx.mediaAsset.findUniqueOrThrow({where:{id:intent.assetId}}),message:'Upload already finalized.'};
  if(intent.expiresAt<new Date())throw new HttpError(409,'Upload expired. Start a new upload.');
  const Bucket=process.env.S3_BUCKET,client=storage();const head=await client.send(new HeadObjectCommand({Bucket,Key:intent.key}));
  if(head.ContentLength!==intent.size||head.ContentLength>MAX_UPLOAD_BYTES)throw new HttpError(400,'Uploaded size does not match');
  const data=await client.send(new GetObjectCommand({Bucket,Key:intent.key,IfMatch:head.ETag}));
  const chunks:Uint8Array[]=[];let size=0;
  for await(const chunk of data.Body as AsyncIterable<Uint8Array>){size+=chunk.length;if(size>intent.size)throw new HttpError(413,'Upload limit exceeded');chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);if(bytes.length!==intent.size||uploadMime(bytes)!==intent.mime)throw new HttpError(400,'Uploaded content does not match');
  // Snapshot to a server-only key; the client's signed URL cannot replace finalized input.
  const key='quarantine/assets/'+randomUUID();await putObject(key,bytes,intent.mime);
  const asset=await tx.mediaAsset.create({data:{key,name:intent.name,alt:intent.alt,mime:intent.mime,size:intent.size}});
  await tx.videoJob.create({data:{kind:'process',assetId:asset.id,input:{}}});await tx.uploadIntent.update({where:{id},data:{assetId:asset.id}});
  await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'finalize-upload',entity:'media',entityId:asset.id,summary:{mime:intent.mime,size:intent.size,result:'quarantined'},correlationId:requestCorrelationId()}});
  return {asset,message:'Uploaded to quarantine. Scanning, processing and approval are required.'};
 },{timeout:30000});
}
