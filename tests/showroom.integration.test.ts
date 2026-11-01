import {afterAll,describe,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
import {allowed,defaultScene} from '../src/lib/domain';
const actor=vi.hoisted(()=>({id:'showroom-test-owner',role:'owner'}));
vi.mock('../src/lib/security',async original=>{const originalModule=await original<typeof import('../src/lib/security')>();return {...originalModule,user:vi.fn(async()=>null),staff:vi.fn(async(resource:string)=>{if(!allowed(actor.role,resource))throw new originalModule.HttpError(403,'Denied');return actor;})};});
const {createEnquiry,updateEnquiry,convertEnquiry,updateOrder,recordReceipt,lookupTracking,trackingCommand,recoverTracking,showroomRead,customerCommand}=await import('../src/lib/showroom');
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
 it('rejects missing customer data and unavailable items',async()=>{await expect(createEnquiry({requestKey:randomUUID(),name:'',email:'',items:[]})).rejects.toThrow();await expect(createEnquiry({requestKey:randomUUID(),name:'Guest',email:'guest@example.test',items:[{type:'product',slug:'not-a-real-product',quantity:1}]})).rejects.toMatchObject({status:422});});
 it('converts once, preserves snapshots, queues one email and supports safe lifecycle/receipts/tracking',async()=>{
  const quote=await db.quote.findUniqueOrThrow({where:{id:quotes[0]}});
  await expect(convertEnquiry({id:quote.id,amount:10000,currency:'GHS',address:'Reviewed delivery address',confirmCustomer:true,reason:'Agreement checked'})).rejects.toMatchObject({status:409});
  await updateEnquiry({id:quote.id,version:quote.version,status:'agreed',reason:'WhatsApp agreement reviewed'});
  const input={id:quote.id,amount:10000,currency:'GHS',address:'Reviewed delivery address',confirmCustomer:true,reason:'Customer identity and agreement verified'};
  const [a,b]=await Promise.all([convertEnquiry(input),convertEnquiry(input)]);expect(a.record.id).toBe(b.record.id);
  let order=await db.order.findUniqueOrThrow({where:{id:a.record.id},include:{items:true}});expect(order.reference).toMatch(/^SSL-\d{6,}$/);expect(order.items).toHaveLength(3);expect(order.items.find(item=>item.kind==='inspiration')?.variantId).toBeNull();expect(order.items.every(item=>item.price===null)).toBe(true);
  expect(await db.payment.count({where:{orderId:order.id}})).toBe(0);expect(await db.notification.count({where:{recipient:quote.email}})).toBe(1);
  const token=decryptTracking(order.trackingCipher!);const safe=await lookupTracking({token});expect(safe.reference).toBe(order.reference);for(const field of ['email','phone','total','payments','address','notes','actorId'])expect(JSON.stringify(safe)).not.toContain('"'+field+'"');
  await expect(lookupTracking({token:'aa'.repeat(32)})).rejects.toMatchObject({status:404});
  await expect(updateOrder({id:order.id,version:order.version,status:'completed',reason:'Invalid skipped delivery'})).rejects.toMatchObject({status:409});
  await updateOrder({id:order.id,version:order.version,status:'confirmed',reason:'Same status save'});expect(await db.orderEvent.count({where:{orderId:order.id}})).toBe(1);expect(await db.notification.count({where:{recipient:quote.email}})).toBe(1);
  order=await db.order.findUniqueOrThrow({where:{id:order.id},include:{items:true}});
  const attempts=await Promise.allSettled([updateOrder({id:order.id,version:order.version,status:'processing',reason:'Begin preparation',publicNote:'Your order is being prepared.'}),updateOrder({id:order.id,version:order.version,status:'processing',reason:'Concurrent duplicate'})]);expect(attempts.filter(attempt=>attempt.status==='fulfilled')).toHaveLength(1);expect(await db.orderEvent.count({where:{orderId:order.id}})).toBe(2);expect(await db.notification.count({where:{recipient:quote.email}})).toBe(2);
  actor.role='sales';await expect(recordReceipt({id:order.id})).rejects.toMatchObject({status:403});actor.role='owner';
  const receipt={id:order.id,requestKey:randomUUID(),action:'confirm',amount:4000,currency:'GHS',confirmedAt:new Date(Date.now()-1000).toISOString(),method:'Bank transfer',reason:'Bank receipt independently verified'};
  await Promise.all([recordReceipt(receipt),recordReceipt(receipt)]);expect(await db.payment.count({where:{orderId:order.id}})).toBe(1);const read=await showroomRead('orders',new URLSearchParams({record:order.id}));expect(read.rows?.[0]).toMatchObject({receiptSummary:{status:'partially_paid',balance:6000}});
  actor.role='fulfillment';const fulfillment=await showroomRead('orders',new URLSearchParams({record:order.id}));expect(JSON.stringify(fulfillment)).not.toContain('receiptSummary');expect(fulfillment.rows?.[0]).not.toHaveProperty('total');actor.role='owner';
  const payment=await db.payment.findFirstOrThrow({where:{orderId:order.id}});await recordReceipt({id:order.id,requestKey:randomUUID(),action:'reverse',paymentId:payment.id,reason:'Receipt belonged to a different agreement'});expect(await db.payment.count({where:{orderId:order.id}})).toBe(2);
  const recovery={reference:order.reference,email:quote.email};await Promise.all([recoverTracking(recovery),recoverTracking(recovery)]);expect(await db.notification.count({where:{dedupeKey:{startsWith:'recovery:'+order.id}}})).toBe(1);expect(await recoverTracking({...recovery,email:'other@example.test'})).toEqual(await recoverTracking(recovery));
  let current=await db.order.findUniqueOrThrow({where:{id:order.id}});await trackingCommand({id:order.id,version:current.version,action:'revoke',reason:'Customer requested a new private link'});await expect(lookupTracking({token})).rejects.toMatchObject({status:404});current=await db.order.findUniqueOrThrow({where:{id:order.id}});await trackingCommand({id:order.id,version:current.version,action:'regenerate',reason:'Identity verified for replacement'});await expect(lookupTracking({token})).rejects.toMatchObject({status:404});current=await db.order.findUniqueOrThrow({where:{id:order.id}});await db.order.update({where:{id:order.id},data:{trackingExpiresAt:new Date(Date.now()-1000)}});await expect(lookupTracking({token:decryptTracking(current.trackingCipher!)})).rejects.toMatchObject({status:404});
 });
 it('keeps reviewed customer details when staff matches a later guest enquiry',async()=>{
  actor.role='owner';const customer=await db.customer.findUniqueOrThrow({where:{email:emails[0]}});await db.customer.update({where:{id:customer.id},data:{notes:'Preserve existing reviewed notes',phone:'+233200000000'}});
  const enquiry=await createEnquiry({requestKey:randomUUID(),name:'Later guest name',email:emails[0],items:[]});quotes.push(enquiry.id);expect((await db.quote.findUniqueOrThrow({where:{id:enquiry.id}})).customerId).toBeNull();
  await customerCommand({quoteId:enquiry.id,version:1,name:'Later guest name',email:emails[0],phone:'',confirm:true,reason:'Staff verified the existing customer identity'});
  expect(await db.customer.findUniqueOrThrow({where:{id:customer.id}})).toMatchObject({name:customer.name,notes:'Preserve existing reviewed notes',phone:'+233200000000'});expect((await db.quote.findUniqueOrThrow({where:{id:enquiry.id}})).customerId).toBe(customer.id);
 });

});
