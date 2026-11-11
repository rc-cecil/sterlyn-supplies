'use client';

import { useEffect, useState, type FormEvent } from 'react';

export default function OwnerSetupPage() {
  const [invitation, setInvitation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('token') || '';
    if (/^[a-f0-9]{64}$/i.test(token)) setInvitation(token);
    // Remove the one-time token from the address bar and browser history promptly.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (password !== confirmation) { setMessage('Your passwords do not match.'); return; }
    if (!invitation) { setMessage('Open the original secure invitation link from your email.'); return; }
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/owner-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ token: invitation, password }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) { setMessage(result.message || 'Setup failed.'); return; }
      setComplete(true);
      setInvitation('');
      setPassword('');
      setConfirmation('');
      setMessage('Your owner account has been created. The business dashboard will be accessible when the production app is activated.');
    } catch {
      setMessage('The setup request could not be completed. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return <main style={{minHeight:'100vh',background:'#f8f6f1',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',color:'#243126',fontFamily:'system-ui, sans-serif'}}>
    <section style={{width:'100%',maxWidth:440,background:'white',border:'1px solid #e4e0d8',borderRadius:14,padding:'clamp(20px,5vw,40px)',boxShadow:'0 12px 40px rgba(0,0,0,0.06)'}}>
      <span style={{fontSize:12,fontWeight:700,letterSpacing:'0.15em'}}>STERLYN SUPPLIES</span>
      <h1 style={{fontSize:30,lineHeight:1.15,margin:'18px 0'}}>Secure owner setup</h1>
      {complete ? <p role="status">{message}</p> : <>
        <p style={{color:'#536055',lineHeight:1.55}}>Choose a new password to activate your private owner account. This password is sent securely to the site and is never shared with ChatGPT.</p>
        <form onSubmit={submit} style={{display:'grid',gap:16,marginTop:26}}>
          <label style={{display:'grid',gap:7,fontSize:14}}>Create password
            <input aria-label="Create password" type="password" required minLength={16} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:13,fontSize:16,border:'1px solid #b8c0b7',borderRadius:6}} />
          </label>
          <label style={{display:'grid',gap:7,fontSize:14}}>Confirm password
            <input aria-label="Confirm password" type="password" required minLength={16} maxLength={128} autoComplete="new-password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} style={{padding:13,fontSize:16,border:'1px solid #b8c0b7',borderRadius:6}} />
          </label>
          <p style={{margin:0,fontSize:13,color:'#536055'}}>Use at least 16 characters. A unique passphrase is recommended.</p>
          <button type="submit" disabled={pending || !invitation} style={{padding:'14px 18px',background:'#244b38',color:'white',border:0,borderRadius:6,fontWeight:700,fontSize:15,cursor:'pointer',opacity:pending||!invitation?0.55:1}}>{pending?'Creating account…':'Create owner account'}</button>
          {!invitation && <p role="status" style={{fontSize:13,color:'#8a401b'}}>Please open your private invitation link from the email. The setup link works once and expires.</p>}
          {message && <p role="alert" style={{fontSize:14,color:'#8a401b'}}>{message}</p>}
        </form>
      </>}
      <p style={{fontSize:12,color:'#6e766d',marginTop:28}}>Private administrator enrollment • Not a public registration page</p>
    </section>
  </main>;
}
