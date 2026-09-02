"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { i18n } from "@/i18n/config";

export function LanguageSelector() {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current locale from pathname
  const currentLocale = i18n.locales.find((loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) || i18n.defaultLocale;

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    
    // Replace the locale in the pathname
    const newPathname = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    
    router.push(newPathname);
  };

  return (
    <div className="flex items-center gap-2 text-[12px] text-stone-500">
      <span className="sr-only">Idioma:</span>
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
