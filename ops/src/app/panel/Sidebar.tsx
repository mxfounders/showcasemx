'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  {
    section: 'Cola editorial',
    items: [
      { href: '/panel', label: 'Pendientes', icon: ClipboardIcon, exact: true },
      { href: '/panel/postulaciones', label: 'Todas las postulaciones', icon: GridIcon },
    ],
  },
  {
    section: 'Plataforma',
    items: [
      { href: '/panel/usuarios', label: 'Usuarios', icon: UsersIcon },
      { href: '/panel/revisores', label: 'Revisores', icon: ShieldIcon },
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
    <aside className="fixed top-0 left-0 bottom-0 w-60 bg-white border-r border-stone-200 flex flex-col z-50 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-stone-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/shwcs-logo-white.png" alt="shwcs"
          className="h-[18px] w-auto"
          style={{ filter: 'invert(1)', opacity: 0.85 }}
        />
        <p className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mt-1">Operaciones</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {navItems.map(group => (
          <div key={group.section}>
            <p className="px-5 py-2 text-[10px] font-bold tracking-widest uppercase text-stone-400">{group.section}</p>
            {group.items.map(item => {
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-medium transition-colors
                    ${active
                      ? 'bg-[#e4ebfc] text-[#365dc4] font-semibold'
                      : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                    }`}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'opacity-100' : 'opacity-60'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-stone-200 space-y-2">
        <p className="text-xs text-stone-500 truncate">{userEmail}</p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-stone-200 text-stone-500 text-xs font-medium hover:bg-stone-100 transition-colors"
        >
          <LogoutIcon className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2"/>
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
