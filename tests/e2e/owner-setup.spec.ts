import {test,expect} from '@playwright/test';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {db} from '../../src/lib/db';

test('owner invitation hydrates under nonce CSP, creates an owner once and signs in',async({page})=>{
 test.setTimeout(90000);
 if(new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw Error('Owner setup test requires isolated sterlyn_test');
 if(await db.user.count({where:{role:'owner'}}))throw Error('Refusing to alter an existing owner');
 const prior=await db.setting.findUnique({where:{key:'ownerSetupInvitation'}});
 if(prior)throw Error('Refusing to replace an existing test invitation');
 const token=randomBytes(32).toString('hex'),email=randomUUID()+'@owner-setup.invalid',password=randomUUID()+randomUUID();
 const origin=process.env.E2E_BASE_URL||'http://localhost:3002';
 const errors:string[]=[];
 page.on('console',message=>{if(message.type()==='error'&&/content security policy|refused to (execute|load)/i.test(message.text()))errors.push(message.text());});
 try{
  await db.setting.create({data:{key:'ownerSetupInvitation',value:{email,tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:new Date(Date.now()+3600000).toISOString()}}});
  const response=await page.goto(origin+'/owner-setup#token='+token);
  const csp=response!.headers()['content-security-policy'];expect(csp).toContain("'strict-dynamic'");
  const nonce=csp.match(/'nonce-([^']+)'/)?.[1];expect(nonce).toBeTruthy();
  expect(await page.locator('script').evaluateAll(scripts=>scripts.some(script=>!!(script as HTMLScriptElement).nonce))).toBe(true);
  await expect(page.getByRole('status')).toContainText('Complete private token detected');
  await expect(page).toHaveURL(origin+'/owner-setup');
  await expect(page.getByRole('button',{name:'Create owner account'})).toBeEnabled();
  // Also exercise pasting the private file's complete contents after the hash is cleared.
  await page.reload();await expect(page.getByRole('button',{name:'Create owner account'})).toBeDisabled();
  await page.getByLabel('Private setup link from Neon').fill(`Private setup instructions\n${origin}/owner-setup#token=${token}\nOwner login: ${email}`);
  await expect(page.getByRole('button',{name:'Create owner account'})).toBeEnabled();
  await page.getByLabel('Create password',{exact:true}).fill(password);
  await page.getByLabel('Confirm password',{exact:true}).fill(password);
  const saved=page.waitForResponse(response=>response.url().endsWith('/api/owner-setup')&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Create owner account'}).click();expect((await saved).status()).toBe(201);
  await expect(page.getByRole('status')).toContainText('Your owner account is ready');
  expect(await db.setting.findUnique({where:{key:'ownerSetupInvitation'}})).toBeNull();
  const retry=await page.request.post('/api/owner-setup',{headers:{origin},data:{token,password}});expect(retry.status()).toBe(403);
  await page.getByRole('link',{name:'Sign in to your dashboard'}).click();
  await page.getByLabel('Work email / login').fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Open my workspace'}).click();
  await expect(page).toHaveURL(origin+'/admin');await expect(page.locator('.workspace-stat-grid')).toBeVisible();
  expect(errors).toEqual([]);
 }finally{
  await db.setting.deleteMany({where:{key:'ownerSetupInvitation'}});
  await db.notification.deleteMany({where:{recipient:email}});
  await db.user.deleteMany({where:{email}});await db.$disconnect();
 }
});
