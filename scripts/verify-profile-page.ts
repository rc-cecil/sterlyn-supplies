import 'dotenv/config';
import {randomUUID} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {db} from '../src/lib/db';
const base='http://127.0.0.1:3000',email=`profile-check-${randomUUID()}@sterlyn.test`,password=randomUUID()+randomUUID();
if(!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))throw Error('Local verification only');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({baseURL:base});
try{
 const guest=await context.newPage();await guest.goto('/account/profile');await expect(guest.getByRole('button',{name:'Sign in',exact:true})).toBeVisible();await guest.close();
 let r=await context.request.post('/api/auth/sign-up/email',{headers:{Origin:base},data:{email,password,name:'Profile Customer'}});expect(r.ok()).toBe(true);
 await db.user.update({where:{email},data:{emailVerified:true}});
 r=await context.request.post('/api/auth/sign-in/email',{headers:{Origin:base},data:{email,password}});expect(r.ok()).toBe(true);
 const page=await context.newPage();await page.goto('/profile');await expect(page).toHaveURL(base+'/account/profile');
 await expect(page.getByRole('heading',{name:'Your profile',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Profile',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByRole('heading',{name:'Personal details'})).toBeVisible();
 await expect(page.getByText('Email verified',{exact:true})).toBeVisible();
 for(const size of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/profile-${size.width}.png`,fullPage:true});
 }
 await page.getByLabel('Your name',{exact:true}).fill('Updated Profile Customer');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Profile updated.'})).toBeVisible();
 await expect(page.locator('.profile-identity strong')).toHaveText('Updated Profile Customer');
 expect((await db.user.findUniqueOrThrow({where:{email}})).name).toBe('Updated Profile Customer');
 await page.reload();await expect(page.getByLabel('Your name',{exact:true})).toHaveValue('Updated Profile Customer');
 await page.getByRole('link',{name:'Sterlyn Supplies home'}).click();
 await page.getByRole('link',{name:'Your profile',exact:true}).click();await expect(page).toHaveURL(base+'/account/profile');
 console.log('PASS: guest sign-in, dedicated profile route, header navigation, active profile tab, responsive layout, saved profile changes and reload persistence.');
}finally{await context.close();await browser.close();await db.notification.deleteMany({where:{recipient:email}});await db.user.deleteMany({where:{email}});await db.$disconnect();}
