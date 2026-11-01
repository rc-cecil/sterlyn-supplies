import {authPost} from './auth-helpers';
import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {bootstrapOwner} from '../../src/lib/owner-bootstrap';
import {db} from '../../src/lib/db';
test('password-authenticated staff retain role boundaries and can revoke other sessions without MFA enrollment',async({page,request})=>{
 test.setTimeout(120000);const email=randomUUID()+'@owner-acceptance.invalid',password=randomUUID()+randomUUID(),origin=process.env.E2E_BASE_URL||'http://localhost:3002';const {id}=await bootstrapOwner({email,password});
 try{
  expect((await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email,password}})).ok()).toBe(true);expect((await authPost(request,'/api/auth/sign-in/email',{headers:{origin},data:{email,password}})).ok()).toBe(true);expect((await page.request.get('/api/admin/products')).status()).toBe(200);
  await page.goto('/account');await expect(page.getByRole('button',{name:'Sign out other sessions',exact:true})).toBeVisible();await page.getByRole('button',{name:'Sign out other sessions',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'1 other session signed out'})).toBeVisible();expect((await request.get('/api/admin/products')).status()).toBe(401);expect((await page.request.get('/api/admin/products')).status()).toBe(200);
  await db.user.update({where:{id},data:{role:'catalogue'}});expect((await page.request.get('/api/admin/product-workspace')).status()).toBe(200);expect((await page.request.get('/api/admin/orders')).status()).toBe(403);expect((await page.request.get('/api/admin/cms')).status()).toBe(403);expect((await page.request.post('/api/admin/invoice-command',{headers:{origin},data:{action:'draft',id:'not-an-order',reason:'Role verification'}})).status()).toBe(403);await db.user.update({where:{id},data:{role:'owner'}});
  expect((await page.request.post('/api/admin/staff-access',{headers:{origin},data:{id,action:'suspend',reason:'Owner protection test'}})).status()).toBe(409);await authPost(page.request,'/api/auth/sign-out',{headers:{origin},data:{}});expect((await page.request.get('/api/admin/orders')).status()).toBe(401);
 }finally{await db.notification.deleteMany({where:{recipient:email}});await db.user.delete({where:{id}});await db.$disconnect();}
});
