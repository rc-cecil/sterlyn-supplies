import {test,expect,type Page} from '@playwright/test';
const customer={name:'Quote Customer',email:'customer@example.test'};
async function openQuote(page:Page,entry:string){
 await page.goto(entry==='studio'?'/design-studio':'/products/the-emerald-room');
 if(entry==='bag'){
  await page.getByRole('button',{name:'Add to bag',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Added to your collection bag.'})).toBeVisible();
  await page.goto('/cart');
 }
 await page.getByRole('button',{name:entry==='bag'?'Request this collection':entry==='studio'?'Request this kitchen':'Request a tailored quote',exact:true}).click();
 return page.getByRole('dialog');
}
for(const entry of ['product','bag','studio'])test(`${entry} quote autofills contact and preserves attached request`,async({page})=>{
 await page.route('**/api/session',r=>r.fulfill({json:{user:customer}}));
 let sent:Record<string,unknown>|undefined;
 await page.route('**/api/quotes',async r=>{sent=r.request().postDataJSON();if(entry==='bag')await page.route('**/api/cart',cart=>cart.fulfill({json:{items:[]}}));await r.fulfill({json:{reference:'SQ-1001',cartChanged:entry==='bag',message:'Request sent.'}});});
 const dialog=await openQuote(page,entry);
 await expect(dialog.locator('[name=name]')).toHaveValue(customer.name);
 await expect(dialog.locator('[name=email]')).toHaveValue(customer.email);
 await expect(dialog.locator('[name=phone]')).toHaveValue('');
 await dialog.locator('[name=name]').fill('Edited Customer');
 await dialog.locator('[name=email]').fill('edited@example.test');
 await dialog.locator('[name=notes]').fill('Please quote my kitchen with these selections.');
 await dialog.getByRole('button',{name:/Send/}).click();
 await expect(dialog.getByRole('status')).toContainText('SQ-1001');
 await expect(dialog.locator('form')).toHaveCount(0);
 await expect(dialog.getByRole('heading',{name:'Thank you. We’ve received your request.'})).toBeFocused();
 expect(sent).toMatchObject({name:'Edited Customer',email:'edited@example.test',phone:''});
 if(entry==='product')expect(sent).toMatchObject({variantId:expect.any(String),quantity:1});
 if(entry==='studio')expect(sent?.scene).toMatchObject({modules:expect.any(Array)});
 if(entry==='bag'){await expect(page.locator('.cart-item')).toHaveCount(0);await dialog.getByRole('button',{name:'Done',exact:true}).click();await expect(page.getByRole('heading',{name:'Your bag is ready for your selections.'})).toBeVisible();}
});
test('delayed session preserves typed values, including cleared fields',async({page})=>{
 let release!:()=>void;const ready=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/session',async r=>{await ready;await r.fulfill({json:{user:customer}});});
 const dialog=await openQuote(page,'product');
 await dialog.locator('[name=name]').fill('Typing Customer');
 await dialog.locator('[name=email]').fill('temporary@example.test');
 await dialog.locator('[name=email]').fill('');
 release();
 await expect.poll(()=>page.request.get('/api/live').then(r=>r.status())).toBe(200);
 await expect(dialog.locator('[name=name]')).toHaveValue('Typing Customer');
 await expect(dialog.locator('[name=email]')).toHaveValue('');
});
for(const failed of [false,true])test(`guest quote remains usable when session ${failed?'fails':'is anonymous'}`,async({page})=>{
 await page.route('**/api/session',r=>r.fulfill({status:failed?500:200,json:failed?{error:'Unavailable'}:{user:null}}));
 await page.route('**/api/quotes',r=>r.fulfill({json:{reference:'SQ-1002',message:'Request sent.'}}));
 const dialog=await openQuote(page,'product');
 await expect(dialog.locator('[name=name]')).toHaveValue('');
 await expect(dialog.locator('[name=email]')).toHaveValue('');
 await dialog.locator('[name=name]').fill('Guest Customer');await dialog.locator('[name=email]').fill('guest@example.test');
 await dialog.locator('[name=notes]').fill('Please quote this kitchen.');await dialog.getByRole('button',{name:'Send quote request'}).click();
 await expect(dialog.getByRole('status')).toContainText('SQ-1002');
 await expect(dialog.locator('form')).toHaveCount(0);
 await dialog.getByRole('button',{name:'Done',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('failed request keeps entered details and allows a successful retry',async({page})=>{
 await page.route('**/api/session',r=>r.fulfill({json:{user:customer}}));
 let submissions=0;
 await page.route('**/api/quotes',r=>{submissions++;return r.fulfill(submissions===1?{status:500,json:{error:'Please try again.'}}:{json:{reference:'SQ-1003'}});});
 const dialog=await openQuote(page,'product');
 await expect(dialog.locator('[name=name]')).toHaveValue(customer.name);
 await dialog.locator('[name=notes]').fill('Keep my project details on failure.');
 await dialog.getByRole('button',{name:'Send quote request'}).click();
 await expect(dialog.getByRole('status')).toHaveText('Please try again.');
 await expect(dialog.locator('[name=notes]')).toHaveValue('Keep my project details on failure.');
 await dialog.getByRole('button',{name:'Send quote request'}).click();
 await expect(dialog.getByRole('status')).toContainText('SQ-1003');
 await expect(dialog.locator('form')).toHaveCount(0);expect(submissions).toBe(2);
});
