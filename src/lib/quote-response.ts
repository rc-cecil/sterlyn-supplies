import {z} from 'zod';
import {db} from './db';
import {requireUser,HttpError} from './security';
export async function respondToQuote(input:unknown){
 const u=await requireUser();
 if(!u.emailVerified)throw new HttpError(403,'Verify your email before responding to a quote.');
 const v=z.object({id:z.string(),updatedAt:z.iso.datetime(),action:z.enum(['accept','question']),message:z.string().max(4000).optional()}).parse(input);
 return db.$transaction(async tx=>{
  const quote=await tx.quote.findFirst({where:{id:v.id,userId:u.id}});
  if(!quote)throw new HttpError(404,'Quotation not found.');
  if(quote.updatedAt.toISOString()!==v.updatedAt)throw new HttpError(409,'The quotation has changed. Reload and review the latest version.');
  if(v.action==='accept'){
   if(quote.status!=='quoted'||quote.estimate===null||!quote.validUntil||quote.validUntil<=new Date())throw new HttpError(409,'This quotation is not available for acceptance. Ask the team for an updated quotation.');
   const changed=await tx.quote.updateMany({where:{id:quote.id,userId:u.id,status:'quoted',updatedAt:quote.updatedAt},data:{status:'accepted'}});
   if(!changed.count)throw new HttpError(409,'This quotation changed. Reload before accepting.');
   await tx.notification.create({data:{recipient:u.email,subject:'Quotation accepted — Sterlyn',body:'You accepted quotation '+quote.reference+' for GHS '+(quote.estimate/100).toFixed(2)+'. No payment has been taken. Our team will contact you with the next steps.'}});
  }else{
   if(!v.message||v.message.trim().length<5)throw new HttpError(400,'Please tell us what you would like to clarify.');
   await tx.supportTicket.create({data:{name:u.name,email:u.email,subject:'Quotation '+quote.reference,message:v.message}});
  }
  if(process.env.STAFF_EMAIL)await tx.notification.create({data:{recipient:process.env.STAFF_EMAIL,subject:'Quotation '+quote.reference+': '+(v.action==='accept'?'accepted':'customer question'),body:v.action==='accept'?'The customer accepted the quotation. Review it in administration.':v.message!}});
  return {message:v.action==='accept'?'Quotation accepted. Our team will contact you with the next steps. No payment has been taken.':'Your question has been sent to our team. We will reply by email.'};
 });
}
