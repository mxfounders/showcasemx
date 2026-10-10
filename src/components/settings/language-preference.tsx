'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { i18n } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionary';

// Endonyms on purpose: each language is named in itself, so a reader can find
// their own language whichever one the page is currently in.
const names: Record<string, string> = { es: 'Español', en: 'English' };

/**
 * Switches the locale segment of the current URL. Honest about coverage: the
 * interface, including the account area, is translated, but the emails the
 * server sends are still Spanish because accounts store no language preference.
 */
export function LanguagePreference({
  current,
  dict,
}: {
  current: string;
  dict: Dictionary['settings']['data']['language'];
}) {
  const router = useRouter();
  const path = usePathname();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {i18n.locales.map(locale => {
          const active = locale === current;
          return (
            <button
              key={locale}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (active) return;
                const rest = path.replace(new RegExp(`^/(${i18n.locales.join('|')})(?=/|$)`), '');
                router.push(`/${locale}${rest || ''}`);
                router.refresh();
              }}
              className="selector-tab inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]"
            >
              {active && <Check aria-hidden="true" className="size-4" />}
              {names[locale] ?? locale}
            </button>
          );
        })}
      </div>
      <p className="text-sm leading-relaxed text-stone-500">{dict.note}</p>
    </div>
  );
}
