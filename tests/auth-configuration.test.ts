import {afterEach,describe,expect,it,vi} from 'vitest';
// Importing shared routes must not initialize auth before backend configuration is checked.
import {getAuth} from '../src/lib/auth';
afterEach(()=>vi.unstubAllEnvs());
describe('lazy backend authentication',()=>{
 it('allows module import but rejects actual production auth when URL/secret are missing',()=>{vi.stubEnv('NODE_ENV','production');vi.stubEnv('BETTER_AUTH_URL','');vi.stubEnv('BETTER_AUTH_SECRET','');expect(()=>getAuth()).toThrow(/requires a configured/);});
 it('requires a strong secret for actual backend initialization',()=>{vi.stubEnv('NODE_ENV','production');vi.stubEnv('BETTER_AUTH_URL','https://example.test');vi.stubEnv('BETTER_AUTH_SECRET','short');expect(()=>getAuth()).toThrow(/strong authentication secret/);});
});
