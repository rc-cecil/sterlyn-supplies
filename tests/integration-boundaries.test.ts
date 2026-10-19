import {afterEach,describe,expect,it,vi} from 'vitest';
import {checkout,webhook} from '../src/lib/commerce';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('postponed integrations',()=>{
  it('never calls payment or AI providers even with legacy credentials configured',async()=>{
    vi.stubEnv('PAYSTACK_SECRET_KEY','test-only-disabled');
    vi.stubEnv('OPENAI_API_KEY','test-only-disabled');
    vi.stubEnv('OPENAI_MODEL','test-only-disabled');
    const network=vi.fn();vi.stubGlobal('fetch',network);
    await expect(checkout({})).rejects.toMatchObject({status:409});
    await expect(webhook(new Request('http://localhost/api/payments/webhook',{method:'POST',body:'{}'}))).rejects.toMatchObject({status:410});
    expect(network).not.toHaveBeenCalled();
  });
});
