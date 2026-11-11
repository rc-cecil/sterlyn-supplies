import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import {db} from '../../src/lib/db';
import {bootstrapOwner} from '../../src/lib/owner-bootstrap';
import {decryptTracking} from '../../src/lib/order-tracking';
import {authPost} from './auth-helpers';

test('staff captures a private WhatsApp request and shares account-free tracking without email',async({page,browser})=>{
 test.setTimeout(180000);page.setDefaultTimeout(15000);
 const origin=process.env.E2E_BASE_URL||'http://localhost:3002',marker=randomUUID(),email=marker+'@staff.invalid',password=randomUUID()+randomUUID();
 let ownerId:string|undefined,quoteId:string|undefined,orderId:string|undefined;
 const guest=await browser.newContext();await mkdir('out/whatsapp-workflow',{recursive:true});
 try{
  const publicPage=await guest.newPage();await publicPage.goto(origin+'/contact');
  const generic=publicPage.getByRole('link',{name:/WhatsApp · Preferred/});await expect(generic).toHaveAttribute('href',/text=/);expect(decodeURIComponent((await generic.getAttribute('href'))!)).toContain('Hi Sterlyn, I’m enquiring from your website.');await expect(publicPage.locator('main')).not.toContainText('+447576899618');
  const denied=await publicPage.request.post(origin+'/api/admin/manual-enquiry',{headers:{origin},data:{}});expect(denied.status()).toBe(401);
  ownerId=(await bootstrapOwner({email,password})).id;expect((await authPost(page.request,'/api/auth/sign-in/email',{headers:{origin},data:{email,password}})).ok()).toBe(true);
  await page.goto('/admin/enquiries');await page.getByRole('button',{name:'Add WhatsApp enquiry',exact:true}).click();
  const form=page.locator('section[aria-labelledby="manual-enquiry-title"]');await form.getByLabel('Customer name',{exact:true}).fill('Private WhatsApp customer');await form.getByLabel('WhatsApp number').fill('+233 20 000 0001');await form.getByLabel('What does the customer need?').fill('Bespoke walnut kitchen');await form.getByLabel('Quantity',{exact:true}).fill('2');
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).include('.admin-main').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);await page.screenshot({path:`out/whatsapp-workflow/01-new-enquiry-${width}.png`,fullPage:true});}
  await form.getByRole('button',{name:'Save enquiry',exact:true}).click();await expect(page.locator('.ops-success-panel')).toContainText('Enquiry saved');await expect(form).toHaveCount(0);
  const quote=await db.quote.findFirstOrThrow({where:{assignedTo:ownerId,name:'Private WhatsApp customer'}});quoteId=quote.id;expect(quote.email).toBe('');await expect(page.locator('.ops-reference')).toHaveText(quote.reference!);await expect(page.locator('.ops-timeline')).toContainText('Direct WhatsApp');
  await page.getByRole('button',{name:'Confirm order & tracking',exact:true}).click();const confirmation=page.locator('.ops-conversion');await confirmation.getByLabel('Agreed amount').fill('100');await confirmation.getByLabel('Delivery address').fill('Synthetic delivery address, Accra');await confirmation.getByRole('checkbox').check();await confirmation.getByRole('button',{name:'Confirm order & create tracking'}).click();await expect(page.locator('.ops-success-panel')).toContainText('No email was queued');
  const order=await db.order.findUniqueOrThrow({where:{sourceQuoteId:quote.id}});orderId=order.id;
  const share=page.getByRole('link',{name:'Share tracking in WhatsApp'});await expect(share).toBeVisible();expect(decodeURIComponent((await share.getAttribute('href'))!)).toContain('/track#');expect(await db.notification.count({where:{dedupeKey:{startsWith:'order:'+order.id+':'}}})).toBe(0);await page.screenshot({path:'out/whatsapp-workflow/02-confirmed-share-tracking.png',fullPage:true});
  process.env.TRACKING_ENCRYPTION_KEY||='33'.repeat(32);const token=decryptTracking(order.trackingCipher!);await publicPage.goto(origin+'/track#'+token);await expect(publicPage.getByRole('heading',{name:'Confirmed',exact:true})).toBeVisible();await expect(publicPage.locator('main')).not.toContainText('233200000001');
  await page.getByRole('link',{name:'Open '+order.reference,exact:true}).click();await page.getByRole('button',{name:'Start processing',exact:true}).click();await expect(page.locator('.ops-success-panel')).toContainText('No email address is recorded');await publicPage.reload();await expect(publicPage.getByRole('heading',{name:'Processing',exact:true})).toBeVisible();await publicPage.screenshot({path:'out/whatsapp-workflow/03-customer-tracking.png',fullPage:true});
 }finally{
  await guest.close();if(orderId){await db.notification.deleteMany({where:{dedupeKey:{startsWith:'order:'+orderId+':'}}});await db.orderEvent.deleteMany({where:{orderId}});await db.orderItem.deleteMany({where:{orderId}});await db.order.delete({where:{id:orderId}});}if(quoteId){await db.enquiryEvent.deleteMany({where:{quoteId}});await db.quote.delete({where:{id:quoteId}});}if(ownerId)await db.user.delete({where:{id:ownerId}});await db.$disconnect();
 }
});
