import {randomUUID} from 'node:crypto';
import nodemailer from 'nodemailer';
import {db} from './db';
export function deliveryFailure(error:unknown,attempt:number){
 const detail=error as {code?:string;responseCode?:number};
 const definitive=!!detail?.responseCode||['ECONNREFUSED','ENOTFOUND','EAI_AGAIN'].includes(detail?.code||'');
 const permanent=(detail?.responseCode||0)>=500;
 return {status:definitive?(permanent||attempt>=5?'failed':'queued'):'delivery_unknown',error:definitive?'SMTP rejected delivery. Check configuration or recipient before retrying.':'Delivery outcome unknown. Verify with the mail provider before retrying.',nextAttemptAt:new Date(Date.now()+Math.min(3600000,60000*2**(attempt-1)))};
}
export function smtpConfigured(){return !!(process.env.SMTP_HOST&&process.env.MAIL_FROM&&(!process.env.SMTP_USER||process.env.SMTP_PASSWORD));}
export function createMailTransport(){
 return nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_PORT==='465',connectionTimeout:15000,greetingTimeout:15000,socketTimeout:60000,requireTLS:process.env.NODE_ENV==='production'&&!(['mail','localhost','127.0.0.1'].includes(process.env.SMTP_HOST||'')&&process.env.SMTP_ALLOW_INSECURE_LOCAL==='true'),auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined});
}
export async function deliverNotifications(notificationIds?:string[]){
 const scope=notificationIds?{id:{in:notificationIds}}:{};
 const now=new Date();
 await db.notification.updateMany({where:{...scope,status:'sending',OR:[{leaseUntil:{lt:now}},{leaseUntil:null,updatedAt:{lt:new Date(Date.now()-15*60000)}}]},data:{status:'delivery_unknown',leaseToken:null,leaseUntil:null,error:'Worker interrupted during delivery. Verify with the provider before retrying.'}});
 if(!smtpConfigured())return;
 const mailer=createMailTransport();
 try{
  for(const mail of await db.notification.findMany({where:{...scope,status:'queued',nextAttemptAt:{lte:now},attempts:{lt:5}},take:10,orderBy:{createdAt:'asc'}})){
   const leaseToken=randomUUID();
   const claim=await db.notification.updateMany({where:{id:mail.id,status:'queued',attempts:mail.attempts},data:{status:'sending',attempts:{increment:1},leaseToken,leaseUntil:new Date(Date.now()+5*60000)}});
   if(!claim.count)continue;
   try{
    const result=await mailer.sendMail({from:process.env.MAIL_FROM,to:mail.recipient,subject:mail.subject,text:mail.body,html:mail.html||undefined,messageId:`<sterlyn-${mail.id}@${new URL(process.env.BETTER_AUTH_URL||'http://localhost').hostname}>`});
    if(!result.accepted.length)throw {responseCode:550};
    await db.notification.updateMany({where:{id:mail.id,status:'sending',leaseToken},data:{status:'smtp_accepted',error:null,leaseToken:null,leaseUntil:null}});
   }catch(error){await db.notification.updateMany({where:{id:mail.id,status:'sending',leaseToken},data:{...deliveryFailure(error,mail.attempts+1),leaseToken:null,leaseUntil:null}});}
  }
 }finally{mailer.close();}
}
