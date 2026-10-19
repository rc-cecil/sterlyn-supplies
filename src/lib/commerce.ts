import { cookies } from 'next/headers';
import { randomBytes,createHmac,timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { db } from './db';
import { user,HttpError } from './security';
import { quoteSchema,validPlacement } from './domain';
export async function getCart(){
 const jar=await cookies(),u=await user();let token=jar.get('sterlyn-bag')?.value;
 if(token&&!/^[0-9a-f]{64}$/.test(token))token=undefined;
 if(token){const existing=await db.cart.findUnique({where:{token},select:{userId:true}});if(existing?.userId&&existing.userId!==u?.id)token=undefined;}
 if(!token){token=randomBytes(32).toString('hex');jar.set('sterlyn-bag',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*30});}
 const cartToken=token;
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${u?'cart-user:'+u.id:'cart-token:'+cartToken},0))`;
  const cart=await tx.cart.upsert({where:{token:cartToken},create:{token:cartToken},update:{}});
  if(cart.userId&&cart.userId!==u?.id)throw new HttpError(409,'Your session changed. Reload your bag.');
  if(u){
   const old=await tx.cart.findMany({where:{userId:u.id,id:{not:cart.id}},include:{items:true}});
   for(const c of old){for(const i of c.items){const current=await tx.cartItem.findUnique({where:{cartId_variantId:{cartId:cart.id,variantId:i.variantId}}});await tx.cartItem.upsert({where:{cartId_variantId:{cartId:cart.id,variantId:i.variantId}},create:{cartId:cart.id,variantId:i.variantId,quantity:Math.min(20,i.quantity)},update:{quantity:Math.min(20,(current?.quantity||0)+i.quantity)}});}await tx.cart.delete({where:{id:c.id}});}
   await tx.cart.update({where:{id:cart.id},data:{userId:u.id}});
  }
  return tx.cart.findUniqueOrThrow({where:{id:cart.id},include:{items:{include:{variant:{include:{product:true}}}}}});
 });
}
export async function changeCart(input:unknown){
 const v=z.object({variantId:z.string(),quantity:z.coerce.number().int().min(0).max(20),replace:z.boolean().optional()}).parse(input);
 const cart=await getCart();const actor=await user();
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor?'cart-user:'+actor.id:'cart-token:'+cart.token},0))`;
  const current=await tx.cart.findUnique({where:{id:cart.id}});
  if(!current||(current.userId&&current.userId!==actor?.id))throw new HttpError(409,'Your session changed. Reload your bag.');
  const variant=await tx.variant.findUnique({where:{id:v.variantId},include:{product:true}});
  if(!variant||variant.product.status!=='published')throw new HttpError(404,'This item is not available.');
  if(v.quantity===0)await tx.cartItem.deleteMany({where:{cartId:cart.id,variantId:v.variantId}});
  else {
   const old=await tx.cartItem.findUnique({where:{cartId_variantId:{cartId:cart.id,variantId:v.variantId}}});
   const quantity=v.replace?v.quantity:Math.min(20,(old?.quantity||0)+v.quantity);
   await tx.cartItem.upsert({where:{cartId_variantId:{cartId:cart.id,variantId:v.variantId}},create:{cartId:cart.id,variantId:v.variantId,quantity},update:{quantity}});
  }
  const updated=await tx.cart.findUniqueOrThrow({where:{id:cart.id},include:{items:{include:{variant:{include:{product:true}}}}}});
  return {id:updated.id,items:updated.items};
 });
}
export async function createQuote(input:unknown){
 const data=quoteSchema.extend({variantId:z.string().optional(),quantity:z.coerce.number().int().min(1).max(20).optional()}).parse(input);
 if(data.scene&&data.variantId)throw new HttpError(400,'Choose either a product or a kitchen design for this request.');
 if(data.scene&&data.scene.modules.some(m=>!validPlacement(data.scene!,m)))throw new HttpError(400,'Design contains overlapping units or units outside the room.');
 const cart=await getCart(),u=await user();
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${u?'cart-user:'+u.id:'cart-token:'+cart.token},0))`;
  const current=await tx.cart.findUnique({where:{id:cart.id},include:{items:{include:{variant:{include:{product:true}}}}}});
  if(!current||(current.userId&&current.userId!==u?.id))throw new HttpError(409,'Your session changed. Reload your bag.');
  let items=data.scene?[]:current.items.map(i=>({image:i.variant.image||i.variant.product.image,slug:i.variant.product.slug,variantId:i.variantId,sku:i.variant.sku,name:i.variant.product.name,finish:i.variant.name,quantity:i.quantity}));
  if(data.variantId){
   const v=await tx.variant.findFirst({where:{id:data.variantId,product:{status:'published'}},include:{product:true}});
   if(!v)throw new HttpError(404,'This item is not available.');
   items=[{image:v.image||v.product.image,slug:v.product.slug,variantId:v.id,sku:v.sku,name:v.product.name,finish:v.name,quantity:data.quantity||1}];
  }
  if(!data.scene&&!items.length)throw new HttpError(400,'Your bag is empty. Add items before requesting a quotation.');
  const quote=await tx.quote.create({data:{name:data.name,email:data.email,phone:data.phone,notes:data.notes,scene:data.scene,items,userId:u?.id}});
  if(process.env.STAFF_EMAIL)await tx.notification.create({data:{recipient:process.env.STAFF_EMAIL,subject:'New Sterlyn quotation '+quote.reference,body:'New request from '+data.name+'\n'+(data.scene?'Kitchen design: '+data.scene.width+' × '+data.scene.depth+' m, '+data.scene.modules.length+' units\n':'')+items.map(i=>i.quantity+' × '+i.name+' · '+i.finish+' · SKU '+i.sku).join('\n')+'\nProject notes: '+data.notes+'\nReview: '+new URL('/admin/quotes?record='+quote.id,process.env.BETTER_AUTH_URL||'http://localhost:3000').href}});
  let cartChanged=false;
  for(const item of items){
   const line=current.items.find(i=>i.variantId===item.variantId);if(!line)continue;
   const remaining=line.quantity-item.quantity;
   if(remaining>0)await tx.cartItem.update({where:{id:line.id},data:{quantity:remaining}});
   else await tx.cartItem.delete({where:{id:line.id}});
   cartChanged=true;
  }
  return {id:quote.id,reference:quote.reference,cartChanged,message:'Your quotation request has been sent. Reference: '+quote.reference};
 });
}
// Deliberately unavailable even if legacy provider credentials are configured.
export async function checkout(_input:unknown):Promise<{url:string}>{void _input;throw new HttpError(409,'Online payments are postponed. Please request a quotation.');}
export function validSignature(raw:string,signature:string,secret:string){const expected=createHmac('sha512',secret).update(raw).digest('hex');return /^[0-9a-f]{128}$/i.test(signature)&&timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex'));}
export async function webhook(_req:Request):Promise<never>{void _req;throw new HttpError(410,'Payment settlement is disabled.');}
