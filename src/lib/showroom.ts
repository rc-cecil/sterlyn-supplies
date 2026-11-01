import {randomUUID} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {z} from 'zod';
import {db} from './db';
import {staff,user,HttpError,hash} from './security';
import {allowed} from './domain';
import {requestCorrelationId} from './request-context';
import {publishedInspirations} from './inspiration-content';
import {BUSINESS_WHATSAPP,whatsappEnquiryText} from './enquiry';
import {amountSchema,currencySchema,enquiryInput,enquiryStatuses,itemSnapshot,canonicalEnquiryStatus,canonicalOrderStatus,nextOrderStatuses,receiptSummary,type ItemSnapshot} from './showroom-domain';
import {trackingCredentials,trackingHash,trackingUrl} from './order-tracking';
import {queueOrderEmail} from './order-email';
type Actor={id:string;role:string};
const reason=z.string().trim().min(3).max(1000);
const id=z.string().min(1).max(100);
async function record(tx:Prisma.TransactionClient,actor:Actor,action:string,entity:string,entityId:string,summary:Prisma.InputJsonObject){await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action,entity,entityId,summary,correlationId:requestCorrelationId()}});}
async function assignee(tx:Prisma.TransactionClient,value:string|undefined,resource:string){if(!value)return null;const target=await tx.user.findUnique({where:{id:value}});if(!target||target.suspended||!allowed(target.role,resource))throw new HttpError(400,'Choose an active staff member with the relevant permission.');return target.id;}
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const matchesHash=(stored:string|null,value:string)=>stored===value;

export async function createEnquiry(input:unknown){
 const v=enquiryInput.parse(input),actor=await user(),fingerprint=hash(JSON.stringify(v));
 const replay=await db.quote.findUnique({where:{requestKey:v.requestKey}});
 if(replay){if(!matchesHash(replay.requestHash,fingerprint))throw new HttpError(409,'This submission key belongs to a different enquiry. Start a new enquiry.');return enquiryResult(replay);}
 const items:ItemSnapshot[]=[];
 for(const item of v.items){
  if(item.type==='product'){
   const product=await db.product.findFirst({where:{slug:item.slug,status:'published'},include:{variants:true}});
   if(!product)throw new HttpError(422,'A selected product is no longer available. Review your selections before submitting.');
   const variant=product.variants.find(variant=>variant.name===item.finish);
   items.push({...item,name:product.name,image:product.image,...(variant?{variantId:variant.id,sku:variant.sku}:{})});
  }else{
   const story=(await publishedInspirations()).find(story=>story.slug===item.slug);
   if(!story)throw new HttpError(422,'A selected inspiration is no longer available. Review your selections.');
   items.push({...item,name:story!.title,image:story!.image});
  }
 }
 if(v.scene)items.push({type:'design',name:'Design Studio project',quantity:1});
 try{
 const quote=await db.$transaction(async tx=>{
  let customerId:string|undefined;
  if(actor?.emailVerified&&actor.email.toLowerCase()===v.email){
   const customer=await tx.customer.upsert({where:{email:v.email},create:{name:v.name,email:v.email,phone:v.phone,userId:actor.id,verifiedBy:actor.id},update:{}});
   if(customer.userId&&customer.userId!==actor.id)throw new HttpError(409,'This verified contact is linked to a different account. Contact our team.');
   customerId=customer.id;
  }
  const quote=await tx.quote.create({data:{name:v.name,email:v.email,phone:v.phone,notes:v.notes,requestKey:v.requestKey,requestHash:fingerprint,items:json(items),...(v.scene?{scene:json(v.scene)}:{}),userId:actor?.emailVerified&&actor.email.toLowerCase()===v.email?actor.id:null,customerId,history:{create:{status:'new',actorId:actor?.id||'guest',note:'Website enquiry saved before WhatsApp handoff.'}}}});
  await record(tx,{id:actor?.id||'guest',role:actor?.role||'guest'},'enquiry-created','quotes',quote.id,{reference:quote.reference,itemCount:items.length});
  return quote;
 });return enquiryResult(quote);
 }catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002'){
  const prior=await db.quote.findUnique({where:{requestKey:v.requestKey}});if(prior&&matchesHash(prior.requestHash,fingerprint))return enquiryResult(prior);
 }throw error;}
}
function enquiryResult(quote:{id:string;reference:string;name:string;notes:string;items:Prisma.JsonValue}){
 const items=z.array(itemSnapshot).parse(quote.items);
 const text=`Enquiry reference: ${quote.reference}\n\n`+whatsappEnquiryText(items.filter(i=>i.type!=='design') as Parameters<typeof whatsappEnquiryText>[0],quote.name,quote.notes)+(items.some(i=>i.type==='design')?'\nDesign Studio layout attached to this enquiry.':'');
 return {id:quote.id,reference:quote.reference,whatsappUrl:`https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(text)}`,message:'Your enquiry is saved. Review and send the message in WhatsApp.'};
}

