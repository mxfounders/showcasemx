"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { newsletterProfiles, newsletterRoles, type NewsletterProfile, type NewsletterRole } from "@/lib/newsletter";
import { isDashboardMode } from "@/lib/dashboard/model";

type Values = { name: string; organization: string; profile: NewsletterProfile | ""; role: NewsletterRole | "" };
const initial: Values = { name: "", organization: "", profile: "", role: "" };
const field = "w-full border-0 border-b-2 border-stone-200 bg-transparent px-0 py-3 text-xl text-stone-900 outline-none transition-colors placeholder:text-stone-300 focus:border-[#365DC4] sm:text-2xl";
const titles = ["Cuéntanos quién eres", "¿Cómo describirías tu relación con shwcs?", "¿A qué te dedicas?"];

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(0), [values, setValues] = useState<Values>(initial), [error, setError] = useState(""), [pending, setPending] = useState(false);
  const busy = useRef(false), heading = useRef<HTMLHeadingElement>(null), form = useRef<HTMLFormElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step]);
  const update = <K extends keyof Values>(key: K, value: Values[K]) => setValues(current => ({ ...current, [key]: value }));

  function valid(current: number) {
    if (current === 0 && values.name.trim().length < 2) return "Escribe tu nombre.";
    if (current === 1 && !values.profile) return "Elige la opción que más se acerque.";
    if (current === 2 && !values.role) return "Elige tu rol.";
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy.current) return;
    const validation = valid(step); if (validation) return setError(validation);
    setError(""); if (step < 2) return setStep(current => current + 1);
    busy.current = true; setPending(true);
    try {
      const response = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values), signal: AbortSignal.timeout(15000) });
      const result = await response.json(); if (!response.ok || result.ok !== true) throw new Error(result.error || "No pudimos guardar tu perfil.");
      if (isDashboardMode(values.profile)) {
        await fetch("/api/account/dashboard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: values.profile }), signal: AbortSignal.timeout(15000) }).catch(() => {});
      }
      router.replace("/account"); router.refresh();
    } catch (submitError) {
      const name = submitError instanceof Error ? submitError.name : "";
      setError(submitError instanceof Error && !["TypeError", "TimeoutError", "SyntaxError"].includes(name) ? submitError.message : "No pudimos guardar tu perfil. Tus respuestas siguen aquí, intenta de nuevo.");
    } finally { busy.current = false; setPending(false); }
  }

  function keyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (pending || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    const typing = target instanceof HTMLInputElement;
    if (step === 1 && !typing && /^[a-d]$/i.test(event.key)) {
      const option = newsletterProfiles[event.key.toLowerCase().charCodeAt(0) - 97];
      if (option) { update("profile", option.value); setError(""); }
      return;
    }
    if (step === 2 && !typing && /^[a-f]$/i.test(event.key)) {
      const option = newsletterRoles[event.key.toLowerCase().charCodeAt(0) - 97];
      if (option) { update("role", option.value); setError(""); }
      return;
    }
    if (event.key !== "Enter" || target instanceof HTMLButtonElement) return;
    event.preventDefault(); form.current?.requestSubmit();
  }

  return (
    <form ref={form} noValidate aria-label="Cuéntanos de ti" aria-busy={pending} onSubmit={submit} onKeyDown={keyDown}>
      <div role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} className="mb-10 h-1 w-full rounded-full bg-stone-200">
        <div className="h-1 rounded-full bg-[#365DC4] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(step + 1) * (100 / 3)}%` }} />
      </div>
      <p aria-live="polite" className="mb-3 text-sm text-stone-400">Paso {step + 1} de 3</p>

      <div key={step} className="contact-step min-h-[380px]">
        <h1 ref={heading} tabIndex={-1} id="onboarding-question" className="max-w-xl text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-stone-900 outline-none sm:text-5xl">
          {titles[step]}
        </h1>

        {step === 0 && (
          <div className="mt-10 space-y-8">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-500">Tu nombre</span>
              <input autoFocus value={values.name} onChange={event => update("name", event.target.value)} maxLength={100} placeholder="Cómo te llamas" className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-500">Empresa o proyecto (opcional)</span>
              <input value={values.organization} onChange={event => update("organization", event.target.value)} maxLength={120} placeholder="Nombre de tu empresa" className={field} />
            </label>
          </div>
        )}

        {step === 1 && (
          <fieldset aria-labelledby="onboarding-question" className="mt-10 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Tu perfil</legend>
            {newsletterProfiles.map((option, index) => {
              const selected = values.profile === option.value;
              return (
                <label key={option.value} className="cursor-pointer">
                  <input type="radio" name="profile" value={option.value} checked={selected} onChange={() => { update("profile", option.value); setError(""); }} className="peer sr-only" />
                  <span className="flex min-h-28 gap-3 rounded-2xl border border-stone-200 bg-white/40 p-4 transition-[border-color,background-color,transform] hover:border-[#9BB0E7] peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4] motion-reduce:transform-none">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs ${selected ? "border-[#365DC4] bg-[#365DC4] text-white" : "border-current text-stone-500"}`}>
                      {selected ? <Check className="size-4" aria-hidden="true" /> : String.fromCharCode(65 + index)}
                    </span>
                    <span><strong className="block text-sm font-medium text-stone-800">{option.label}</strong><span className="mt-1.5 block text-xs leading-relaxed text-stone-500">{option.detail}</span></span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {step === 2 && (
          <fieldset aria-labelledby="onboarding-question" className="mt-10 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Tu rol</legend>
            {newsletterRoles.map((option, index) => {
              const selected = values.role === option.value;
              return (
                <label key={option.value} className="cursor-pointer">
                  <input type="radio" name="role" value={option.value} checked={selected} onChange={() => { update("role", option.value); setError(""); }} className="peer sr-only" />
                  <span className="flex min-h-16 items-center gap-3 rounded-2xl border border-stone-200 bg-white/40 p-4 transition-[border-color,background-color,transform] hover:border-[#9BB0E7] peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4] motion-reduce:transform-none">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs ${selected ? "border-[#365DC4] bg-[#365DC4] text-white" : "border-current text-stone-500"}`}>
                      {selected ? <Check className="size-4" aria-hidden="true" /> : String.fromCharCode(65 + index)}
                    </span>
                    <strong className="text-sm font-medium text-stone-800">{option.label}</strong>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}
      </div>

      {error && <p role="alert" className="mt-6 text-sm text-[#A94E35]">{error}</p>}

      <div className="mt-10 flex items-center gap-4">
        <button type="submit" disabled={pending} style={{ backgroundColor: "#E4EBFC", color: "#365DC4" }} className="action-button rounded-full px-7 py-3.5 text-sm font-medium disabled:opacity-50">
          {pending ? "Guardando…" : step < 2 ? "Continuar" : "Entrar a shwcs"}
        </button>
        <span className="text-xs text-stone-400 motion-reduce:transition-none">presiona Enter ↵</span>
      </div>
    </form>
  );
}
