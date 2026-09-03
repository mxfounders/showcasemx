"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sections = [
  { href: '/account/settings', label: 'Resumen' },
  { href: '/account/settings/profile', label: 'Perfil' },
  { href: '/account/settings/security', label: 'Seguridad' },
  { href: '/account/settings/connections', label: 'Conexiones' },
  { href: '/account/settings/notifications', label: 'Avisos' },
  { href: '/account/settings/data', label: 'Datos' },
];

/**
 * Persistent tabs across every settings page, so moving between them no longer
 * costs a trip back to the hub. Uses the shared selector pattern; the active tab
 * is marked with aria-current, which is what colours it.
 */
export function SettingsNav() {
  const path = usePathname();
  const normalised = path.replace(/^\/(es|en)(?=\/|$)/, '') || '/';
  return <nav aria-label="Secciones de configuración" className="mb-9 -mx-1 overflow-x-auto pb-1">
    <div className="selector-tabs flex-nowrap px-1">
      {sections.map(section => <Link key={section.href} href={section.href} aria-current={normalised === section.href ? 'page' : undefined} className="selector-tab whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]">{section.label}</Link>)}
    </div>
  </nav>;
}
