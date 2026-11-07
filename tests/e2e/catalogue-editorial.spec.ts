import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
const categories=[['kitchens',4],['cabinetry',6],['islands',3],['worktops',3],['sinks',6]] as const;
test('each category has products; journal imagery and actions are independent',async({page})=>{
 test.setTimeout(90000);const images=new Set<string>();
 for(const [category,count] of categories){await page.goto('/collections/'+category);if(category===categories[0])await page.getByRole('button',{name:'Essential only'}).click();await expect(page.locator('.product-card')).toHaveCount(count);await expect(page.locator('.product-card h3').first()).toBeVisible();for(const src of await page.locator('.product-image img').evaluateAll(nodes=>nodes.map(n=>(n as HTMLImageElement).getAttribute('src')||'')))images.add(src);}
 expect(images.size).toBe(22);
 await page.goto('/collections/storage');await expect(page).toHaveURL(/\/collections\/cabinetry$/);
 await page.goto('/collections/taps');await expect(page).toHaveURL(/\/collections\/sinks$/);
 await page.goto('/collections/bathrooms');await expect(page).toHaveURL(/\/collections$/);
 await page.goto('/inspiration');await expect(page.locator('.inspiration-grid>a')).toHaveCount(6);await expect(page.getByRole('button',{name:'Quick view'})).toHaveCount(0);
 const journalImages=await page.locator('.inspiration-grid img').evaluateAll(nodes=>nodes.map(n=>(n as HTMLImageElement).getAttribute('src')||''));expect(journalImages.every(src=>!images.has(src))).toBe(true);
 await page.getByRole('heading',{name:'The Emerald Room'}).click();await expect(page).toHaveURL(/\/inspiration\/the-emerald-room$/,{timeout:30000});await expect(page.locator('main h1')).toHaveText('The Emerald Room');await expect(page.getByRole('button',{name:'Add to bag'})).toHaveCount(0);await expect(page.getByRole('link',{name:'Browse related products'})).toHaveAttribute('href','/collections/kitchens');
});
test('collections and journal remain accessible at three widths',async({browser})=>{
 test.setTimeout(360000);await mkdir('out/catalogue-review',{recursive:true});const report:unknown[]=[];
 for(const [label,width,height] of [['desktop',1440,1000],['tablet',820,1180],['mobile',390,844]] as const){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:label==='desktop'?1:2,reducedMotion:'reduce',baseURL:process.env.E2E_BASE_URL||'http://localhost:3002'});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/collections','/collections/cabinetry','/products/sink-and-tap-study','/inspiration','/inspiration/marble-at-dusk']){
 await page.goto(route);if(route==='/collections')await page.getByRole('button',{name:'Essential only'}).click();await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.querySelectorAll('main img')).map(async node=>{const image=node as HTMLImageElement;image.loading='eager';await image.decode().catch(()=>{});}));});await expect(page.locator('main h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 const axe=await new AxeBuilder({page}).include('main').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([]);await page.screenshot({path:'out/catalogue-review/'+label+route.replaceAll('/','-')+'.png',fullPage:true});console.log('Checked',label,route);
 report.push({label,route,images:await page.locator('main img').evaluateAll(nodes=>nodes.map(n=>{const image=n as HTMLImageElement;return {src:image.currentSrc,loaded:image.complete&&image.naturalWidth>0,displayWidth:Math.round(image.getBoundingClientRect().width),naturalWidth:image.naturalWidth,dpr:devicePixelRatio};}))});
 }expect(errors).toEqual([]);await context.close();}
 await writeFile('out/catalogue-review/browser-report.json',JSON.stringify(report,null,2));
});
