"use client";
import { useRef,useState } from 'react';
import Link from 'next/link';
import { actionButtonStyle } from '@/lib/brand-colors';
// Opening a report is the only thing a visitor does here. Resolving, dismissing and
// taking content down live in the ops backoffice, never in the product — mirrors
// src/components/trust/report-form.tsx for solution fichas.
type ReportDict={done:string;loginSuffixReport:string;reasonLabel:string;reasonSpam:string;reasonAbuse:string;reasonImpersonation:string;reasonOther:string;detailsLabel:string;saving:string;submit:string;genericError:string};
export function CommunityReportForm({listId,commentId,onDone,dict,loginPrompt}:{listId:string;commentId?:string;onDone?:()=>void;dict?:ReportDict;loginPrompt?:string}){
 const [error,setError]=useState(''),[done,setDone]=useState(false),[pending,setPending]=useState(false),[login,setLogin]=useState(false);
 const busy=useRef(false);
 if(done)return <p role="status" className="text-sm text-[#416B50]">{dict?.done??'Reporte recibido. Revisaremos lo que compartiste.'}</p>;
 if(login)return <p className="text-sm text-stone-500"><Link href={`/sign-in?next=${encodeURIComponent('/comunidad/'+listId)}`} className="text-[#365DC4] underline underline-offset-4">{loginPrompt??'Inicia sesión o crea una cuenta'}</Link> {dict?.loginSuffixReport??'para reportar.'}</p>;
 return <form noValidate className="space-y-3" onSubmit={async e=>{e.preventDefault();if(busy.current)return;const values=Object.fromEntries(new FormData(e.currentTarget));busy.current=true;setPending(true);setError('');try{const r=await fetch('/api/community',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,action:'report',listId,commentId})});const data=await r.json();if(r.status===401){setLogin(true);return;}if(!r.ok)throw Error(data.error);setDone(true);onDone?.();}catch(e){setError(e instanceof Error?e.message:(dict?.genericError??'Intenta de nuevo.'));}finally{busy.current=false;setPending(false);}}}>
  <label className="block text-sm">{dict?.reasonLabel??'Motivo'}<select name="reason" disabled={pending} className="mt-2 w-full rounded-xl border border-stone-300 bg-transparent p-3"><option value="spam">{dict?.reasonSpam??'Spam o promoción no deseada'}</option><option value="abuse">{dict?.reasonAbuse??'Abuso o contenido ofensivo'}</option><option value="impersonation">{dict?.reasonImpersonation??'Suplantación o robo de contenido'}</option><option value="other">{dict?.reasonOther??'Otro motivo'}</option></select></label>
  <label className="block text-sm">{dict?.detailsLabel??'¿Qué debemos revisar?'}<textarea name="details" minLength={10} maxLength={2000} required disabled={pending} rows={3} className="mt-2 w-full rounded-xl border border-stone-300 bg-transparent p-3"/></label>
  <button disabled={pending} style={actionButtonStyle} className="action-button rounded-full px-5 py-3 text-sm">{pending?(dict?.saving??'Guardando…'):(dict?.submit??'Enviar reporte')}</button>
  {error&&<p role="alert" className="text-sm text-[#A94E35]">{error}</p>}
 </form>;
}
