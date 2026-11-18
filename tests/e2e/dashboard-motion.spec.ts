import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import {db} from '../../src/lib/db';
import {bootstrapOwner} from '../../src/lib/owner-bootstrap';
import {authPost} from './auth-helpers';

test('Efferd dashboard has usable chart controls, keyboard inspection, filtering and reduced motion',async({page})=>{
 test.setTimeout(180000);
 if(new URL(process.env.DATABASE_URL!).pathname!=='/sterlyn_test')throw Error('Isolated test database required');
 const marker=randomUUID(),email=marker+'@dashboard-design.invalid',ownerEmail=marker+'@dashboard-owner.invalid',password=randomUUID()+randomUUID();let ownerId:string|undefined;
 const origin=process.env.E2E_BASE_URL||'http://localhost:3002';
 try{
  const quotes=Array.from({length:30},(_,index)=>Array.from({length:[3,5,2,6,4,7,3][index%7]},()=>({name:'Synthetic design customer',email,notes:'Synthetic chart acceptance fixture only',items:[],createdAt:new Date(Date.now()-(29-index)*86400000)}))).flat();
  await db.quote.createMany({data:quotes});
  await db.order.createMany({data:Array.from({length:18},(_,index)=>({name:'Synthetic design order',email,address:{deliveryAddress:'Test address'},accessHash:randomUUID(),subtotal:10000,total:10000,tax:0,shipping:0,status:['confirmed','processing','ready_for_delivery','dispatched','delivered','completed'][index%6],createdAt:new Date(Date.now()-(27-index)*86400000)}))});
  ownerId=(await bootstrapOwner({email:ownerEmail,password})).id;
  expect((await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email:ownerEmail,password}})).ok()).toBe(true);
  await page.setViewportSize({width:1440,height:1080});await page.goto('/admin');await expect(page.locator('.activity-card')).toBeVisible();await expect(page.locator('.recharts-area-curve')).toHaveCount(2);
  const periods=page.getByRole('group',{name:'Reporting period',exact:true}),series=page.getByRole('group',{name:'Visible chart series',exact:true});
  await expect(page.getByRole('heading',{name:'Current workload'})).toBeVisible();
  const preparation=page.getByRole('link',{name:/^Orders in preparation/}).locator('strong');
  const originalPreparation=await preparation.textContent();
  const originalOrders=Number(await series.getByRole('button',{name:/^Orders/}).locator('b').textContent());
  expect(Number(originalPreparation)).toBeGreaterThan(0);
  const response=page.waitForResponse(response=>response.url().includes('/api/admin/overview?days=7'));
  await periods.getByRole('button',{name:'7 days',exact:true}).click();expect((await response).ok()).toBe(true);await expect(periods.getByRole('button',{name:'7 days',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('.activity-card')).toHaveAttribute('aria-busy','false');
  await expect(preparation).toHaveText(originalPreparation!);
  expect(Number(await series.getByRole('button',{name:/^Orders/}).locator('b').textContent())).toBeLessThan(originalOrders);
  await series.getByRole('button',{name:/^Enquiries/}).click();await expect(series.getByRole('button',{name:/^Enquiries/})).toHaveAttribute('aria-pressed','false');await expect(page.locator('.recharts-area-curve')).toHaveCount(1);await series.getByRole('button',{name:/^Enquiries/}).click();await expect(page.locator('.recharts-area-curve')).toHaveCount(2);
  const chart=page.locator('.activity-card svg.recharts-surface');await chart.focus();await page.keyboard.press('ArrowRight');await expect(page.getByTestId('activity-tooltip')).toBeVisible();await expect(page.getByTestId('activity-tooltip')).toContainText('Enquiries');await page.keyboard.press('ArrowLeft');
  const thirty=page.waitForResponse(response=>response.url().includes('/api/admin/overview?days=30'));await periods.getByRole('button',{name:'30 days',exact:true}).click();await thirty;await expect(page.locator('.activity-card')).toHaveAttribute('aria-busy','false');
  await page.getByLabel('Filter this work list').fill('no matching synthetic reference');await expect(page.locator('.queue-empty')).toContainText('No matching work');await page.getByLabel('Filter this work list').fill('');await expect(page.locator('.workspace-records>a').first()).toBeVisible();await page.getByRole('group',{name:'Work queue',exact:true}).getByRole('button',{name:/^Orders/}).click();await expect(page.locator('.workspace-records')).toContainText('Synthetic design order');
  await mkdir('out/efferd-dashboard',{recursive:true});
  for(const width of [1440,820,390]){await page.setViewportSize({width,height:1080});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const axe=await new AxeBuilder({page}).include('.admin-main').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations).toEqual([]);await page.screenshot({path:`out/efferd-dashboard/workspace-${width}.png`,fullPage:true});}
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('tab',{name:'Activity & reports'}).click();await expect(page.locator('.overview-daily-data')).toBeVisible();await expect(page.locator('.delivery-card')).toHaveCount(0);await page.getByText('View exact daily counts',{exact:true}).click();await expect(page.locator('.overview-daily-data table')).toBeVisible();await page.screenshot({path:'out/efferd-dashboard/reduced-motion-reports.png',fullPage:true});
 }finally{
  await db.order.deleteMany({where:{email}});await db.quote.deleteMany({where:{email}});await db.notification.deleteMany({where:{recipient:ownerEmail}});if(ownerId)await db.user.delete({where:{id:ownerId}});await db.$disconnect();
 }
});
