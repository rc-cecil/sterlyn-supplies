import {describe,it,expect} from 'vitest';
import {localAdminTesting} from '../src/lib/local-admin-testing';
const demo={LOCAL_ADMIN_SKIP_MFA:'true',PUBLIC_LAUNCH:'false',HOSTNAME:'127.0.0.1',BETTER_AUTH_URL:'http://localhost:3000',DATABASE_URL:'postgresql://local:local@localhost:55432/sterlyn'};
describe('local administrator testing guard',()=>{
  it('requires explicit opt-in and loopback-only demo configuration',()=>{
    expect(localAdminTesting(demo)).toBe(true);
    for(const change of [{LOCAL_ADMIN_SKIP_MFA:undefined},{PUBLIC_LAUNCH:'true'},{PUBLIC_LAUNCH:undefined},{HOSTNAME:'0.0.0.0'},{BETTER_AUTH_URL:'https://sterlyn.example'},{DATABASE_URL:'postgresql://local:local@db/sterlyn'},{DATABASE_URL:'invalid'},{DATABASE_URL:'postgresql://local:local@localhost/production'}])expect(localAdminTesting({...demo,...change})).toBe(false);
  });
});
