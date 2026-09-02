"use client";
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { actionButtonStyle } from '@/lib/brand-colors';
export default function AccountError({reset}:{reset:()=>void}){const router=useRouter();return <section className="account-page"><h1 className="text-3xl font-semibold">No pudimos cargar tu cuenta.</h1><p className="mt-4 text-stone-500">Tus datos guardados siguen ahí. Inténtalo de nuevo en un momento.</p><button onClick={()=>startTransition(()=>{router.refresh();reset();})} style={actionButtonStyle} className="action-button mt-6 rounded-full px-5 py-3 text-sm">Reintentar</button></section>;}
