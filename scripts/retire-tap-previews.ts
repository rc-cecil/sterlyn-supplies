import {config} from 'dotenv';
config({path:process.argv.includes('--production')?'.env.production.local':'.env',override:true,quiet:true});
if(process.argv.includes('--production')&&!new URL(process.env.DATABASE_URL||'').hostname.endsWith('.neon.tech'))throw Error('Production curation requires the configured Neon database.');
const {retireTapPreviews}=await import('../src/lib/catalogue-curation');
const {db}=await import('../src/lib/db');
try{console.log(JSON.stringify(await retireTapPreviews()));}finally{await db.$disconnect();}