export async function updateEnquiry(input:unknown){
 const actor=await staff('quotes');
 const v=z.object({id,version:z.number().int(),status:z.enum(enquiryStatuses),assignedTo:z.string().optional(),staffNotes:z.string().max(5000).default(''),reason}).parse(input);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${v.id} FOR UPDATE`;
  const current=await tx.quote.findUniqueOrThrow({where:{id:v.id}});
  if(current.version!==v.version)throw new HttpError(409,'This enquiry changed. Reload before saving.');
  if(current.status==='converted'||v.status==='converted'||await tx.order.findUnique({where:{sourceQuoteId:v.id},select:{id:true}}))throw new HttpError(409,'Converted status is managed by order creation.');
  const assignedTo=await assignee(tx,v.assignedTo,'quotes');
  await tx.quote.update({where:{id:v.id},data:{status:v.status,staffNotes:v.staffNotes,assignedTo,version:{increment:1}}});
  await tx.enquiryEvent.create({data:{quoteId:v.id,previousStatus:current.status,status:v.status,actorId:actor.id,note:v.reason}});
  await record(tx,actor,'enquiry-updated','quotes',v.id,{from:current.status,to:v.status,reason:v.reason});return {message:'Enquiry updated.'};
 });
}
const conversionInput=z.object({id,amount:amountSchema,currency:currencySchema.default('GHS'),address:z.string().trim().min(3).max(2000),expectedDelivery:z.iso.date().optional(),instructions:z.string().max(4000).default(''),assignedTo:z.string().optional(),customerId:z.string().optional(),confirmCustomer:z.literal(true),reason});
export async function convertEnquiry(input:unknown){
 const actor=await staff('orders');await staff('quotes');const v=conversionInput.parse(input);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${v.id} FOR UPDATE`;
  const prior=await tx.order.findUnique({where:{sourceQuoteId:v.id},select:{id:true,reference:true,status:true}});if(prior)return {record:prior,message:'This enquiry already has an order.'};
  const quote=await tx.quote.findUniqueOrThrow({where:{id:v.id}});
  if(!['agreed','accepted'].includes(quote.status))throw new HttpError(409,'Record the WhatsApp agreement before converting this enquiry.');
  const items=z.array(itemSnapshot).parse(quote.items);
  // Legacy scene-only requests remain convertible without fabricated catalogue lines.
  if(!items.length&&quote.scene)items.push({type:'design',name:'Design Studio project',quantity:1});
  if(!items.length)throw new HttpError(400,'Confirm the requested items before creating an order.');
  const email=quote.email.toLowerCase();
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer:${email}`},0))`;
  const customer=v.customerId?await tx.customer.findUniqueOrThrow({where:{id:v.customerId}}):await tx.customer.upsert({where:{email},create:{name:quote.name,email,phone:quote.phone,verifiedBy:actor.id},update:{}});
  if(v.customerId&&customer.email!==email&&quote.customerId!==customer.id)throw new HttpError(400,'Review and match the customer identity before converting.');
  const assignedTo=await assignee(tx,v.assignedTo,'orders'),credentials=trackingCredentials();
  const created=await tx.order.create({data:{sourceQuoteId:quote.id,customerId:customer.id,userId:quote.userId,name:quote.name,email:quote.email,phone:quote.phone||customer.phone,address:{deliveryAddress:v.address},assignedTo,expectedDelivery:v.expectedDelivery?new Date(v.expectedDelivery+'T12:00:00Z'):null,notes:v.instructions,quoteSnapshot:json({reference:quote.reference,items:quote.items,scene:quote.scene,notes:quote.notes}),accessHash:hash(randomUUID()),trackingHash:credentials.trackingHash,trackingCipher:credentials.trackingCipher,status:'confirmed',currency:v.currency,subtotal:v.amount,total:v.amount,tax:0,shipping:0,items:{create:items.map(item=>({variantId:item.variantId||null,kind:item.type,name:item.name,sku:item.sku||'',quantity:item.quantity,price:null,snapshot:json(item)}))}}});
  const event=await tx.orderEvent.create({data:{orderId:created.id,status:'confirmed',note:v.reason,actorId:actor.id,publicNote:null}});
  await tx.quote.update({where:{id:quote.id},data:{status:'converted',customerId:customer.id,version:{increment:1}}});
  await tx.enquiryEvent.create({data:{quoteId:quote.id,previousStatus:quote.status,status:'converted',note:v.reason,actorId:actor.id}});
  await queueOrderEmail(tx,created,event.id);
  await record(tx,actor,'enquiry-to-order','orders',created.id,{quoteId:quote.id,customerId:customer.id,amount:v.amount,currency:v.currency,payment:'unpaid',reason:v.reason});
  return {record:{id:created.id,reference:created.reference,status:created.status},message:'Order confirmed. Confirmation email queued; no payment has been recorded.'};
 });
}

