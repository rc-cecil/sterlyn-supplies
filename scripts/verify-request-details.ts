import 'dotenv/config';
import assert from 'node:assert/strict';
import {db} from '../src/lib/db';
import {defaultScene} from '../src/lib/domain';
const base='http://127.0.0.1:3000';
const ids:string[]=[];let cookie='';
async function post(path:string,body:unknown){const r=await fetch(base+'/api/'+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,JSON.stringify(data));const cookies=r.headers.getSetCookie();if(cookies.length)cookie=cookies.map(c=>c.split(';')[0]).join('; ');return data;}
try{
 const variant=await db.variant.findFirstOrThrow({where:{product:{status:'published'}},include:{product:true}});
 await post('cart',{variantId:variant.id,quantity:2});
 const contact={name:'Request detail check',email:'request-check@sterlyn.test',notes:'Local verification of submitted selections.'};
 for(const kind of ['product','bag','studio']){
  await post('cart',{variantId:variant.id,quantity:2,replace:true});
  const result=await post('quotes',{...contact,...(kind==='product'?{variantId:variant.id,quantity:3}:kind==='studio'?{scene:defaultScene}:{})});ids.push(result.id);assert.match(result.reference,/^SQ-\d+$/);
  const q=await db.quote.findUniqueOrThrow({where:{id:result.id}});const items=q.items as {name:string;sku:string;finish:string;quantity:number;slug:string;image:string}[];
  const bag=await fetch(base+'/api/cart',{headers:{Cookie:cookie}}).then(r=>r.json());
  if(kind==='studio'){assert.deepEqual(items,[]);assert.deepEqual(q.scene,defaultScene);assert.equal(bag.items[0].quantity,2);}
  else assert.equal(bag.items.length,0);
  if(kind!=='studio'){assert.equal(items.length,1);assert.equal(items[0].quantity,kind==='product'?3:2);assert.equal(items[0].name,variant.product.name);assert.equal(items[0].sku,variant.sku);assert.equal(items[0].finish,variant.name);assert.equal(items[0].slug,variant.product.slug);assert.ok(items[0].image);}
 }
 await post('cart',{variantId:variant.id,quantity:2,replace:true});
 const partial=await post('quotes',{...contact,variantId:variant.id,quantity:1});ids.push(partial.id);
 let bag=await fetch(base+'/api/cart',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(bag.items[0].quantity,1);
 const failed=await fetch(base+'/api/quotes',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({...contact,notes:''})});assert.equal(failed.status,400);
 bag=await fetch(base+'/api/cart',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(bag.items[0].quantity,1);
 console.log('PASS: bag clears after successful quote; partial quantities and studio bag preserved; failed submission retains bag.');
 console.log('PASS: product and bag selections include quantity, SKU, finish, image and product link; studio preserves layout without unrelated bag items.');
}finally{
 for(const id of ids)await db.notification.deleteMany({where:{OR:[{subject:{contains:id}},{body:{contains:id}}]}});await db.quote.deleteMany({where:{id:{in:ids}}});
 const token=cookie.match(/(?:^|; )sterlyn-bag=([^;]+)/)?.[1];if(token)await db.cart.deleteMany({where:{token}});
 await db.$disconnect();
}
