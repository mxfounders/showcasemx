'use client';

import NextError from 'next/error';
// The raw pathname: this boundary replaces the [locale] layout, so the locale is read from the URL.
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { i18n, isLocale } from '@/i18n/config';
import { reportError } from '@/lib/analytics/client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const segment = usePathname()?.split('/')[1] ?? '';
  useEffect(() => reportError(error), [error]);

  return (
    <html lang={isLocale(segment) ? segment : i18n.defaultLocale}>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
