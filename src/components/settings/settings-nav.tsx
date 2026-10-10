'use client';
import Link, { usePathname } from '@/i18n/navigation';
import type { Dictionary } from '@/i18n/dictionary';

const sections = [
  { href: '/account/settings', key: 'overview' },
  { href: '/account/settings/profile', key: 'profile' },
  { href: '/account/settings/security', key: 'security' },
  { href: '/account/settings/connections', key: 'connections' },
  { href: '/account/settings/notifications', key: 'notifications' },
  { href: '/account/settings/billing', key: 'billing' },
  { href: '/account/settings/data', key: 'data' },
] as const;

/**
 * Persistent tabs across every settings page, so moving between them no longer
 * costs a trip back to the hub. Uses the shared selector pattern; the active tab
 * is marked with aria-current, which is what colours it.
 */
export function SettingsNav({ dict }: { dict: Dictionary['settings']['nav'] }) {
  const path = usePathname();
  return (
    <nav aria-label={dict.ariaLabel} className="mb-9 -mx-1 overflow-x-auto pb-1">
      <div className="selector-tabs flex-nowrap px-1">
        {sections.map(section => (
          <Link
            key={section.href}
            href={section.href}
            aria-current={path === section.href ? 'page' : undefined}
            className="selector-tab whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]"
          >
            {dict[section.key]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
