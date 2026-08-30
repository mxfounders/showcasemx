"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { actionButtonStyle, brandColors } from "@/lib/brand-colors";

const field = "mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-500";

export function FounderInvitation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const submissionId = useRef<string | null>(null);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setPending(true); setError("");
    submissionId.current ??= crypto.randomUUID();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, id: submissionId.current }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || "No pudimos guardar la postulación. Inténtalo de nuevo.");
      setSent(true);
    } catch (failure) {
      setError(failure instanceof Error && failure.name !== "TimeoutError" && failure.name !== "TypeError" ? failure.message : "No pudimos confirmar el envío. Reintenta; conservamos tus datos y evitamos duplicar tu postulación.");
    } finally { submitting.current = false; setPending(false); }
  }
  return <section className="mx-auto max-w-[1544px] px-7 py-14 sm:px-11 lg:py-20">
    <div className="flex flex-col gap-6 border-t border-stone-300 pt-10 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
      <div className="min-w-0">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-stone-900 sm:text-[32px] sm:leading-tight xl:whitespace-nowrap">¿Construyes algo que una empresa necesita?</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-600 sm:text-base">Postula tu software, agencia o servicio y cuéntanos qué resuelves y para quién.</p>
      </div>
      <div className="shrink-0 xl:text-right">
        <button onClick={() => dialog.current?.showModal()} type="button" style={actionButtonStyle} className="inline-flex items-center gap-3 rounded-full px-6 py-4 font-medium action-button transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Postular mi solución <ArrowUpRight aria-hidden="true" className="size-5" /></button>
        <p className="mt-3 text-xs text-stone-500">La postulación no garantiza la publicación.</p>
      </div>
    </div>
    <dialog ref={dialog} aria-labelledby="application-title" onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); dialog.current?.close(); } }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} className="max-h-[90svh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl bg-white p-6 text-stone-900 shadow-2xl backdrop:bg-stone-950/35 backdrop:backdrop-blur-sm sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-4"><h2 id="application-title" className="text-2xl font-semibold tracking-tight">{sent ? "Recibimos tu postulación." : "Cuéntanos qué estás construyendo."}</h2><button type="button" aria-label="Cerrar postulación" onClick={() => dialog.current?.close()} style={actionButtonStyle} className="action-button rounded-full p-2"><X aria-hidden="true" className="size-5" /></button></div>
      {sent ? <p className="leading-relaxed text-stone-600">Revisaremos tu solución. Si necesitamos más información, te contactaremos en el correo que compartiste.</p> : <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm">Nombre de tu solución<input name="name" autoComplete="organization" required maxLength={100} className={field} /></label>
        <div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm">Sitio web<input name="website" type="url" placeholder="https://" required maxLength={500} className={field} /></label><label className="block text-sm">¿Qué ofreces?<select name="kind" required className={field} defaultValue=""><option value="" disabled>Selecciona</option><option>Software</option><option>Agencia</option><option>Servicio</option></select></label></div>
        <label className="block text-sm">Correo de contacto<input name="email" type="email" autoComplete="email" required maxLength={254} className={field} /></label>
        <label className="block text-sm">¿Qué problema resuelves y para quién?<textarea name="problem" required minLength={20} maxLength={1500} rows={3} className={field} placeholder="Ayudamos a…" /></label>
        <div aria-hidden="true" className="hidden"><label>Deja este campo vacío<input name="company" tabIndex={-1} autoComplete="off" /></label></div>
        <p className="text-xs leading-relaxed text-stone-500">Usaremos estos datos para revisar tu postulación y contactarte al respecto. Tu correo no se mostrará en el catálogo.</p>
        {error && <p role="alert" className="rounded-xl p-4 text-sm" style={{ backgroundColor: brandColors.terracotta.soft, color: brandColors.terracotta.solid }}>{error}</p>}
        <button disabled={pending} type="submit" style={actionButtonStyle} className="w-full rounded-full action-button px-5 py-3.5 text-sm font-medium disabled:cursor-wait disabled:opacity-60">{pending ? "Enviando…" : "Enviar postulación"}</button>
      </form>}
    </dialog>
  </section>;
}
