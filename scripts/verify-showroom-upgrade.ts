import 'dotenv/config';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=new URL(process.env.TEST_DATABASE_URL||'postgresql://sterlyn:local-development-only@localhost:55432/sterlyn_test');
if(source.pathname!=='/sterlyn_test')throw Error('Upgrade verification requires isolated test configuration');
const name='sterlyn_upgrade_'+randomUUID().replaceAll('-',''),adminUrl=new URL(source);adminUrl.pathname='/postgres';const admin=new pg.Client({connectionString:adminUrl.toString()});await admin.connect();let created=false,target:pg.Client|undefined;
try{
 await admin.query('CREATE DATABASE '+name);created=true;const url=new URL(source);url.pathname='/'+name;target=new pg.Client({connectionString:url.toString()});await target.connect();
 const migrations=(await readdir('prisma/migrations')).filter(file=>/^\d/.test(file)).sort();const upgrade='20261101090000_showroom_operations';
 for(const migration of migrations.filter(file=>file<upgrade))await target.query(await readFile(`prisma/migrations/${migration}/migration.sql`,'utf8'));
 await target.query(`INSERT INTO "Category" (id,slug,name,image) VALUES ('legacy-category','legacy-category','Legacy fixture','/images/kitchen-walnut-v2.webp');
 INSERT INTO "Product" (id,slug,name,description,"categoryId",style,material,image,gallery,"updatedAt") VALUES ('legacy-product','legacy-product','Legacy product','Fixture','legacy-category','Modern','Wood','/images/kitchen-walnut-v2.webp',ARRAY[]::text[],NOW());
 INSERT INTO "Variant" (id,"productId",sku,name,color) VALUES ('legacy-variant','legacy-product','LEGACY-FIXTURE','Legacy finish','#153c30');
 INSERT INTO "Quote" (id,name,email,notes,items,"updatedAt") VALUES ('legacy-quote','Legacy customer','legacy@example.test','Retain commercial history','[]',NOW());
 INSERT INTO "Order" (id,"sourceQuoteId",email,name,address,"accessHash",status,currency,subtotal,tax,shipping,total,"updatedAt") VALUES ('legacy-order','legacy-quote','legacy@example.test','Legacy customer','{}','legacy-hash','delivered','GHS',500,0,0,500,NOW());
 INSERT INTO "OrderItem" (id,"orderId","variantId",name,sku,quantity,price) VALUES ('legacy-item','legacy-order','legacy-variant','Legacy item','LEGACY-FIXTURE',1,500);
 INSERT INTO "Payment" (id,"orderId",reference,status,amount) VALUES ('legacy-payment','legacy-order','LEGACY-RECEIPT','paid',500);
 INSERT INTO "Invoice" (id,"orderId",status,number,snapshot,"actorId") VALUES ('legacy-invoice','legacy-order','issued','LEGACY-INVOICE','{}','legacy-staff');`);
 const before=(await target.query('SELECT reference FROM "Quote" WHERE id=$1',['legacy-quote'])).rows[0].reference;
 for(const migration of migrations.filter(file=>file>=upgrade))await target.query(await readFile(`prisma/migrations/${migration}/migration.sql`,'utf8'));
 assert.equal((await target.query('SELECT reference FROM "Quote" WHERE id=$1',['legacy-quote'])).rows[0].reference,before);
 assert.equal((await target.query('SELECT reference FROM "Order" WHERE id=$1',['legacy-order'])).rows[0].reference,null);
 assert.equal((await target.query('SELECT provider,amount FROM "Payment" WHERE id=$1',['legacy-payment'])).rows[0].provider,'paystack');
 assert.equal((await target.query('SELECT price FROM "OrderItem" WHERE id=$1',['legacy-item'])).rows[0].price,500);
 assert.equal((await target.query('SELECT number FROM "Invoice" WHERE id=$1',['legacy-invoice'])).rows[0].number,'LEGACY-INVOICE');
 console.log(JSON.stringify({populatedLegacyUpgrade:'passed',historicalReferences:'preserved',commercialRecords:'preserved'}));
}finally{await target?.end();if(created)await admin.query('DROP DATABASE '+name);await admin.end();}
