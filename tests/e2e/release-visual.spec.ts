import {test,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
test('release layouts, image delivery and production CSP at three widths',async({browser})=>{
 test.setTimeout(300000);await mkdir('out/release-evidence',{recursive:true});const reports:unknown[]=process.env.VISUAL_VIEWPORT_FILTER?JSON.parse(await readFile('out/release-evidence/image-and-navigation-report.json','utf8').catch(()=>'[]')).filter((r:{label:string})=>r.label!==process.env.VISUAL_VIEWPORT_FILTER):[];
 for(const [label,width,height,dpr] of [['mobile',390,844,2],['tablet',820,1180,2],['desktop',1440,1000,1],['desktop-hidpi',1440,1000,2]] as const){
  if(process.env.VISUAL_VIEWPORT_FILTER&&process.env.VISUAL_VIEWPORT_FILTER!==label)continue;
  const context=await browser.newContext({baseURL:process.env.E2E_BASE_URL||'http://localhost:3002',viewport:{width,height},deviceScaleFactor:dpr,reducedMotion:'reduce'}),page=await context.newPage();
  await page.addInitScript(()=>{const metrics={cls:0,lcp:0};Object.assign(window,{sterlynReleaseMetrics:metrics});new PerformanceObserver(list=>{for(const item of list.getEntries()){const entry=item as PerformanceEntry&{hadRecentInput:boolean;value:number};if(!entry.hadRecentInput)metrics.cls+=entry.value;}}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const entry of list.getEntries())metrics.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.name));
  for(const route of ['/','/collections','/design-studio','/account','/cart']){
   const response=await page.goto(route);expect(response?.ok()).toBe(true);
   const csp=response?.headers()['content-security-policy']||'';expect(csp).toContain("'nonce-");expect(csp).not.toContain("'unsafe-eval'");expect(csp.split(';').find(v=>v.trim().startsWith('script-src'))).not.toContain("'unsafe-inline'");
   await page.evaluate(async()=>{await document.fonts.ready;for(const image of Array.from(document.images))if(image.loading!=='lazy')await image.decode().catch(()=>{});});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
   reports.push({label,route,performance:await page.evaluate(()=>(window as Window&{sterlynReleaseMetrics?:unknown}).sterlynReleaseMetrics),images:await page.evaluate(()=>Array.from(document.images).filter(i=>i.getBoundingClientRect().width>100).map(i=>({src:i.currentSrc,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,displayWidth:Math.round(i.getBoundingClientRect().width),displayHeight:Math.round(i.getBoundingClientRect().height),objectFit:getComputedStyle(i).objectFit,srcSet:i.srcset,sizes:i.sizes,deliveredEncodedBytes:(performance.getEntriesByName(i.currentSrc)[0] as PerformanceResourceTiming|undefined)?.encodedBodySize||null,dpr:devicePixelRatio}))),navigation:await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;return {domContentLoaded:n.domContentLoadedEventEnd,responseStart:n.responseStart};})});
   await page.screenshot({path:`out/release-evidence/${label}-${route==='/'?'home':route.slice(1)}.png`,fullPage:false});
  }
  expect(errors).toEqual([]);await context.close();
 }
 await writeFile('out/release-evidence/image-and-navigation-report.json',JSON.stringify(reports,null,2));
});
