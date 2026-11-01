import {spawn} from 'node:child_process';
import {cpSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const url=process.env.TEST_DATABASE_URL||'postgresql://sterlyn:local-development-only@localhost:55432/sterlyn_test';
if(new URL(url).pathname!=='/sterlyn_test')throw new Error('Refusing to start tests against a non-test database');
cpSync('public','.next/standalone/public',{recursive:true});cpSync('.next/static','.next/standalone/.next/static',{recursive:true});
const child=spawn(process.execPath,['.next/standalone/server.js'],{stdio:'inherit',env:{...process.env,PORT:'3002',HOSTNAME:'127.0.0.1',DATABASE_URL:url,BETTER_AUTH_URL:'http://localhost:3002',BETTER_AUTH_SECRET:process.env.TEST_AUTH_SECRET||randomBytes(48).toString('hex'),PUBLIC_LAUNCH:'false',SMTP_HOST:'',TRACKING_ENCRYPTION_KEY:process.env.TRACKING_ENCRYPTION_KEY||'33'.repeat(32)}});
for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
