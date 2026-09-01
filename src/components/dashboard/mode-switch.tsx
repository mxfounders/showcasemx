"use client";
import { useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardModes,type DashboardMode } from '@/lib/dashboard/model';
export function DashboardModeSwitch({mode}:{mode:DashboardMode}){
 const [pending,setPending]=useState(false),[error,setError]=useState('');const busy=useRef(false),router=useRouter();
 return <div><div role="group" aria-label="Vista del inicio" className="selector-tabs">{(Object.entries(dashboardModes) as [DashboardMode,string][]).map(([value,label])=><button key={value} type="button" disabled={pending} aria-pressed={mode===value} className="selector-tab disabled:opacity-50" onClick={async()=>{if(busy.current||mode===value)return;busy.current=true;setPending(true);setError('');try{const r=await fetch('/api/account/dashboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:value}),signal:AbortSignal.timeout(15000)});if(!r.ok){const body=await r.json();throw new Error(body.error);}router.refresh();}catch{setError('No pudimos cambiar la vista. Vuelve a intentarlo.');}finally{busy.current=false;setPending(false);}}}>{label}</button>)}</div>{error&&<p role="alert" className="mt-3 text-xs text-[#A94E35]">{error}</p>}</div>;
}
