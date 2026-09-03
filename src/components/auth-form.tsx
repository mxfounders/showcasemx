"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Mail, LockKeyhole, ShieldCheck } from 'lucide-react';
import { authReturnTo } from '@/lib/auth/return-to';
import { credentialErrors } from '@/lib/auth/validation';
import { actionButtonStyle } from '@/lib/brand-colors';

export function AuthForm({ mode, returnTo = '/account',googleAvailable=false }: {googleAvailable?:boolean; mode: 'login' | 'register'; returnTo?: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<{ email?: string; password?: string }>({});
  const [registered, setRegistered] = useState(false);
  // The password was accepted but the account asks for a second factor. No session
  // exists yet: the server holds a short-lived challenge until the code checks out.
  const [challenge, setChallenge] = useState(false);
  const [code, setCode] = useState('');
  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const value = code.trim();
    if (!/^\d{6}$/.test(value) && !/^\d{8}$/.test(value)) { setError('Escribe el código de 6 dígitos de tu aplicación, o uno de respaldo de 8.'); return; }
    busy.current = true; setPending(true); setError('');
    try {
      const response = await fetch('/api/auth/totp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: value }), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'No pudimos verificar el código.');
      router.replace(authReturnTo(returnTo)); router.refresh();
    } catch (failure) {
      setError(failure instanceof Error && !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name) ? failure.message : 'No pudimos confirmar la operación. Vuelve a intentarlo.');
    } finally { busy.current = false; setPending(false); }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const errors = credentialErrors(String(data.email ?? ''), String(data.password ?? ''));
    setFields(errors); setError('');
    if (Object.keys(errors).length) { event.currentTarget.querySelector<HTMLInputElement>(errors.email ? '[name=email]' : '[name=password]')?.focus(); return; }
    busy.current = true; setPending(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'No pudimos completar la solicitud.');
      if (mode === 'register') setRegistered(true);
      else if (result.step === 'totp') setChallenge(true);
      else { router.replace(authReturnTo(returnTo)); router.refresh(); }
    } catch (failure) {
      setError(failure instanceof Error && !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name) ? failure.message : 'No pudimos confirmar la operación. Vuelve a intentarlo.');
    } finally { busy.current = false; setPending(false); }
  }
  const inputClass = 'w-full rounded-xl border border-stone-300 bg-transparent py-4 pl-12 pr-4 text-base text-stone-900 outline-none transition-colors placeholder:text-stone-400 hover:border-stone-400 focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';
  if (challenge) return <form noValidate onSubmit={submitCode} className="space-y-5" aria-label="Verificación en dos pasos" aria-busy={pending}>
    <span style={{ backgroundColor: '#E4EBFC', color: '#365DC4' }} className="flex size-12 items-center justify-center rounded-2xl"><ShieldCheck aria-hidden="true" className="size-6" /></span>
    <h2 className="text-2xl font-semibold tracking-tight">Confirma que eres tú</h2>
    <p className="leading-relaxed text-stone-600">Tu cuenta tiene verificación en dos pasos. Abre tu aplicación de autenticación y escribe el código de 6 dígitos.</p>
    <div>
      <label htmlFor="totp-code" className="sr-only">Código de verificación</label>
      <input id="totp-code" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus required value={code} onChange={event => { setCode(event.target.value.replace(/\D/g, '').slice(0, 8)); setError(''); }} placeholder="123456" className={`${inputClass} pl-4 text-center text-2xl tracking-[0.4em]`} />
      <p className="mt-3 text-xs leading-relaxed text-stone-500">¿Perdiste tu teléfono? Escribe aquí uno de tus códigos de respaldo de 8 dígitos. Cada uno sirve una sola vez.</p>
    </div>
    {error && <p role="alert" className="text-sm leading-relaxed text-stone-700">{error}</p>}
    <button disabled={pending} type="submit" style={actionButtonStyle} className="action-button inline-flex w-full items-center justify-center gap-3 rounded-full px-6 py-4 font-medium disabled:cursor-wait disabled:opacity-60">{pending ? 'Verificando…' : 'Entrar a mi cuenta'}<ArrowRight aria-hidden="true" className="size-4" /></button>
    <button type="button" onClick={() => { setChallenge(false); setCode(''); setError(''); }} className="text-sm text-stone-500 underline underline-offset-4 hover:text-stone-900">Usar otra cuenta</button>
  </form>;
  if (registered) return <div role="status"><h2 className="text-2xl font-semibold">Continúa al acceso.</h2><p className="mt-4 leading-relaxed text-stone-600">Si el correo estaba disponible, tu cuenta ya está creada. Si ya tenías una cuenta, entra con tu contraseña habitual.</p><Link href={`/sign-in?next=${encodeURIComponent(returnTo)}`} style={actionButtonStyle} className="action-button mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3">Iniciar sesión <ArrowRight aria-hidden="true" className="size-4" /></Link></div>;
  return <form noValidate onSubmit={submit} className="space-y-5" aria-label={mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} aria-busy={pending}>
    <div>
      <button type="button" disabled={!googleAvailable||pending} onClick={()=>window.location.assign(`/api/auth/google/start?next=${encodeURIComponent(returnTo)}`)} aria-describedby={googleAvailable?undefined:"google-coming-soon"} className="flex w-full disabled:cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-stone-300 bg-transparent px-5 py-4 text-base font-medium text-stone-700">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.05v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.91a6 6 0 0 1 0-3.82V7.5H3.05a10 10 0 0 0 0 9l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.61 9.61 0 0 0 12 2a10 10 0 0 0-8.95 5.5l3.34 2.59C7.18 7.72 9.39 5.96 12 5.96Z"/></svg>
        Continuar con Google
      </button>
      {!googleAvailable&&<p id="google-coming-soon" className="mt-2 text-center text-xs text-stone-400">Pendiente de conexión</p>}
    </div>
    <div className="flex items-center gap-4 py-2 text-xs text-stone-400"><span aria-hidden="true" className="h-px flex-1 bg-stone-200" /><span>o continúa con tu correo</span><span aria-hidden="true" className="h-px flex-1 bg-stone-200" /></div>
    <div className="relative">
      <label htmlFor="account-email" className="sr-only">Correo electrónico</label>
      <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-stone-400" />
      <input id="account-email" name="email" type="email" autoComplete="email" required maxLength={254} aria-invalid={Boolean(fields.email)} aria-describedby={fields.email ? "email-error" : undefined} onChange={() => setFields(value => ({ ...value, email: undefined }))} className={`${inputClass} ${fields.email ? "border-[#A94E35]" : ""}`} placeholder="Correo electrónico" />
    </div>
    {fields.email && <p id="email-error" role="alert" className="text-sm text-[#A94E35]">{fields.email}</p>}
    <div>
      <label htmlFor="account-password" className="sr-only">Contraseña</label>
      <div className="relative">
        <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-stone-400" />
        <input id="account-password" name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required aria-invalid={Boolean(fields.password)} onChange={() => setFields(value => ({ ...value, password: undefined }))} aria-describedby={fields.password ? 'password-error' : mode === 'register' ? 'password-help' : undefined} placeholder="Contraseña" className={`${inputClass} pr-12`} />
        <button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={visible} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-200/50 hover:text-stone-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}</button>
      </div>
      {fields.password && <p id="password-error" role="alert" className="mt-2 text-sm text-[#A94E35]">{fields.password}</p>}
      {mode === 'register' && <p id="password-help" className="mt-2 text-xs text-stone-500">Mínimo 6 caracteres. Una frase larga protege mejor tu cuenta.</p>}
    </div>
    {mode === 'login' && <Link href="/forgot-password" className="inline-block text-sm text-stone-500 underline underline-offset-4 hover:text-stone-900">Olvidé mi contraseña</Link>}
    <div hidden aria-hidden="true"><label>Deja este campo vacío<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
    {error && <p role="alert" className="text-sm leading-relaxed text-stone-700">{error}</p>}
    <button disabled={pending} type="submit" style={actionButtonStyle} className="action-button inline-flex w-full items-center justify-center gap-3 rounded-full px-6 py-4 font-medium disabled:cursor-wait disabled:opacity-60">{pending ? 'Un momento…' : mode === 'login' ? 'Entrar a mi cuenta' : 'Crear mi cuenta'}<ArrowRight aria-hidden="true" className="size-4" /></button>
    <p className="text-sm text-stone-500">{mode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya tienes cuenta?'} <Link href={`${mode === 'login' ? '/sign-up' : '/sign-in'}?next=${encodeURIComponent(returnTo)}`} className="font-medium text-stone-800 underline underline-offset-4">{mode === 'login' ? 'Regístrate' : 'Inicia sesión'}</Link></p>
  </form>;
}
