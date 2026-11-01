import {test,expect} from '@playwright/test';
// Keep live rendering in a separate browser from the layout/operations cases.
// The explicit colour-profile argument also fixes the visual capture profile.
test.use({launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--force-color-profile=srgb']}});
test('the monogram renders continuously and fits its frame without pause controls',async({page})=>{
 test.setTimeout(90000);await page.goto('/',{waitUntil:'domcontentloaded'});
 const emblem=page.getByLabel('Sterlyn monogram in three dimensions');
 await expect(emblem).toBeVisible();
 await expect.poll(()=>emblem.evaluate(element=>element.querySelector('canvas[data-engine]')?'webgl':element.querySelector('video')?'animated-video':'loading'),{timeout:30000}).not.toBe('loading');
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  const canvas=emblem.locator('canvas'),video=emblem.locator('video');
  if(await canvas.count()){
   await expect(canvas).toBeVisible();
   expect(await canvas.evaluate(element=>{const canvas=element as HTMLCanvasElement;const gl=canvas.getContext('webgl2');return !!gl&&!gl.isContextLost()&&canvas.width>0&&canvas.height>0;})).toBe(true);
   const outer=await emblem.boundingBox(),inner=await canvas.boundingBox();expect(inner!.width).toBeLessThanOrEqual(outer!.width+1);expect(inner!.height).toBeLessThanOrEqual(outer!.height+1);
  }else{
   await expect(video).toBeVisible();await expect(video).toHaveJSProperty('autoplay',true);await expect(video).toHaveJSProperty('loop',true);await expect.poll(()=>video.evaluate(element=>(element as HTMLVideoElement).paused)).toBe(false);
  }
  await expect(page.getByRole('button',{name:'Pause logo animation',exact:true})).toHaveCount(0);
 }
 console.log('Monogram rendering:',await emblem.locator('canvas').count()?'WebGL':'animated video fallback');
});
