import {db} from '@/lib/db';
export const dynamic='force-dynamic';
export default async function sitemap(){const base=process.env.BETTER_AUTH_URL||'http://localhost:3000';const products=await db.product.findMany({where:{status:'published'},select:{slug:true,updatedAt:true}});return [{url:base},...['collections','inspiration','contact','design-studio'].map(p=>({url:base+'/'+p})),...products.map(p=>({url:base+'/products/'+p.slug,lastModified:p.updatedAt}))];}
