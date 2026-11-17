import {afterEach,describe,expect,it,vi} from 'vitest';
import {storefrontMetadata} from '../src/lib/storefront-seo';

afterEach(()=>vi.unstubAllEnvs());
describe('storefront indexing',()=>{
 it('only enables indexing on the explicitly launched canonical origin',()=>{
  const details={path:'/products/walnut',title:'Walnut',description:'Walnut cabinetry in Accra.'};
  vi.stubEnv('PUBLIC_LAUNCH','true');
  vi.stubEnv('BETTER_AUTH_URL','https://preview.example');
  expect(storefrontMetadata(details).robots).toEqual({index:false,follow:true});
  vi.stubEnv('BETTER_AUTH_URL','https://sterlynsupplies.com/');
  const metadata=storefrontMetadata(details);
  expect(metadata.robots).toEqual({index:true,follow:true});
  expect(metadata.alternates?.canonical).toBe('https://sterlynsupplies.com/products/walnut');
  expect(storefrontMetadata({path:'/',description:details.description}).title).toEqual({absolute:'Sterlyn Supplies — Kitchen design & furniture in Accra'});
  expect(metadata.openGraph).toMatchObject({url:metadata.alternates?.canonical,title:'Walnut | Sterlyn Supplies'});
  expect(storefrontMetadata({...details,index:false}).robots).toEqual({index:false,follow:true});
  vi.stubEnv('PUBLIC_LAUNCH','false');
  expect(storefrontMetadata(details).robots).toEqual({index:false,follow:true});
 });
});
