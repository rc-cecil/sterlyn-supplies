import 'dotenv/config';
import pg from 'pg';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const source=new URL(process.env.TEST_DATABASE_URL||'postgresql://sterlyn:local-development-only@localhost:55432/sterlyn_test');
if(source.pathname!=='/sterlyn_test')throw Error('Runtime-role verification requires isolated sterlyn_test');
const role='sterlyn_rolecheck_'+randomBytes(8).toString('hex'),password=randomBytes(48).toString('hex'),admin=new pg.Client({connectionString:source.toString()});await admin.connect();let runtime:pg.Client|undefined,created=false;
try{
 await admin.query('CREATE ROLE '+role+" LOGIN PASSWORD '"+password+"'");created=true;
 const file=await readFile('ops/runtime-role.sql','utf8'),sql=file.slice(file.indexOf('BEGIN;')).replaceAll(':"runtime_role"','"'+role+'"');await admin.query(sql);
 const connection=new URL(source);connection.username=role;connection.password=password;runtime=new pg.Client({connectionString:connection.toString()});await runtime.connect();
 await runtime.query('SELECT id FROM "user" LIMIT 0');
 let denied=0;for(const sql of ['UPDATE "AuditLog" SET action=action WHERE false','DELETE FROM "AuditLog" WHERE false','TRUNCATE "AuditLog"','DELETE FROM _prisma_migrations WHERE false','CREATE TABLE public.runtime_escape(id int)']){try{await runtime.query(sql);throw Error('Restricted command unexpectedly succeeded');}catch(error){if((error as {code?:string}).code!=='42501')throw error;denied++;}}
 console.log(JSON.stringify({runtimeRole:'passed',ordinaryRead:'passed',auditUpdateDeleteTruncate:'denied',migrationMutation:'denied',publicSchemaCreation:'denied',restrictedCommands:denied}));
}finally{await runtime?.end();if(created){await admin.query('DROP OWNED BY '+role);await admin.query('DROP ROLE '+role);}await admin.end();}
