"use client";
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import { newsletterProfiles, newsletterRoles } from '@/lib/newsletter';
import { validateAccount, type AccountProfile } from '@/lib/account';
export function AccountProfileForm({ initial }: { initial: AccountProfile }) {
  const [values,setValues]=useState(initial);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const busy=useRef(false);
  const router=useRouter();
  const field='mt-2 w-full rounded-xl border border-stone-300 bg-transparent px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';
  function update(key: keyof AccountProfile,value:string){setValues(previous=>({...previous,[key]:value}));setMessage('');setError('');}
  return <form noValidate aria-label="Editar mi perfil" aria-busy={pending} onSubmit={async event=>{
    event.preventDefault(); if(busy.current)return;setError('');setMessage('');
    if(!validateAccount(values)){setError('Escribe tu nombre y selecciona tu perfil y rol. Nombre: hasta 100 caracteres; empresa: hasta 120.');return;}
    busy.current=true;setPending(true);
    try{const response=await fetch('/api/account',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(values),signal:AbortSignal.timeout(15000)});const result=await response.json();if(!response.ok)throw new Error(result.error||'No pudimos guardar el perfil.');setMessage('Tu perfil está actualizado.');router.refresh();}
    catch(failure){setError(failure instanceof Error&&!['TimeoutError','TypeError','SyntaxError'].includes(failure.name)?failure.message:'No pudimos confirmar el guardado. Inténtalo de nuevo.');}
    finally{busy.current=false;setPending(false);}
  }}>
    <div className="grid gap-6 sm:grid-cols-2">
      <label className="text-sm font-medium text-stone-600">Tu nombre<input name="name" autoComplete="name" value={values.name} onChange={e=>update('name',e.target.value)} maxLength={100} className={field} placeholder="¿Cómo te llamas?" /></label>
      <label className="text-sm font-medium text-stone-600">Empresa <span className="font-normal text-stone-400">(opcional)</span><input name="organization" autoComplete="organization" value={values.organization} onChange={e=>update('organization',e.target.value)} maxLength={120} className={field} placeholder="Nombre de tu empresa" /></label>
      <label className="text-sm font-medium text-stone-600">Tu perfil<select name="profile" value={values.profile} onChange={e=>update('profile',e.target.value)} className={field}><option value="">Selecciona tu perfil</option>{newsletterProfiles.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="text-sm font-medium text-stone-600">Tu rol<select name="role" value={values.role} onChange={e=>update('role',e.target.value)} className={field}><option value="">Selecciona tu rol</option>{newsletterRoles.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    </div>
    <div className="mt-7 flex flex-wrap items-center gap-4"><button type="submit" disabled={pending} style={actionButtonStyle} className="action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-60">{pending?'Guardando…':'Guardar cambios'}<ArrowRight aria-hidden="true" className="size-4" /></button>{message&&<p role="status" className="inline-flex items-center gap-2 text-sm text-stone-600"><Check aria-hidden="true" className="size-4" />{message}</p>}</div>
    {error&&<p role="alert" className="mt-4 text-sm text-[#A94E35]">{error}</p>}
  </form>;
}
