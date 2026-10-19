import 'dotenv/config';
import assert from 'node:assert/strict';
import {db} from '../src/lib/db';
import {catalogueCategories,catalogueProducts,productImage} from '../src/lib/catalogue-content';
import {inspirationStories} from '../src/lib/inspiration';
try{
 const products=await db.product.findMany({where:{slug:{in:catalogueProducts.map(p=>p.slug)}},include:{category:true,variants:true}});
 assert.equal(products.length,18,'All eighteen product directions must persist');
 const journalImages=new Set<string>(inspirationStories.map(s=>s.image));
 const categories=catalogueCategories.map(([slug,name])=>{const rows=products.filter(p=>p.category.slug===slug&&p.status==='published');assert.ok(rows.length>=3,slug+' needs three published products');return {slug,name,publishedProducts:rows.length};});
 for(const entry of catalogueProducts){const p=products.find(p=>p.slug===entry.slug)!;assert.equal(p.name,entry.name);assert.equal(p.image,productImage(entry.asset));assert.ok(!journalImages.has(p.image));assert.equal(p.illustrative,true);assert.ok(p.variants.every(v=>!v.verified&&v.price===null&&v.stock===0),'No commercial claims invented');}
 assert.equal(new Set(products.map(p=>p.image)).size,18);
 const refreshes=await db.auditLog.findMany({where:{action:'catalogue.illustrative-refresh'},select:{entityId:true}});
 assert.ok(refreshes.every(a=>products.some(p=>p.id===a.entityId)),'Refreshed IDs must remain intact');
 console.log(JSON.stringify({categories,uniqueProductImages:18,journalStories:inspirationStories.length,sharedProductJournalImages:0,refreshAuditRecords:refreshes.length,refreshedIdsPreserved:true,quoteOnly:true},null,2));
}finally{await db.$disconnect();}
