import {afterAll,afterEach,describe,expect,it,vi} from 'vitest';
import {db} from '../src/lib/db';
const mailer=vi.hoisted(()=>({sendMail:vi.fn(),close:vi.fn()}));
vi.mock('nodemailer',()=>({default:{createTransport:()=>mailer}}));
const {deliverNotifications}=await import('../src/lib/notification-delivery');
const enabled=process.env.RUN_DATABASE_TESTS==='true';if(enabled&&new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw Error('Isolated sterlyn_test database required');
const ids:string[]=[];
afterEach(()=>{vi.unstubAllEnvs();mailer.sendMail.mockReset();});
describe.skipIf(!enabled)('notification processing leases and outcomes',()=>{
 afterAll(async()=>{if(!enabled)return;await db.notification.deleteMany({where:{id:{in:ids}}});await db.$disconnect();});
 async function fixture(){const message=await db.notification.create({data:{recipient:'notifications-suite@integration.invalid',subject:'Synthetic notification',body:'Plain text alternative',html:'<p>HTML alternative</p>',dedupeKey:crypto.randomUUID()}});ids.push(message.id);return message;}
 function configure(){vi.stubEnv('SMTP_USER','');vi.stubEnv('SMTP_PASSWORD','');vi.stubEnv('SMTP_HOST','127.0.0.1');vi.stubEnv('SMTP_PORT','1025');vi.stubEnv('MAIL_FROM','development@integration.invalid');}
 it('claims a queued message once across concurrent workers and records SMTP acceptance honestly',async()=>{
  configure();const message=await fixture();mailer.sendMail.mockImplementation(async()=>{await new Promise(resolve=>setTimeout(resolve,20));return {accepted:['notifications-suite@integration.invalid']};});
  await Promise.all([deliverNotifications([message.id]),deliverNotifications([message.id])]);expect(mailer.sendMail).toHaveBeenCalledTimes(1);expect(mailer.sendMail.mock.calls[0][0]).toMatchObject({text:message.body,html:message.html});expect(await db.notification.findUniqueOrThrow({where:{id:message.id}})).toMatchObject({status:'smtp_accepted',attempts:1,leaseToken:null,leaseUntil:null});await deliverNotifications([message.id]);expect(mailer.sendMail).toHaveBeenCalledTimes(1);
 });
 it('retries definitive transient rejection and does not automatically resend an uncertain outcome',async()=>{
  configure();const retry=await fixture();mailer.sendMail.mockRejectedValueOnce({responseCode:451});await deliverNotifications([retry.id]);expect(await db.notification.findUniqueOrThrow({where:{id:retry.id}})).toMatchObject({status:'queued',attempts:1});await db.notification.update({where:{id:retry.id},data:{nextAttemptAt:new Date(Date.now()-1000)}});mailer.sendMail.mockResolvedValueOnce({accepted:['notifications-suite@integration.invalid']});await deliverNotifications([retry.id]);expect(await db.notification.findUniqueOrThrow({where:{id:retry.id}})).toMatchObject({status:'smtp_accepted',attempts:2});
  const uncertain=await fixture();mailer.sendMail.mockRejectedValueOnce({code:'ETIMEDOUT'});await deliverNotifications([uncertain.id]);const calls=mailer.sendMail.mock.calls.length;await deliverNotifications([uncertain.id]);expect(mailer.sendMail).toHaveBeenCalledTimes(calls);expect(await db.notification.findUniqueOrThrow({where:{id:uncertain.id}})).toMatchObject({status:'delivery_unknown',attempts:1});
 });
 it('keeps authenticated SMTP paused until its password is configured',async()=>{
  configure();vi.stubEnv('SMTP_HOST','smtp.gmail.com');vi.stubEnv('SMTP_USER','sender@integration.invalid');
  const message=await fixture();await deliverNotifications([message.id]);
  expect(mailer.sendMail).not.toHaveBeenCalled();expect(await db.notification.findUniqueOrThrow({where:{id:message.id}})).toMatchObject({status:'queued',attempts:0});
 });
 it('leaves unconfigured mail queued and marks expired sending leases uncertain without resending',async()=>{
  vi.stubEnv('SMTP_HOST','');const pending=await fixture();await deliverNotifications([pending.id]);expect(await db.notification.findUniqueOrThrow({where:{id:pending.id}})).toMatchObject({status:'queued',attempts:0});await db.notification.update({where:{id:pending.id},data:{status:'sending',leaseToken:'expired-worker',leaseUntil:new Date(Date.now()-1000)}});configure();await deliverNotifications([pending.id]);expect(mailer.sendMail).not.toHaveBeenCalled();expect(await db.notification.findUniqueOrThrow({where:{id:pending.id}})).toMatchObject({status:'delivery_unknown'});
 });
});
