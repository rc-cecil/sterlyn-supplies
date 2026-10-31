import 'dotenv/config';
import {randomUUID} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {db} from '../src/lib/db';
const base='http://127.0.0.1:3000',email=`filter-check-${randomUUID()}@sterlyn.test`,password=randomUUID()+randomUUID();
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))throw Error('Local verification only');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({baseURL:base});
try{
 let r=await context.request.post('/api/auth/sign-up/email',{headers:{Origin:base},data:{email,password,name:'Filter verification'}});expect(r.ok()).toBe(true);
 await db.user.update({where:{email},data:{emailVerified:true,role:'admin'}});
 r=await context.request.post('/api/auth/sign-in/email',{headers:{Origin:base},data:{email,password}});expect(r.ok()).toBe(true);
 const page=await context.newPage();
 const loaded=page.waitForResponse(r=>r.url().includes('/api/admin/product-workspace'),{timeout:30000});await page.goto('/admin/products');await loaded;
 const toolbar=page.getByRole('search',{name:'Filter products'});
 await expect(toolbar).toBeVisible();
 for(const size of [{width:1440,height:1000},{width:1024,height:768},{width:390,height:844}]){
  await page.setViewportSize(size);
  await expect(toolbar.getByLabel('Search products')).toBeVisible();
  const boxes=await toolbar.locator('input,select').evaluateAll(elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {height:r.height,left:r.left,right:r.right,top:r.top};}));
  for(const box of boxes){expect(box.height).toBe(44);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(size.width);}
  if(size.width===1440)expect(new Set(boxes.map(b=>b.top)).size).toBe(1);
  await page.screenshot({path:`test-results/admin-filters-${size.width}.png`});if(size.width===1440)await toolbar.screenshot({path:'test-results/admin-filter-toolbar.png'});
 }
 await page.setViewportSize({width:1440,height:1000});
 await toolbar.getByLabel('Search products').fill('walnut');
 await expect(toolbar.getByRole('button',{name:'Clear filters'})).toBeVisible();
 await toolbar.getByRole('combobox',{name:'Status',exact:true}).selectOption('published');
 await toolbar.getByRole('button',{name:'Clear filters'}).click();
 await expect(toolbar.getByLabel('Search products')).toHaveValue('');await expect(toolbar.getByRole('combobox',{name:'Status',exact:true})).toHaveValue('');
 await page.getByRole('button',{name:'Add product',exact:true}).click();
 const style=page.getByRole('dialog').getByRole('combobox',{name:'Style',exact:true});
 await style.click();
 await expect(style).toHaveCSS('outline-style','none');
 await page.keyboard.press('Tab');
 const material=page.getByRole('dialog').getByLabel('Material or finish direction');
 await expect(material).toBeFocused();await expect(material).toHaveCSS('outline-style','solid');
 console.log('PASS: aligned desktop filters, responsive tablet/phone layout, filter reset, no pointer focus outline, visible keyboard focus.');
}finally{await context.close();await browser.close();await db.notification.deleteMany({where:{recipient:email}});await db.user.deleteMany({where:{email}});await db.$disconnect();}
