import {requestCorrelationId} from './request-context';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {db} from './db';
import {staff,requireUser,HttpError,hash} from './security';
const staffRole=z.enum(['admin','sales','catalogue','fulfillment','support','analyst','content']);
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
  await tx.notification.create({data:{recipient:v.email,subject:'Your Sterlyn staff invitation',body:`Sign in or create and verify your account, then accept your invitation: ${new URL('/account/invitation',baseUrl.data).toString()}?token=${token}\nThis invitation expires in 48 hours.`}});
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
 });return {message:'Invitation accepted. Sign in again to access your staff workspace.'};
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
export {convertEnquiry as convertQuote} from './showroom';
