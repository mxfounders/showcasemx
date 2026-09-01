"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { actionButtonStyle, brandColors } from '@/lib/brand-colors';
import { newsletterProfiles, newsletterRoles, type NewsletterProfile, type NewsletterRole } from '@/lib/newsletter';

export function NewsletterForm() {
  const busy = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const question = useRef<HTMLHeadingElement>(null);
  const initialized = useRef(false);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<NewsletterProfile | ''>('');
  const [role, setRole] = useState<NewsletterRole | ''>('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (initialized.current) question.current?.focus({ preventScroll: true });
    initialized.current = true;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(panel.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out', clearProps: 'opacity,transform' });
    });
    return () => media.revert();
  }, [step, sent]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    setError('');
    if (step < 2) { setStep(value => value + 1); return; }
    if (!profile || !role) { setStep(!profile ? 0 : 1); return; }
    busy.current = true; setPending(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, profile, role, consent, company: data.get('company') }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'No pudimos registrar tu suscripción. Inténtalo de nuevo.');
      setSent(true);
    } catch (failure) {
      setError(failure instanceof Error && !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name) ? failure.message : 'No pudimos confirmar la suscripción. Reintenta; no duplicaremos tu registro.');
    } finally { busy.current = false; setPending(false); }
  }
  const titles = ['¿Qué te trae por aquí?', '¿Cuál es tu rol?', '¿A qué correo te escribimos?'];
  if (sent) return <div ref={panel}>
    <span style={actionButtonStyle} className="mb-6 inline-flex size-12 items-center justify-center rounded-full"><Check aria-hidden="true" className="size-6" /></span>
    <h2 ref={question} tabIndex={-1} className="text-3xl font-semibold tracking-tight focus:outline-none">Gracias por sumarte.</h2>
    <p className="mt-4 text-stone-600">Recibimos tu solicitud. Si ya estabas en la lista, no duplicaremos tu registro.</p>
    <Link href="/" style={actionButtonStyle} className="action-button mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium">Explorar soluciones <ArrowRight aria-hidden="true" className="size-4" /></Link>
  </div>;
  return <form onSubmit={submit} aria-label="Suscripción al newsletter" aria-busy={pending}>
    <div className="mb-8 flex items-center gap-4">
      <span className="shrink-0 text-xs tabular-nums text-stone-500" aria-live="polite">Paso {step + 1} de 3</span>
      <div role="progressbar" aria-label="Progreso del formulario" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} className="h-1 w-24 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(step + 1) / 3 * 100}%`, backgroundColor: brandColors.blue.solid }} /></div>
    </div>
    <div ref={panel} className="min-h-[310px]">
      <h2 ref={question} id="newsletter-question" tabIndex={-1} className="mb-6 text-2xl font-medium tracking-tight text-stone-900 focus:outline-none sm:text-3xl">{titles[step]}</h2>
      {step === 0 && <fieldset aria-labelledby="newsletter-question" className="grid gap-3 sm:grid-cols-2">
        {newsletterProfiles.map((option, index) => <label key={option.value} className="relative cursor-pointer">
          <input type="radio" name="profile" value={option.value} required checked={profile === option.value} onChange={() => setProfile(option.value)} className="peer sr-only" />
          <span className="flex min-h-24 items-center gap-4 rounded-xl border border-stone-300/80 p-4 transition-colors hover:border-blue-400 peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4]">
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-md border border-current text-xs text-stone-500">{String.fromCharCode(65 + index)}</span>
            <span><span className="block text-base font-medium text-stone-800">{option.label}</span><span className="mt-1 block text-xs leading-relaxed text-stone-500">{option.detail}</span></span>
          </span>
        </label>)}
      </fieldset>}
      {step === 1 && <fieldset aria-labelledby="newsletter-question" className="grid gap-3 sm:grid-cols-2">
        {newsletterRoles.map((option, index) => <label key={option.value} className="relative cursor-pointer">
          <input type="radio" name="role" value={option.value} required checked={role === option.value} onChange={() => setRole(option.value)} className="peer sr-only" />
          <span className="flex min-h-16 items-center gap-3 rounded-xl border border-stone-300/80 px-4 py-3 transition-colors hover:border-blue-400 peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4]"><span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-md border border-current text-xs text-stone-500">{String.fromCharCode(65 + index)}</span><span className="text-sm font-medium text-stone-800">{option.label}</span></span>
        </label>)}
      </fieldset>}
      {step === 2 && <div>
        <label htmlFor="newsletter-email" className="sr-only">Tu correo electrónico</label>
        <input id="newsletter-email" name="email" type="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@correo.com" aria-describedby="newsletter-purpose" className="w-full border-0 border-b-2 border-stone-300 bg-transparent px-0 py-4 text-2xl text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-[#365DC4] sm:text-3xl" />
        <p id="newsletter-purpose" className="mt-4 text-xs leading-relaxed text-stone-500">Usaremos tu correo, perfil y rol para enviarte novedades y avisos relevantes de shwcs.</p>
        <label className="mt-7 flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-stone-600"><input name="consent" type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#365DC4]" />Quiero recibir novedades y avisos de shwcs por correo.</label>
      </div>}
    </div>
    <div hidden aria-hidden="true"><label>Deja este campo vacío<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
    {error && <p role="alert" className="mb-5 text-sm leading-relaxed text-stone-700">{error}</p>}
    <div className="mt-8 flex items-center justify-between gap-4">
      <button type="submit" disabled={pending} style={actionButtonStyle} className="action-button inline-flex items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm font-medium disabled:cursor-wait disabled:opacity-60">{pending ? 'Registrando…' : step === 2 ? 'Suscribirme' : 'Continuar'}<ArrowRight aria-hidden="true" className="size-4" /></button>
      {step > 0 && <button type="button" disabled={pending} onClick={() => { setError(''); setStep(value => value - 1); }} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline focus-visible:outline-2 disabled:opacity-50"><ArrowLeft aria-hidden="true" className="size-4" />Anterior</button>}
    </div>
  </form>;
}
