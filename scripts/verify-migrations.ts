import 'dotenv/config';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile),source=new URL(process.env.TEST_DATABASE_URL||'postgresql://sterlyn:local-development-only@localhost:55432/sterlyn_test');
if(source.pathname!=='/sterlyn_test')throw Error('Migration verification requires isolated test configuration');
const name='sterlyn_migration_'+randomUUID().replaceAll('-',''),adminUrl=new URL(source);adminUrl.pathname='/postgres';
const client=new pg.Client({connectionString:adminUrl.toString()});await client.connect();let created=false;
try{
 await client.query('CREATE DATABASE '+name);created=true;const target=new URL(source);target.pathname='/'+name;
 const env={...process.env,DATABASE_URL:target.toString()};
 await exec(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env,timeout:120000,maxBuffer:1024*1024});
 await exec(process.execPath,['node_modules/prisma/build/index.js','migrate','diff','--from-config-datasource','--to-schema','prisma/schema.prisma','--exit-code'],{env,timeout:120000,maxBuffer:1024*1024});
 console.log(JSON.stringify({freshMigrations:'passed',schemaDrift:'none'}));
}finally{if(created)await client.query('DROP DATABASE '+name);await client.end();}
