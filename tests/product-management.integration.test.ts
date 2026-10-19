import {afterAll,describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../src/lib/db';
const actor=vi.hoisted(()=>({id:'product-management-test',role:'owner'}));
vi.mock('../src/lib/security',async original=>({...await original<object>(),staff:vi.fn(async()=>{if(actor.role==='customer')throw Object.assign(new Error('Denied'),{status:403});return actor;})}));
const {manageProduct,manageCategory}=await import('../src/lib/product-management');
const {overview}=await import('../src/lib/admin-overview');
const enabled=process.env.RUN_DATABASE_TESTS==='true';if(enabled&&new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw Error('Isolated test database required');
const ids:string[]=[],cats:string[]=[],assets:string[]=[];
describe.skipIf(!enabled)('product management persistence',()=>{
 afterAll(async()=>{if(!enabled)return;await db.product.deleteMany({where:{id:{in:ids}}});await db.category.deleteMany({where:{id:{in:cats}}});await db.mediaAsset.deleteMany({where:{id:{in:assets}}});await db.$disconnect();});
 it('creates, publishes, reassigns and archives with stable identifiers and rejects conflicting edits',async()=>{
 const c=await manageCategory({name:'Fixture '+randomUUID(),image:'/images/products/forest-shaker.webp'});cats.push(c.record.id);
 const d=await manageCategory({name:'Fixture '+randomUUID(),image:'/images/products/ivory-framed.webp'});cats.push(d.record.id);
 const input={name:'Fixture product',description:'A synthetic acceptance fixture.',categoryId:c.record.id,style:'Modern',material:'Concept',status:'draft',illustrative:true,featured:false,trackStock:false,pictures:[]};
 const first=await manageProduct(input);ids.push(first.record.id);expect(first.record.variants).toHaveLength(1);expect(first.record.trackStock).toBe(false);
 await expect(manageProduct({...input,id:first.record.id,expectedUpdatedAt:first.record.updatedAt.toISOString(),status:'published'})).rejects.toMatchObject({status:400});
 const published=await manageProduct({...input,id:first.record.id,expectedUpdatedAt:first.record.updatedAt.toISOString(),status:'published',pictures:[{source:'/images/products/forest-shaker.webp',alt:'Forest shaker product'}]});expect(published.record.pictures).toHaveLength(1);
 const command={...input,id:first.record.id,expectedUpdatedAt:published.record.updatedAt.toISOString(),categoryId:d.record.id,status:'published',pictures:[{source:'/images/products/ivory-framed.webp',alt:'Ivory product'}]};
 const concurrent=await Promise.allSettled([manageProduct(command),manageProduct(command)]);expect(concurrent.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(await db.product.count({where:{categoryId:c.record.id,status:'published'}})).toBe(0);expect(await db.product.count({where:{categoryId:d.record.id,status:'published'}})).toBe(1);
 const current=await db.product.findUniqueOrThrow({where:{id:first.record.id}});await manageProduct({...command,expectedUpdatedAt:current.updatedAt.toISOString(),status:'archived'});expect(await db.product.count({where:{id:first.record.id,status:'published'}})).toBe(0);
 expect(await db.auditLog.count({where:{entityId:first.record.id}})).toBeGreaterThanOrEqual(4);
 });
 it('allows draft processing images but denies publishing unapproved pictures and forged paths',async()=>{const a=await db.mediaAsset.create({data:{name:'fixture',mime:'image/png',size:12,key:'fixture/'+randomUUID(),alt:'Synthetic fixture'}});assets.push(a.id);const input={name:'Upload fixture',description:'Synthetic test',categoryId:cats[0],style:'Modern',material:'Concept',status:'draft',illustrative:true,featured:false,trackStock:false,pictures:[{source:'/api/media/'+a.id,alt:'Pending fixture'}]};const draft=await manageProduct(input);ids.push(draft.record.id);expect(draft.record.pictures[0].assetId).toBe(a.id);await expect(manageProduct({...input,id:draft.record.id,expectedUpdatedAt:draft.record.updatedAt.toISOString(),status:'published'})).rejects.toMatchObject({status:409});await expect(manageProduct({...input,pictures:[{source:'https://example.com/file',alt:'Invalid source'}]})).rejects.toMatchObject({status:400});});
 it('filters overview data by role and denies customer mutation',async()=>{actor.role='catalogue';const stats=await overview();expect(stats.products).toBe(await db.product.count({where:{status:'published'}}));expect(stats.customers).toBeNull();expect(stats.orders).toBeNull();expect(stats.recentOrders).toEqual([]);actor.role='customer';await expect(manageCategory({})).rejects.toMatchObject({status:403});actor.role='owner';});
});
