import {requestCorrelationId} from './request-context';
import { headers } from 'next/headers';
import { auth } from './auth';
import { db } from './db';
import { allowed } from './domain';
import { createHash } from 'node:crypto';
import {localAdminTesting} from './local-admin-testing';
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function user(){const session=await auth.api.getSession({headers:await headers()});if(!session)return null;const current=await db.user.findUnique({where:{id:session.user.id},select:{id:true,name:true,email:true,emailVerified:true,role:true,twoFactorEnabled:true,suspended:true}});return current&&!current.suspended?current:null;}
export async function requireUser(){const u=await user();if(!u)throw new HttpError(401,'Please sign in to continue.');return u;}
export async function adminFactorSatisfied(u:{id:string;twoFactorEnabled:boolean}){if(localAdminTesting())return true;const factor=await db.twoFactor.findUnique({where:{userId:u.id},select:{verified:true}});return u.twoFactorEnabled&&!!factor?.verified;}
export async function staff(resource:string){const u=await requireUser();if(!allowed(u.role,resource))throw new HttpError(403,'You do not have permission for this operation.');if(!await adminFactorSatisfied(u))throw new HttpError(403,'Set up two-factor authentication in your account before accessing administration.');return u;}
export async function audit(u:{id:string;role:string},action:string,entity:string,entityId:string,summary:Record<string,unknown>={}){await db.auditLog.create({data:{actorId:u.id,role:u.role,action,entity,entityId,summary:JSON.parse(JSON.stringify(summary)),correlationId:requestCorrelationId()}});}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin!==new URL(process.env.BETTER_AUTH_URL||req.url).origin&&!(process.env.NODE_ENV!=='production'&&['http://localhost:3000','http://127.0.0.1:3000'].includes(origin||'')))throw new HttpError(403,'Invalid request origin.');}
export async function limit(req:Request,scope:string,max=30){const ip=process.env.TRUST_PROXY==='true'?(req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'):'local';const key=hash(scope+ip);const now=new Date();await db.$executeRaw`INSERT INTO "RateLimit" (key,count,"resetAt") VALUES (${key},1,${new Date(Date.now()+60000)}) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RateLimit"."resetAt"<${now} THEN 1 ELSE "RateLimit".count+1 END,"resetAt"=CASE WHEN "RateLimit"."resetAt"<${now} THEN ${new Date(Date.now()+60000)} ELSE "RateLimit"."resetAt" END`;const record=await db.rateLimit.findUnique({where:{key}});if(record&&record.count>max)throw new HttpError(429,'Too many requests. Please wait a minute.');}
