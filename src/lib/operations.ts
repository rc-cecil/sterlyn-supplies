import {requestCorrelationId} from './request-context';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {db} from './db';
import {staff,requireUser,HttpError,hash} from './security';
const staffRole=z.enum(['admin','catalogue','fulfillment','support','analyst','content']);
const reason=z.string().min(3).max(200);
export async function inviteStaff(input:unknown){
 const actor=await staff('teams');if(actor.role!=='owner')throw new HttpError(403,'Only the owner can invite staff.');
 const v=z.object({email:z.email().transform(s=>s.toLowerCase().trim()),role:staffRole,reason}).parse(input);
 const baseUrl=z.url().safeParse(process.env.BETTER_AUTH_URL);
 if(!baseUrl.success)throw new HttpError(503,'Staff invitations require a configured application URL.');
 const token=randomBytes(32).toString('hex');
 await db.$transaction(async tx=>{
  await tx.staffInvitation.updateMany({where:{email:v.email,acceptedAt:null,revokedAt:null},data:{revokedAt:new Date()}});
  const invitation=await tx.staffInvitation.create({data:{email:v.email,role:v.role,invitedBy:actor.id,tokenHash:hash(token),expiresAt:new Date(Date.now()+48*3600000)}});
  await tx.notification.create({data:{recipient:v.email,subject:'Your Sterlyn staff invitation',body:`Sign in or create and verify your account, then accept your invitation: ${new URL('/account/invitation',baseUrl.data).toString()}?token=${token}\nThis invitation expires in 48 hours. Authenticator verification is required before administration access.`}});
  await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'invite',entity:'teams',entityId:invitation.id,summary:{role:v.role,reason:v.reason,result:'queued'},correlationId:requestCorrelationId()}});
 });
 return {message:'Invitation queued for email delivery. It expires in 48 hours.'};
}
export async function acceptInvitation(input:unknown){
 const actor=await requireUser();if(!actor.emailVerified)throw new HttpError(403,'Verify your email before accepting an invitation.');
 const {token}=z.object({token:z.string().regex(/^[0-9a-f]{64}$/)}).parse(input);
 await db.$transaction(async tx=>{
  const invite=await tx.staffInvitation.findUnique({where:{tokenHash:hash(token)}});
  if(!invite||invite.email!==actor.email.toLowerCase()||invite.expiresAt<new Date()||invite.revokedAt||invite.acceptedAt)throw new HttpError(409,'This invitation is invalid or expired.');
  if(actor.role==='owner')throw new HttpError(409,'Owner permissions cannot be replaced by an invitation.');
  const claim=await tx.staffInvitation.updateMany({where:{id:invite.id,acceptedAt:null,revokedAt:null},data:{acceptedAt:new Date()}});
  if(!claim.count)throw new HttpError(409,'Invitation already used.');
  await tx.user.update({where:{id:actor.id},data:{role:staffRole.parse(invite.role)}});
  await tx.session.deleteMany({where:{userId:actor.id}});
  await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'accept-invitation',entity:'teams',entityId:actor.id,summary:{before:{role:actor.role},after:{role:invite.role},result:'success'},correlationId:requestCorrelationId()}});
 });return {message:'Invitation accepted. Sign in again and complete authenticator setup.'};
}
export async function staffAccess(input:unknown){
 const actor=await staff('teams');if(actor.role!=='owner')throw new HttpError(403,'Only the owner can manage staff access.');
 const v=z.object({id:z.string(),action:z.enum(['suspend','reactivate','revoke-sessions']),reason}).parse(input);
 await db.$transaction(async tx=>{
  const target=await tx.user.findUniqueOrThrow({where:{id:v.id}});
  if(target.role==='owner'||target.id===actor.id)throw new HttpError(409,'Owner access is protected.');
  if(v.action!=='revoke-sessions')await tx.user.update({where:{id:v.id},data:{suspended:v.action==='suspend'}});
  await tx.session.deleteMany({where:{userId:v.id}});
  await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:v.action,entity:'teams',entityId:v.id,summary:{reason:v.reason,before:{suspended:target.suspended},after:{suspended:v.action==='revoke-sessions'?target.suspended:v.action==='suspend'},result:'success'},correlationId:requestCorrelationId()}});
 });return {message:'Access updated and sessions revoked.'};
}
export async function convertQuote(input:unknown){
 const actor=await staff('orders');await staff('quotes');
 const v=z.object({id:z.string(),reason,tax:z.coerce.number().int().nonnegative(),shipping:z.coerce.number().int().nonnegative(),linePrices:z.record(z.string(),z.number().int().nonnegative()),address:z.object({line1:z.string().min(3),city:z.string().min(2),region:z.string().min(2)})}).parse(input);
 const order=await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${v.id} FOR UPDATE`;
  const prior=await tx.order.findUnique({where:{sourceQuoteId:v.id},select:{id:true,status:true}});if(prior)return prior;
  const quote=await tx.quote.findUniqueOrThrow({where:{id:v.id}});
  if(quote.status!=='accepted')throw new HttpError(409,'Only an accepted quotation can become an order.');
  const items=z.array(z.object({variantId:z.string(),sku:z.string(),name:z.string(),quantity:z.number().int().min(1).max(20)})).min(1).parse(quote.items);
  const lines=items.map(i=>{const price=v.linePrices[i.variantId];if(price===undefined)throw new HttpError(400,'Confirm a price in pesewas for every quotation line.');return {...i,price};});
  const subtotal=lines.reduce((s,i)=>s+i.price*i.quantity,0),total=subtotal+v.tax+v.shipping;
  if(!Number.isSafeInteger(total)||total>2147483647)throw new HttpError(400,'Order amount is outside the supported range.');
  if(quote.estimate===null||quote.estimate!==total)throw new HttpError(409,'The confirmed total must match the accepted quotation estimate.');
  const created=await tx.order.create({data:{sourceQuoteId:quote.id,quoteSnapshot:JSON.parse(JSON.stringify({items:quote.items,scene:quote.scene,estimate:quote.estimate,capturedAt:new Date()})),userId:quote.userId,email:quote.email,name:quote.name,address:v.address,accessHash:hash(randomBytes(32).toString('hex')),status:'awaiting_confirmation',subtotal,tax:v.tax,shipping:v.shipping,total,items:{create:lines},events:{create:{status:'awaiting_confirmation',note:'Accepted quotation converted to an unpaid order. '+v.reason,actorId:actor.id}}},select:{id:true,status:true}});
  await tx.auditLog.create({data:{actorId:actor.id,role:actor.role,action:'quote-to-order',entity:'orders',entityId:created.id,summary:{quoteId:quote.id,reason:v.reason,result:'success',payment:'unpaid'},correlationId:requestCorrelationId()}});
  return created;
 });return {record:order,message:'Unpaid order prepared. No payment was taken or recorded.'};
}
