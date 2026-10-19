import 'dotenv/config';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {db} from '../src/lib/db';
const base='http://127.0.0.1:3000';
const email=`quote-check-${randomUUID()}@sterlyn.test`,password=randomUUID()+randomUUID();
let id='';let quoteId='';
try{
 const post=(path:string,body:unknown,cookie='')=>fetch(base+'/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:cookie},body:JSON.stringify(body)});
 let r=await post('auth/sign-up/email',{email,password,name:'Quote workflow check'});assert.equal(r.status,200,await r.text());
 const u=await db.user.findUniqueOrThrow({where:{email}});id=u.id;await db.user.update({where:{id},data:{emailVerified:true}});
 r=await post('auth/sign-in/email',{email,password});assert.equal(r.status,200,await r.text());
 const cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.ok(cookie);
 const quote=await db.quote.create({data:{userId:id,name:u.name,email,notes:'Test kitchen request',items:[],status:'quoted',estimate:120000,customerSummary:'Cabinet and delivery included.',validUntil:new Date(Date.now()+86400000)}});quoteId=quote.id;
 r=await post('quotes/respond',{id:quote.id,updatedAt:quote.updatedAt.toISOString(),action:'accept'});assert.equal(r.status,401);
 r=await post('quotes/respond',{id:quote.id,updatedAt:new Date(0).toISOString(),action:'accept'},cookie);assert.equal(r.status,409);
 r=await post('quotes/respond',{id:quote.id,updatedAt:quote.updatedAt.toISOString(),action:'accept'},cookie);assert.equal(r.status,200,await r.text());
 assert.equal((await db.quote.findUniqueOrThrow({where:{id:quote.id}})).status,'accepted');
 r=await post('quotes/respond',{id:quote.id,updatedAt:quote.updatedAt.toISOString(),action:'accept'},cookie);assert.equal(r.status,409);
 const expired=await db.quote.update({where:{id:quote.id},data:{status:'quoted',validUntil:new Date(0)}});
 r=await post('quotes/respond',{id:quote.id,updatedAt:expired.updatedAt.toISOString(),action:'accept'},cookie);assert.equal(r.status,409);
 console.log('PASS: registration and sign-in from 127.0.0.1; authenticated acceptance; stale, duplicate, and expired quote rejection.');
}finally{
 if(quoteId){await db.notification.deleteMany({where:{subject:{contains:quoteId}}});await db.quote.deleteMany({where:{id:quoteId}});}
 await db.notification.deleteMany({where:{recipient:email}});if(id)await db.user.deleteMany({where:{id}});await db.$disconnect();
}
