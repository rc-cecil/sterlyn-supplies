import {z} from 'zod';
import {db} from './db';
import {inspirationStories,type InspirationStory} from './inspiration';
import {staff,HttpError} from './security';
import {requestCorrelationId} from './request-context';
const contentSchema=z.object({title:z.string().trim().min(2).max(180),intro:z.string().trim().min(5).max(1000),heading:z.string().trim().min(2).max(180),paragraphs:z.array(z.string().trim().min(5).max(4000)).min(1).max(12)});
export async function publishedInspirations():Promise<InspirationStory[]>{
 const pages=await db.cmsPage.findMany({where:{slug:{startsWith:'inspiration-'},status:'published'},select:{slug:true,body:true}});
 return inspirationStories.map(story=>{const page=pages.find(page=>page.slug==='inspiration-'+story.slug);if(!page)return story;try{const content=contentSchema.safeParse(JSON.parse(page.body));return content.success?{...story,...content.data}:story;}catch{return story;}});
}
export async function inspirationWorkspace(){await staff('cms');const pages=await db.cmsPage.findMany({where:{slug:{startsWith:'inspiration-'}},include:{revisions:{take:1,orderBy:{createdAt:'desc'}}}});return {stories:await publishedInspirations(),pages};}
export async function saveInspiration(input:unknown){
 const actor=await staff('cms');const v=z.object({slug:z.string(),expectedUpdatedAt:z.iso.datetime().optional(),content:contentSchema,reason:z.string().min(3).max(200)}).parse(input);
 const original=inspirationStories.find(story=>story.slug===v.slug);if(!original)throw new HttpError(404,'Inspiration not found.');
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`inspiration:${v.slug}`},0))`;
  const existing=await tx.cmsPage.findUnique({where:{slug:'inspiration-'+v.slug}});
  if(existing&&existing.updatedAt.toISOString()!==v.expectedUpdatedAt)throw new HttpError(409,'This inspiration changed. Reload before saving.');
  const body=JSON.stringify(v.content),page=existing||await tx.cmsPage.create({data:{slug:'inspiration-'+v.slug,title:v.content.title,body,status:'draft',image:original.image}});
  if(existing&&existing.status==='draft')await tx.cmsPage.update({where:{id:existing.id},data:{title:v.content.title,body}});
  const revision=await tx.cmsRevision.create({data:{pageId:page.id,title:v.content.title,body,status:'draft',actorId:actor.id}});
  await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'inspiration-draft',entity:'cms',entityId:page.id,summary:{reason:v.reason,revisionId:revision.id},correlationId:requestCorrelationId()}});
  return {revisionId:revision.id,message:'Draft saved. Publish it when you have reviewed the wording.'};
 });
}
