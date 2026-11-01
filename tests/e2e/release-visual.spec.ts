import {test,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
// These captures measure layout, assets and CSP. Exercise the accessible fallback
// so software WebGL does not consume the runner; logo-render.spec covers live 3D in its own browser.
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),args:['--disable-webgl']}});
for(const [label,width,height,dpr] of [['mobile',390,844,2],['tablet',820,1180,2],['desktop',1440,1000,1],['desktop-hidpi',1440,1000,2]] as const){
 test(`release layout, image delivery and production CSP · ${label}`,async({browser})=>{
  test.skip(!!process.env.VISUAL_VIEWPORT_FILTER&&process.env.VISUAL_VIEWPORT_FILTER!==label,'A different viewport was explicitly selected.');
  test.setTimeout(120000);await mkdir('out/release-evidence',{recursive:true});
  const reports:unknown[]=JSON.parse(await readFile('out/release-evidence/image-and-navigation-report.json','utf8').catch(()=>'[]')).filter((report:{label:string})=>report.label!==label);
  const context=await browser.newContext({baseURL:process.env.E2E_BASE_URL||'http://localhost:3002',viewport:{width,height},deviceScaleFactor:dpr,reducedMotion:'reduce'}),page=await context.newPage();
  await page.addInitScript(()=>{const metrics={cls:0,lcp:0};Object.assign(window,{sterlynReleaseMetrics:metrics});new PerformanceObserver(list=>{for(const item of list.getEntries()){const entry=item as PerformanceEntry&{hadRecentInput:boolean;value:number};if(!entry.hadRecentInput)metrics.cls+=entry.value;}}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(list=>{for(const entry of list.getEntries())metrics.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.name));
  try{
   for(const route of ['/','/collections','/design-studio','/account','/cart']){
    const response=await page.goto(route);expect(response?.ok()).toBe(true);
    const csp=response?.headers()['content-security-policy']||'';expect(csp).toContain("'nonce-");expect(csp).not.toContain("'unsafe-eval'");expect(csp.split(';').find(value=>value.trim().startsWith('script-src'))).not.toContain("'unsafe-inline'");
    await page.evaluate(async()=>{await document.fonts.ready;for(const image of Array.from(document.images))if(image.loading!=='lazy')await image.decode().catch(()=>{});});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    reports.push({label,route,rendering:'accessible-webgl-fallback',metrics:await page.evaluate(()=>Reflect.get(window,'sterlynReleaseMetrics')),images:await page.locator('img').evaluateAll(nodes=>nodes.map(node=>{const image=node as HTMLImageElement;return {src:image.currentSrc,loaded:image.complete&&image.naturalWidth>0,width:Math.round(image.getBoundingClientRect().width),height:Math.round(image.getBoundingClientRect().height),objectFit:getComputedStyle(image).objectFit,srcSet:image.srcset,sizes:image.sizes,deliveredEncodedBytes:(performance.getEntriesByName(image.currentSrc)[0] as PerformanceResourceTiming|undefined)?.encodedBodySize||null,dpr:devicePixelRatio};})),navigation:await page.evaluate(()=>{const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;return {domContentLoaded:navigation.domContentLoadedEventEnd,responseStart:navigation.responseStart};})});
    await page.screenshot({path:`out/release-evidence/${label}-${route==='/'?'home':route.slice(1)}.png`,fullPage:false});
   }
   expect(errors).toEqual([]);await writeFile('out/release-evidence/image-and-navigation-report.json',JSON.stringify(reports,null,2));
  }finally{await context.close();}
 });
}
