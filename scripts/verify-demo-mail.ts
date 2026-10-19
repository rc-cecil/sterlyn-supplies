import 'dotenv/config';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
const base=process.env.DEMO_APP_URL||'http://localhost:3000';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('Demo verification is local only');
const email=`mail-check-${randomUUID()}@sterlyn.test`;
try{
 const response=await fetch(base+'/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({name:'Demo mail verification',email,password:randomUUID()+randomUUID()})});
 if(!response.ok)throw new Error('Registration failed: '+response.status);
 let message:{ID:string}|undefined;
 for(let n=0;n<25;n++){
  const data=await fetch('http://127.0.0.1:8025/api/v1/messages').then(r=>r.json());
  message=data.messages.find((m:{To:{Address:string}[]})=>m.To.some(t=>t.Address===email));
  if(message)break;await new Promise(r=>setTimeout(r,1000));
 }
 if(!message)throw new Error('Verification email not captured within 25 seconds');
 const captured=await fetch('http://127.0.0.1:8025/api/v1/message/'+message.ID).then(r=>r.json());
 const link=String(captured.Text).match(/https?:\/\/\S+/)?.[0];
 if(!link||new URL(link).origin!==base)throw new Error('Missing local verification link');
 const verified=await fetch(link,{redirect:'manual'});if(verified.status>=400)throw new Error('Verification failed');
 const account=await db.user.findUniqueOrThrow({where:{email}});if(!account.emailVerified)throw new Error('Account did not become verified');
 const notification=await db.notification.findFirstOrThrow({where:{recipient:email}});if(notification.status!=='sent')throw new Error('Notification was not marked sent');
 console.log(JSON.stringify({registration:'passed',smtpCapture:'passed',emailVerification:'passed',notification:'sent'}));
}finally{await db.user.deleteMany({where:{email}});await db.notification.deleteMany({where:{recipient:email}});await db.$disconnect();}
