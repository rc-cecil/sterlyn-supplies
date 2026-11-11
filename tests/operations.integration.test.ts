import {afterAll,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
import {bootstrapOwner} from '../src/lib/owner-bootstrap';
process.env.BETTER_AUTH_URL='http://localhost:3002';
process.env.TRACKING_ENCRYPTION_KEY='11'.repeat(32);
const enabled=process.env.RUN_DATABASE_TESTS==='true';
if(enabled&&new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw new Error('Integration tests require isolated sterlyn_test database');
const actor=vi.hoisted(()=>({id:'',role:'owner',email:'',emailVerified:true}));
vi.mock('../src/lib/security',async importOriginal=>({...await importOriginal<object>(),staff:vi.fn(async()=>actor),requireUser:vi.fn(async()=>actor)}));
const {inviteStaff,acceptInvitation,staffAccess,provisionStaff,convertQuote}=await import('../src/lib/operations');
const created:string[]=[];
describe.skipIf(!enabled)('PostgreSQL owner and staff transactions',()=>{
 afterAll(async()=>{if(!enabled)return;await db.staffInvitation.deleteMany({where:{invitedBy:{in:created}}});await db.notification.deleteMany({where:{recipient:{endsWith:'@integration.invalid'}}});await db.user.deleteMany({where:{id:{in:created}}});await db.$disconnect();});
 it('serializes concurrent owner bootstrap and never overwrites an account',async()=>{
  if(await db.user.count({where:{role:'owner'}}))throw new Error('Test database already has an owner; refusing to alter it');
  const pass=randomUUID()+randomUUID();
  const results=await Promise.allSettled([bootstrapOwner({email:randomUUID()+'@integration.invalid',password:pass}),bootstrapOwner({email:randomUUID()+'@integration.invalid',password:pass})]);
  const successes=results.filter(r=>r.status==='fulfilled');for(const r of successes)if(r.status==='fulfilled')created.push(r.value.id);
  expect(successes).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
  actor.id=created[0];expect(await db.user.count({where:{role:'owner'}})).toBe(1);
 });
 it('lets only the owner issue staff credentials and reset them without email invitations',async()=>{
  const email=randomUUID()+'@integration.invalid',password=randomUUID()+randomUUID();
  const createdStaff=await provisionStaff({action:'create',name:'Owner-issued staff',email,password,role:'fulfillment'});created.push(createdStaff.id);
  expect(await db.user.findUniqueOrThrow({where:{id:createdStaff.id}})).toMatchObject({emailVerified:true,role:'fulfillment'});
  expect(await db.notification.count({where:{recipient:email}})).toBe(0);
  const account=await db.account.findFirstOrThrow({where:{userId:createdStaff.id}});expect(account.providerId).toBe('credential');expect(account.password).not.toBe(password);
  await expect(provisionStaff({action:'create',name:'Duplicate',email,password,role:'sales'})).rejects.toMatchObject({status:409});
  const owner=actor.id;actor.id=createdStaff.id;actor.role='fulfillment';await expect(provisionStaff({action:'create',name:'Forbidden',email:randomUUID()+'@integration.invalid',password,role:'admin'})).rejects.toMatchObject({status:403});actor.id=owner;actor.role='owner';
  await provisionStaff({action:'reset-password',id:createdStaff.id,password:randomUUID()+randomUUID()});
  expect((await db.account.findFirstOrThrow({where:{userId:createdStaff.id}})).password).not.toBe(account.password);
  expect(JSON.stringify(await db.auditLog.findMany({where:{entityId:createdStaff.id}}))).not.toContain(password);
  await expect(provisionStaff({action:'reset-password',id:owner,password})).rejects.toMatchObject({status:409});
 });
 it('queues invitations, accepts once, revokes sessions, and protects owner',async()=>{
  const id=randomUUID(),email=id+'@integration.invalid';created.push(id);
  await db.user.create({data:{id,email,name:'Test staff',emailVerified:true}});
  await inviteStaff({email,role:'catalogue',reason:'Integration invitation'});
  const message=await db.notification.findFirstOrThrow({where:{recipient:email}});
  expect(message.status).toBe('queued');const token=new URL(message.body.match(/https?:\/\/[^\s]+/)![0]).searchParams.get('token');
  const owner=actor.id;actor.id=id;actor.email=email;actor.role='customer';
  await acceptInvitation({token});await expect(acceptInvitation({token})).rejects.toMatchObject({status:409});
  expect((await db.user.findUniqueOrThrow({where:{id}})).role).toBe('catalogue');
  actor.id=owner;actor.role='owner';
  await staffAccess({id,action:'suspend',reason:'Integration suspension'});expect((await db.user.findUniqueOrThrow({where:{id}})).suspended).toBe(true);
  await staffAccess({id,action:'reactivate',reason:'Integration reactivation'});expect((await db.user.findUniqueOrThrow({where:{id}})).suspended).toBe(false);
  await expect(staffAccess({id:owner,action:'suspend',reason:'Invalid owner change'})).rejects.toMatchObject({status:409});
 });
});

describe.skipIf(!enabled)('PostgreSQL quote conversion',()=>{
 it('serializes duplicate conversions and preserves an unpaid immutable snapshot',async()=>{
  const variant=await db.variant.findFirstOrThrow();
  const quote=await db.quote.create({data:{name:'Integration customer',email:'quote@integration.invalid',notes:'Test snapshot',status:'accepted',estimate:2500,items:[{variantId:variant.id,sku:'TEST',name:'Quoted cabinet',quantity:2}]}});
  try {
   const input={id:quote.id,reason:'Accepted commercial details',amount:2500,currency:'GHS',address:'Test street, Accra',confirmCustomer:true};
   const results=await Promise.all([convertQuote(input),convertQuote(input)]);
   expect(results[0].record.id).toBe(results[1].record.id);
   const order=await db.order.findUniqueOrThrow({where:{sourceQuoteId:quote.id},include:{items:true,payments:true}});
   expect(order.status).toBe('confirmed');expect(order.total).toBe(2500);expect(order.payments).toHaveLength(0);expect(order.items).toHaveLength(1);
   await db.quote.update({where:{id:quote.id},data:{items:[]}});
   expect((order.quoteSnapshot as {items:unknown[]}).items).toHaveLength(1);
  } finally {
   const order=await db.order.findUnique({where:{sourceQuoteId:quote.id}});
   if(order){await db.orderEvent.deleteMany({where:{orderId:order.id}});await db.orderItem.deleteMany({where:{orderId:order.id}});await db.order.delete({where:{id:order.id}});}
   await db.enquiryEvent.deleteMany({where:{quoteId:quote.id}});await db.quote.delete({where:{id:quote.id}});
  }
 });
});

describe.skipIf(!enabled)('PostgreSQL CMS revisions',()=>{
 it('publishes and restores a stored revision without deleting history',async()=>{
  const {publishRevision}=await import('../src/lib/publishing');
  const page=await db.cmsPage.create({data:{slug:'integration-'+randomUUID(),title:'Original title',body:'Original body',status:'published'}});
  try {
   const original=await db.cmsRevision.create({data:{pageId:page.id,title:page.title,body:page.body,status:'published',actorId:actor.id}});
   const draft=await db.cmsRevision.create({data:{pageId:page.id,title:'Updated title',body:'Updated body',status:'draft',actorId:actor.id}});
   await publishRevision({revisionId:draft.id,reason:'Integration publication'});
   expect((await db.cmsPage.findUniqueOrThrow({where:{id:page.id}})).title).toBe('Updated title');
   await publishRevision({revisionId:original.id,reason:'Integration rollback'});
   expect((await db.cmsPage.findUniqueOrThrow({where:{id:page.id}})).body).toBe('Original body');
   expect(await db.cmsRevision.count({where:{pageId:page.id}})).toBe(4);
  } finally {await db.cmsRevision.deleteMany({where:{pageId:page.id}});await db.cmsPage.delete({where:{id:page.id}});}
 });
});

describe.skipIf(!enabled)('PostgreSQL append-only audit',()=>{
 it('rejects updates and deletions at the database layer',async()=>{
  const record=await db.auditLog.create({data:{actorId:'integration-test',role:'owner',action:'verify-immutability',entity:'test',entityId:randomUUID(),summary:{synthetic:true},correlationId:randomUUID()}});
  await expect(db.auditLog.update({where:{id:record.id},data:{action:'tampered'}})).rejects.toThrow();
  await expect(db.auditLog.delete({where:{id:record.id}})).rejects.toThrow();
  expect((await db.auditLog.findUniqueOrThrow({where:{id:record.id}})).action).toBe('verify-immutability');
 });
});

describe.skipIf(!enabled)('Administration category and delivery workflows',()=>{
 it('creates and edits categories with audit history',async()=>{
  const {adminWrite}=await import('../src/lib/admin');
  const slug='test-'+randomUUID();let id:string|undefined;
  try {
   const result=await adminWrite('categories',{name:'Test collection',slug,image:'/images/kitchen-walnut-v2.webp',reason:'Verify category creation'});
   id=(result.record as {id:string}).id;
   await adminWrite('categories',{id,name:'Updated collection',slug,image:'/images/kitchen-ivory-v2.webp',reason:'Verify category editing'});
   expect((await db.category.findUniqueOrThrow({where:{id}})).name).toBe('Updated collection');
   expect(await db.auditLog.count({where:{entity:'categories',entityId:id}})).toBe(2);
  } finally {if(id)await db.category.delete({where:{id}});}
 });
 it('requires confirmation and refuses retry of already sent notifications',async()=>{
  const {adminWrite}=await import('../src/lib/admin');
  const message=await db.notification.create({data:{recipient:'retry@integration.invalid',subject:'Test retry',body:'Synthetic test',status:'delivery_unknown',attempts:5}});
  try {
   await expect(adminWrite('notifications',{id:message.id,action:'retry',reason:'Verify retry guard'})).rejects.toThrow();
   await adminWrite('notifications',{id:message.id,action:'retry',confirmed:'yes',reason:'Mailbox checked; retry approved'});
   expect(await db.notification.findUniqueOrThrow({where:{id:message.id}})).toMatchObject({status:'queued',attempts:0});
   await db.notification.update({where:{id:message.id},data:{status:'sent'}});
   await expect(adminWrite('notifications',{id:message.id,action:'retry',confirmed:'yes',reason:'Invalid duplicate retry'})).rejects.toMatchObject({status:409});
  } finally {await db.notification.delete({where:{id:message.id}});}
 });
});

describe.skipIf(!enabled)('Release operations',()=>{
 it('issues immutable numbered invoices only with approved seller configuration and never records payment',async()=>{
  const {invoiceCommand}=await import('../src/lib/release-operations');const variant=await db.variant.findFirstOrThrow();
  const quote=await db.quote.create({data:{name:'Test buyer',email:'invoice@integration.invalid',notes:'Synthetic quote',status:'accepted',estimate:1000,items:[{variantId:variant.id,sku:variant.sku,name:'Quoted unit',quantity:1}]}});
  const previous=await db.setting.findUnique({where:{key:'invoiceIssuer'}});let orderId='';
  try{
   const converted=await convertQuote({id:quote.id,reason:'Invoice verification',amount:1000,currency:'GHS',address:'Synthetic test only, Accra',confirmCustomer:true});orderId=converted.record.id;
   const draft=await invoiceCommand({action:'draft',id:orderId,reason:'Verify draft'});await db.setting.deleteMany({where:{key:'invoiceIssuer'}});
   await expect(invoiceCommand({action:'issue',confirmation:'yes',id:draft.record.id,reason:'Missing approved details'})).rejects.toMatchObject({status:409});
   await db.setting.create({data:{key:'invoiceIssuer',value:{approved:true,approvedBy:'synthetic-test',legalName:'Synthetic test issuer',address:'Synthetic address',contact:'test@integration.invalid',taxTreatment:'Synthetic test only'}}});
   const issued=await invoiceCommand({action:'issue',confirmation:'yes',id:draft.record.id,reason:'Approved synthetic test'});expect(issued.record.number).toMatch(/^ST-\d{4}-\d{6}$/);
   expect((await invoiceCommand({action:'issue',confirmation:'yes',id:draft.record.id,reason:'Verify idempotency'})).record.number).toBe(issued.record.number);
   expect(await db.payment.count({where:{orderId}})).toBe(0);expect((await db.order.findUniqueOrThrow({where:{id:orderId}})).status).toBe('confirmed');
  }finally{await db.setting.deleteMany({where:{key:'invoiceIssuer'}});if(previous)await db.setting.create({data:{key:previous.key,value:previous.value!}});if(orderId){await db.invoice.deleteMany({where:{orderId}});await db.orderEvent.deleteMany({where:{orderId}});await db.orderItem.deleteMany({where:{orderId}});await db.order.delete({where:{id:orderId}});}await db.enquiryEvent.deleteMany({where:{quoteId:quote.id}});await db.quote.delete({where:{id:quote.id}});}
 });
 it('blocks privacy execution without policy, then erases eligible account data after owner review',async()=>{
  const {privacyCommand}=await import('../src/lib/release-operations');const id=randomUUID(),email=id+'@integration.invalid';
  const previous=await db.setting.findUnique({where:{key:'privacyRetention'}});await db.user.create({data:{id,email,name:'Synthetic privacy customer',emailVerified:true}});
  const request=await db.privacyRequest.create({data:{userId:id}});
  try{
   await db.setting.deleteMany({where:{key:'privacyRetention'}});await privacyCommand({id:request.id,action:'review',reason:'Verified synthetic request'});
   await expect(privacyCommand({id:request.id,action:'execute',confirmation:'ERASE',reason:'Missing policy'})).rejects.toMatchObject({status:409});
   await db.setting.create({data:{key:'privacyRetention',value:{approved:true,approvedBy:'synthetic-test',version:'test-only',nonCommercialErasure:true}}});
   await privacyCommand({id:request.id,action:'execute',confirmation:'ERASE',reason:'Approved synthetic erasure'});
   expect(await db.user.findUnique({where:{id}})).toBeNull();expect((await db.privacyRequest.findUniqueOrThrow({where:{id:request.id}})).status).toBe('completed');
  }finally{await db.privacyRequest.delete({where:{id:request.id}});await db.user.deleteMany({where:{id}});await db.setting.deleteMany({where:{key:'privacyRetention'}});if(previous)await db.setting.create({data:{key:previous.key,value:previous.value!}});}
 });
});

describe.skipIf(!enabled)('Concurrent inventory operations',()=>{
 it('allows only one decrement of the final unit',async()=>{
  const {adminWrite}=await import('../src/lib/admin');const product=await db.product.findFirstOrThrow();const variant=await db.variant.create({data:{productId:product.id,sku:'SYNTHETIC-'+randomUUID(),name:'Synthetic stock fixture',color:'#153c30',stock:1}});
  try{
   const input={id:variant.id,delta:-1,verified:false,sku:variant.sku,name:variant.name,reason:'Synthetic concurrent decrement'};
   const results=await Promise.allSettled([adminWrite('inventory',input),adminWrite('inventory',input)]);
   expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect((await db.variant.findUniqueOrThrow({where:{id:variant.id}})).stock).toBe(0);
   expect(await db.stockMovement.count({where:{variantId:variant.id}})).toBe(1);
  }finally{await db.stockMovement.deleteMany({where:{variantId:variant.id}});await db.variant.delete({where:{id:variant.id}});}
 });
 it('releases a cancelled reservation immediately and only once',async()=>{
  const {adminWrite}=await import('../src/lib/admin');const product=await db.product.findFirstOrThrow();
  const variant=await db.variant.create({data:{productId:product.id,sku:'RESERVE-'+randomUUID(),name:'Synthetic reserved unit',color:'#153c30',stock:0}});
  const order=await db.order.create({data:{name:'Synthetic cancellation',email:'cancel@integration.invalid',address:{},accessHash:randomUUID(),status:'awaiting_confirmation',subtotal:1000,tax:0,shipping:0,total:1000,reservations:{create:{variantId:variant.id,quantity:1,expiresAt:new Date(Date.now()+3600000)}}}});
  try{
   await adminWrite('orders',{id:order.id,version:1,status:'cancelled',reason:'Synthetic immediate release'});await adminWrite('orders',{id:order.id,version:2,status:'cancelled',reason:'Synthetic duplicate command'});
   expect((await db.variant.findUniqueOrThrow({where:{id:variant.id}})).stock).toBe(1);expect(await db.stockMovement.count({where:{variantId:variant.id}})).toBe(1);
  }finally{await db.reservation.deleteMany({where:{orderId:order.id}});await db.orderEvent.deleteMany({where:{orderId:order.id}});await db.order.delete({where:{id:order.id}});await db.stockMovement.deleteMany({where:{variantId:variant.id}});await db.variant.delete({where:{id:variant.id}});await db.notification.deleteMany({where:{recipient:'cancel@integration.invalid'}});}
 });

});

describe.skipIf(!enabled)('Scheduled publication',()=>{
 it('publishes without mandatory MFA, records audit once and rejects a suspended approver',async()=>{
  const {schedulePublication,runSchedules}=await import('../src/lib/scheduling');const prior={...actor},id=randomUUID(),template=await db.product.findFirstOrThrow();const products:string[]=[],schedules:string[]=[];
  await db.user.create({data:{id,email:id+'@integration.invalid',name:'Synthetic scheduled publisher',role:'catalogue',emailVerified:true}});
  actor.id=id;actor.role='catalogue';
  try{
   for(let n=0;n<2;n++){
    const product=await db.product.create({data:{slug:'scheduled-'+randomUUID(),name:'Synthetic scheduled fixture',description:'Synthetic test content',categoryId:template.categoryId,style:'Modern',material:'Wood',image:template.image,gallery:[template.image],status:'draft',illustrative:true}});products.push(product.id);
    const result=await schedulePublication({target:'product',targetId:product.id,publishAt:new Date(Date.now()+60000).toISOString(),reason:'Synthetic publication verification'});schedules.push(result.record.id);
    await db.publicationSchedule.update({where:{id:result.record.id},data:{publishAt:new Date(Date.now()-1000)}});
    if(n===1)await db.user.update({where:{id},data:{suspended:true}});
    await runSchedules();await runSchedules();
    expect((await db.product.findUniqueOrThrow({where:{id:product.id}})).status).toBe(n===0?'published':'draft');
    expect((await db.publicationSchedule.findUniqueOrThrow({where:{id:result.record.id}})).status).toBe(n===0?'published':'failed');
    expect(await db.auditLog.count({where:{entityId:product.id,action:n===0?'scheduled-publication':'scheduled-publication-failed'}})).toBe(1);
   }
  }finally{Object.assign(actor,prior);await db.publicationSchedule.deleteMany({where:{id:{in:schedules}}});await db.product.deleteMany({where:{id:{in:products}}});await db.user.delete({where:{id}});}
 });
});

describe.skipIf(!enabled)('Commercial privacy retention',()=>{
 it('requires order-specific approval and preserves financial records while redacting eligible identity',async()=>{
  const {privacyCommand}=await import('../src/lib/release-operations');const id=randomUUID(),email=id+'@integration.invalid',previous=await db.setting.findUnique({where:{key:'privacyRetention'}});let orderId='';
  await db.user.create({data:{id,email,name:'Synthetic retained customer',emailVerified:true}});const request=await db.privacyRequest.create({data:{userId:id}});
  try{
   const order=await db.order.create({data:{userId:id,name:'Synthetic retained customer',email,address:{line1:'Private synthetic address'},accessHash:randomUUID(),status:'delivered',subtotal:1000,tax:0,shipping:0,total:1000}});orderId=order.id;
   await db.invoice.create({data:{orderId,status:'issued',actorId:'synthetic',snapshot:{customer:{name:'Synthetic retained customer',email,address:{line1:'Private synthetic address'}},total:1000,items:[]}}});
   await db.setting.upsert({where:{key:'privacyRetention'},create:{key:'privacyRetention',value:{approved:true,approvedBy:'synthetic',version:'test-only',nonCommercialErasure:true}},update:{value:{approved:true,approvedBy:'synthetic',version:'test-only',nonCommercialErasure:true}}});
   await privacyCommand({id:request.id,action:'review',reason:'Synthetic retention review'});
   await expect(privacyCommand({id:request.id,action:'execute',confirmation:'ERASE',reason:'Missing record eligibility'})).rejects.toMatchObject({status:409});
   await db.setting.update({where:{key:'privacyRetention'},data:{value:{approved:true,approvedBy:'synthetic',version:'test-only',nonCommercialErasure:true,approvedCommercialOrderIds:[orderId]}}});
   await privacyCommand({id:request.id,action:'execute',confirmation:'ERASE',reason:'Order-specific synthetic legal approval'});
   const retained=await db.order.findUniqueOrThrow({where:{id:orderId}});expect(retained.total).toBe(1000);expect(retained.email).toBe('erased@privacy.invalid');expect(retained.address).toEqual({});expect(await db.user.findUnique({where:{id}})).toBeNull();
  }finally{await db.privacyRequest.delete({where:{id:request.id}});if(orderId){await db.invoice.deleteMany({where:{orderId}});await db.order.delete({where:{id:orderId}});}await db.user.deleteMany({where:{id}});await db.setting.deleteMany({where:{key:'privacyRetention'}});if(previous)await db.setting.create({data:{key:previous.key,value:previous.value!}});}
 });
 it('rejects stale catalogue and CMS writes instead of losing newer edits',async()=>{
  const {adminWrite}=await import('../src/lib/admin');const template=await db.product.findFirstOrThrow();
  const product=await db.product.create({data:{slug:'conflict-'+randomUUID(),name:'Synthetic conflict fixture',description:'Synthetic test',categoryId:template.categoryId,style:'Modern',material:'Wood',image:template.image,gallery:[template.image]}});
  const page=await db.cmsPage.create({data:{slug:'conflict-'+randomUUID(),title:'Synthetic title',body:'Synthetic content',status:'draft'}});
  try{
   const payload={id:product.id,expectedUpdatedAt:product.updatedAt.toISOString(),name:product.name,slug:product.slug,description:product.description,categoryId:product.categoryId,style:product.style,material:product.material,image:product.image,gallery:product.gallery,status:'draft',illustrative:true,reason:'Synthetic concurrency verification'};
   const results=await Promise.allSettled([adminWrite('products',{...payload,name:'First edit'}),adminWrite('products',{...payload,name:'Second edit'})]);
   expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
   const cms={id:page.id,expectedUpdatedAt:page.updatedAt.toISOString(),slug:page.slug,title:page.title,body:page.body,status:'draft',reason:'Synthetic CMS conflict check'};
   await adminWrite('cms',{...cms,title:'Newer synthetic title'});await expect(adminWrite('cms',cms)).rejects.toMatchObject({status:409});
  }finally{await db.product.delete({where:{id:product.id}});await db.cmsRevision.deleteMany({where:{pageId:page.id}});await db.cmsPage.delete({where:{id:page.id}});}
 });

 it('blocks media approval and rollback when scanner readiness fails',async()=>{
  const scan=await import('../src/lib/media-scan');const {adminWrite}=await import('../src/lib/admin');const {rollbackMedia}=await import('../src/lib/publishing');
  const asset=await db.mediaAsset.create({data:{key:'synthetic/'+randomUUID(),outputKey:'synthetic/output',name:'Synthetic scan guard fixture',alt:'Synthetic verification only',mime:'image/png',size:1,status:'ready',metadata:{scanned:true}}});
  const guard=vi.spyOn(scan,'scannerReadiness');
  try{
   guard.mockRejectedValueOnce(Error('Synthetic scanner unavailable'));
   await expect(adminWrite('media',{id:asset.id,status:'approved',placement:'brand',alt:asset.alt,reason:'Synthetic fail-closed verification'})).rejects.toThrow('Synthetic scanner unavailable');
   expect((await db.mediaAsset.findUniqueOrThrow({where:{id:asset.id}})).status).toBe('ready');expect(await db.mediaPublication.count({where:{assetId:asset.id}})).toBe(0);
   guard.mockRejectedValueOnce(Error('Synthetic scanner unavailable'));
   await expect(rollbackMedia({publicationId:'not-a-version',reason:'Synthetic unavailable scanner'})).rejects.toThrow('Synthetic scanner unavailable');expect(guard).toHaveBeenCalledTimes(2);
  }finally{guard.mockRestore();await db.mediaAsset.delete({where:{id:asset.id}});}
 });

});
