/** Explicit opt-in for an unenrolled administrator on a loopback-only demo. */
export function localAdminTesting(env:Record<string,string|undefined>=process.env):boolean {
  if(env.LOCAL_ADMIN_SKIP_MFA!=='true'||env.PUBLIC_LAUNCH!=='false'||env.HOSTNAME!=='127.0.0.1')return false;
  try {
    const auth=new URL(env.BETTER_AUTH_URL||'');
    const database=new URL(env.DATABASE_URL||'');
    return auth.protocol==='http:'&&['localhost','127.0.0.1'].includes(auth.hostname)
      &&['localhost','127.0.0.1'].includes(database.hostname)&&database.pathname==='/sterlyn';
  }catch{return false;}
}
