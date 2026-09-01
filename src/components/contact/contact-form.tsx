"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import { inquiryReasons, inquiryUrgencies, type InquiryReason, type InquiryUrgency } from "@/lib/contact-inquiry";
import { actionButtonStyle } from "@/lib/brand-colors";

type Values = { reason: InquiryReason | ""; name: string; email: string; organization: string; role: string; website: string; message: string; urgency: InquiryUrgency | ""; consent: boolean };
const initial: Values = { reason: "", name: "", email: "", organization: "", role: "", website: "", message: "", urgency: "", consent: false };
const field = "w-full border-0 border-b-2 border-stone-200 bg-transparent px-0 py-3 text-xl text-stone-900 outline-none transition-colors placeholder:text-stone-300 focus:border-[#365DC4] sm:text-2xl";

export function ContactForm() {
  const [step, setStep] = useState(0), [values, setValues] = useState<Values>(initial), [error, setError] = useState(""), [pending, setPending] = useState(false), [sent, setSent] = useState(false);
  const busy = useRef(false), heading = useRef<HTMLHeadingElement>(null), form = useRef<HTMLFormElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, sent]);
  const update = <K extends keyof Values>(key: K, value: Values[K]) => setValues(current => ({ ...current, [key]: value }));
  function valid(current: number) {
    if (current === 0 && !values.reason) return "Elige el motivo que más se acerque a tu mensaje.";
    if (current === 1) {
      if (values.name.trim().length < 2) return "Escribe tu nombre.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) return "Escribe un correo válido.";
      if (values.organization.trim().length < 2) return "Escribe el nombre de tu empresa o proyecto.";
    }
    if (current === 2) {
      if (values.message.trim().length < 20) return "Cuéntanos un poco más para poder responderte bien.";
      if (!values.urgency) return "Indica en qué momento quieres resolverlo.";
      if (values.website) { try { const url = new URL(values.website); if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error(); } catch { return "Escribe un sitio válido, incluyendo https://"; } }
    }
    if (current === 3 && !values.consent) return "Necesitamos tu autorización para responder este mensaje.";
    return "";
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current) return;
    const validation = valid(step); if (validation) return setError(validation);
    setError(""); if (step < 3) return setStep(current => current + 1);
    busy.current = true; setPending(true); const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, companyFax: data.get("companyFax") }), signal: AbortSignal.timeout(15000) });
      const result = await response.json(); if (!response.ok || result.ok !== true) throw new Error(result.error || "No pudimos enviar tu mensaje."); setSent(true);
    } catch (failure) { setError(failure instanceof Error && !["TimeoutError", "TypeError", "SyntaxError"].includes(failure.name) ? failure.message : "No pudimos confirmar el envío. Tus respuestas siguen aquí para que puedas reintentar."); }
    finally { busy.current = false; setPending(false); }
  }
  function keyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (pending || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    if (step === 0 && !typing && /^[a-f]$/i.test(event.key)) {
      event.preventDefault();
      const option = inquiryReasons[event.key.toLowerCase().charCodeAt(0) - 97];
      if (option) { update("reason", option.value); setError(""); }
      return;
    }
    if (event.key !== "Enter" || target instanceof HTMLButtonElement) return;
    if (target instanceof HTMLTextAreaElement && event.shiftKey) return;
    event.preventDefault();
    form.current?.requestSubmit();
  }
  if (sent) return <div className="contact-step max-w-xl"><span className="flex size-14 items-center justify-center rounded-full bg-[#E4EBFC] text-[#365DC4]"><Check className="size-6" aria-hidden="true" /></span><h1 ref={heading} tabIndex={-1} className="mt-7 text-4xl font-semibold leading-tight tracking-[-0.045em] outline-none sm:text-5xl">Tu mensaje ya está con nosotros.</h1><p className="mt-5 max-w-lg leading-relaxed text-stone-500">Lo guardamos correctamente. Te responderemos a <strong className="font-medium text-stone-700">{values.email}</strong> con el contexto de tu solicitud.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/" style={actionButtonStyle} className="action-button inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium">Explorar shwcs <ArrowRight className="size-4" aria-hidden="true" /></Link><button type="button" onClick={() => { setValues(initial); setStep(0); setSent(false); }} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm text-stone-500 hover:bg-white hover:text-stone-900"><RotateCcw className="size-4" aria-hidden="true" />Enviar otro</button></div></div>;
  const reason = inquiryReasons.find(item => item.value === values.reason), urgency = inquiryUrgencies.find(item => item.value === values.urgency);
  const titles = ["¿Para qué quieres hablar con nosotros?", "¿Con quién vamos a conversar?", "Cuéntanos el contexto.", "¿Todo correcto?"];
  return <form ref={form} onSubmit={submit} onKeyDown={keyDown} noValidate aria-label="Formulario de contacto" aria-busy={pending} className="w-full max-w-2xl">
    <div className="mb-10 flex items-center gap-4"><span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400" aria-live="polite">Paso {step + 1} de 4</span><div role="progressbar" aria-label="Progreso del formulario" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1} className="h-px flex-1 overflow-hidden bg-stone-200"><div className="h-full bg-[#365DC4] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(step + 1) * 25}%` }} /></div></div>
    <div key={step} className="contact-step min-h-[430px]"><h1 ref={heading} id="contact-question" tabIndex={-1} className="max-w-xl text-3xl font-semibold leading-[1.08] tracking-[-0.045em] outline-none sm:text-5xl">{titles[step]}</h1>
      {step === 0 && <fieldset aria-labelledby="contact-question" className="mt-9 grid gap-3 sm:grid-cols-2">{inquiryReasons.map((option, index) => { const selected=values.reason === option.value; return <label key={option.value} className="cursor-pointer"><input type="radio" name="reason" value={option.value} checked={selected} onChange={() => { update("reason", option.value); setError(""); }} className="peer sr-only" /><span className="flex min-h-28 gap-3 rounded-2xl border border-stone-200 bg-white/40 p-4 transition-[border-color,background-color,transform] hover:border-[#9BB0E7] peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4] motion-reduce:transform-none"><span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs ${selected?'border-[#365DC4] bg-[#365DC4] text-white':'border-current text-stone-500'}`}>{selected?<Check className="size-4" aria-hidden="true"/>:String.fromCharCode(65 + index)}</span><span><strong className="block text-sm font-medium text-stone-800">{option.label}</strong><span className="mt-1.5 block text-xs leading-relaxed text-stone-500">{option.detail}</span></span></span></label>})}</fieldset>}
      {step === 1 && <div className="mt-9 grid gap-x-8 gap-y-7 sm:grid-cols-2"><label className="block text-xs font-medium text-stone-500">Nombre completo<input autoFocus name="name" autoComplete="name" maxLength={80} value={values.name} onChange={event => update("name", event.target.value)} placeholder="Tu nombre" className={field} /></label><label className="block text-xs font-medium text-stone-500">Correo de trabajo<input name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={values.email} onChange={event => update("email", event.target.value)} placeholder="tu@empresa.com" className={field} /></label><label className="block text-xs font-medium text-stone-500">Empresa o proyecto<input name="organization" autoComplete="organization" maxLength={120} value={values.organization} onChange={event => update("organization", event.target.value)} placeholder="Nombre" className={field} /></label><label className="block text-xs font-medium text-stone-500">Tu rol <span className="font-normal text-stone-400">· opcional</span><input name="role" autoComplete="organization-title" maxLength={100} value={values.role} onChange={event => update("role", event.target.value)} placeholder="Founder, CFO, operaciones…" className={field} /></label></div>}
      {step === 2 && <div className="mt-9 space-y-8"><label className="block text-xs font-medium text-stone-500">¿Qué necesitas resolver?<textarea autoFocus name="message" rows={4} maxLength={2400} value={values.message} onChange={event => update("message", event.target.value)} placeholder="Danos el contexto, qué has intentado y cuál sería un buen siguiente paso." className={`${field} resize-none leading-relaxed`} /><span className="mt-2 flex justify-between text-[11px] text-stone-400"><span>Shift + Enter para una nueva línea</span><span className="tabular-nums">{values.message.length}/2400</span></span></label><div className="grid gap-7 sm:grid-cols-2"><label className="block text-xs font-medium text-stone-500">Sitio <span className="font-normal text-stone-400">· opcional</span><input name="website" type="url" inputMode="url" autoComplete="url" maxLength={500} value={values.website} onChange={event => update("website", event.target.value)} placeholder="https://" className={field} /></label><fieldset><legend className="text-xs font-medium text-stone-500">¿En qué momento estás?</legend><div className="mt-3 flex flex-wrap gap-2">{inquiryUrgencies.map(option => { const selected=values.urgency===option.value; return <label key={option.value} className="cursor-pointer"><input type="radio" name="urgency" value={option.value} checked={selected} onChange={() => update("urgency", option.value)} className="peer sr-only" /><span className="flex items-center gap-1.5 rounded-full border border-stone-200 px-3.5 py-2 text-xs text-stone-500 transition-colors hover:border-[#9BB0E7] peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-checked:text-[#365DC4] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">{selected&&<Check className="size-3.5" aria-hidden="true"/>}{option.label}</span></label>})}</div></fieldset></div></div>}
      {step === 3 && <div className="mt-9"><dl className="divide-y divide-stone-200 border-y border-stone-200">{[['Motivo', reason?.label], ['Persona', `${values.name} · ${values.email}`], ['Empresa o proyecto', values.organization], ['Momento', urgency?.label]].map(([label, value]) => <div key={label} className="grid gap-2 py-4 sm:grid-cols-[150px_1fr]"><dt className="text-xs text-stone-400">{label}</dt><dd className="text-sm text-stone-700">{value}</dd></div>)}</dl><blockquote className="mt-6 border-l-2 border-[#365DC4] pl-4 text-sm leading-relaxed text-stone-500">{values.message}</blockquote><label className="mt-8 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-stone-600"><input type="checkbox" checked={values.consent} onChange={event => update("consent", event.target.checked)} className="mt-0.5 shrink-0" />Autorizo a shwcs a usar estos datos para responder mi solicitud. Esto no me suscribe al newsletter.</label></div>}
    </div>
    <div className="sr-only" aria-hidden="true"><label>No llenar<input name="companyFax" tabIndex={-1} autoComplete="off" /></label></div>{error && <p role="alert" className="mb-5 text-sm text-[#A94E35]">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200 pt-7"><div className="flex items-center gap-3"><button type="submit" disabled={pending} style={actionButtonStyle} className="action-button inline-flex min-w-36 items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm font-medium disabled:cursor-wait disabled:opacity-60">{pending ? "Enviando…" : step === 3 ? "Enviar mensaje" : "Continuar"}<ArrowRight className="size-4" aria-hidden="true" /></button><span className="hidden text-[11px] text-stone-400 sm:inline">presiona Enter ↵</span></div>{step > 0 && <button type="button" disabled={pending} onClick={() => { setError(""); setStep(current => current - 1); }} className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-stone-500 transition-colors hover:bg-white hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4] disabled:opacity-50"><ArrowLeft className="size-4" aria-hidden="true" />Anterior</button>}</div>
  </form>;
}
