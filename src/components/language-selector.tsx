'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { i18n, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionary';
import { languageSelector as es } from '@/i18n/dictionaries/es/settings';
import { languageSelector as en } from '@/i18n/dictionaries/en/settings';

// The footer that renders this selector only receives its own dictionary slice,
// and the selector already derives the locale from the URL, so it reads its one
// label straight from the named per-locale exports instead of a `dict` prop.
const labels: Record<Locale, Dictionary['settings']['languageSelector']> = { es, en };

export function LanguageSelector() {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current locale from pathname
  const currentLocale =
    i18n.locales.find(loc => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) ||
    i18n.defaultLocale;

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;

    // Replace the locale in the pathname
    const newPathname = pathname.replace(`/${currentLocale}`, `/${newLocale}`);

    router.push(newPathname);
  };

  return (
    <div className="flex items-center gap-2 text-[12px] text-stone-500">
      <span className="sr-only">{labels[currentLocale].label}</span>
      <select
        value={currentLocale}
        onChange={handleLanguageChange}
        className="bg-transparent text-stone-500 hover:text-stone-700 outline-none cursor-pointer focus:ring-0 focus-visible:ring-0 border-none px-1 appearance-none"
      >
        <option value="es">ES</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}
