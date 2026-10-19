import 'dotenv/config';
import pg from 'pg';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const exec=promisify(execFile);
const source=new URL(process.env.TEST_DATABASE_URL||'postgresql://sterlyn:local-development-only@localhost:55432/sterlyn_test');
if(source.pathname!=='/sterlyn_test')throw new Error('Restore exercise requires the isolated test database');
const tools=process.env.PG_TOOLS_PATH;if(!tools)throw new Error('Set PG_TOOLS_PATH to the installed PostgreSQL binary directory');
const database='sterlyn_restore_check';const adminUrl=new URL(source);adminUrl.pathname='/postgres';
const admin=new pg.Client({connectionString:adminUrl.toString()});await admin.connect();let created=false;
const env={...process.env,PGPASSWORD:decodeURIComponent(source.password)};
const connection=['-h',source.hostname,'-p',source.port||'5432','-U',decodeURIComponent(source.username)];
try{
 if((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[database])).rowCount)throw new Error('Restore-check database already exists; refusing to overwrite it');
 await mkdir('.local/backups',{recursive:true});const backup=resolve('.local/backups/test-restore.dump');
 await exec(join(tools,'pg_dump'),[...connection,'-Fc','--no-owner','-f',backup,'sterlyn_test'],{env});
 await admin.query('CREATE DATABASE '+database);created=true;
 await exec(join(tools,'pg_restore'),[...connection,'--no-owner','--no-privileges','--exit-on-error','-d',database,backup],{env});
 const restoredUrl=new URL(source);restoredUrl.pathname='/'+database;
 const a=new pg.Client({connectionString:source.toString()}),b=new pg.Client({connectionString:restoredUrl.toString()});await a.connect();await b.connect();
 try{const tables=(await a.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;for(const {tablename} of tables){const identifier='"'+String(tablename).replaceAll('"','""')+'"';const query=`SELECT count(*)::int AS count, md5(coalesce(string_agg(row_hash, '' ORDER BY row_hash),'')) AS fingerprint FROM (SELECT md5(to_jsonb(t)::text) AS row_hash FROM ${identifier} t) rows`;const original=(await a.query(query)).rows[0],restored=(await b.query(query)).rows[0];if(original.count!==restored.count||original.fingerprint!==restored.fingerprint)throw new Error('Restored data mismatch: '+tablename);}console.log(JSON.stringify({restore:'passed',verification:'row counts and full-row fingerprints',tablesCompared:tables.length,backup:'.local/backups/test-restore.dump'}));}finally{await a.end();await b.end();}
}finally{if(created)await admin.query('DROP DATABASE '+database);await admin.end();}
