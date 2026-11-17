import {afterAll,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
import {allowed,defaultScene} from '../src/lib/domain';
const actor=vi.hoisted(()=>({id:'showroom-test-owner',role:'owner'}));
vi.mock('../src/lib/security',async original=>{const originalModule=await original<typeof import('../src/lib/security')>();return {...originalModule,user:vi.fn(async()=>null),staff:vi.fn(async(resource:string)=>{if(!allowed(actor.role,resource))throw new originalModule.HttpError(403,'Denied');return actor;})};});
const {createManualEnquiry,createEnquiry,updateEnquiry,convertEnquiry,updateOrder,recordReceipt,shareTracking,lookupTracking,trackingCommand,recoverTracking,showroomRead,customerCommand}=await import('../src/lib/showroom');
const {decryptTracking}=await import('../src/lib/order-tracking');
const enabled=process.env.RUN_DATABASE_TESTS==='true';
if(enabled&&new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw new Error('Isolated sterlyn_test database required');
process.env.TRACKING_ENCRYPTION_KEY='22'.repeat(32);process.env.BETTER_AUTH_URL='http://localhost:3002';
const emails:string[]=[],quotes:string[]=[];
describe.skipIf(!enabled)('showroom PostgreSQL workflow',()=>{
 afterAll(async()=>{if(!enabled)return;const orders=await db.order.findMany({where:{sourceQuoteId:{in:quotes}},select:{id:true}}),ids=orders.map(order=>order.id);await db.notification.deleteMany({where:{recipient:{in:emails}}});await db.payment.deleteMany({where:{orderId:{in:ids},reversalOf:{not:null}}});await db.payment.deleteMany({where:{orderId:{in:ids}}});await db.orderEvent.deleteMany({where:{orderId:{in:ids}}});await db.orderItem.deleteMany({where:{orderId:{in:ids}}});await db.order.deleteMany({where:{id:{in:ids}}});await db.enquiryEvent.deleteMany({where:{quoteId:{in:quotes}}});await db.quote.deleteMany({where:{id:{in:quotes}}});await db.customer.deleteMany({where:{email:{in:emails}}});await db.$disconnect();});
 it('saves canonical selections once under concurrent retries before generating WhatsApp text',async()=>{
  const email=randomUUID()+'@showroom.invalid';emails.push(email);const product=await db.product.findFirstOrThrow({where:{status:'published'}});
  const input={requestKey:randomUUID(),name:'Guest customer',email,items:[{type:'product',slug:product.slug,name:'FORGED NAME',quantity:2,finish:'Requested finish'},{type:'inspiration',slug:'the-emerald-room',quantity:1}],scene:defaultScene,notes:'Test project requirements'};
  const [a,b]=await Promise.all([createEnquiry(input),createEnquiry(input)]);quotes.push(a.id);expect(a.id).toBe(b.id);expect(a.reference).toMatch(/^SQ-\d{6,}$/);expect(a.whatsappUrl).toContain('447576899618');expect(decodeURIComponent(a.whatsappUrl)).toContain(a.reference);expect(decodeURIComponent(a.whatsappUrl)).toContain(product.name);expect(decodeURIComponent(a.whatsappUrl)).not.toContain('FORGED NAME');expect(await db.quote.count({where:{requestKey:input.requestKey}})).toBe(1);expect((await db.quote.findUniqueOrThrow({where:{id:a.id}})).customerId).toBeNull();await expect(createEnquiry({...input,notes:'Changed request'})).rejects.toMatchObject({status:409});
 });
 it('records private WhatsApp requests once and tracks phone-only orders without inventing emails',async()=>{
  actor.role='owner';const input={requestKey:randomUUID(),name:'Private WhatsApp customer',phone:'+233200000001',description:'Bespoke walnut kitchen',quantity:2,source:'Direct WhatsApp'};
  const [a,b]=await Promise.all([createManualEnquiry(input),createManualEnquiry(input)]);quotes.push(a.enquiry.id);expect(a.enquiry.id).toBe(b.enquiry.id);
  await expect(createManualEnquiry({...input,description:'Different request'})).rejects.toMatchObject({status:409});
  const quote=await db.quote.findUniqueOrThrow({where:{id:a.enquiry.id},include:{history:true}});expect(quote.email).toBe('');expect(quote.assignedTo).toBe(actor.id);expect(quote.history[0].note).toContain('Direct WhatsApp');
  const result=await convertEnquiry({id:quote.id,amount:10000,address:'Agreed delivery address',confirmAgreement:true,confirmCustomer:true});
  const order=await db.order.findUniqueOrThrow({where:{id:result.record.id},include:{items:true}});expect(order.email).toBe('');expect(order.customerId).toBeNull();expect(order.items[0]).toMatchObject({kind:'custom',name:input.description,quantity:2,price:null});expect(result.message).toContain('No email was queued');
  expect(await db.notification.count({where:{dedupeKey:{startsWith:'order:'+order.id+':'}}})).toBe(0);
  const token=decryptTracking(order.trackingCipher!);expect((await lookupTracking({token})).status).toBe('confirmed');
  await updateOrder({id:order.id,version:order.version,status:'processing'});expect((await lookupTracking({token})).status).toBe('processing');
  expect(await db.notification.count({where:{recipient:''}})).toBe(0);
  await expect(createManualEnquiry({...input,requestKey:randomUUID(),phone:'0200000000'})).rejects.toThrow();
  actor.role='fulfillment';await expect(createManualEnquiry({...input,requestKey:randomUUID()})).rejects.toMatchObject({status:403});actor.role='owner';
 });
 it('can record a reviewed email when confirming a phone-only request',async()=>{
  const email=randomUUID()+'@showroom.invalid';emails.push(email);
  const saved=await createManualEnquiry({requestKey:randomUUID(),name:'WhatsApp email supplied later',phone:'+233200000002',description:'Custom pantry'});quotes.push(saved.enquiry.id);
  const result=await convertEnquiry({id:saved.enquiry.id,email,amount:10000,address:'Reviewed address',confirmAgreement:true,confirmCustomer:true});
  expect(await db.order.findUniqueOrThrow({where:{id:result.record.id}})).toMatchObject({email});expect(await db.notification.count({where:{recipient:email}})).toBe(1);
 });
 it('rejects missing customer data and unavailable items',async()=>{await expect(createEnquiry({requestKey:randomUUID(),name:'',email:'',items:[]})).rejects.toThrow();await expect(createEnquiry({requestKey:randomUUID(),name:'Guest',email:'guest@example.test',items:[{type:'product',slug:'not-a-real-product',quantity:1}]})).rejects.toMatchObject({status:422});});
 it('converts once, preserves snapshots, queues one email and supports safe lifecycle/receipts/tracking',async()=>{
  const quote=await db.quote.findUniqueOrThrow({where:{id:quotes[0]}});
  await expect(convertEnquiry({id:quote.id,amount:10000,currency:'GHS',address:'Reviewed delivery address',confirmCustomer:true,reason:'Agreement checked'})).rejects.toMatchObject({status:409});
  await updateEnquiry({id:quote.id,version:quote.version,status:'agreed',reason:'WhatsApp agreement reviewed'});
  const input={id:quote.id,amount:10000,currency:'GHS',address:'Reviewed delivery address',confirmCustomer:true,reason:'Customer identity and agreement verified'};
  const [a,b]=await Promise.all([convertEnquiry(input),convertEnquiry(input)]);expect(a.record.id).toBe(b.record.id);
  let order=await db.order.findUniqueOrThrow({where:{id:a.record.id},include:{items:true}});expect(order.reference).toMatch(/^SSL-\d{6,}$/);expect(order.items).toHaveLength(3);expect(order.items.find(item=>item.kind==='inspiration')?.variantId).toBeNull();expect(order.items.every(item=>item.price===null)).toBe(true);
  expect(await db.payment.count({where:{orderId:order.id}})).toBe(0);expect(await db.notification.count({where:{recipient:quote.email}})).toBe(1);
  const token=decryptTracking(order.trackingCipher!);expect((await shareTracking(new URLSearchParams({id:order.id}))).url).toContain('/track#'+token);const safe=await lookupTracking({token});expect(safe.reference).toBe(order.reference);for(const field of ['email','phone','total','payments','address','notes','actorId'])expect(JSON.stringify(safe)).not.toContain('"'+field+'"');
  await expect(lookupTracking({token:'aa'.repeat(32)})).rejects.toMatchObject({status:404});
  await expect(updateOrder({id:order.id,version:order.version,status:'completed',reason:'Invalid skipped delivery'})).rejects.toMatchObject({status:409});
  await updateOrder({id:order.id,version:order.version,status:'confirmed',reason:'Same status save'});expect(await db.orderEvent.count({where:{orderId:order.id}})).toBe(1);expect(await db.notification.count({where:{recipient:quote.email}})).toBe(1);expect(JSON.stringify((await showroomRead('orders',new URLSearchParams({record:order.id}))).rows?.[0])).toContain('Same status save');
  order=await db.order.findUniqueOrThrow({where:{id:order.id},include:{items:true}});
  const attempts=await Promise.allSettled([updateOrder({id:order.id,version:order.version,status:'processing',reason:'Begin preparation',publicNote:'Your order is being prepared.'}),updateOrder({id:order.id,version:order.version,status:'processing',reason:'Concurrent duplicate'})]);expect(attempts.filter(attempt=>attempt.status==='fulfilled')).toHaveLength(1);expect(await db.orderEvent.count({where:{orderId:order.id}})).toBe(2);expect(await db.notification.count({where:{recipient:quote.email}})).toBe(2);
  actor.role='sales';await expect(recordReceipt({id:order.id})).rejects.toMatchObject({status:403});actor.role='owner';
  const receipt={id:order.id,requestKey:randomUUID(),action:'confirm',amount:4000,currency:'GHS',confirmedAt:new Date(Date.now()-1000).toISOString(),method:'Bank transfer'};
  await Promise.all([recordReceipt(receipt),recordReceipt(receipt)]);expect(await db.payment.count({where:{orderId:order.id}})).toBe(1);const read=await showroomRead('orders',new URLSearchParams({record:order.id}));expect(read.rows?.[0]).toMatchObject({receiptSummary:{status:'partially_paid',balance:6000}});
  await db.order.update({where:{id:order.id},data:{assignedTo:actor.id}});actor.role='fulfillment';const fulfillment=await showroomRead('orders',new URLSearchParams({record:order.id}));expect(JSON.stringify(fulfillment)).not.toContain('receiptSummary');expect(fulfillment.rows?.[0]).not.toHaveProperty('total');actor.role='owner';
  const payment=await db.payment.findFirstOrThrow({where:{orderId:order.id}});await expect(recordReceipt({id:order.id,requestKey:randomUUID(),action:'reverse',paymentId:payment.id})).rejects.toThrow();await recordReceipt({id:order.id,requestKey:randomUUID(),action:'reverse',paymentId:payment.id,reason:'Receipt belonged to a different agreement'});expect(await db.payment.count({where:{orderId:order.id}})).toBe(2);
  const recovery={reference:order.reference,email:quote.email};await Promise.all([recoverTracking(recovery),recoverTracking(recovery)]);expect(await db.notification.count({where:{dedupeKey:{startsWith:'recovery:'+order.id}}})).toBe(1);expect(await recoverTracking({...recovery,email:'other@example.test'})).toEqual(await recoverTracking(recovery));
  let current=await db.order.findUniqueOrThrow({where:{id:order.id}});await trackingCommand({id:order.id,version:current.version,action:'revoke',reason:'Customer requested a new private link'});await expect(lookupTracking({token})).rejects.toMatchObject({status:404});current=await db.order.findUniqueOrThrow({where:{id:order.id}});await trackingCommand({id:order.id,version:current.version,action:'regenerate',reason:'Identity verified for replacement'});await expect(lookupTracking({token})).rejects.toMatchObject({status:404});current=await db.order.findUniqueOrThrow({where:{id:order.id}});await db.order.update({where:{id:order.id},data:{trackingExpiresAt:new Date(Date.now()-1000)}});await expect(lookupTracking({token:decryptTracking(current.trackingCipher!)})).rejects.toMatchObject({status:404});
 });
 it('keeps reviewed customer details when staff matches a later guest enquiry',async()=>{
  actor.role='owner';const customer=await db.customer.findUniqueOrThrow({where:{email:emails[0]}});await db.customer.update({where:{id:customer.id},data:{notes:'Preserve existing reviewed notes',phone:'+233200000000'}});
  const enquiry=await createEnquiry({requestKey:randomUUID(),name:'Later guest name',email:emails[0],items:[]});quotes.push(enquiry.id);expect((await db.quote.findUniqueOrThrow({where:{id:enquiry.id}})).customerId).toBeNull();
  await customerCommand({quoteId:enquiry.id,version:1,name:'Later guest name',email:emails[0],phone:'',confirm:true,reason:'Staff verified the existing customer identity'});
  expect(await db.customer.findUniqueOrThrow({where:{id:customer.id}})).toMatchObject({name:customer.name,notes:'Preserve existing reviewed notes',phone:'+233200000000'});expect((await db.quote.findUniqueOrThrow({where:{id:enquiry.id}})).customerId).toBe(customer.id);
 });

 it('confirms directly without routine notes and limits staff to their assigned work',async()=>{
  actor.role='owner';const ownerId=actor.id;
  const product=await db.product.findFirstOrThrow({where:{status:'published'}});
  const member=await db.user.create({data:{id:randomUUID(),name:'Assigned colleague',email:randomUUID()+'@staff-scope.invalid',role:'sales',emailVerified:true}});
  try{
   const email=randomUUID()+'@showroom.invalid';emails.push(email);
   const enquiry=await createEnquiry({requestKey:randomUUID(),name:'Direct agreement',email,items:[{type:'product',slug:product.slug,quantity:1}]});quotes.push(enquiry.id);
   await updateEnquiry({id:enquiry.id,version:1,status:'new',assignedTo:member.id});
   const command={id:enquiry.id,amount:10000,address:'Agreed address, Accra',confirmAgreement:true,confirmCustomer:true};
   const result=await convertEnquiry(command);expect(result.trackingUrl).toContain('/track#');
   expect(await db.notification.count({where:{recipient:email}})).toBe(1);
   const order=await db.order.findUniqueOrThrow({where:{sourceQuoteId:enquiry.id}});expect(order.assignedTo).toBe(member.id);
   actor.id=member.id;actor.role='sales';
   const work=await showroomRead('orders',new URLSearchParams());expect(work.rows?.map(row=>row.id)).toEqual([order.id]);
   await updateOrder({id:order.id,version:order.version,status:'processing'});
   expect(await db.orderEvent.findFirstOrThrow({where:{orderId:order.id,status:'processing'}})).toMatchObject({actorId:member.id,note:'Order moved from Confirmed to Processing.'});
   const other=await db.order.findFirstOrThrow({where:{id:{not:order.id}}});
   expect((await showroomRead('orders',new URLSearchParams({record:other.id}))).rows).toEqual([]);
   await expect(updateOrder({id:other.id,version:other.version,status:'processing'})).rejects.toMatchObject({status:403});
   const current=await db.order.findUniqueOrThrow({where:{id:order.id}});
   await expect(updateOrder({id:order.id,version:current.version,status:'ready_for_delivery',assignedTo:''})).rejects.toMatchObject({status:403});
  }finally{actor.id=ownerId;actor.role='owner';await db.user.delete({where:{id:member.id}});}
 });


 it('edits enquiry products safely while preserving authorization, versions and orders',async()=>{
  actor.role='owner';
  const email=randomUUID()+'@showroom.invalid';
  emails.push(email);

  const created=await createEnquiry({
   requestKey:randomUUID(),
   name:'Enquiry editing customer',
   email,
   items:[]
  });
  quotes.push(created.id);

  const initial=await db.quote.findUniqueOrThrow({where:{id:created.id}});

  await updateEnquiry({
   id:created.id,
   version:initial.version,
   status:'new',
   itemChanges:{adds:[{
    name:'Custom fitted cabinet',
    quantity:2,
    finish:'Walnut'
   }]}
  });

  let current=await db.quote.findUniqueOrThrow({where:{id:created.id}});
  expect(current.items).toMatchObject([{
   type:'custom',
   name:'Custom fitted cabinet',
   quantity:2,
   finish:'Walnut'
  }]);

  await expect(updateEnquiry({
   id:created.id,
   version:initial.version,
   status:'new',
   itemChanges:{adds:[{name:'Stale addition',quantity:1}]}
  })).rejects.toMatchObject({status:409});

  await expect(updateEnquiry({
   id:created.id,
   version:current.version,
   status:'new',
   itemChanges:{edits:[
    {index:0,name:'Duplicate A',quantity:1},
    {index:0,name:'Duplicate B',quantity:1}
   ]}
  })).rejects.toThrow();

  await expect(updateEnquiry({
   id:created.id,
   version:current.version,
   status:'new',
   itemChanges:{adds:[{
    name:'Invalid quantity',
    quantity:0
   }]}
  })).rejects.toThrow();

  await expect(updateEnquiry({
   id:created.id,
   version:current.version,
   status:'new',
   itemChanges:{adds:Array.from({length:40},(_,i)=>({
    name:'Extra '+i,
    quantity:1
   }))}
  })).rejects.toMatchObject({status:400});

  await db.quote.update({
   where:{id:created.id},
   data:{assignedTo:actor.id}
  });

  try{
   actor.role='sales';

   await expect(updateEnquiry({
    id:created.id,
    version:current.version,
    status:'contacted',
    itemChanges:{removes:[0]}
   })).rejects.toMatchObject({status:403});

   await updateEnquiry({
    id:created.id,
    version:current.version,
    status:'contacted',
    staffNotes:'Contacted customer'
   });
  }finally{
   actor.role='owner';
  }

  current=await db.quote.findUniqueOrThrow({where:{id:created.id}});

  await updateEnquiry({
   id:created.id,
   version:current.version,
   status:'contacted',
   itemChanges:{edits:[{
    index:0,
    name:'Revised fitted cabinet',
    quantity:3,
    finish:'Oak'
   }]}
  });

  current=await db.quote.findUniqueOrThrow({where:{id:created.id}});
  expect(current.items).toMatchObject([{
   name:'Revised fitted cabinet',
   quantity:3,
   finish:'Oak'
  }]);

  await updateEnquiry({
   id:created.id,
   version:current.version,
   status:'contacted',
   itemChanges:{
    removes:[0],
    adds:[{name:'Replacement cabinet',quantity:1}]
   }
  });

  current=await db.quote.findUniqueOrThrow({where:{id:created.id}});
  expect(current.items).toMatchObject([{
   type:'custom',
   name:'Replacement cabinet',
   quantity:1
  }]);

  const audit=await db.auditLog.findFirst({
   where:{
    entity:'quotes',
    entityId:created.id,
    action:'enquiry-updated'
   },
   orderBy:{createdAt:'desc'}
  });
  expect(audit).not.toBeNull();
  expect(await db.enquiryEvent.count({
   where:{quoteId:created.id}
  })).toBeGreaterThan(2);

  const confirmed=await convertEnquiry({
   id:created.id,
   amount:10000,
   address:'Agreed address in Accra',
   confirmAgreement:true,
   confirmCustomer:true
  });

  const order=await db.order.findUniqueOrThrow({
   where:{id:confirmed.record.id},
   include:{items:true}
  });
  expect(order.items[0]).toMatchObject({
   name:'Replacement cabinet',
   quantity:1
  });

  current=await db.quote.findUniqueOrThrow({where:{id:created.id}});

  await expect(updateEnquiry({
   id:created.id,
   version:current.version,
   status:'converted',
   itemChanges:{removes:[0]}
  })).rejects.toMatchObject({status:409});

  expect((await db.order.findUniqueOrThrow({
   where:{id:order.id},
   include:{items:true}
  })).items[0].name).toBe('Replacement cabinet');
 });

 it('preserves catalogue metadata and inspiration when editing a product line',async()=>{
  actor.role='owner';
  const email=randomUUID()+'@showroom.invalid';
  emails.push(email);

  const product=await db.product.findFirstOrThrow({
   where:{status:'published'}
  });

  const created=await createEnquiry({
   requestKey:randomUUID(),
   name:'Quotation product customer',
   email,
   items:[
    {type:'product',slug:product.slug,quantity:1},
    {type:'inspiration',slug:'the-emerald-room',quantity:1}
   ]
  });
  quotes.push(created.id);

  let current=await db.quote.findUniqueOrThrow({
   where:{id:created.id}
  });
  const before=current.items as unknown as Record<string,unknown>[];

  await updateEnquiry({
   id:created.id,
   version:current.version,
   status:'new',
   itemChanges:{edits:[{
    index:0,
    name:'Customer requested variation',
    quantity:4,
    finish:'Matt'
   }]}
  });

  current=await db.quote.findUniqueOrThrow({where:{id:created.id}});
  const after=current.items as unknown as Record<string,unknown>[];

  expect(after[0]).toMatchObject({
   name:'Customer requested variation',
   quantity:4,
   finish:'Matt',
   type:'product',
   slug:before[0].slug,
   image:before[0].image
  });
  expect(after[0].variantId).toBe(before[0].variantId);
  expect(after[0].sku).toBe(before[0].sku);
  expect(after[1]).toEqual(before[1]);

  await expect(updateEnquiry({
   id:created.id,
   version:current.version,
   status:'new',
   itemChanges:{removes:[1]}
  })).rejects.toMatchObject({status:400});

  await updateEnquiry({
   id:created.id,
   version:current.version,
   status:'new',
   itemChanges:{removes:[0]}
  });

  const result=await db.quote.findUniqueOrThrow({where:{id:created.id}});
  expect(result.items).toEqual([before[1]]);
 });

});
