import type {Prisma} from '@prisma/client';
import {label,statusDescription} from './showroom-domain';
import {applicationUrl,trackingUrl} from './order-tracking';
export const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function orderEmail(data:{name:string;reference:string;status:string;expectedDelivery?:Date|null;publicNote?:string|null;url:string;description?:string}){
  const title='Order '+label(data.status),description=data.description||statusDescription[data.status]||'Our team has updated your order.';
  const date=data.expectedDelivery?new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'Africa/Accra'}).format(data.expectedDelivery):null;
  const body=[`Hello ${data.name},`,`${data.reference} — ${title}`,description,data.publicNote,date?'Estimated delivery: '+date:null,'Track your order: '+data.url,'WhatsApp: https://wa.me/447576899618','Sterlyn Supplies Limited'].filter(Boolean).join('\n\n');
  const html=`<!doctype html><html><body style="margin:0;background:#f6f2e9;color:#10271f;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" style="max-width:600px;background:#fffdf7"><tr><td style="padding:28px;background:#0e3025"><img width="130" alt="Sterlyn Supplies Limited" src="${escapeHtml(applicationUrl())}/images/sterlyn-official-logo.jpg"></td></tr><tr><td style="padding:32px"><p>Hello ${escapeHtml(data.name)},</p><p style="font-size:14px">${escapeHtml(data.reference)}</p><h1 style="font-size:28px">${escapeHtml(title)}</h1><p style="line-height:1.6">${escapeHtml(description)}</p>${data.publicNote?`<p>${escapeHtml(data.publicNote)}</p>`:''}${date?`<p><strong>Estimated delivery:</strong> ${escapeHtml(date)}</p>`:''}<p style="margin:30px 0"><a style="display:inline-block;padding:14px 22px;background:#0e3025;color:#fffdf7;text-decoration:none" href="${escapeHtml(data.url)}">Track your order</a></p><p>Questions? <a style="color:#0e3025" href="https://wa.me/447576899618">Contact us on WhatsApp</a>.</p><p style="font-size:12px;line-height:1.6">Keep your tracking link private. No account is required.<br>Sterlyn Supplies Limited · Style. Quality. Innovation.</p></td></tr></table></td></tr></table></body></html>`;
  return {subject:`${data.reference} · ${title}`,body,html};
}
export async function queueOrderEmail(tx:Prisma.TransactionClient,order:{id:string;name:string;email:string;reference:string|null;status:string;trackingCipher:string|null;trackingRevokedAt:Date|null;expectedDelivery:Date|null},eventId:string,publicNote?:string|null){
  if(!order.email||!order.trackingCipher||order.trackingRevokedAt)return;
  const override=(await tx.setting.findUnique({where:{key:'notificationTemplates'}}))?.value as Record<string,string>|undefined;
  const mail=orderEmail({name:order.name,reference:order.reference||order.id,status:order.status,expectedDelivery:order.expectedDelivery,publicNote,url:trackingUrl(order.trackingCipher),description:override?.[order.status]});
  await tx.notification.create({data:{...mail,recipient:order.email,dedupeKey:`order:${order.id}:${eventId}`,templateData:{version:1,orderId:order.id,eventId,status:order.status}}});
}
