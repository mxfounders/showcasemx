'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardCheck, Grid, Users, Shield, LogOut } from 'lucide-react';

const focusStyle = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]';

const navItems = [
  {
    section: 'Cola editorial',
    items: [
      { href: '/panel', label: 'Pendientes', Icon: ClipboardCheck, exact: true },
      { href: '/panel/postulaciones', label: 'Postulaciones', Icon: Grid },
    ],
  },
  {
    section: 'Plataforma',
    items: [
      { href: '/panel/usuarios', label: 'Usuarios', Icon: Users },
      { href: '/panel/revisores', label: 'Revisores', Icon: Shield },
    ],
  },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside aria-label="Navegación de operaciones" className="sticky top-0 z-40 px-4 pt-4 lg:fixed lg:inset-y-6 lg:left-0 lg:w-[248px] lg:px-0 lg:pt-0">
      <div className="flex flex-col rounded-2xl border border-stone-200/70 bg-white shadow-[4px_4px_28px_-12px_rgba(0,0,0,0.12)] h-full lg:rounded-l-none lg:rounded-r-2xl lg:border-l-0">
        
        {/* Logo area */}
        <div className="flex shrink-0 items-center justify-between px-6 py-5 lg:pb-7 lg:pt-7">
          <Link href="/panel" className="flex items-center gap-2 outline-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/shwcs-logo-blue.png" alt="shwcs" className="h-4 w-auto" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mt-0.5">Ops</span>
          </Link>
        </div>

        {/* Nav */}
        <div className="flex-1 flex-col overflow-y-auto px-3">
          {navItems.map(group => (
            <div key={group.section} className="mb-6">
              <p className="px-3 pb-2 text-[10px] font-bold tracking-widest uppercase text-stone-400">{group.section}</p>
              <nav aria-label={group.section} className="space-y-1">
                {group.items.map(({ href, label, Icon, exact }) => {
                  const active = isActive(href, exact);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-200 ${
                        active ? 'bg-[#e4ebfc] text-[#365dc4]' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                      } ${focusStyle}`}
                    >
                      <span
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-translate-y-px motion-reduce:transform-none"
                        style={{ backgroundColor: active ? 'rgba(255,255,255,0.6)' : 'transparent', color: active ? '#365dc4' : 'currentColor' }}
                      >
                        <Icon aria-hidden="true" strokeWidth={1.7} className="size-4" />
                      </span>
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-3 pb-3 mt-auto">
          <div className="mx-3 mb-3 border-t border-stone-100" />
          <div className="px-3 py-3 rounded-xl bg-stone-50 mb-2">
            <p className="text-[11px] font-semibold text-stone-800 truncate">{userEmail}</p>
            <p className="text-[10px] text-stone-400">Revisor autorizado</p>
          </div>
          <button
            onClick={handleLogout}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 ${focusStyle}`}
          >
            <span className="flex size-7 items-center justify-center rounded-lg text-stone-400 group-hover:text-stone-600">
              <LogOut className="size-4" />
            </span>
            Cerrar sesión
          </button>
        </div>

      </div>
    </aside>
  );
}
