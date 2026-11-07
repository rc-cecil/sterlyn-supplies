import {describe,it,expect} from 'vitest';
import {existsSync,readdirSync} from 'node:fs';
import sharp from 'sharp';
import {supplierCatalogueProducts} from '../src/lib/supplier-catalogue';
import {supplierInspirationStories} from '../src/lib/supplier-inspiration';

describe('refined supplier photograph integrity',()=>{
 it('keeps model-matched local source photographs available',()=>{
   const imageDir='public/images/supplier';
   const files=readdirSync(imageDir).filter(name=>name.endsWith('.webp'));
   expect(files.length).toBeGreaterThanOrEqual(36);
   const photos=[
     ...supplierCatalogueProducts.map(p=>p.sourcePhoto).filter((p):p is string=>typeof p==='string'),
     ...supplierInspirationStories.map(s=>s.sourcePhoto).filter((p):p is string=>typeof p==='string')
   ];
   expect(photos).toHaveLength(4);
   expect(new Set(photos).size).toBe(4);
   for(const path of photos){
     expect(path.startsWith('/images/supplier/')).toBe(true);
     expect(existsSync('public'+path)).toBe(true);
   }
 });
 it('publishes sufficient canvas dimensions without stretching product geometry',async()=>{
   const files=readdirSync('public/images/supplier').filter(name=>name.endsWith('.webp'));
   for(const name of files){
     const meta=await sharp('public/images/supplier/'+name).metadata();
     expect(meta.format).toBe('webp');
     expect(meta.width).toBeGreaterThanOrEqual(800);
     expect(meta.height).toBeGreaterThanOrEqual(500);
   }
 });
});
