import {requestCorrelationId} from './request-context';
import {randomUUID} from 'node:crypto';
import {hashPassword} from 'better-auth/crypto';
import {z} from 'zod';
import {db} from './db';
const credentials=z.object({email:z.email().transform(v=>v.trim().toLowerCase()),password:z.string().min(16).max(128).refine(v=>!/^(.)(\1)+$/.test(v),'Use a unique, strong password')});
export async function bootstrapOwner(input:unknown){
  const {email,password}=credentials.parse(input);
  const digest=await hashPassword(password);
  return db.$transaction(async tx=>{
    // A transaction-scoped PostgreSQL lock serializes concurrent bootstrap attempts.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(731901017)`;
    if(await tx.user.count({where:{role:'owner'}}))throw new Error('An owner already exists. Use the protected team interface.');
    if(await tx.user.findUnique({where:{email}}))throw new Error('This account already exists. Bootstrap does not overwrite accounts.');
    const id=randomUUID();
    await tx.user.create({data:{id,name:'Sterlyn owner',email,emailVerified:true,role:'owner',accounts:{create:{id:randomUUID(),accountId:id,providerId:'credential',password:digest}}}});
    await tx.auditLog.create({data:{actorId:id,role:'owner',action:'owner-bootstrap',entity:'teams',entityId:id,summary:{result:'success',mfaRequired:true},correlationId:requestCorrelationId()}});
    return {id};
  },{timeout:30000,maxWait:30000});
}
