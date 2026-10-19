import 'dotenv/config';
import {bootstrapOwner} from '../src/lib/owner-bootstrap';
import {db} from '../src/lib/db';
try {
  if(process.argv.includes('--status')){
    console.log(JSON.stringify({ownerExists:(await db.user.count({where:{role:'owner'}}))>0,credentialsConfigured:!!process.env.OWNER_EMAIL&&!!process.env.OWNER_PASSWORD}));
  }else{
    if(!process.env.OWNER_EMAIL||!process.env.OWNER_PASSWORD)throw new Error('Configure OWNER_EMAIL and a unique OWNER_PASSWORD (16+ characters) privately in the process environment.');
    await bootstrapOwner({email:process.env.OWNER_EMAIL,password:process.env.OWNER_PASSWORD});
    console.log('Owner created. Sign in and verify authenticator enrollment before accessing administration.');
  }
}catch(e){console.error(e instanceof Error?e.message:'Owner setup failed');process.exitCode=1;}finally{await db.$disconnect();}
