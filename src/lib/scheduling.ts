import {eligiblePictures} from './product-management';
import {scannerReadiness} from './media-scan';
import {requestCorrelationId} from './request-context';
import {z} from 'zod';
import {db} from './db';
import {staff,HttpError} from './security';
import {allowed} from './domain';
const permission={product:'products',cms:'cms',media:'media'};
export async function schedulePublication(input:unknown){
 const v=z.object({target:z.enum(['product','cms','media']),targetId:z.string(),placement:z.enum(['hero','collection','brand','product']).optional(),publishAt:z.string().datetime({offset:true}).transform(value=>new Date(value)).refine(d=>d.getTime()>Date.now(),'Choose a future publication time'),reason:z.string().min(3).max(200)}).parse(input),actor=await staff(permission[v.target]);
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'schedule:'+v.target+':'+v.targetId},0))`;
  if(v.target==='product')await tx.product.findUniqueOrThrow({where:{id:v.targetId}});
  if(v.target==='cms')await tx.cmsRevision.findUniqueOrThrow({where:{id:v.targetId}});
  if(v.target==='media'){await scannerReadiness();const asset=await tx.mediaAsset.findUniqueOrThrow({where:{id:v.targetId}});if(!v.placement||asset.status!=='approved'||!asset.outputKey||!(asset.metadata as {scanned?:boolean}).scanned)throw new HttpError(409,'Choose approved, scanned media and a placement.');}
  await tx.publicationSchedule.updateMany({where:{target:v.target,targetId:v.targetId,status:'scheduled'},data:{status:'cancelled'}});
  const {reason,...data}=v,record=await tx.publicationSchedule.create({data:{...data,actorId:actor.id}});
  await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'schedule-publication',entity:v.target,entityId:v.targetId,summary:{reason,publishAt:v.publishAt.toISOString(),scheduleId:record.id},correlationId:requestCorrelationId()}});return {message:'Publication scheduled in Africa/Accra time.',record};
 });
}
export async function cancelSchedule(input:unknown){const v=z.object({id:z.string(),reason:z.string().min(3).max(200)}).parse(input),record=await db.publicationSchedule.findUniqueOrThrow({where:{id:v.id}}),actor=await staff(permission[record.target as keyof typeof permission]||'invalid');return db.$transaction(async tx=>{const changed=await tx.publicationSchedule.updateMany({where:{id:v.id,status:'scheduled'},data:{status:'cancelled'}});if(!changed.count)throw new HttpError(409,'Schedule has already completed or changed');await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'cancel-publication',entity:record.target,entityId:record.targetId,summary:{reason:v.reason},correlationId:requestCorrelationId()}});return {message:'Schedule cancelled.'};});}
export async function runSchedules(){
 for(const item of await db.publicationSchedule.findMany({where:{status:'scheduled',publishAt:{lte:new Date()}},take:20,orderBy:{publishAt:'asc'}})){
  try{if(item.target==='media')await scannerReadiness();await db.$transaction(async tx=>{
   const claim=await tx.publicationSchedule.updateMany({where:{id:item.id,status:'scheduled'},data:{status:'published'}});if(!claim.count)return;
   const actor=await tx.user.findUnique({where:{id:item.actorId},include:{twoFactor:true}});
   if(!actor||actor.suspended||!actor.twoFactorEnabled||!actor.twoFactor?.verified||!allowed(actor.role,permission[item.target as keyof typeof permission]||'invalid'))throw Error('Publisher authorization no longer valid');
   if(item.target==='product'){const product=await tx.product.findUniqueOrThrow({where:{id:item.targetId}});if(product.status==='archived')throw Error('Archived product');await eligiblePictures(tx,(product.gallery.length?product.gallery:[product.image]).map(source=>({source,alt:product.name})),true);await tx.product.update({where:{id:item.targetId},data:{status:'published'}});}
   else if(item.target==='cms'){const revision=await tx.cmsRevision.findUniqueOrThrow({where:{id:item.targetId}});await tx.cmsPage.update({where:{id:revision.pageId},data:{title:revision.title,body:revision.body,status:'published'}});await tx.cmsRevision.create({data:{pageId:revision.pageId,title:revision.title,body:revision.body,status:'published',actorId:actor.id}});}
   else if(item.target==='media'){const asset=await tx.mediaAsset.findUniqueOrThrow({where:{id:item.targetId}});if(asset.status!=='approved'||!asset.outputKey||!(asset.metadata as {scanned?:boolean}).scanned||!item.placement)throw Error('Media no longer eligible');await tx.mediaPublication.create({data:{assetId:asset.id,placement:item.placement,actorId:actor.id}});}
   else throw Error('Unknown publication target');
   await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'scheduled-publication',entity:item.target,entityId:item.targetId,summary:{scheduleId:item.id,result:'published'},correlationId:requestCorrelationId()}});
  });}catch{const failed=await db.publicationSchedule.updateMany({where:{id:item.id,status:'scheduled'},data:{status:'failed',error:'Publication eligibility or authorization check failed.'}});if(failed.count)await db.auditLog.create({data:{actorId:item.actorId,role:'system',action:'scheduled-publication-failed',entity:item.target,entityId:item.targetId,summary:{scheduleId:item.id,result:'failed'},correlationId:requestCorrelationId()}});}
 }
}
