"use client";
import { usePathname, useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { i18n } from '@/i18n/config';

const names: Record<string, string> = { es: 'Español', en: 'English' };

/**
 * Switches the locale segment of the current URL. Deliberately honest about
 * coverage: the public catalogue is translated, the private account area is not
 * yet, so choosing English does not silently promise a translated dashboard.
 */
export function LanguagePreference({ current }: { current: string }) {
  const router = useRouter();
  const path = usePathname();

  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {i18n.locales.map(locale => {
        const active = locale === current;
        return <button key={locale} type="button" aria-pressed={active} onClick={() => {
          if (active) return;
          const rest = path.replace(new RegExp(`^/(${i18n.locales.join('|')})(?=/|$)`), '');
          router.push(`/${locale}${rest || ''}`);
          router.refresh();
        }} className="selector-tab inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]">
          {active && <Check aria-hidden="true" className="size-4" />}{names[locale] ?? locale}
        </button>;
      })}
    </div>
    <p className="text-sm leading-relaxed text-stone-500">El catálogo, la página de inicio y las páginas informativas están traducidos. Tu cuenta y los correos siguen en español por ahora.</p>
  </div>;
}
