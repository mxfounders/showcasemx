'use client';

import { useLocale } from '@/i18n/use-locale';
import { useEffect, useRef, useState } from 'react';
import Link, { usePathname } from '@/i18n/navigation';
import Image from 'next/image';
import {
  House,
  ChartNoAxesCombined,
  Inbox,
  Send,
  Bookmark,
  FolderOpen,
  LibraryBig,
  Layers,
  Compass,
  Menu,
  X,
  Settings2,
  ChevronsUpDown,
} from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { CommunityIcon } from '@/components/library/community-icon';
import { BrandLink } from './brand-link';
import { actionButtonStyle, brandColors } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

const focusStyle =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]';

export function AccountSidebar({
  name,
  avatar,
  dict,
}: {
  name: string;
  avatar: string | null;
  dict: Dictionary['account'];
}) {
  const locale = useLocale();
  const text = dict.sidebar;
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRoot = useRef<HTMLDivElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [path]);
  useEffect(() => {
    if (!accountOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !accountRoot.current?.contains(event.target))
        setAccountOpen(false);
    };
    const frame = requestAnimationFrame(() =>
      accountRoot.current?.querySelector<HTMLAnchorElement>('a')?.focus(),
    );
    document.addEventListener('pointerdown', dismiss);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', dismiss);
    };
  }, [accountOpen]);
  const links = [
    { href: '/account', label: text.home, Icon: House, tone: brandColors.blue },
    {
      href: '/account/solutions',
      label: text.mySolutions,
      Icon: Layers,
      tone: brandColors.sage,
    },
    {
      href: '/account/saved',
      label: text.saved,
      Icon: Bookmark,
      tone: brandColors.lavender,
    },
    {
      href: '/account/lists',
      label: text.myLists,
      Icon: FolderOpen,
      tone: brandColors.amber,
    },
    {
      href: '/account/community',
      label: text.savedLists,
      Icon: LibraryBig,
      tone: brandColors.terracotta,
    },
    {
      href: '/account/contacts',
      label: text.myContacts,
      Icon: Send,
      tone: brandColors.blue,
    },
    {
      href: '/account/opportunities',
      label: text.opportunities,
      Icon: Inbox,
      tone: brandColors.terracotta,
    },
    {
      href: '/account/metrics',
      label: text.metrics,
      Icon: ChartNoAxesCombined,
      tone: brandColors.blue,
    },
  ];
  const isActive = (href: string) =>
    href === '/account'
      ? path === '/account'
      : href === '/account/solutions'
        ? path === href || (path.startsWith(href + '/') && path !== href + '/new')
        : path === href || path.startsWith(`${href}/`);

  return (
    <aside
      aria-label={text.ariaLabel}
      className="sticky top-0 z-40 px-4 pt-4 lg:fixed lg:inset-y-6 lg:left-0 lg:w-[248px] lg:px-0 lg:pt-0"
      onKeyDown={event => {
        if (event.key === 'Escape' && accountOpen) {
          setAccountOpen(false);
          accountTrigger.current?.focus();
          return;
        }
        if (event.key === 'Escape' && open) {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <div className="flex flex-col rounded-2xl border border-stone-200/70 bg-white shadow-[4px_4px_28px_-12px_rgba(0,0,0,0.12)] lg:h-full lg:rounded-l-none lg:rounded-r-2xl lg:border-l-0">
        <div className="flex shrink-0 items-center justify-between px-6 py-5 lg:pb-7 lg:pt-7">
          <BrandLink variant="navbar" locale={locale} />
          <button
            ref={trigger}
            type="button"
            aria-label={open ? text.closeNavigation : text.openNavigation}
            aria-expanded={open}
            aria-controls="account-sidebar-navigation"
            onClick={() => {
              setOpen(value => !value);
              setAccountOpen(false);
            }}
            className={`rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 lg:hidden ${focusStyle}`}
          >
            {open ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
        <div
          id="account-sidebar-navigation"
          className={`${open ? 'flex sidebar-reveal' : 'hidden'} max-h-[calc(100svh-112px)] flex-col overflow-y-auto lg:flex lg:min-h-0 lg:max-h-none lg:flex-1`}
        >
          <nav aria-label={text.navigationAria} className="space-y-1 px-3 pb-7">
            {links.map(({ href, label, Icon, tone }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  style={active ? { backgroundColor: tone.soft, color: tone.solid } : undefined}
                  className={`group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-200 ${active ? '' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'} ${focusStyle}`}
                >
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-translate-y-px motion-reduce:transform-none"
                    style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.6)' : tone.soft,
                      color: tone.solid,
                    }}
                  >
                    <Icon aria-hidden="true" strokeWidth={1.7} className="size-4" />
                  </span>
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 pb-3 lg:mt-auto">
            <div className="mx-3 mb-3 border-t border-stone-100" />
            <Link
              href="/comunidad"
              onClick={() => {
                setOpen(false);
                setAccountOpen(false);
              }}
              className={`group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 ${focusStyle}`}
            >
              <span
                style={{
                  backgroundColor: brandColors.lavender.soft,
                  color: brandColors.lavender.solid,
                }}
                className="flex size-7 items-center justify-center rounded-lg"
              >
                <CommunityIcon className="size-4" />
              </span>
              {text.community}
            </Link>
            <Link
              href="/#catalogo"
              onClick={() => {
                setOpen(false);
                setAccountOpen(false);
              }}
              className={`group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-stone-500 transition-colors duration-200 hover:bg-stone-50 hover:text-stone-900 ${focusStyle}`}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:-translate-y-px motion-reduce:transform-none"
                style={{ backgroundColor: brandColors.sage.soft, color: brandColors.sage.solid }}
              >
                <Compass aria-hidden="true" strokeWidth={1.7} className="size-4" />
              </span>
              {text.exploreCatalog}
            </Link>

            <div
              ref={accountRoot}
              className="relative"
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false);
              }}
            >
              {accountOpen && (
                <div
                  id="sidebar-account-options"
                  className="sidebar-reveal absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl border border-stone-200 bg-white p-1.5 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.18)]"
                >
                  <nav aria-label={text.accountOptionsAria}>
                    <Link
                      href="/account/settings"
                      onClick={() => {
                        setAccountOpen(false);
                        setOpen(false);
                      }}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-3 text-[13px] text-stone-600 transition-colors hover:bg-stone-50 ${focusStyle}`}
                    >
                      <Settings2 aria-hidden="true" className="size-4" />
                      {text.settings}
                    </Link>
                  </nav>
                  <div className="mt-1 border-t border-stone-100 pt-1">
                    <LogoutButton quiet dict={dict} />
                  </div>
                </div>
              )}
              <button
                ref={accountTrigger}
                type="button"
                aria-label={text.accountMenuAria}
                aria-expanded={accountOpen}
                aria-controls="sidebar-account-options"
                onClick={() => setAccountOpen(value => !value)}
                className={`mt-3 flex w-full items-center text-left gap-3 rounded-xl p-3 transition-colors hover:bg-stone-50 ${focusStyle}`}
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-medium ring-1 ring-black/5"
                  style={actionButtonStyle}
                >
                  {avatar ? (
                    <Image src={avatar} alt="" width={36} height={36} unoptimized />
                  ) : (
                    (name || text.myAccount).slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-stone-800">
                    {name || text.myAccount}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-stone-400">{text.myAccount}</span>
                </span>
                <ChevronsUpDown aria-hidden="true" className="size-3.5 shrink-0 text-stone-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
