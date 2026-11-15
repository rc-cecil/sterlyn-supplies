import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),args:['--disable-webgl']}});
test('homepage explains the company below its unchanged hero on desktop and phone',async({page})=>{
 test.setTimeout(120000);await mkdir('out/homepage-company',{recursive:true});await page.addInitScript(()=>localStorage.setItem('sterlyn-consent','essential'));
 await page.goto('/about');await expect(page).toHaveURL(/\/#our-story$/);await page.goto('/');await expect(page.getByRole('heading',{level:1,name:'The art of a better kitchen.'})).toBeVisible();
 await expect(page.locator('.hero-side')).toContainText('Considered design.');await expect(page.locator('.hero-side')).not.toContainText('Explore premium kitchen designs');
 await expect(page.locator('.home-story')).toContainText('homeowners, property developers and contractors');await expect(page.locator('.home-story')).toContainText('Accra');await expect(page.locator('.home-service-list article')).toHaveCount(3);
 await expect(page.getByRole('link',{name:'More about Sterlyn',exact:true})).toHaveCount(0);await expect(page.locator('.home-facebook-photos figure')).toHaveCount(2);await expect(page.locator('.home-story img')).toHaveAttribute('src',/sterlyn-facebook-kitchen/);await expect(page.locator('.home-project-footer a')).toHaveAttribute('href','/contact');await expect(page.locator('.home-project-guide')).toContainText('private link');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
  if(width===390){await page.getByRole('button',{name:/Open navigation|Open menu/}).click();await page.getByRole('link',{name:'Our story',exact:true}).click();await expect(page).toHaveURL(/#our-story$/);await expect(page.getByRole('button',{name:/Close navigation|Close menu/})).toHaveCount(0);}
  for(const section of ['home-story','home-services','home-facebook-gallery','home-project-guide']){const target=page.locator('.'+section);await target.scrollIntoViewIfNeeded();if(section==='home-story')await target.locator('img').evaluate(async node=>{await (node as HTMLImageElement).decode();});await target.locator('h2').click();await target.screenshot({path:`out/homepage-company/${section}-${width}.png`});}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const result=await new AxeBuilder({page}).include('.home-story').include('.home-services').include('.home-facebook-gallery').include('.home-project-guide').withTags(['wcag2a','wcag2aa']).analyze();expect(result.violations.map(issue=>({id:issue.id,targets:issue.nodes.map(node=>node.target)}))).toEqual([]);
 }
});
