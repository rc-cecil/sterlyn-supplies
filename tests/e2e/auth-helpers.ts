import type {APIRequestContext} from '@playwright/test';
// Exercise real limits and honor their retry timing; never disable them for acceptance.
export async function authPost(context:APIRequestContext,path:string,options:Parameters<APIRequestContext['post']>[1]){
 for(let attempt=0;attempt<4;attempt++){
  const response=await context.post(path,options);if(response.status()!==429)return response;
  const seconds=Math.min(60,Math.max(1,Number(response.headers()['retry-after'])||11));
  await new Promise(resolve=>setTimeout(resolve,(seconds+.1)*1000));
 }
 throw Error('Authentication remained rate-limited after bounded retries');
}
