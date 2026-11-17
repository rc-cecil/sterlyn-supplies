import type {MetadataRoute} from 'next';
import {storefrontIndexing,storefrontOrigin} from '@/lib/storefront-seo';

export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{
 // Allow crawlers to read noindex on non-public pages and redirects.
 return storefrontIndexing()?{rules:{userAgent:'*',allow:'/'},sitemap:storefrontOrigin+'/sitemap.xml'}:
  {rules:{userAgent:'*',disallow:'/'}};
}
