import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('.local',{recursive:true});
const token=()=>randomBytes(24).toString('hex');
const text=`POSTGRES_PASSWORD=${token()}\nS3_ACCESS_KEY=sterlyn-demo\nS3_SECRET_KEY=${token()}\nBETTER_AUTH_SECRET=${token()}\nS3_BUCKET=sterlyn\nS3_REGION=us-east-1\nPUBLIC_LAUNCH=false\n`;
try {await writeFile('.local/demo.env',text,{flag:'wx',mode:0o600});console.log('Created private local demo configuration. No owner account was created.');}
catch(error){if((error as NodeJS.ErrnoException).code==='EEXIST')console.log('Existing private demo configuration retained.');else throw error;}
