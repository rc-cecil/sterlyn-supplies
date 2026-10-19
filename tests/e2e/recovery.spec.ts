import {authPost} from './auth-helpers';
import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {db} from '../../src/lib/db';
test('password reset expires, is single use and revokes existing sessions',async({page})=>{
 test.setTimeout(90000);if(new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw Error('Isolated test database required');
 const id=randomUUID(),email=id+'@recovery.invalid',password=randomUUID()+randomUUID(),nextPassword=randomUUID()+randomUUID(),origin=process.env.E2E_BASE_URL||'http://localhost:3002';
 await db.user.create({data:{id,email,name:'Synthetic recovery customer',emailVerified:true,accounts:{create:{id:randomUUID(),accountId:id,providerId:'credential',password:await hashPassword(password)}}}});
 const post=(path:string,data:unknown)=>authPost(page.request,'/api/auth/'+path,{headers:{origin},data});
 async function resetToken(){await post('request-password-reset',{email,redirectTo:origin+'/account/reset-password'});const notification=await db.notification.findFirstOrThrow({where:{recipient:email},orderBy:{createdAt:'desc'}});return new URL(notification.body).pathname.split('/').at(-1)!;}
 try{
  expect((await post('sign-in/email',{email,password})).ok()).toBe(true);
  const expired=await resetToken();await db.verification.updateMany({where:{identifier:'reset-password:'+expired},data:{expiresAt:new Date(Date.now()-60000)}});
  expect((await post('reset-password',{token:expired,newPassword:nextPassword})).ok()).toBe(false);
  const token=await resetToken();expect((await post('reset-password',{token,newPassword:nextPassword})).ok()).toBe(true);
  expect((await post('reset-password',{token,newPassword:password})).ok()).toBe(false);
  expect((await page.request.get('/api/account')).status()).toBe(401);
  expect((await post('sign-in/email',{email,password:nextPassword})).ok()).toBe(true);
 }finally{await db.notification.deleteMany({where:{recipient:email}});await db.user.delete({where:{id}});await db.$disconnect();}
});