export async function updateOrder(input:unknown){
 const actor=await staff('orders');
 const v=z.object({id,version:z.number().int(),status:z.string(),publicNote:z.string().trim().max(1000).default(''),reason,expectedDelivery:z.iso.date().nullable().optional(),address:z.string().min(3).max(2000).optional(),instructions:z.string().max(4000).optional(),assignedTo:z.string().optional()}).parse(input);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${v.id} FOR UPDATE`;
  const current=await tx.order.findUniqueOrThrow({where:{id:v.id}});if(current.version!==v.version)throw new HttpError(409,'This order changed. Reload before saving.');
  const previous=canonicalOrderStatus(current.status),changed=v.status!==previous;
  if(changed&&!nextOrderStatuses(current.status,current.resumeStatus).includes(v.status))throw new HttpError(409,'This order status transition is not allowed.');
  const exception=['delayed','on_hold'].includes(v.status),wasException=['delayed','on_hold'].includes(previous);
  const assignedTo=v.assignedTo===undefined?current.assignedTo:await assignee(tx,v.assignedTo,'orders');
  const order=await tx.order.update({where:{id:current.id},data:{status:changed?v.status:current.status,version:{increment:1},assignedTo,resumeStatus:exception?(wasException?current.resumeStatus:previous):null,expectedDelivery:v.expectedDelivery===undefined?undefined:v.expectedDelivery?new Date(v.expectedDelivery+'T12:00:00Z'):null,address:v.address?{deliveryAddress:v.address}:undefined,notes:v.instructions,trackingExpiresAt:changed&&['completed','cancelled'].includes(v.status)?new Date(Date.now()+90*86400000):undefined}});
  if(changed&&v.status==='cancelled'){for(const reservation of await tx.reservation.findMany({where:{orderId:current.id,released:false}})){const released=await tx.reservation.updateMany({where:{id:reservation.id,released:false},data:{released:true}});if(released.count){await tx.variant.update({where:{id:reservation.variantId},data:{stock:{increment:reservation.quantity}}});await tx.stockMovement.create({data:{variantId:reservation.variantId,quantity:reservation.quantity,reason:'Cancelled order reservation release',actorId:actor.id}});}}}
  if(changed){const event=await tx.orderEvent.create({data:{orderId:current.id,status:v.status,previousStatus:current.status,actorId:actor.id,note:v.reason,publicNote:v.publicNote||null}});await queueOrderEmail(tx,order,event.id,v.publicNote);}
  await record(tx,actor,changed?'order-status':'order-details','orders',current.id,{from:current.status,to:order.status,reason:v.reason,paymentGate:'staff_decision'});
  return {message:changed?'Status updated. Customer email queued when an active tracking link is available.':'Details saved. No status email was created.'};
 });
}

export async function recordReceipt(input:unknown){
 const actor=await staff('orders');if(!['owner','admin'].includes(actor.role))throw new HttpError(403,'Only the owner or an admin can confirm or reverse external receipts.');
 const v=z.object({id,requestKey:z.uuid(),action:z.enum(['confirm','reverse']),amount:amountSchema.optional(),currency:currencySchema.optional(),confirmedAt:z.iso.datetime().optional(),method:z.string().trim().min(2).max(80).optional(),externalReference:z.string().max(150).optional(),paymentId:z.string().optional(),reason}).parse(input);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${v.id} FOR UPDATE`;
  const prior=await tx.payment.findUnique({where:{requestKey:v.requestKey}});if(prior){if(prior.orderId!==v.id||prior.reason!==v.reason||(v.action==='reverse'?prior.reversalOf!==v.paymentId:prior.amount!==v.amount||prior.currency!==v.currency))throw new HttpError(409,'Receipt submission key already used.');return {message:'Receipt already recorded.'};}
  const order=await tx.order.findUniqueOrThrow({where:{id:v.id}});
  let amount=v.amount,reversalOf:string|undefined;
  if(v.action==='reverse'){
   const payment=await tx.payment.findUnique({where:{id:v.paymentId||''}});
   if(!payment||payment.orderId!==v.id||payment.provider!=='manual'||payment.status!=='confirmed'||payment.reversalOf)throw new HttpError(400,'Choose a confirmed external receipt to reverse.');
   if(await tx.payment.findUnique({where:{reversalOf:payment.id}}))throw new HttpError(409,'This receipt has already been reversed.');
   amount=payment.amount;reversalOf=payment.id;
  }else if(!amount||v.currency!==order.currency||!v.method||!v.confirmedAt||new Date(v.confirmedAt)>new Date())throw new HttpError(400,'Confirm the amount, matching currency, payment method and actual receipt date.');
  const payment=await tx.payment.create({data:{orderId:v.id,reference:'MAN-'+randomUUID(),provider:'manual',status:'confirmed',amount:amount!,currency:order.currency,confirmedBy:actor.id,confirmedAt:v.action==='reverse'?new Date():new Date(v.confirmedAt!),method:v.method,externalReference:v.externalReference,reason:v.reason,reversalOf,requestKey:v.requestKey}});
  await record(tx,actor,v.action==='reverse'?'receipt-reversed':'receipt-confirmed','payments',payment.id,{orderId:v.id,amount:amount!,currency:order.currency,reason:v.reason});return {message:'External receipt recorded. No online payment was taken.'};
 });
}

