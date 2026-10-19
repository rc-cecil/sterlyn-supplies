import {catalogueImageSchema} from './catalogue-image';
import {requestCorrelationId} from './request-context';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {db} from './db';
import {staff,HttpError} from './security';
import {parseCsv,csvCell} from './csv';
const columns=['slug','name','description','categoryId','style','material','image'] as const;
const rowSchema=z.object({slug:z.string().regex(/^[a-z0-9-]+$/),name:z.string().min(2).max(200),description:z.string().max(5000),categoryId:z.string().min(1),style:z.enum(['Modern','Classic','Contemporary']),material:z.string().max(100),image:catalogueImageSchema});
export async function importCatalogue(input:unknown){
 const actor=await staff('products');const v=z.object({csv:z.string().max(2_000_000),commit:z.boolean(),reason:z.string().min(3).max(200)}).parse(input);
 const [header,...data]=parseCsv(v.csv);if(!header||header.join(',')!==columns.join(','))throw new HttpError(400,'Required CSV columns: '+columns.join(','));
 const rows=data.map((r,i)=>{if(r.length!==columns.length)throw new HttpError(400,`Row ${i+2} has an invalid column count`);return rowSchema.parse(Object.fromEntries(columns.map((k,n)=>[k,r[n]])));});
 if(!rows.length||new Set(rows.map(r=>r.slug)).size!==rows.length)throw new HttpError(400,'Provide unique product slugs and at least one row.');
 const categories=new Set((await db.category.findMany({select:{id:true}})).map(c=>c.id));if(rows.some(r=>!categories.has(r.categoryId)))throw new HttpError(400,'An unknown category ID was supplied.');
 if(!v.commit)return {rows,message:`${rows.length} rows validated. Import creates or updates illustrative drafts; publication and inventory are separate.`};
 await db.$transaction(async tx=>{for(const row of rows){const existing=await tx.product.findUnique({where:{slug:row.slug}});if(existing&&!existing.illustrative)throw new HttpError(409,'CSV cannot overwrite a verified commercial product.');await tx.product.upsert({where:{slug:row.slug},update:{...row,status:'draft'},create:{...row,status:'draft',illustrative:true,gallery:[row.image],variants:{create:{sku:'ST-'+randomUUID(),name:'Standard',color:'#153c30'}}}});}await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'csv-import',entity:'products',entityId:'batch',summary:{slugs:rows.map(r=>r.slug),count:rows.length,reason:v.reason,result:'success'},correlationId:requestCorrelationId()}});});
 return {message:`Imported ${rows.length} illustrative drafts.`};
}
export async function exportCatalogue(query:URLSearchParams){
 const actor=await staff('products');const rows=await db.product.findMany({where:{name:{contains:query.get('q')||'',mode:'insensitive'},...(query.get('status')?{status:query.get('status')!}:{})},orderBy:{slug:'asc'}});
 await db.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'export',entity:'products',entityId:'catalogue',summary:{count:rows.length,result:'success'},correlationId:requestCorrelationId()}});
 return [columns.join(','),...rows.map(r=>columns.map(k=>csvCell(r[k])).join(','))].join('\r\n');
}
export async function editVariant(input:unknown){
 const actor=await staff('products');const v=z.object({id:z.string().optional(),productId:z.string(),sku:z.string().min(2).max(100).optional(),name:z.string().min(2).max(100),color:z.string().regex(/^#[0-9a-f]{6}$/i),reason:z.string().min(3).max(200)}).parse(input);
 return db.$transaction(async tx=>{const {id,reason,...rest}=v;const data={...rest,sku:v.sku||'ST-'+randomUUID().slice(0,8).toUpperCase()};if(id&&!await tx.variant.findFirst({where:{id,productId:v.productId}}))throw new HttpError(404,'Variant not found');const variant=id?await tx.variant.update({where:{id},data}):await tx.variant.create({data});await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:id?'update-variant':'create-variant',entity:'products',entityId:v.productId,summary:{variantId:variant.id,reason,result:'success'},correlationId:requestCorrelationId()}});return {message:'Variant saved. Pricing and inventory remain separate.',record:variant};});
}
