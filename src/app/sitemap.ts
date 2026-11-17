import type {MetadataRoute} from 'next';
import {db} from '@/lib/db';
import {publishedInspirations} from '@/lib/inspiration-content';
import {storefrontIndexing,storefrontOrigin} from '@/lib/storefront-seo';

export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if(!storefrontIndexing())return [];
 const [categories,products,stories]=await Promise.all([
  db.category.findMany({where:{products:{some:{status:'published'}}},select:{slug:true}}),
  db.product.findMany({where:{status:'published'},select:{slug:true,updatedAt:true}}),
  publishedInspirations(),
 ]);
 const url=(path:string)=>storefrontOrigin+path;
 return [
  ...['/','/collections','/inspiration','/contact','/design-studio'].map(path=>({url:url(path)})),
  ...categories.filter(({slug})=>!['storage','taps','bathrooms'].includes(slug)).map(({slug})=>({url:url('/collections/'+encodeURIComponent(slug))})),
  ...products.map(({slug,updatedAt})=>({url:url('/products/'+encodeURIComponent(slug)),lastModified:updatedAt})),
  ...stories.map(({slug})=>({url:url('/inspiration/'+encodeURIComponent(slug))})),
 ];
}