export async function trackingCommand(input:unknown){
 const actor=await staff('orders');const v=z.object({id,version:z.number().int(),action:z.enum(['revoke','regenerate']),reason}).parse(input);
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${v.id} FOR UPDATE`;
  const current=await tx.order.findUniqueOrThrow({where:{id:v.id}});if(current.version!==v.version)throw new HttpError(409,'This order changed. Reload before updating its tracking link.');
  const credentials=v.action==='regenerate'?trackingCredentials():null;
  const order=await tx.order.update({where:{id:v.id},data:{version:{increment:1},...(credentials?{trackingHash:credentials.trackingHash,trackingCipher:credentials.trackingCipher,trackingRevokedAt:null,trackingExpiresAt:['completed','cancelled'].includes(current.status)?new Date(Date.now()+90*86400000):null}:{trackingRevokedAt:new Date()})}});
  if(credentials)await queueOrderEmail(tx,order,'tracking-'+randomUUID());
  await record(tx,actor,'tracking-'+v.action,'orders',v.id,{reason:v.reason});return {message:credentials?'New private tracking link created and email queued.':'Tracking link revoked.',...(credentials?{url:trackingUrl(order.trackingCipher!)}:{})};
 });
}
export async function lookupTracking(input:unknown){
 const {token}=z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).parse(input);
 const order=await db.order.findUnique({where:{trackingHash:trackingHash(token)},select:{reference:true,status:true,resumeStatus:true,expectedDelivery:true,updatedAt:true,trackingRevokedAt:true,trackingExpiresAt:true,events:{where:{},select:{id:true,status:true,publicNote:true,createdAt:true},orderBy:{createdAt:'asc'}}}});
 if(!order||order.trackingRevokedAt||(order.trackingExpiresAt&&order.trackingExpiresAt<new Date()))throw new HttpError(404,'This tracking link is unavailable. Contact Sterlyn Supplies for help.');
 return {reference:order.reference,status:canonicalOrderStatus(order.status),resumeStatus:order.resumeStatus,expectedDelivery:order.expectedDelivery,updatedAt:order.events.at(-1)?.createdAt||order.updatedAt,events:order.events.map(event=>({...event,status:canonicalOrderStatus(event.status)}))};
}
export async function recoverTracking(input:unknown){
 const v=z.object({reference:z.string().trim().max(100),email:z.email().transform(s=>s.toLowerCase())}).parse(input);
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`recovery:${v.reference}`},0))`;
  const order=await tx.order.findFirst({where:{reference:v.reference,email:{equals:v.email,mode:'insensitive'},trackingRevokedAt:null,trackingCipher:{not:null},OR:[{trackingExpiresAt:null},{trackingExpiresAt:{gt:new Date()}}]}});
  if(!order)return;
  const bucket=Math.floor(Date.now()/3600000),dedupeKey=`recovery:${order.id}:${bucket}`;
  if(await tx.notification.findUnique({where:{dedupeKey}}))return;
  await queueOrderEmail(tx,order,'recovery-'+bucket);
  // The recovery marker bounds repeat requests without revealing account existence.
  await tx.notification.update({where:{dedupeKey:`order:${order.id}:recovery-${bucket}`},data:{dedupeKey}});
 });return {message:'If those details match an active order, a tracking email will be queued to its existing contact address. For an expired or revoked link, contact Sterlyn Supplies.'};
}

