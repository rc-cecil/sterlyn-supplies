import {defineConfig} from '@playwright/test';
const testDatabase=process.env.TEST_DATABASE_URL||'postgresql://sterlyn:local-development-only@localhost:55432/sterlyn_test';
if(new URL(testDatabase).pathname!=='/sterlyn_test')throw new Error('Acceptance tests require sterlyn_test');
process.env.DATABASE_URL=testDatabase;
export default defineConfig({testDir:'tests/e2e',workers:1,timeout:45000,use:{baseURL:process.env.E2E_BASE_URL||'http://localhost:3002',headless:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']},screenshot:'only-on-failure',trace:'retain-on-failure'},reporter:[['list'],['html',{open:'never'}]]});
