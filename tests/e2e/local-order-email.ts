import {expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {db} from '../../src/lib/db';
import {deliverNotifications} from '../../src/lib/notification-delivery';

/** Opt-in real SMTP acceptance test; strictly restricted to a local capture inbox. */
export async function verifyLocalOrderEmails(recipient:string,reference:string){
 if(new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test'||process.env.SMTP_HOST!=='127.0.0.1'||process.env.SMTP_PORT!=='1027')throw Error('Email verification requires isolated PostgreSQL and local Mailpit on port 1027');
 const messages=await db.notification.findMany({where:{recipient}});
 expect(messages).toHaveLength(7);
 await deliverNotifications(messages.map(message=>message.id));
 expect(await db.notification.count({where:{recipient,status:'smtp_accepted'}})).toBe(7);
 const response=await fetch('http://127.0.0.1:8027/api/v1/search?query='+encodeURIComponent('to:'+recipient));
 expect(response.ok).toBe(true);
 const inbox=await response.json() as {messages:{ID:string;Subject:string}[]};
 expect(inbox.messages).toHaveLength(7);
 const lifecycle=inbox.messages.filter(message=>message.Subject.includes(reference));
 expect(lifecycle).toHaveLength(6);
 for(const status of ['Confirmed','Processing','Ready For Delivery','Dispatched','Delivered','Completed'])expect(lifecycle.some(message=>message.Subject.endsWith('Order '+status))).toBe(true);
 const completed=lifecycle.find(message=>message.Subject.includes('Completed'));expect(completed).toBeTruthy();
 const detail=await (await fetch('http://127.0.0.1:8027/api/v1/message/'+completed!.ID)).json() as {HTML:string;Text:string};
 expect(detail.HTML).toContain('Track your order');expect(detail.HTML).toContain('/track#');expect(detail.Text).toContain('https://wa.me/447576899618');
 await writeFile('out/streamlined-workflow/09-completed-order-email.html',detail.HTML);
 console.log('Seven order-update emails accepted and captured locally; tracking and WhatsApp links verified. No external email sent.');
}
