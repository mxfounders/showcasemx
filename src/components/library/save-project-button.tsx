"use client";
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark,Check } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import { libraryButton,libraryError } from './client';
export function SaveProjectButton({projectKey,initialSaved,variant}: {projectKey:string;initialSaved?:boolean;variant?:'primary'|'secondary'}){
 const [saved,setSaved]=useState(initialSaved??false);const [loading,setLoading]=useState(initialSaved===undefined);const [pending,setPending]=useState(false);const [error,setError]=useState('');const [login,setLogin]=useState(false);const [confirm,setConfirm]=useState(false);const [message,setMessage]=useState('');const busy=useRef(false);const router=useRouter();
 const returnTo=`/account/saved?project=${encodeURIComponent(projectKey)}`;
 useEffect(()=>{if(initialSaved!==undefined){setSaved(initialSaved);return;}const controller=new AbortController();setLoading(true);fetch(`/api/library?project=${encodeURIComponent(projectKey)}`,{cache:'no-store',signal:controller.signal}).then(async response=>{if(response.status===401)return;if(!response.ok)throw Error();const result=await response.json();setSaved(result.saved===true);}).catch(error=>{if(error.name!=='AbortError')setError('No pudimos consultar si está guardado. Puedes volver a guardarlo.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[projectKey,initialSaved]);
 async function change(remove=false){if(busy.current)return;if(saved&&!remove){setConfirm(true);return;}busy.current=true;setPending(true);setError('');setMessage('');try{const response=await fetch('/api/library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:remove?'unsave':'save',projectKey}),signal:AbortSignal.timeout(15000)});if(response.status===401){setLogin(true);return;}const result=await response.json();if(!response.ok)throw new Error(result.error);setSaved(!remove);setConfirm(false);setMessage(remove?'Proyecto eliminado de tus guardados.':'Guardado en tu cuenta.');router.refresh();}catch(error){setError(libraryError(error));}finally{busy.current=false;setPending(false);}}
 
 const buttonClass = variant === 'secondary'
   ? "flex w-full items-center justify-between gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-medium transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
   : libraryButton;
 const buttonStyle = variant === 'secondary'
   ? (saved ? { backgroundColor: '#FEF3C7', color: '#B45309', borderColor: '#FEF3C7' } : undefined)
   : actionButtonStyle;

 return <div className="space-y-3"><button type="button" disabled={pending||loading} aria-pressed={saved} onClick={()=>void change()} style={buttonStyle} className={buttonClass}>
   {variant === 'secondary' ? (
     <>
       <span>{loading?'Consultando…':pending?'Guardando…':saved?'Guardado':'Guardar proyecto'}</span>
       {saved?<Bookmark className="size-4" fill="currentColor" aria-hidden="true"/>:<Bookmark className="size-4" aria-hidden="true"/>}
     </>
   ) : (
     <>
       {saved?<Check className="size-4" aria-hidden="true"/>:<Bookmark className="size-4" aria-hidden="true"/>}
       {loading?'Consultando…':pending?'Guardando…':saved?'Guardado':'Guardar proyecto'}
     </>
   )}
 </button>
 {confirm&&<div className="text-center text-sm text-stone-600"><p>También se quitará de tus listas y se eliminarán sus notas en ellas.</p><div className="mt-3 flex justify-center gap-4"><button disabled={pending} onClick={()=>void change(true)} type="button" className="text-[#A94E35] underline underline-offset-4">Quitar de guardados</button><button type="button" disabled={pending} onClick={()=>setConfirm(false)}>Cancelar</button></div></div>}
 {login&&<p className="text-center text-sm leading-relaxed text-stone-500"><Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`} className="font-medium text-[#365DC4] underline underline-offset-4">Inicia sesión o crea una cuenta</Link> para guardar este proyecto. Lo retomaremos al entrar.</p>}
 {message&&<p role="status" className="text-center text-xs text-stone-500">{message}{saved&&<> <Link href="/account/saved" className="underline underline-offset-4">Organizar en listas</Link></>}</p>}
 {error&&<p role="alert" className="text-center text-sm text-[#A94E35]">{error}</p>}
 </div>;
}
