import EmbeddedPostgres from 'embedded-postgres';
import { mkdir,access } from 'node:fs/promises';
await mkdir('.local',{recursive:true});
const pg=new EmbeddedPostgres({databaseDir:'.local/postgres',user:'sterlyn',password:'local-development-only',port:55432,persistent:true});
let initialized=false;try{await access('.local/postgres/PG_VERSION');initialized=true;}catch{}
if(!initialized)await pg.initialise();
await pg.start();
try{await pg.createDatabase('sterlyn');}catch(e){if(!String(e).includes('already exists'))throw e;}
console.log('PostgreSQL ready on localhost:55432; data persists in .local/postgres');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await pg.stop();process.exit(0);});
setInterval(()=>{},60000);
