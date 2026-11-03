'use client';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {createAuthClient} from 'better-auth/react';
const authClient=createAuthClient();
import {ArrowRight,ShieldCheck} from 'lucide-react';
export default function StaffSignIn(){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;setBusy(true);setError('');const v=Object.fromEntries(new FormData(event.currentTarget)) as Record<string,string>;try{const result=await authClient.signIn.email({email:v.email,password:v.password});if(result.error)throw Error(result.error.message);router.replace('/admin');router.refresh();}catch(error){setError((error as Error).message);}finally{setBusy(false);}}
 return <main className="staff-login"><div className="staff-login-brand">STERLYN<span>BUSINESS DESK</span></div><section><ShieldCheck size={28}/><h1>Staff sign in</h1><p>Use the work email and password provided by the owner.</p><form className="form-stack" onSubmit={submit}><label className="field"><span>Work email / login</span><input type="email" name="email" autoComplete="username" required/></label><label className="field"><span>Password</span><input type="password" name="password" autoComplete="current-password" required/></label><button className="button" disabled={busy}>{busy?'Signing in…':'Open my workspace'} <ArrowRight size={17}/></button>{error&&<p role="alert">{error}</p>}</form><small>Need access or a password reset? Ask the owner.</small></section></main>;
}
