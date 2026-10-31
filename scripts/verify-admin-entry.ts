import 'dotenv/config';
import {localAdminTesting} from '../src/lib/local-admin-testing';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {db} from '../src/lib/db';
const base='http://127.0.0.1:3000';
const email=`quote-check-${randomUUID()}@sterlyn.test`,password=randomUUID()+randomUUID();
let id='';
try{
 const post=(path:string,body:unknown,cookie='')=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:cookie},body:JSON.stringify(body)});
 let r=await post('auth/sign-up/email',{email,password,name:'Quote workflow check'});assert.equal(r.status,200,await r.text());
 const u=await db.user.findUniqueOrThrow({where:{email}});id=u.id;await db.user.update({where:{id},data:{emailVerified:true}});
 r=await post('auth/sign-in/email',{email,password});assert.equal(r.status,200,await r.text());
 const cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.ok(cookie);
 await db.user.update({where:{id},data:{role:'support'}});
 let page=await fetch(base+'/admin',{headers:{Cookie:cookie},redirect:'manual'});assert.equal(page.status,200);assert.ok((await page.text()).includes(localAdminTesting()?'BUSINESS STUDIO':'Secure your staff account.'));
 assert.equal((await fetch(base+'/api/admin/quotes',{headers:{Cookie:cookie}})).status,localAdminTesting()?200:403);
 page=await fetch(base+'/account?setup=authenticator',{headers:{Cookie:cookie}});assert.equal(page.status,200);
 await db.user.update({where:{id},data:{role:'customer'}});
 page=await fetch(base+'/admin',{headers:{Cookie:cookie},redirect:'manual'});assert.equal(page.status,200);assert.ok((await page.text()).includes('Staff access required.'));
 console.log('PASS: staff admin access matches local testing configuration; customer access remains restricted.');

}finally{
 await db.notification.deleteMany({where:{recipient:email}});if(id)await db.user.deleteMany({where:{id}});await db.$disconnect();
}
