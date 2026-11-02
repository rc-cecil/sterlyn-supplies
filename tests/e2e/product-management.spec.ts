import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import {bootstrapOwner} from '../../src/lib/owner-bootstrap';
import {db} from '../../src/lib/db';
import {authPost} from './auth-helpers';
test('nontechnical product editor publishes and moves products; five-task responsive administration',async({page})=>{
 test.setTimeout(240000);if(new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw Error('Isolated database required');
 const email=randomUUID()+'@product-test.invalid',password=randomUUID()+randomUUID(),name='Acceptance '+randomUUID().slice(0,8);const owner=await bootstrapOwner({email,password});const origin='http://localhost:3002';let productId:string|undefined;
 try{expect((await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email,password}})).ok()).toBe(true);
 await page.goto('/admin/products');await expect(page.getByRole('heading',{name:'Products',exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Administration',exact:true}).getByRole('link')).toHaveCount(5);
 await page.getByRole('button',{name:'Add product',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Product name',{exact:true}).fill(name);await dialog.getByLabel('Description',{exact:true}).fill('Synthetic acceptance product with no commercial claims.');await dialog.getByRole('button',{name:'Choose from image library'}).click();await dialog.getByRole('button',{name:'Use picture',exact:true}).first().click();await dialog.getByRole('button',{name:'Publish',exact:true}).click();await expect(dialog.getByRole('status').filter({hasText:'Product published in its category.'})).toBeVisible();const record=await db.product.findFirstOrThrow({where:{name}});productId=record.id;expect(record.status).toBe('published');expect(record.trackStock).toBe(false);
 const choices=await db.category.findMany({where:{id:{not:record.categoryId}}});await dialog.getByLabel('Show this product in').selectOption(choices[0].id);await dialog.getByRole('button',{name:'Publish',exact:true}).click();await expect.poll(async()=>(await db.product.findUniqueOrThrow({where:{id:productId}})).categoryId).toBe(choices[0].id);await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await page.goto('/collections/'+choices[0].slug);await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 await mkdir('out/admin-simplified',{recursive:true});for(const [label,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]] as const){await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});for(const route of ['','products','categories','settings']){await page.goto('/admin/'+route);await expect(page.locator('.admin-content')).toBeVisible();await expect(page.locator('.admin-content')).not.toContainText('Loading your business activity');await expect(page.locator('.admin-content')).not.toContainText('Loading products');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const axe=await new AxeBuilder({page}).include('.admin-main').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations).toEqual([]);await page.screenshot({path:'out/admin-simplified/'+label+'-'+(route||'overview')+'.png',fullPage:true});}}
 expect((await page.request.post('/api/insights',{headers:{origin},data:{question:'Show orders'}})).status()).toBe(404);
 }finally{if(productId)await db.product.delete({where:{id:productId}});await db.user.delete({where:{id:owner.id}});await db.$disconnect();}
});
