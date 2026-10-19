import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {catalogueCategories,catalogueProducts,productImage} from '../src/lib/catalogue-content';
import {catalogueImageSchema} from '../src/lib/catalogue-image';
import {inspirationStories} from '../src/lib/inspiration';
describe('product collections and editorial separation',()=>{
 it('gives every category three distinct products and images',()=>{
  for(const [category] of catalogueCategories){const rows=catalogueProducts.filter(p=>p.category===category);expect(rows.length).toBeGreaterThanOrEqual(3);expect(new Set(rows.map(p=>p.asset)).size).toBe(rows.length);}
  expect(new Set(catalogueProducts.map(p=>p.slug)).size).toBe(catalogueProducts.length);
 });
 it('allows bundled product images for editing and CSV while rejecting remote and traversal paths',()=>{
  expect(catalogueImageSchema.safeParse('/images/products/forest-shaker.webp').success).toBe(true);
  expect(catalogueImageSchema.safeParse('/images/sterlyn-official-logo.jpg').success).toBe(true);
  for(const path of ['/images/products/../secret.png','/images/../../secret.png','https://example.com/image.png','/images/other/image.webp','/images/%2e%2e/secret.png','/images/image.html'])expect(catalogueImageSchema.safeParse(path).success).toBe(false);
 });
 it('keeps room stories out of product names and imagery',()=>{
  const editorialImages=new Set<string>(inspirationStories.map(s=>s.image));
  for(const product of catalogueProducts){expect(product.name).not.toMatch(/room|study|dusk|inspiration/i);expect(editorialImages.has(productImage(product.asset))).toBe(false);expect(existsSync('public'+productImage(product.asset))).toBe(true);}
  expect(inspirationStories.length).toBeGreaterThanOrEqual(6);
 });
});
