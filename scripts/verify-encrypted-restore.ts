import 'dotenv/config';
import {createDecipheriv,createHash,randomUUID} from 'node:crypto';
import {readFile,mkdtemp,open,rm,stat} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import pg from 'pg';
import {CreateBucketCommand,DeleteBucketCommand,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import {storage} from '../src/lib/storage';
const source=new URL(process.env.TEST_DATABASE_URL||'postgresql://sterlyn:local-development-only@localhost:55432/sterlyn_test');
if(source.pathname!=='/sterlyn_test'||!process.env.BACKUP_VERIFY_DIR||!process.env.BACKUP_KEY_FILE||!process.env.PG_TOOLS_PATH)throw Error('Configure isolated test database, backup directory, private key and PostgreSQL tools');
const backup=resolve(process.env.BACKUP_VERIFY_DIR);await stat(join(backup,'COMPLETE'));
if((await stat(process.env.BACKUP_KEY_FILE)).mode&0o077)throw Error('Private key permissions must be 0600');
const key=Buffer.from((await readFile(process.env.BACKUP_KEY_FILE,'utf8')).trim(),'base64');if(key.length!==32)throw Error('Invalid key');
const dir=await mkdtemp(join(tmpdir(),'sterlyn-encrypted-restore-'));
async function decrypt(name:string,output:string){if(!/^(manifest|database|object-\d+)\.enc$/.test(name))throw Error('Invalid backup member');const file=join(backup,name),handle=await open(file,'r');try{const info=await handle.stat();if(info.size<33)throw Error('Invalid encrypted file');const header=Buffer.alloc(17),tag=Buffer.alloc(16);await handle.read(header,0,17,0);await handle.read(tag,0,16,info.size-16);if(header.subarray(0,5).toString()!=='STBK1')throw Error('Invalid backup format');const cipher=createDecipheriv('aes-256-gcm',key,header.subarray(5));cipher.setAuthTag(tag);const hash=createHash('sha256');await pipeline(createReadStream(file,{start:17,end:info.size-17}),cipher,new Transform({transform(chunk,_encoding,done){hash.update(chunk);done(null,chunk);}}),createWriteStream(output,{mode:0o600}));return hash.digest('hex');}finally{await handle.close();}}
const database='sterlyn_restore_'+randomUUID().replaceAll('-',''),Bucket='sterlyn-restore-'+randomUUID(),adminUrl=new URL(source);adminUrl.pathname='/postgres';const client=new pg.Client({connectionString:adminUrl.toString()}),s3=storage();let databaseCreated=false,bucketCreated=false;const uploaded:string[]=[];
try{
 await decrypt('manifest.enc',join(dir,'manifest.json'));const manifest=JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
 if(manifest.version!==1||!manifest.tables||!Array.isArray(manifest.objects))throw Error('Unsupported manifest');
 if(await decrypt(manifest.database.file,join(dir,'database.dump'))!==manifest.database.sha256)throw Error('Database backup checksum mismatch');
 await client.connect();await client.query('CREATE DATABASE '+database);databaseCreated=true;
 await promisify(execFile)(join(process.env.PG_TOOLS_PATH,'pg_restore'),['-h',source.hostname,'-p',source.port||'5432','-U',decodeURIComponent(source.username),'--no-owner','--no-privileges','--exit-on-error','-d',database,join(dir,'database.dump')],{env:{...process.env,PGPASSWORD:decodeURIComponent(source.password)},timeout:600000});
 const restoredUrl=new URL(source);restoredUrl.pathname='/'+database;const restored=new pg.Client({connectionString:restoredUrl.toString()});await restored.connect();try{for(const [table,expected] of Object.entries(manifest.tables)){const identifier='"'+table.replaceAll('"','""')+'"';const row=(await restored.query(`SELECT count(*)::int AS count,md5(coalesce(string_agg(h,'' ORDER BY h),'')) AS fingerprint FROM (SELECT md5(to_jsonb(t)::text) h FROM ${identifier} t) data`)).rows[0];if(JSON.stringify(row)!==JSON.stringify(expected))throw Error('Restored database differs from manifest');}}finally{await restored.end();}
 await s3.send(new CreateBucketCommand({Bucket}));bucketCreated=true;
 for(const item of manifest.objects){const file=join(dir,'object');if(await decrypt(item.file,file)!==item.sha256)throw Error('Object backup checksum mismatch');await s3.send(new PutObjectCommand({Bucket,Key:item.key,Body:createReadStream(file),ContentType:item.contentType,Metadata:item.metadata,ContentLength:(await stat(file)).size}));uploaded.push(item.key);const read=await s3.send(new GetObjectCommand({Bucket,Key:item.key})),hash=createHash('sha256');for await(const chunk of read.Body as AsyncIterable<Uint8Array>)hash.update(chunk);if(hash.digest('hex')!==item.sha256)throw Error('Restored object checksum mismatch');await rm(file);}
 console.log(JSON.stringify({encryptedRestore:'passed',tables:Object.keys(manifest.tables).length,objects:uploaded.length,checksums:'matched'}));
}finally{if(bucketCreated){for(const Key of uploaded)await s3.send(new DeleteObjectCommand({Bucket,Key}));await s3.send(new DeleteBucketCommand({Bucket}));}if(databaseCreated)await client.query('DROP DATABASE '+database);await client.end().catch(()=>{});await rm(dir,{recursive:true,force:true});}
