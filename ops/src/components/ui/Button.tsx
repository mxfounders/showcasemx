import Link from 'next/link';
import {
  cloneElement,
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

export type ButtonTone =
  'primary' | 'solid' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
export type ButtonSize = 'xs' | 'sm' | 'md';

const tones: Record<ButtonTone, string> = {
  // Brand CTA: soft blue fill, blue text (actionButtonStyle in the product).
  primary:
    'bg-accent-soft text-accent-fg hover:bg-accent/20 hover:shadow-[0_8px_24px_-10px_rgb(var(--accent)/0.45)]',
  solid: 'bg-accent text-white hover:bg-accent-strong shadow-[0_1px_0_rgb(255_255_255/0.15)_inset]',
  secondary: 'bg-surface text-fg-2 border border-line hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-muted hover:text-fg hover:bg-surface-3',
  danger: 'bg-terracotta-soft text-terracotta hover:bg-terracotta/15',
  success: 'bg-sage-soft text-sage hover:bg-sage/15',
  warning: 'bg-amber-soft text-amber hover:bg-amber/15',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 gap-1.5 rounded-lg px-2.5 text-xs',
  sm: 'h-8 gap-1.5 rounded-[10px] px-3 text-[13px]',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
};

const iconSizes: Record<ButtonSize, string> = { xs: 'size-3.5', sm: 'size-4', md: 'size-4' };

/**
 * A Lucide component, or an already-rendered icon element. Server Components
 * must pass the element form (`icon={<Ban />}`) to client components such as
 * ActionButton: component references cannot cross the RSC boundary.
 */
export type IconProp = LucideIcon | ReactElement<{ className?: string }>;

interface Shared {
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: IconProp;
  iconRight?: IconProp;
  loading?: boolean;
  children?: ReactNode;
  className?: string;
}

export function buttonClass(
  tone: ButtonTone = 'secondary',
  size: ButtonSize = 'sm',
  extra?: string,
) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none',
    tones[tone],
    sizes[size],
    extra,
  );
}

export function renderIcon(icon: IconProp | undefined, className: string) {
  if (!icon) return null;
  if (isValidElement(icon))
    return cloneElement(icon, { className, 'aria-hidden': true } as { className: string });
  const Component = icon as LucideIcon;
  return <Component aria-hidden className={className} strokeWidth={1.9} />;
}

function Inner({ icon, iconRight, loading, size = 'sm', children }: Shared) {
  return (
    <>
      {loading ? (
        <span
          aria-hidden
          className={cn(
            iconSizes[size],
            'animate-spin rounded-full border-2 border-current border-r-transparent',
          )}
        />
      ) : (
        renderIcon(icon, iconSizes[size])
      )}
      {children}
      {renderIcon(iconRight, iconSizes[size])}
    </>
  );
}

export function Button({
  tone,
  size,
  icon,
  iconRight,
  loading,
  children,
  className,
  type = 'button',
  disabled,
  ...rest
}: Shared & ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(tone, size, className)}
      {...rest}
    >
      <Inner icon={icon} iconRight={iconRight} loading={loading} size={size}>
        {children}
      </Inner>
    </button>
  );
}

export function ButtonLink({
  href,
  tone,
  size,
  icon,
  iconRight,
  children,
  className,
  external,
  ...rest
}: Shared & { href: string; external?: boolean } & Omit<ComponentPropsWithoutRef<'a'>, 'href'>) {
  if (external)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass(tone, size, className)}
        {...rest}
      >
        <Inner icon={icon} iconRight={iconRight} size={size}>
          {children}
        </Inner>
      </a>
    );
  return (
    <Link href={href} className={buttonClass(tone, size, className)} {...rest}>
      <Inner icon={icon} iconRight={iconRight} size={size}>
        {children}
      </Inner>
    </Link>
  );
}

export function IconButton({
  label,
  icon: Icon,
  className,
  size = 'sm',
  ...rest
}: { label: string; icon: LucideIcon; size?: ButtonSize } & ComponentPropsWithoutRef<'button'>) {
  const box =
    size === 'xs'
      ? 'size-7 rounded-lg'
      : size === 'md'
        ? 'size-10 rounded-xl'
        : 'size-8 rounded-[10px]';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center text-muted transition hover:bg-surface-3 hover:text-fg active:translate-y-px disabled:opacity-50',
        box,
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden className="size-4" strokeWidth={1.9} />
    </button>
  );
}
