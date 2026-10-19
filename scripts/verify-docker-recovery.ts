import 'dotenv/config';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
if(process.env.DEMO_RECOVERY_VERIFY!=='true'||process.env.PUBLIC_LAUNCH==='true')throw Error('Explicit local demo verification flag required');
const base='http://web:3000',origin=process.env.BETTER_AUTH_URL!,email=randomUUID()+'@recovery-verification.invalid',password=randomUUID()+randomUUID(),nextPassword=randomUUID()+randomUUID(),cookies=new Map<string,string>(),seen=new Set<string>(),tokens:string[]=[];
async function post(path:string,data:unknown){const response=await fetch(base+'/api/auth/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:[...cookies].map(([key,value])=>key+'='+value).join('; ')},body:JSON.stringify(data)});for(const value of response.headers.getSetCookie()){const [pair]=value.split(';'),index=pair.indexOf('=');cookies.set(pair.slice(0,index),pair.slice(index+1));}return response;}
async function captured(subject:string){for(let n=0;n<60;n++){const data=await fetch('http://mail:8025/api/v1/messages').then(r=>r.json());const message=data.messages.find((m:{ID:string;Subject:string;To:{Address:string}[]})=>!seen.has(m.ID)&&m.Subject===subject&&m.To.some(t=>t.Address===email));if(message){seen.add(message.ID);const content=await fetch('http://mail:8025/api/v1/message/'+message.ID).then(r=>r.json());const url=new URL(String(content.Text).trim());if(url.origin!==origin)throw Error('Unexpected capture link origin');return url;}await new Promise(r=>setTimeout(r,1000));}throw Error('Local SMTP capture deadline exceeded');}
try{
 if(!(await post('sign-up/email',{email,password,name:'Synthetic recovery verification'})).ok)throw Error('Registration failed');
 const verify=await captured('Verify your Sterlyn email');verify.protocol='http:';verify.host='web:3000';if((await fetch(verify,{redirect:'manual'})).status>=400)throw Error('Email verification failed');
 if(!(await db.user.findUniqueOrThrow({where:{email}})).emailVerified)throw Error('Email was not verified');
 if(!(await post('sign-in/email',{email,password})).ok)throw Error('Sign in failed');
 for(let i=0;i<2;i++){
  if(!(await post('request-password-reset',{email,redirectTo:origin+'/account/reset-password'})).ok)throw Error('Reset request failed');
  const link=await captured('Reset your Sterlyn password'),token=link.pathname.split('/').at(-1)!;tokens.push(token);
  if(i===0)await db.verification.updateMany({where:{identifier:'reset-password:'+token},data:{expiresAt:new Date(Date.now()-60000)}});
  const reset=await post('reset-password',{token,newPassword:nextPassword});if(reset.ok!==(i===1))throw Error('Reset expiry/validity check failed');
  if(i===1&&(await post('reset-password',{token,newPassword:password})).ok)throw Error('Reset token replay succeeded');
 }
 const account=await fetch(base+'/api/account',{headers:{Cookie:[...cookies].map(([key,value])=>key+'='+value).join('; ')}});if(account.status!==401)throw Error('Previous session was not revoked');
 if(!(await post('sign-in/email',{email,password:nextPassword})).ok)throw Error('New password did not work');
 if(await db.notification.count({where:{recipient:email,status:{not:'sent'}}}))throw Error('Captured notifications were not marked delivered');
 console.log(JSON.stringify({registration:'passed',capturedVerification:'passed',capturedPasswordRecovery:'passed',expiry:'passed',singleUse:'passed',sessionInvalidation:'passed',delivery:'local Mailpit only'}));
}finally{await db.verification.deleteMany({where:{identifier:{in:tokens.map(token=>'reset-password:'+token)}}});await db.notification.deleteMany({where:{recipient:email}});await db.user.deleteMany({where:{email}});await db.$disconnect();}
