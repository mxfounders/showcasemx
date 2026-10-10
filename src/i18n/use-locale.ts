'use client';

import { useParams } from 'next/navigation';
import { i18n, isLocale, type Locale } from './config';

/** The route's `[locale]` segment, for client components that receive no locale prop. */
export function useLocale(): Locale {
  const locale = useParams<{ locale?: string }>()?.locale ?? '';
  return isLocale(locale) ? locale : i18n.defaultLocale;
}
