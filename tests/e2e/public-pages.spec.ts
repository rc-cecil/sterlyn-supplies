import {test,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
test('product, journal and company pages fit desktop tablet and mobile',async({browser})=>{
 test.setTimeout(240000);await mkdir('out/release-evidence',{recursive:true});const report:unknown[]=JSON.parse(await readFile('out/release-evidence/image-and-navigation-report.json','utf8').catch(()=>'[]')).filter((row:{label:string})=>!row.label.startsWith('public-'));
 for(const [label,width,height,dpr] of [['desktop',1440,1000,1],['tablet',820,1180,2],['mobile',390,844,2]] as const){
  const context=await browser.newContext({baseURL:process.env.E2E_BASE_URL||'http://localhost:3002',viewport:{width,height},deviceScaleFactor:dpr,reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.name));
  for(const route of ['/products/the-emerald-room','/inspiration','/inspiration/the-emerald-room','/checkout','/about','/contact','/faq','/delivery','/returns','/privacy','/terms','/account/reset-password']){
   const response=await page.goto(route);expect(response?.ok()).toBe(true);await expect(page.locator('main h1')).toBeVisible();await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   report.push({label:'public-'+label,route,images:await page.evaluate(()=>Array.from(document.images).filter(image=>image.getBoundingClientRect().width>100).map(image=>({src:image.currentSrc,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,displayWidth:Math.round(image.getBoundingClientRect().width),displayHeight:Math.round(image.getBoundingClientRect().height),objectFit:getComputedStyle(image).objectFit,srcSet:image.srcset,sizes:image.sizes,deliveredEncodedBytes:(performance.getEntriesByName(image.currentSrc)[0] as PerformanceResourceTiming|undefined)?.encodedBodySize||null,dpr:devicePixelRatio})))});
   await page.screenshot({path:'out/release-evidence/public-'+label+'-'+route.slice(1).replaceAll('/','-')+'.png'});
  }
  expect(errors).toEqual([]);await context.close();
 }
 await writeFile('out/release-evidence/image-and-navigation-report.json',JSON.stringify(report,null,2));
});
