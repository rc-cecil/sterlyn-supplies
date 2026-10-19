import {test,expect} from '@playwright/test';
test('quick view and comparison survive navigation without payment actions',async({page})=>{
 await page.goto('/shop');await page.getByRole('button',{name:'Quick view',exact:true}).first().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Compare',exact:true}).first().click();await expect(page.getByRole('button',{name:'Remove comparison',exact:true}).first()).toBeVisible();await page.reload();await page.getByRole('button',{name:'View comparison (1)',exact:true}).first().click();await expect(page.getByRole('dialog').getByRole('table')).toBeVisible();
 await page.getByRole('button',{name:'Clear comparison',exact:true}).click();await expect(page.getByText('No published concepts selected.')).toBeVisible();
});
test('disabled providers and removed generation endpoint cannot execute',async({request})=>{
 const headers={origin:'http://localhost:3002'};
 expect((await request.post('/api/checkout',{headers,data:{}})).status()).toBe(409);
 expect((await request.post('/api/payments/webhook',{data:{event:'charge.success'}})).status()).toBe(410);
 expect((await request.post('/api/video/generate',{headers,data:{prompt:'No generation should run'}})).status()).toBe(404);
});

test('legacy shop redirects into the single collections catalogue with filters intact',async({page})=>{
 await page.goto('/shop?material=Wood');
 await expect(page).toHaveURL(/\/collections\?material=Wood/);
 await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Shop the details'})).toHaveCount(0);
 await expect(page.getByLabel('Material',{exact:true})).toHaveValue('Wood');
});

test('concurrent additions to the same bag do not lose updates',async({page})=>{
 const {db}=await import('../../src/lib/db');const variant=await db.variant.findFirstOrThrow({where:{product:{status:'published'}}});const origin=process.env.E2E_BASE_URL||'http://localhost:3002';
 await page.request.get('/api/cart');
 await page.request.post('/api/cart',{headers:{origin},data:{variantId:variant.id,quantity:0}});
 const requests=await Promise.all(Array.from({length:8},()=>page.request.post('/api/cart',{headers:{origin},data:{variantId:variant.id,quantity:1}})));
 for(const response of requests)expect(response.ok()).toBe(true);
 const bag=await (await page.request.get('/api/cart')).json();expect(bag.items.find((i:{variantId:string})=>i.variantId===variant.id).quantity).toBe(8);
});

test('WebGL failure preserves collection navigation and the 2D planner',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;Object.defineProperty(HTMLCanvasElement.prototype,'getContext',{value:function(this:HTMLCanvasElement,type:string,...args:unknown[]){if(['webgl','webgl2','experimental-webgl'].includes(type))return null;return Reflect.apply(original,this,[type,...args]);}});});
 await page.goto('/');await page.getByRole('link',{name:'Explore our collections',exact:true}).click();await expect(page).toHaveURL(/\/collections/);
 await page.goto('/design-studio');await expect(page.locator('.plan-2d')).toBeVisible();
});

test('keyboard users can enter and leave quick view with focus restored',async({page})=>{
 await page.goto('/collections');const skip=page.getByRole('link',{name:'Skip to content'});await skip.focus();await expect(skip).toBeFocused();await page.keyboard.press('Enter');await expect(page).toHaveURL(/#main$/);
 const trigger=page.getByRole('button',{name:'Quick view',exact:true}).first();await trigger.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
});
