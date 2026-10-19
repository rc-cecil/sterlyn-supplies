'use client';
import {useEffect,useRef,useState} from 'react';
import {api,Field} from './ui';

type Contact={name:string;email:string};
export default function QuoteContactFields({emailLabel='Email'}:{emailLabel?:string}){
 const [contact,setContact]=useState<Contact>({name:'',email:''});
 const edited=useRef({name:false,email:false});
 useEffect(()=>{
  let active=true;
  api<{user:Contact|null}>('session').then(({user})=>{
   if(!active||!user)return;
   setContact(current=>({name:edited.current.name?current.name:user.name,email:edited.current.email?current.email:user.email}));
  }).catch(()=>{/* Guests can continue entering their details if the session is unavailable. */});
  return()=>{active=false;};
 },[]);
 function update(key:keyof Contact,value:string){edited.current[key]=true;setContact(current=>({...current,[key]:value}));}
 return <><label className="field"><span>Your name</span><input name="name" autoComplete="name" required value={contact.name} onChange={e=>update('name',e.target.value)}/></label><label className="field"><span>{emailLabel}</span><input name="email" type="email" autoComplete="email" required value={contact.email} onChange={e=>update('email',e.target.value)}/></label><Field label="Phone (optional)" name="phone" required={false}/></>;
}
