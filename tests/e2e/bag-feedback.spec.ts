import {test,expect} from '@playwright/test';
test('adding on mobile shows the product, quantity and a view bag link',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/cart',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{items:[]}});
  const data=route.request().postDataJSON();return route.fulfill({json:{items:[{id:'test-line',quantity:data.quantity,variant:{id:data.variantId,name:'Test finish',product:{name:'Walnut Handleless Kitchen',slug:'the-walnut-room',image:'/images/kitchen-walnut-v2.webp'}}}]}});
 });
 await page.goto('/products/the-walnut-room');
 await page.getByRole('button',{name:'Increase quantity'}).click();
 await page.getByRole('button',{name:'Add to bag',exact:true}).click();
 const notice=page.getByRole('complementary',{name:'Bag confirmation'});
 await expect(notice).toBeVisible();await expect(notice.getByRole('status')).toContainText('Added to your collection bag.');
 await expect(notice).toContainText('Walnut Handleless Kitchen');await expect(notice).toContainText('Quantity in bag: 2');
 const box=await notice.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390);
 await expect(notice.getByRole('link',{name:'View bag'})).toHaveAttribute('href','/cart');
 await notice.getByRole('button',{name:'Continue exploring'}).click();await expect(notice).toHaveCount(0);
 await page.getByRole('button',{name:'Add to bag',exact:true}).click();await expect(notice).toBeVisible();
 await notice.getByRole('button',{name:'Dismiss bag confirmation'}).click();await expect(notice).toHaveCount(0);
});
test('failed additions display an error without a success notification',async({page})=>{
 await page.route('**/api/cart',route=>route.fulfill(route.request().method()==='POST'?{status:409,json:{error:'This item is unavailable.'}}:{json:{items:[]}}));
 await page.goto('/products/the-walnut-room');await page.getByRole('button',{name:'Add to bag',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'This item is unavailable.'})).toBeVisible();
 await expect(page.getByRole('complementary',{name:'Bag confirmation'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Add to bag',exact:true})).toBeEnabled();
});
