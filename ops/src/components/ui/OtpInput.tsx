'use client';

import { useRef } from 'react';
import { cn } from './cn';

/**
 * Six separate digit boxes that behave like one field: typing advances, Backspace
 * goes back, paste of a full code fills every box, and the browser's one-time-code
 * autofill (on the first box) works.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
  invalid,
  label = 'Código de verificación',
}: {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  label?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  function set(next: string, focusIndex?: number) {
    const clean = next.replace(/\D/g, '').slice(0, 6);
    onChange(clean);
    if (focusIndex !== undefined) refs.current[Math.min(5, focusIndex)]?.focus();
    if (clean.length === 6) onComplete?.(clean);
  }

  return (
    <div role="group" aria-label={label} className="flex justify-center gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={element => {
            refs.current[index] = element;
          }}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Dígito ${index + 1}`}
          aria-invalid={invalid || undefined}
          maxLength={6}
          onFocus={event => event.currentTarget.select()}
          onChange={event => {
            const typed = event.target.value.replace(/\D/g, '');
            if (typed.length > 1) {
              // Paste or autofill into one box.
              set(typed, typed.length);
              return;
            }
            const chars = digits.slice();
            chars[index] = typed;
            set(chars.join(''), typed ? index + 1 : undefined);
          }}
          onKeyDown={event => {
            if (event.key === 'Backspace' && !digit && index > 0) {
              const chars = digits.slice();
              chars[index - 1] = '';
              set(chars.join(''), index - 1);
              event.preventDefault();
            } else if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
            else if (event.key === 'ArrowRight' && index < 5) refs.current[index + 1]?.focus();
          }}
          className={cn(
            'num h-12 w-11 rounded-xl border bg-surface text-center text-lg font-semibold text-fg shadow-[0_1px_0_rgb(var(--shadow)/0.03)] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60',
            invalid ? 'border-terracotta/60' : 'border-line',
          )}
        />
      ))}
    </div>
  );
}
