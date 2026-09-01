"use client";
import { useEffect,useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight,RefreshCw } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import { libraryButton,libraryField,libraryError } from '@/components/library/client';
import { companySizes,timelines,contactConsent,consentVersion,readContact,canTransition,contactStatuses,type ContactDetails,type ContactStatus } from '@/lib/contacts/model';
async function sendContact(body:Record<string,unknown>){
 const response=await fetch('/api/contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 if(!response.ok)throw new Error(result.error||'No pudimos confirmar el cambio.');
 return result as {ok:boolean;id:string};
}
export function ContactForm({solutionId,recipientId,projectName,email,defaults}:{solutionId:string;recipientId:string;projectName:string;email:string;defaults:{name:string;company:string}}){
 const [details,setDetails]=useState<ContactDetails>({...defaults,size:'',timeline:'',budget:'',need:''}),[consent,setConsent]=useState(false),[review,setReview]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 const id=useRef<string|null>(null),busy=useRef(false);const router=useRouter();
 const reviewHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{if(review)reviewHeading.current?.focus();},[review]);
 const field=(key:keyof ContactDetails,value:string)=>{setDetails(current=>({...current,[key]:value}));setError('');};
 return <form noValidate aria-label="Solicitar contacto" aria-busy={pending} onSubmit={async event=>{
  event.preventDefault();if(busy.current)return;setError('');
  const validated=readContact(details);if(!validated){setError('Completa tu nombre, empresa, tamaño, plazo y una necesidad de al menos 20 caracteres.');return;}
  if(!review){setReview(true);return;}if(!consent){setError('Autoriza compartir estos datos para enviar la solicitud.');return;}
  busy.current=true;setPending(true);id.current??=crypto.randomUUID();
  try{const result=await sendContact({...validated,action:'create',id:id.current,solutionId,recipientId,consent,consentVersion});router.push('/account/contacts/'+result.id);router.refresh();}
  catch(error){setError(libraryError(error));}finally{busy.current=false;setPending(false);}
 }}>
 {!review?<fieldset disabled={pending} className="grid gap-6 sm:grid-cols-2"><label className="text-sm">Tu nombre<input autoComplete="name" value={details.name} onChange={e=>field('name',e.target.value)} maxLength={100} className={libraryField}/></label><label className="text-sm">Empresa<input autoComplete="organization" value={details.company} onChange={e=>field('company',e.target.value)} maxLength={150} className={libraryField}/></label><label className="text-sm">Tamaño del equipo<select value={details.size} onChange={e=>field('size',e.target.value)} className={libraryField}><option value="">Selecciona una opción</option>{companySizes.map(value=><option key={value}>{value}</option>)}</select></label><label className="text-sm">¿Cuándo quieres empezar?<select value={details.timeline} onChange={e=>field('timeline',e.target.value)} className={libraryField}><option value="">Selecciona una opción</option>{timelines.map(value=><option key={value}>{value}</option>)}</select></label><label className="text-sm sm:col-span-2">¿Qué necesitas resolver?<textarea value={details.need} onChange={e=>field('need',e.target.value)} minLength={20} maxLength={2000} rows={4} className={libraryField} placeholder="Describe el problema, tu contexto y qué te gustaría confirmar con el proyecto."/></label><label className="text-sm sm:col-span-2">Presupuesto orientativo <span className="text-stone-400">Opcional</span><input value={details.budget} onChange={e=>field('budget',e.target.value)} maxLength={200} className={libraryField} placeholder="Incluye moneda y periodicidad, o déjalo pendiente."/></label><div className="sm:col-span-2"><button className={libraryButton} style={actionButtonStyle}>Revisar solicitud<ArrowRight className="size-4" aria-hidden="true"/></button></div></fieldset>:<div>
 <h2 tabIndex={-1} ref={reviewHeading} className="text-xl font-medium outline-none">Esto recibirá la cuenta propietaria de {projectName}</h2>
 <dl className="mt-6 grid gap-5 border-y border-stone-200 py-6 text-sm sm:grid-cols-2">{[['Nombre',details.name],['Correo de tu cuenta',email],['Empresa',details.company],['Tamaño',details.size],['Plazo',details.timeline],['Presupuesto',details.budget||'No especificado'],['Necesidad',details.need]].map(([label,value])=><div key={label} className={label==='Necesidad'?'sm:col-span-2':''}><dt className="text-xs text-stone-500">{label}</dt><dd className="mt-2 whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>
 <p className="mt-5 text-sm leading-relaxed text-stone-500">Se entregará en su bandeja de shwcs. No enviamos correos automáticos ni garantizamos respuesta. No incluyas datos sensibles de clientes.</p>
 <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={consent} disabled={pending} onChange={event=>setConsent(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#365DC4]"/><span>{contactConsent}</span></label>
 <div className="mt-7 flex flex-wrap gap-5"><button disabled={pending} style={actionButtonStyle} className={libraryButton}>{pending?'Enviando…':'Enviar solicitud'}<ArrowRight className="size-4" aria-hidden="true"/></button><button type="button" disabled={pending} onClick={()=>{setReview(false);setConsent(false);setError('');}} className="text-sm text-stone-500">Editar datos</button></div>
 </div>}
 {error&&<p role="alert" className="mt-5 text-sm text-[#A94E35]">{error}</p>}
 <Link href="/account/contacts" className="mt-7 inline-block text-sm text-stone-500">Ver mis contactos</Link>
 </form>;
}
export function ContactActions({id,version,status,actor}:{id:string;version:number;status:ContactStatus;actor:'buyer'|'recipient'}){
 const options=(Object.keys(contactStatuses) as ContactStatus[]).filter(next=>canTransition(status,next,actor));
 const [next,setNext]=useState<ContactStatus>(options[0]??status),[message,setMessage]=useState(''),[confirm,setConfirm]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState('');
 const busy=useRef(false);const router=useRouter();
 if(!options.length)return <p className="text-sm text-stone-500">{status==='withdrawn'?'El comprador retiró esta solicitud. No se admiten nuevas respuestas.':'No hay acciones disponibles en este estado.'}</p>;
 return <form noValidate onSubmit={async event=>{event.preventDefault();if(busy.current)return;setError('');if(!confirm){if(actor==='recipient'&&message.trim().length<10){setError('Escribe al menos 10 caracteres para explicar el siguiente paso.');return;}setConfirm(true);return;}busy.current=true;setPending(true);try{await sendContact({action:'update',id,status:next,version,message});router.refresh();}catch(error){setError(libraryError(error));}finally{busy.current=false;setPending(false);}}}>
 {actor==='recipient'?<fieldset disabled={pending||confirm} className="space-y-5"><label className="block text-sm">Actualizar estado<select value={next} onChange={event=>setNext(event.target.value as ContactStatus)} className={libraryField}>{options.map(value=><option value={value} key={value}>{contactStatuses[value]}</option>)}</select></label><label className="block text-sm">Respuesta para el comprador<textarea value={message} onChange={event=>setMessage(event.target.value)} maxLength={2000} rows={4} className={libraryField} placeholder="Explica el siguiente paso o el motivo de cierre. Esta respuesta será visible para el comprador."/></label><p className="text-xs leading-relaxed text-stone-500">El estado no implica que se haya enviado un correo. La conversación fuera de shwcs la coordinan ustedes.</p></fieldset>:<p className="text-sm text-stone-500">Puedes retirar la solicitud si ya no necesitas contacto. Esto no borra la información que el destinatario ya recibió.</p>}
 {confirm&&<p className="mt-5 text-sm leading-relaxed">{actor==='buyer'?'La solicitud se cerrará como retirada y el proyecto lo verá. No podrás reabrirla desde aquí.':`El comprador verá tu respuesta y el estado «${contactStatuses[next]}».`}</p>}
 <div className="mt-5 flex flex-wrap gap-4"><button disabled={pending} style={actionButtonStyle} className={libraryButton}>{pending?'Guardando…':confirm?(actor==='buyer'?'Confirmar retiro':'Publicar respuesta'):(actor==='buyer'?'Retirar solicitud':'Revisar respuesta')}</button>{confirm&&<button type="button" disabled={pending} onClick={()=>setConfirm(false)} className="text-sm text-stone-500">Cancelar</button>}</div>{error&&<p role="alert" className="mt-4 text-sm text-[#A94E35]">{error}</p>}
 </form>;
}
export function RefreshContacts(){const router=useRouter();return <button type="button" onClick={()=>router.refresh()} className="action-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-stone-500"><RefreshCw className="size-4" aria-hidden="true"/>Actualizar</button>;}
