import 'dotenv/config';
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
 const second=await post('auth/sign-in/email',{email,password});assert.equal(second.status,200);const other=second.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 r=await post('auth/revoke-other-sessions',{},cookie);assert.equal(r.status,200,await r.text());
 assert.equal((await fetch(base+'/api/account',{headers:{Cookie:cookie}})).status,200);
 assert.equal((await fetch(base+'/api/account',{headers:{Cookie:other}})).status,401);
 console.log('PASS: other browser session revoked; current session remains signed in.');

}finally{
 await db.notification.deleteMany({where:{recipient:email}});if(id)await db.user.deleteMany({where:{id}});await db.$disconnect();
}
