"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
export function SettingsBackLink(){const path=usePathname();return path==='/account/settings'?null:<Link href="/account/settings" className="mb-7 inline-flex items-center gap-2 rounded-md text-sm text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"><ArrowLeft className="size-4" aria-hidden="true"/>Toda la configuración</Link>;}
