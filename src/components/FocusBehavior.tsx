'use client';
import {useEffect} from 'react';
export default function FocusBehavior(){
 useEffect(()=>{
  const pointer=()=>{document.documentElement.dataset.inputModality='pointer';};
  const keyboard=(event:KeyboardEvent)=>{if(event.key==='Tab'||event.key.startsWith('Arrow'))document.documentElement.dataset.inputModality='keyboard';};
  window.addEventListener('pointerdown',pointer,true);window.addEventListener('keydown',keyboard,true);
  return()=>{window.removeEventListener('pointerdown',pointer,true);window.removeEventListener('keydown',keyboard,true);delete document.documentElement.dataset.inputModality;};
 },[]);
 return null;
}
