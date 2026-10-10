import type { ReactNode } from 'react';
import { cn } from './cn';

export function Card({
  children,
  className,
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn('rounded-2xl border border-line bg-surface shadow-card', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex items-start justify-between gap-4 px-5 pb-3 pt-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon}
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-semibold tracking-tight text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer
      className={cn(
        'flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px]',
        className,
      )}
    >
      {children}
    </footer>
  );
}

export function IconTile({
  children,
  tone = 'blue',
}: {
  children: ReactNode;
  tone?: 'blue' | 'sage' | 'lavender' | 'terracotta' | 'amber' | 'neutral';
}) {
  const map = {
    blue: 'bg-accent-soft text-accent-fg',
    sage: 'bg-sage-soft text-sage',
    lavender: 'bg-lavender-soft text-lavender',
    terracotta: 'bg-terracotta-soft text-terracotta',
    amber: 'bg-amber-soft text-amber',
    neutral: 'bg-surface-3 text-fg-2',
  } as const;
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', map[tone])}>
      {children}
    </span>
  );
}
