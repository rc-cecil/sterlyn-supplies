import {authPost} from './auth-helpers';
import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {db} from '../../src/lib/db';
import {defaultScene} from '../../src/lib/domain';
test('customer cannot read another invoice or mutate another address/project',async({page})=>{
 test.setTimeout(90000);if(new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw Error('Test database required');
 const ids=[randomUUID(),randomUUID()],password=randomUUID()+randomUUID(),origin=process.env.E2E_BASE_URL||'http://localhost:3002';let orderId='',invoiceId='';
 try{
  for(const id of ids)await db.user.create({data:{id,email:id+'@ownership.invalid',name:'Synthetic ownership fixture',emailVerified:true,accounts:{create:{id:randomUUID(),accountId:id,providerId:'credential',password:await hashPassword(password)}}}});
  const address=await db.address.create({data:{userId:ids[1],name:'Private fixture',line1:'Synthetic address',city:'Accra',region:'Test region',phone:'000000000'}});
  const project=await db.designProject.create({data:{userId:ids[1],name:'Private project fixture',scene:defaultScene}});
  const order=await db.order.create({data:{userId:ids[1],name:'Private fixture',email:ids[1]+'@ownership.invalid',address:{},accessHash:randomUUID(),notes:'Internal staff fixture note',status:'awaiting_confirmation',subtotal:0,tax:0,shipping:0,total:0}});orderId=order.id;
  const invoice=await db.invoice.create({data:{orderId,actorId:'synthetic',status:'issued',number:'SYNTHETIC-'+randomUUID(),snapshot:{currency:'GHS',subtotal:1000,tax:0,shipping:0,total:1000,customer:{name:'Synthetic invoice customer',email:'fixture@ownership.invalid',address:{line1:'Synthetic verification fixture only',city:'Fixture city',region:'Demo'}},items:[{name:'Synthetic verification unit',sku:'SYNTHETIC-ONLY',quantity:1,price:1000}],issuer:{legalName:'Synthetic verification seller',address:'Synthetic fixture only — not a business address',contact:'fixture@ownership.invalid',taxTreatment:'Synthetic verification only'}}}});invoiceId=invoice.id;
  expect((await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email:ids[0]+'@ownership.invalid',password}})).ok()).toBe(true);
  expect((await page.request.get('/api/invoices/'+invoiceId)).status()).toBe(404);
  expect((await page.request.post('/api/addresses/change',{headers:{origin},data:{id:address.id,action:'delete'}})).status()).toBe(404);
  expect((await page.request.post('/api/projects',{headers:{origin},data:{id:project.id,version:1,name:'Unauthorized change',scene:defaultScene}})).status()).toBe(404);
  const account=await (await page.request.get('/api/account')).json();expect(account.addresses).toHaveLength(0);expect(account.projects).toHaveLength(0);expect(account.orders).toHaveLength(0);
  await authPost(page.request,'/api/auth/sign-out',{headers:{origin},data:{}});expect((await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email:ids[1]+'@ownership.invalid',password}})).ok()).toBe(true);
  const ownOrder=await (await page.request.get('/api/orders/'+orderId)).json();expect(ownOrder.id).toBe(orderId);expect(ownOrder.notes).toBeUndefined();expect(ownOrder.accessHash).toBeUndefined();expect(ownOrder.userId).toBeUndefined();const ownAccount=await (await page.request.get('/api/account')).json();expect(ownAccount.orders[0].notes).toBeUndefined();
  await page.goto('/invoices/'+invoiceId);await expect(page.getByRole('heading',{name:'Bill to'})).toBeVisible();await expect(page.locator('article')).toContainText('Synthetic verification fixture only');for(const [label,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){await page.setViewportSize({width,height});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:'out/release-evidence/customer-invoice-'+label+'.png'});}
 }finally{if(invoiceId)await db.invoice.delete({where:{id:invoiceId}});if(orderId)await db.order.delete({where:{id:orderId}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();}
});
