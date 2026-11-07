import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {catalogueCategories,catalogueProducts,productImage} from '../src/lib/catalogue-content';
import {supplierCatalogueProducts} from '../src/lib/supplier-catalogue';
import {catalogueImageSchema} from '../src/lib/catalogue-image';
import {inspirationStories} from '../src/lib/inspiration';

function imageFor(product:(typeof catalogueProducts)[number]) {
  return 'sourcePhoto' in product && typeof product.sourcePhoto === 'string'
    ? product.sourcePhoto : productImage(product.asset);
}
describe('product collections and editorial separation',()=>{
 it('gives each category at least three products, distinct names and multiple real images',()=>{
  expect(catalogueCategories.map(([slug])=>slug)).toEqual(['kitchens','cabinetry','islands','worktops','sinks']);
  expect(catalogueProducts).toHaveLength(22);
  for(const [category] of catalogueCategories){
    const rows=catalogueProducts.filter(p=>p.category===category);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(new Set(rows.map(p=>p.slug)).size).toBe(rows.length);
    expect(new Set(rows.map(imageFor)).size).toBeGreaterThanOrEqual(3);
    rows.forEach(p=>expect(existsSync('public'+imageFor(p))).toBe(true));
  }
  expect(new Set(catalogueProducts.map(p=>p.slug)).size).toBe(catalogueProducts.length);
  expect(catalogueProducts.every(p=>!['bathrooms','taps','storage'].includes(p.category))).toBe(true);
  expect(catalogueProducts.every(p=>!/wardrobe|closet|bathroom|vanity|basin/i.test(p.name))).toBe(true);
 });
 it('allows bundled product images for editing and CSV while rejecting remote and traversal paths',()=>{
  expect(catalogueImageSchema.safeParse('/images/products/forest-shaker.webp').success).toBe(true);
  expect(catalogueImageSchema.safeParse('/images/sterlyn-official-logo.jpg').success).toBe(true);
  for(const path of ['/images/products/../secret.png','/images/../../secret.png','https://example.com/image.png','/images/other/image.webp','/images/%2e%2e/secret.png','/images/image.html'])expect(catalogueImageSchema.safeParse(path).success).toBe(false);
 });
 it('keeps editorial titles distinct from product titles, while allowing supplier-photo references',()=>{
  const productNames=new Set(catalogueProducts.map(p=>p.name.toLowerCase()));
  for(const story of inspirationStories){
    expect(productNames.has(story.title.toLowerCase())).toBe(false);
    expect(existsSync('public'+story.image)).toBe(true);
    if('sourcePhoto' in story && story.sourcePhoto)expect(existsSync('public'+story.sourcePhoto)).toBe(true);
  }
  expect(inspirationStories.length).toBeGreaterThanOrEqual(6);
 });
 it('supplies genuine source references and labels product versus packaging dimensions',()=>{
  expect(supplierCatalogueProducts).toHaveLength(4);
  expect(supplierCatalogueProducts.map(p=>p.category)).toEqual(['kitchens','sinks','sinks','sinks']);
  expect(new Set(supplierCatalogueProducts.map(p=>p.referenceCode)).size).toBe(4);
  for(const p of supplierCatalogueProducts){
    expect(p.referenceCode.trim().length).toBeGreaterThan(0);
    expect(p.sourcePdfPage).toBeGreaterThan(0);
    expect(p.sourcePdfPage).toBeLessThanOrEqual(96);
    expect(['custom','product','packaging']).toContain(p.dimensionKind);
    expect(p.dimensions.length).toBeGreaterThan(0);
    if(p.dimensionKind==='packaging')expect(p.dimensions).toMatch(/packaging/i);
  }
 });
});
