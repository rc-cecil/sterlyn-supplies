'use client';
import {useState} from 'react';
import {createAuthClient} from 'better-auth/react';
const auth=createAuthClient();
export default function SessionControl(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function revoke(){
  setBusy(true);setMessage('');
  try{
   const before=await auth.listSessions();if(before.error)throw new Error(before.error.message||'Please sign in again to manage sessions.');
   const result=await auth.revokeOtherSessions();if(result.error)throw new Error(result.error.message||'Could not sign out other sessions. Please try again.');
   const after=await auth.listSessions();if(after.error)throw new Error(after.error.message||'Could not confirm the remaining sessions.');
   if((after.data?.length||0)>1)throw new Error('Another session is still active. Please try again.');
   const count=Math.max(0,(before.data?.length||1)-1);
   setMessage(count?`${count} other ${count===1?'session signed':'sessions signed'} out. You are still signed in here.`:'No other active sessions. You are only signed in here.');
  }catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
 }
 return <div className="session-control"><p>Sign out on other browsers and devices. Tabs sharing this browser’s session stay signed in.</p><button className="text-link" disabled={busy} onClick={revoke}>{busy?'Signing out…':'Sign out other sessions'}</button><p role="status" aria-live="polite" className="form-message">{message}</p></div>;
}
