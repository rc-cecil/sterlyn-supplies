import {authPost} from './auth-helpers';
import {test,expect} from '@playwright/test';
import {randomUUID,createHmac} from 'node:crypto';
import {bootstrapOwner} from '../../src/lib/owner-bootstrap';
import {db} from '../../src/lib/db';
import {mkdir} from 'node:fs/promises';
function totp(secret:string){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of secret.toUpperCase().replace(/=+$/,''))bits+=alphabet.indexOf(c).toString(2).padStart(5,'0');const bytes=Buffer.from((bits.match(/.{8}/g)||[]).map(v=>parseInt(v,2)));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const digest=createHmac('sha1',bytes).update(counter).digest();const offset=digest[19]&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
test('test owner must verify MFA before admin; sessions and publication remain protected',async({page,request})=>{
 test.setTimeout(240000);if(new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw new Error('Owner acceptance requires isolated test database');
 const email=randomUUID()+'@owner-acceptance.invalid',password=randomUUID()+randomUUID();
 const {id}=await bootstrapOwner({email,password});const origin=process.env.E2E_BASE_URL||'http://localhost:3002';

 try{
  const signin=await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email,password}});expect(signin.ok()).toBe(true);
  expect((await authPost(request,'/api/auth/sign-in/email',{headers:{origin},data:{email,password}})).ok()).toBe(true);
  expect((await page.request.get('/api/admin/products')).status()).toBe(403);
  const enabled=await authPost(page.request,'/api/auth/two-factor/enable',{headers:{origin},data:{password}});expect(enabled.ok()).toBe(true);
  const enrollment=await enabled.json();const secret=new URL(enrollment.totpURI).searchParams.get('secret')!;
  expect((await page.request.get('/api/admin/products')).status()).toBe(403);
  const verified=await authPost(page.request,'/api/auth/two-factor/verify-totp',{headers:{origin},data:{code:totp(secret)}});expect(verified.ok()).toBe(true);
  expect((await page.request.get('/api/admin/products')).status()).toBe(200);
  expect((await request.get('/api/admin/products')).status()).toBe(401);
  await page.goto('/account');await page.getByLabel('Current password to replace recovery codes').fill(password);await page.getByRole('button',{name:'Replace recovery codes',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'New recovery codes created.'})).toBeVisible();const backupCodes=(await page.locator('pre.secret-uri').innerText()).trim().split('\n');expect(backupCodes.length).toBeGreaterThan(1);await page.getByRole('button',{name:'Hide recovery codes'}).click();await expect(page.locator('pre.secret-uri')).toHaveCount(0);
  await authPost(page.request,'/api/auth/sign-out',{headers:{origin},data:{}});
  const recoverySignin=await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email,password}});expect(recoverySignin.status()).toBe(200);
  const recovered=await authPost(page.request,'/api/auth/two-factor/verify-backup-code',{headers:{origin},data:{code:backupCodes[0]}});if(!recovered.ok()){const problem=await recovered.json();throw Error('Recovery challenge failed: '+String(problem.code||problem.message||recovered.status()));}
  await authPost(page.request,'/api/auth/sign-out',{headers:{origin},data:{}});
  await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email,password}});
  expect((await authPost(page.request,'/api/auth/two-factor/verify-backup-code',{headers:{origin},data:{code:backupCodes[0]}})).ok()).toBe(false);
  const retrySignin=await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email,password}});expect(retrySignin.status()).toBe(200);
  const finalFactor=await authPost(page.request,'/api/auth/two-factor/verify-totp',{headers:{origin},data:{code:totp(secret)}});if(!finalFactor.ok()){const problem=await finalFactor.json();throw Error('Final MFA challenge failed: '+String(problem.code||problem.message||finalFactor.status()));}

  await db.user.update({where:{id},data:{role:'catalogue'}});
  try{expect((await page.request.get('/api/admin/media')).status()).toBe(200);expect((await page.request.get('/api/admin/orders')).status()).toBe(403);expect((await page.request.get('/api/admin/cms')).status()).toBe(403);expect((await page.request.post('/api/admin/invoice-command',{headers:{origin},data:{action:'draft',id:'not-an-order',reason:'Permission verification'}})).status()).toBe(403);}finally{await db.user.update({where:{id},data:{role:'owner'}});}
  await mkdir('out/release-evidence',{recursive:true});
  for(const [label,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]] as const){if(process.env.AUTH_WORKFLOW_ONLY==='true')break;await page.setViewportSize({width,height});for(const route of ['','products','categories','inventory','orders','quotes','customers','fulfillment','payments','promotions','cms','media','video','reviews','support','analytics','teams','settings','notifications','audit','invoices','privacy','schedules']){const loaded=page.waitForResponse(r=>r.url().includes('/api/admin/'+(route||'overview')+'?')&&r.request().method()==='GET');const response=await page.goto('/admin/'+route);expect(response?.ok()).toBe(true);expect((await loaded).ok()).toBe(true);await expect(page.locator('.admin-content')).toBeVisible();await expect(page.locator('.admin-content')).not.toContainText('Loading records…');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:'out/release-evidence/admin-'+label+'-'+(route||'overview')+'.png'});}}
  const protectedOwner=await page.request.post('/api/admin/staff-access',{headers:{origin},data:{id,action:'suspend',reason:'Acceptance owner protection'}});expect(protectedOwner.status()).toBe(409);
  await authPost(page.request,'/api/auth/sign-out',{headers:{origin},data:{}});expect((await page.request.get('/api/admin/products')).status()).toBe(401);
 }finally{await db.session.deleteMany({where:{userId:id}});await db.user.delete({where:{id}});await db.$disconnect();}
});
