import {test,expect,type Page} from '@playwright/test';
import {ENQUIRY_STORAGE_KEY,enquiryUrl,type EnquiryItem} from '../../src/lib/enquiry';
const oak:EnquiryItem={type:'product',slug:'oak-drawer-organiser',name:'Oak Drawer Organiser',finish:'Natural oak',quantity:1};
const ivory:EnquiryItem={...oak,finish:'Warm ivory',quantity:2};
async function seed(page:Page,items:EnquiryItem[]){await page.addInitScript(({key,items})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify(items));localStorage.setItem('sterlyn-consent','essential');},{key:ENQUIRY_STORAGE_KEY,items});}
function whatsapp(page:Page){return page.locator('a.enquiry-whatsapp');}
test('remove saved selections and update WhatsApp, preserving the other finish and entered details',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,[oak,ivory]);await page.goto('/contact?basket=1');
 await expect(page.locator('.enquiry-selection li')).toHaveCount(2);
 await page.getByLabel('Your name (optional)').fill('Enquiry Customer');await page.getByLabel('Your message or project details (optional)').fill('Please discuss these finishes.');
 await page.getByRole('button',{name:'Remove Oak Drawer Organiser · Natural oak',exact:true}).click();
 await expect(page.locator('.enquiry-selection li')).toHaveCount(1);
 await expect(page.getByLabel('Your name (optional)')).toHaveValue('Enquiry Customer');await expect(page.getByLabel('Your message or project details (optional)')).toHaveValue('Please discuss these finishes.');
 await expect(whatsapp(page)).toHaveAttribute('href',/Warm%20ivory/);await expect(whatsapp(page)).not.toHaveAttribute('href',/Natural%20oak/);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),ENQUIRY_STORAGE_KEY)).toEqual([ivory]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/contact-remove-mobile.png',fullPage:true});
 await page.reload();await expect(page.locator('.enquiry-selection li')).toHaveCount(1);
 await page.getByRole('button',{name:'Remove Oak Drawer Organiser · Warm ivory',exact:true}).click();
 await expect(page.getByRole('heading',{name:'How can we help?'})).toBeVisible();await expect(whatsapp(page)).toContainText('Start a WhatsApp enquiry');
 await expect(whatsapp(page)).not.toHaveAttribute('href',/Oak%20Drawer/);
});
test('remove a direct product without bringing it back on reload',async({page})=>{
 await seed(page,[]);await page.goto(enquiryUrl(oak)+'&notes=Room+dimensions');
 await page.getByRole('button',{name:'Remove Oak Drawer Organiser · Natural oak',exact:true}).click();
 await expect(page).not.toHaveURL(/slug=/);await expect(page).toHaveURL(/notes=Room/);
 await expect(page.getByLabel('Your message or project details (optional)')).toHaveValue('Room dimensions');
 await page.reload();await expect(page.getByRole('heading',{name:'How can we help?'})).toBeVisible();await expect(page.locator('.enquiry-selection li')).toHaveCount(0);
});
test('remove a direct product also stored in the list, preserving the other selection',async({page})=>{
 await seed(page,[oak,ivory]);await page.goto(enquiryUrl(oak));await expect(page.locator('.enquiry-selection li')).toHaveCount(2);
 await page.getByRole('button',{name:'Remove Oak Drawer Organiser · Natural oak',exact:true}).click();
 await expect(page).toHaveURL(/basket=1/);await expect(page).not.toHaveURL(/slug=/);
 await page.reload();await expect(page.locator('.enquiry-selection li')).toHaveCount(1);
 await expect(page.locator('.enquiry-selection')).toContainText('Warm ivory');await expect(page.locator('.enquiry-selection')).not.toContainText('Natural oak');
});
