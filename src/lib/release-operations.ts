import {requestCorrelationId} from './request-context';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {db} from './db';
import {staff,HttpError,requireUser,audit,hash} from './security';
const reason=z.string().trim().min(3).max(200);
export async function invoiceCommand(input:unknown){
 const actor=await staff('finance');const v=z.object({action:z.enum(['draft','issue','void']),id:z.string(),confirmation:z.string().optional(),reason}).parse(input);
 if(v.action!=='draft'&&v.confirmation!=='yes')throw new HttpError(400,'Confirm the invoice action.');
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${'invoice:'+v.id},0))`;
  let record;
  if(v.action==='draft'){
   const existing=await tx.invoice.findFirst({where:{orderId:v.id,status:{in:['draft','issued']}}});if(existing)return {record:existing,message:'Existing invoice returned.'};
   const order=await tx.order.findUniqueOrThrow({where:{id:v.id},include:{items:true}});
   if(!order.sourceQuoteId)throw new HttpError(409,'An accepted quotation is required.');
   record=await tx.invoice.create({data:{orderId:order.id,actorId:actor.id,snapshot:JSON.parse(JSON.stringify({amountBasis:order.items.some(item=>item.price===null)?'negotiated_total':'itemised',currency:order.currency,subtotal:order.subtotal,tax:order.tax,shipping:order.shipping,total:order.total,customer:{name:order.name,email:order.email,address:order.address},items:order.items.map(i=>({name:i.name,sku:i.sku,quantity:i.quantity,price:i.price})),quote:order.quoteSnapshot}))}});
  }else{
   const current=await tx.invoice.findUniqueOrThrow({where:{id:v.id}});
   if(v.action==='issue'){
    if(current.status==='issued')return {record:current,message:'Invoice already issued.'};
    if(current.status!=='draft')throw new HttpError(409,'Only a draft invoice may be issued.');
    const issuer=z.object({approved:z.literal(true),legalName:z.string().min(3),address:z.string().min(5),contact:z.string().min(5),taxTreatment:z.string().min(3),approvedBy:z.string().min(1)}).safeParse((await tx.setting.findUnique({where:{key:'invoiceIssuer'}}))?.value);
    if(!issuer.success)throw new HttpError(409,'Approved issuer identity, address, contact and tax treatment are required.');
    const year=new Date().getUTCFullYear(),counter=await tx.invoiceCounter.upsert({where:{year},create:{year,value:1},update:{value:{increment:1}}});
    record=await tx.invoice.update({where:{id:v.id},data:{status:'issued',number:`ST-${year}-${String(counter.value).padStart(6,'0')}`,issuedAt:new Date(),snapshot:{...(current.snapshot as object),issuer:issuer.data}}});
   }else{
    if(current.status==='void')return {record:current,message:'Invoice already void.'};
    record=await tx.invoice.update({where:{id:v.id},data:{status:'void',voidedAt:new Date(),voidReason:v.reason}});
   }
  }
  await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'invoice-'+v.action,entity:'invoices',entityId:record.id,summary:{reason:v.reason,status:record.status,result:'success'},correlationId:requestCorrelationId()}});
  return {record,message:'Invoice saved. Payment state is unchanged.'};
 });
}
export async function invoiceView(id:string){const actor=await requireUser();const invoice=await db.invoice.findUniqueOrThrow({where:{id}});const order=await db.order.findUniqueOrThrow({where:{id:invoice.orderId},select:{userId:true}});if(actor.role==='customer'){if(order.userId!==actor.id||invoice.status==='draft')throw new HttpError(404,'Invoice not found');}else {await staff('finance');await audit(actor,'read','invoices',invoice.id,{});}return invoice;}
export async function privacyCommand(input:unknown){
 const actor=await staff('customers');if(actor.role!=='owner')throw new HttpError(403,'Only the owner may execute privacy requests.');
 const v=z.object({id:z.string(),action:z.enum(['review','hold','execute']),confirmation:z.string().optional(),reason}).parse(input);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "PrivacyRequest" WHERE id=${v.id} FOR UPDATE`;
  const request=await tx.privacyRequest.findUniqueOrThrow({where:{id:v.id}});if(request.status==='completed')return {message:'Request already completed.'};
  const target=await tx.user.findUniqueOrThrow({where:{id:request.userId}});if(target.role!=='customer')throw new HttpError(409,'Staff and owner accounts require a separate authorized recovery process.');
  let status=v.action==='review'?'reviewed':'retention_hold';
  if(v.action==='execute'){
   if(v.confirmation!=='ERASE')throw new HttpError(400,'Type ERASE to confirm execution.');
   if(request.status!=='reviewed')throw new HttpError(409,'Review the request before execution.');
   const policy=z.object({approved:z.literal(true),approvedBy:z.string().min(1),version:z.string().min(1),nonCommercialErasure:z.literal(true),approvedCommercialOrderIds:z.array(z.string()).max(1000).optional()}).safeParse((await tx.setting.findUnique({where:{key:'privacyRetention'}}))?.value);
   if(!policy.success)throw new HttpError(409,'An approved retention policy is required.');
   const commercial=await tx.order.findMany({where:{OR:[{userId:target.id},{email:target.email},{customer:{OR:[{userId:target.id},{email:target.email}]}}]}});
   if(commercial.some(order=>!['cancelled','delivered','completed'].includes(order.status)||!policy.data.approvedCommercialOrderIds?.includes(order.id)))throw new HttpError(409,'Commercial records require completed fulfillment and explicit order-specific erasure eligibility in the approved retention policy. Place this request on hold.');
   for(const order of commercial){
    const snapshot=(order.quoteSnapshot||{}) as Record<string,unknown>;
    await tx.order.update({where:{id:order.id},data:{accessHash:hash(randomUUID()),userId:null,name:'Erased customer',email:'erased@privacy.invalid',address:{},notes:null,tracking:null,phone:null,trackingHash:null,trackingCipher:null,trackingRevokedAt:new Date(),quoteSnapshot:{...snapshot,scene:null}}});
    await tx.payment.updateMany({where:{orderId:order.id},data:{authorizationUrl:null}});await tx.refund.updateMany({where:{orderId:order.id},data:{reason:'Personal content erased under approved retention review.'}});
    await tx.orderEvent.updateMany({where:{orderId:order.id},data:{note:'Personal content erased under approved retention review.',publicNote:null}});
    for(const invoice of await tx.invoice.findMany({where:{orderId:order.id}})){const value=invoice.snapshot as Record<string,unknown>;await tx.invoice.update({where:{id:invoice.id},data:{snapshot:JSON.parse(JSON.stringify({...value,customer:{name:'Erased customer',email:'erased@privacy.invalid',address:{}},quote:{...((value.quote||{}) as object),scene:null}}))}});}
   }

   await tx.enquiryEvent.updateMany({where:{quote:{OR:[{userId:target.id},{email:target.email},{customer:{OR:[{userId:target.id},{email:target.email}]}}]}},data:{note:'Personal content erased under approved retention review.'}});
   await tx.quote.updateMany({where:{OR:[{userId:target.id},{email:target.email},{customer:{OR:[{userId:target.id},{email:target.email}]}}]},data:{userId:null,name:'Erased customer',email:'erased@privacy.invalid',phone:null,notes:'Erased',staffNotes:null,scene:{}}});
   for(const contact of await tx.customer.findMany({where:{OR:[{userId:target.id},{email:target.email}]}}))await tx.customer.update({where:{id:contact.id},data:{userId:null,name:'Erased customer',email:'erased+'+contact.id+'@privacy.invalid',phone:null,notes:'Erased under approved retention review.'}});
   await tx.supportTicket.updateMany({where:{email:target.email},data:{name:'Erased customer',email:'erased@privacy.invalid',message:'Erased',notes:null}});
   await tx.notification.deleteMany({where:{recipient:target.email}});await tx.newsletter.deleteMany({where:{email:target.email}});await tx.staffInvitation.deleteMany({where:{email:target.email}});
   await tx.verification.deleteMany({where:{OR:[{identifier:target.email},{value:target.id}]}});
   await tx.cart.deleteMany({where:{userId:target.id}});await tx.user.delete({where:{id:target.id}});status='completed';
  }
  await tx.privacyRequest.update({where:{id:v.id},data:{status,reason:v.reason,reviewedBy:actor.id,completedAt:status==='completed'?new Date():null}});
  await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'privacy-'+v.action,entity:'privacy',entityId:v.id,summary:{reason:v.reason,status,result:'success'},correlationId:requestCorrelationId()}});
  return {message:'Privacy request '+status+'.'};
 });
}