export async function showroomRead(resource:string,query:URLSearchParams){
 const permission=resource==='enquiries'?'quotes':resource==='business'?'business':resource;
 const actor=await staff(permission),q=(query.get('q')||'').slice(0,150),status=query.get('status')||'',page=Math.max(1,Math.min(10000,Number(query.get('page'))||1));
 const paging={take:30,skip:(page-1)*30},orderBy={createdAt:query.get('sort')==='oldest'?'asc' as const:'desc' as const};
 const staffList=()=>db.user.findMany({where:{suspended:false,role:{in:['owner','admin','sales','support','fulfillment']}},select:{id:true,name:true,role:true}});
 if(resource==='enquiries'){
  const enquiryFilter:Prisma.QuoteWhereInput=status==='converted'?{order:{isNot:null}}:status?{status:{in:({contacted:['contacted','reviewing'],awaiting_customer:['awaiting_customer','quoted'],agreed:['agreed','accepted']} as Record<string,string[]>)[status]||[status]},order:{is:null}}:{};
  const where:Prisma.QuoteWhereInput={...(query.get('record')?{id:query.get('record')!}:{}),...enquiryFilter,...(query.get('assignedTo')?{assignedTo:query.get('assignedTo')}:{}),OR:[{reference:{contains:q,mode:'insensitive'}},{name:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}}]};
  const [rows,total,staffMembers]=await Promise.all([db.quote.findMany({where,...paging,orderBy,include:{order:{select:{id:true,reference:true}},customer:true,history:{orderBy:{createdAt:'asc'}}}}),db.quote.count({where}),staffList()]);
  const candidates=await db.customer.findMany({where:{email:{in:rows.filter(row=>!row.customerId).map(row=>row.email.toLowerCase())}},select:{id:true,name:true,email:true}});
  return {rows:rows.map(row=>({...row,status:row.order?'converted':canonicalEnquiryStatus(row.status)})),total,staff:staffMembers,candidates,canConvert:allowed(actor.role,'orders')};
 }
 if(resource==='orders'){
  const where:Prisma.OrderWhereInput={...(query.get('record')?{id:query.get('record')!}:{}),...(status?{status:{in:({confirmed:['confirmed','awaiting_confirmation','paid'],dispatched:['dispatched','shipped']} as Record<string,string[]>)[status]||[status]}}:{}),OR:[{id:{contains:q}},{reference:{contains:q,mode:'insensitive'}},{name:{contains:q,mode:'insensitive'}},{email:{contains:q,mode:'insensitive'}}]};
  const finance=['owner','admin','sales'].includes(actor.role);
  const [orders,total,staffMembers]=await Promise.all([db.order.findMany({where,...paging,orderBy,include:{customer:{select:{phone:true}},items:true,payments:true,events:{orderBy:{createdAt:'asc'}},sourceQuote:{select:{reference:true,id:true}}}}),db.order.count({where}),staffList()]);
  const rows=orders.map(order=>{
   // Explicit public-to-staff DTO: credentials and encrypted tokens never leave this service.
   const common={id:order.id,reference:order.reference,name:order.name,email:order.email,phone:order.phone||order.customer?.phone,status:canonicalOrderStatus(order.status),version:order.version,assignedTo:order.assignedTo,address:order.address,notes:order.notes,expectedDelivery:order.expectedDelivery,createdAt:order.createdAt,sourceQuote:order.sourceQuote,nextStatuses:nextOrderStatuses(order.status,order.resumeStatus),scene:(order.quoteSnapshot as {scene?:Prisma.JsonValue}|null)?.scene,customerNotes:(order.quoteSnapshot as {notes?:string}|null)?.notes,items:order.items.map(item=>({id:item.id,name:item.name,quantity:item.quantity,kind:item.kind,snapshot:item.snapshot})),events:order.events,trackingActive:!!order.trackingHash&&!order.trackingRevokedAt,trackingExpiresAt:order.trackingExpiresAt};
   return {...common,...(finance?{currency:order.currency,total:order.total,payments:order.payments.filter(payment=>(payment.provider==='manual'&&payment.status==='confirmed')||(payment.provider!=='manual'&&payment.status==='paid')),receiptSummary:receiptSummary(order.total,order.payments)}:{})};
  });return {rows,total,staff:staffMembers,canConfirmPayments:['owner','admin'].includes(actor.role)};
 }
 if(resource==='customers'){
  const where={...(query.get('record')?{id:query.get('record')!}:{}),OR:[{name:{contains:q,mode:'insensitive' as const}},{email:{contains:q,mode:'insensitive' as const}}]};
  const [rows,total,pending]=await Promise.all([db.customer.findMany({where,...paging,orderBy,include:{enquiries:{select:{id:true,reference:true,status:true,createdAt:true}},orders:{select:{id:true,reference:true,status:true,createdAt:true}}}}),db.customer.count({where}),db.quote.findMany({where:{customerId:null,...where},take:30,orderBy,select:{id:true,name:true,email:true,phone:true,reference:true,status:true,version:true}})]);
  return {rows,total,pending};
 }
 if(resource==='business'){
  const settings=await db.setting.findMany({where:{key:{in:['business','notificationTemplates']}}});
  return {settings,readiness:{smtp:!!(process.env.SMTP_HOST&&process.env.MAIL_FROM),tracking:/^[a-f0-9]{64}$/i.test(process.env.TRACKING_ENCRYPTION_KEY||''),applicationUrl:!!process.env.BETTER_AUTH_URL},worker:(await db.setting.findUnique({where:{key:'workerHeartbeat'}}))?.value};
 }
 throw new HttpError(404,'Unknown business module.');
}
export async function customerCommand(input:unknown){
 const actor=await staff('customers');const v=z.object({id:z.string().optional(),quoteId:z.string().optional(),version:z.number().int().optional(),name:z.string().trim().min(2).max(100),email:z.email().transform(s=>s.toLowerCase()),phone:z.string().max(30).optional(),notes:z.string().max(5000).optional(),reason,confirm:z.literal(true)}).parse(input);
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer:${v.email}`},0))`;
  const customer=v.id?await tx.customer.findUniqueOrThrow({where:{id:v.id}}):await tx.customer.findUnique({where:{email:v.email}});
  if(v.id&&customer?.email!==v.email)throw new HttpError(400,'Customer email changes require a reviewed identity migration.');
  const saved=customer?(v.id?await tx.customer.update({where:{id:customer.id},data:{name:v.name,phone:v.phone,notes:v.notes}}):customer):await tx.customer.create({data:{name:v.name,email:v.email,phone:v.phone,notes:v.notes||'',verifiedBy:actor.id}});
  if(v.quoteId){await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${v.quoteId} FOR UPDATE`;const quote=await tx.quote.findUniqueOrThrow({where:{id:v.quoteId}});if(quote.customerId||quote.version!==v.version)throw new HttpError(409,'This enquiry changed or has already been matched.');await tx.quote.update({where:{id:quote.id},data:{customerId:saved.id,version:{increment:1}}});}
  await record(tx,actor,'customer-reviewed','customers',saved.id,{quoteId:v.quoteId||null,reason:v.reason});return {message:'Customer details saved and identity match recorded.'};
 });
}
export async function businessSettings(input:unknown){
 const actor=await staff('business');if(!['owner','admin'].includes(actor.role))throw new HttpError(403,'Only an owner or admin can change business configuration.');
 const v=z.discriminatedUnion('key',[z.object({key:z.literal('business'),value:z.object({whatsapp:z.literal('447576899618'),contactName:z.string().min(2).max(100)}),reason}),z.object({key:z.literal('notificationTemplates'),value:z.record(z.enum(['confirmed','processing','ready_for_delivery','dispatched','delayed','on_hold','delivered','completed','cancelled']),z.string().trim().min(5).max(1000)),reason})]).parse(input);
 return db.$transaction(async tx=>{await tx.setting.upsert({where:{key:v.key},create:{key:v.key,value:v.value},update:{value:v.value}});await record(tx,actor,'business-settings','settings',v.key,{reason:v.reason});return {message:'Business configuration saved.'};});
}
