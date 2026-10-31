import {test,expect} from '@playwright/test';
test('hero headline and image keep a compact, clear gap across screen sizes',async({page})=>{
 test.setTimeout(90000);
 for(const size of [{width:1920,height:1080},{width:1440,height:800},{width:1024,height:768},{width:390,height:844},{width:375,height:667}]){
  await page.setViewportSize(size);await page.goto('/');
  await page.getByRole('heading',{name:'The art of a better kitchen.'}).waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.hero-expand .sticky')).toHaveCSS('height',size.height+'px',{timeout:30000});
  const measure=()=>page.evaluate(()=>{
   const opening=document.querySelector('.hero-opening')!,title=opening.querySelector('h1')!;
   const frame=document.querySelector('.hero-expand .sticky>div')!;
   const bounds=frame.getBoundingClientRect(),inset=Number.parseFloat(getComputedStyle(frame).clipPath.match(/inset\(([-.\d]+)%/)?.[1]||'0');
   const top=bounds.top+bounds.height*inset/100;
   return {gap:top-(innerWidth<=760?opening.querySelector('.hero-side a')!:title).getBoundingClientRect().bottom,clearance:top-title.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  await expect.poll(async()=>Math.round((await measure()).gap)).toBe(size.width<=760?20:32);
  const measured=await measure();expect(measured.clearance).toBeGreaterThan(16);expect(measured.overflow).toBe(false);
  await page.screenshot({path:`test-results/hero-spacing-${size.width}.png`});
 }
});
