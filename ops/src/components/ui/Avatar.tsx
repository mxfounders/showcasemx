import { cn } from './cn';

const palettes = [
  'bg-accent-soft text-accent-fg',
  'bg-sage-soft text-sage',
  'bg-lavender-soft text-lavender',
  'bg-terracotta-soft text-terracotta',
  'bg-amber-soft text-amber',
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string | null | undefined, email: string) {
  const source = name?.trim() || email.split('@')[0] || '?';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** Deterministic initials avatar. Never loads a remote image (CSP + privacy). */
export function Avatar({
  name,
  email,
  size = 'md',
  className,
}: {
  name?: string | null;
  email: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const box = {
    sm: 'size-7 text-[10.5px]',
    md: 'size-9 text-xs',
    lg: 'size-12 text-sm',
    xl: 'size-16 text-lg',
  }[size];
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-wide',
        box,
        palettes[hash(email) % palettes.length],
        className,
      )}
    >
      {initials(name, email)}
    </span>
  );
}
