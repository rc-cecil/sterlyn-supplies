import 'dotenv/config';
import {randomBytes,createCipheriv,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,stat,rm} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {resolve,join} from 'node:path';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ListObjectsV2Command,GetObjectCommand} from '@aws-sdk/client-s3';
import pg from 'pg';
import {storage} from '../src/lib/storage';
if(process.env.BACKUP_CONFIRM_QUIESCED!=='true')throw Error('Pause application writes and explicitly confirm a consistent backup window');
if(!process.env.BACKUP_KEY_FILE||!process.env.PG_TOOLS_PATH||!process.env.DATABASE_URL||!process.env.BACKUP_DIR)throw Error('Configure private key file, PostgreSQL tools, database and backup directory');
if((await stat(process.env.BACKUP_KEY_FILE)).mode&0o077)throw Error('Backup key file must not be group/world accessible');
const key=Buffer.from((await readFile(process.env.BACKUP_KEY_FILE,'utf8')).trim(),'base64');if(key.length!==32)throw Error('Backup key must contain 32 random bytes encoded as base64');
const source=new URL(process.env.DATABASE_URL),directory=join(resolve(process.env.BACKUP_DIR),new Date().toISOString().replaceAll(':','-')+'-'+randomBytes(4).toString('hex'));
await mkdir(directory,{recursive:true,mode:0o700});
async function encrypt(input:Readable,name:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),hash=createHash('sha256'),destination=join(directory,name);const file=createWriteStream(destination,{mode:0o600});file.write(Buffer.concat([Buffer.from('STBK1'),iv]));await pipeline(input,new Transform({transform(chunk,_encoding,callback){hash.update(chunk);callback(null,chunk);}}),cipher,file);const {appendFile}=await import('node:fs/promises');await appendFile(destination,cipher.getAuthTag());return {file:name,sha256:hash.digest('hex')};}
const dump=join(directory,'temporary.dump');
try{
 await promisify(execFile)(join(process.env.PG_TOOLS_PATH,'pg_dump'),['-h',source.hostname,'-p',source.port||'5432','-U',decodeURIComponent(source.username),'-Fc','--no-owner','-f',dump,decodeURIComponent(source.pathname.slice(1))],{env:{...process.env,PGPASSWORD:decodeURIComponent(source.password)},timeout:600000});
 const client=new pg.Client({connectionString:source.toString()});await client.connect();const tables:Record<string,{count:number;fingerprint:string}>={};try{for(const row of (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows){const identifier='\"'+String(row.tablename).replaceAll('\"','\"\"')+'\"';tables[row.tablename]=(await client.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(h,'' ORDER BY h),'')) AS fingerprint FROM (SELECT md5(to_jsonb(t)::text) h FROM ${identifier} t) data`)).rows[0];}}finally{await client.end();}
 const database=await encrypt(createReadStream(dump),'database.enc');await rm(dump);
 const objects:{key:string;etag?:string;contentType?:string;metadata?:Record<string,string>;file:string;sha256:string}[]=[];let token:string|undefined;
 do{const page=await storage().send(new ListObjectsV2Command({Bucket:process.env.S3_BUCKET,ContinuationToken:token}));for(const item of page.Contents||[]){if(!item.Key)continue;const data=await storage().send(new GetObjectCommand({Bucket:process.env.S3_BUCKET,Key:item.Key,IfMatch:item.ETag}));const encrypted=await encrypt(data.Body as Readable,'object-'+objects.length+'.enc');objects.push({key:item.Key,etag:item.ETag,contentType:data.ContentType,metadata:data.Metadata,...encrypted});}token=page.NextContinuationToken;}while(token);
 await encrypt(Readable.from([JSON.stringify({version:1,createdAt:new Date().toISOString(),database,objects,tables})]),'manifest.enc');
 await writeFile(join(directory,'COMPLETE'),new Date().toISOString(),{mode:0o600});
 const statusClient=new pg.Client({connectionString:source.toString()});try{await statusClient.connect();await statusClient.query('INSERT INTO \"Setting\" (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value',['lastSuccessfulBackup',JSON.stringify({at:new Date().toISOString(),encrypted:true,objects:objects.length,tables:Object.keys(tables).length})]);}catch{console.warn(JSON.stringify({backupStatus:'unavailable',backup:'complete'}));process.exitCode=1;}finally{await statusClient.end();}
 console.log(JSON.stringify({backup:'complete',objects:objects.length,encrypted:true,restoreVerification:'required before relying on backup'}));
}catch(error){console.error(JSON.stringify({backup:'failed',error:error instanceof Error?error.name:'unknown',code:typeof error==='object'&&error!==null&&'code'in error?String(error.code):undefined,status:typeof error==='object'&&error!==null&&'$metadata'in error?(error.$metadata as {httpStatusCode?:number})?.httpStatusCode:undefined}));await rm(dump,{force:true});throw Error('Backup failed; no COMPLETE marker was written. Preserve existing backups and inspect service readiness.');}
