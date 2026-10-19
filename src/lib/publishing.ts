import {scannerReadiness} from './media-scan';
import {requestCorrelationId} from './request-context';
import {z} from 'zod';
import {db} from './db';
import {staff,HttpError} from './security';
export async function publishRevision(input:unknown){
 const actor=await staff('cms');const v=z.object({revisionId:z.string(),reason:z.string().min(3).max(200)}).parse(input);
 await db.$transaction(async tx=>{const revision=await tx.cmsRevision.findUniqueOrThrow({where:{id:v.revisionId}});const before=await tx.cmsPage.findUniqueOrThrow({where:{id:revision.pageId}});await tx.cmsPage.update({where:{id:revision.pageId},data:{title:revision.title,body:revision.body,status:'published'}});await tx.cmsRevision.create({data:{pageId:revision.pageId,title:revision.title,body:revision.body,status:'published',actorId:actor.id}});await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'publish-revision',entity:'cms',entityId:revision.pageId,summary:{revisionId:revision.id,before:{title:before.title,status:before.status},after:{title:revision.title,status:'published'},reason:v.reason,result:'success'},correlationId:requestCorrelationId()}});});return {message:'Revision published. Earlier revisions remain available for rollback.'};
}
export async function mediaHistory(){await staff('media');return {rows:await db.mediaPublication.findMany({orderBy:{createdAt:'desc'},take:100})};}
export async function rollbackMedia(input:unknown){
 const actor=await staff('media');await scannerReadiness();const v=z.object({publicationId:z.string(),reason:z.string().min(3).max(200)}).parse(input);
 await db.$transaction(async tx=>{const version=await tx.mediaPublication.findUniqueOrThrow({where:{id:v.publicationId}});const asset=await tx.mediaAsset.findUniqueOrThrow({where:{id:version.assetId}});if(asset.status!=='approved'||!asset.outputKey||!(asset.metadata as {scanned?:boolean}).scanned)throw new HttpError(409,'Only scanned, approved media can be restored.');await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'media-publication:'+version.placement},0))`;const latest=await tx.mediaPublication.findFirst({where:{placement:version.placement},orderBy:[{createdAt:'desc'},{id:'desc'}]});if(latest?.assetId!==asset.id)await tx.mediaPublication.create({data:{placement:version.placement,assetId:asset.id,actorId:actor.id}});await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'rollback-publication',entity:'media',entityId:asset.id,summary:{publicationId:version.id,placement:version.placement,reason:v.reason,result:'success'},correlationId:requestCorrelationId()}});});return {message:'Previous approved media version restored.'};
}
export async function publishedMedia(placement:string){
 const latest=await db.mediaPublication.findFirst({where:{placement},orderBy:[{createdAt:'desc'},{id:'desc'}]});if(!latest)return null;
 const asset=await db.mediaAsset.findFirst({where:{id:latest.assetId,status:'approved',outputKey:{not:null}}});if(!asset||!(asset.metadata as {scanned?:boolean}).scanned)return null;
 const widths=((asset.metadata as {responsive?:{width:number}[]}).responsive||[]).map(v=>v.width);const originalWidth=(asset.metadata as {width?:number}).width;
 return {src:'/api/media/'+asset.id,srcSet:asset.mime.startsWith('image/')&&originalWidth?[...widths.map(width=>'/api/media/'+asset.id+'?width='+width+' '+width+'w'),'/api/media/'+asset.id+' '+originalWidth+'w'].join(', '):undefined,mediaType:asset.mime.startsWith('video/')?'video' as const:'image' as const,alt:asset.alt};
}
export async function retryLocalJob(input:unknown){
 const actor=await staff('media');const v=z.object({id:z.string(),reason:z.string().min(3).max(200)}).parse(input);
 await db.$transaction(async tx=>{const claim=await tx.videoJob.updateMany({where:{id:v.id,kind:'process',status:'failed'},data:{status:'queued',attempts:0,leaseToken:null,leaseUntil:null,error:null}});if(!claim.count)throw new HttpError(409,'Only a failed local processing job can be retried.');await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'retry-processing',entity:'media',entityId:v.id,summary:{reason:v.reason,result:'queued'},correlationId:requestCorrelationId()}});});return {message:'Local processing queued again. Scanning and approval remain mandatory.'};
}
