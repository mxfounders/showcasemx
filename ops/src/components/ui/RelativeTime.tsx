'use client';

import { useEffect, useState } from 'react';
import { fmtDateTime, fmtRelative } from '@/lib/format';

/** "hace 3 min" that stays fresh; the absolute date is in the tooltip. */
export function RelativeTime({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);
  if (!value) return <span className={className}>—</span>;
  return (
    <time
      dateTime={value}
      title={fmtDateTime(value)}
      className={className}
      suppressHydrationWarning
    >
      {fmtRelative(value, now)}
    </time>
  );
}
