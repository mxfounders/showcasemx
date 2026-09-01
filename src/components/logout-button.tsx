"use client";
import { LogOut } from 'lucide-react';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
export function LogoutButton({quiet=false}:{quiet?:boolean}) {
  const busy=useRef(false);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <div><button type="button" disabled={pending} style={quiet?undefined:actionButtonStyle} className={quiet?"flex w-full items-center gap-2.5 rounded-lg px-3 py-3 text-[13px] text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4] disabled:opacity-60":"action-button rounded-full px-5 py-3 text-sm font-medium disabled:opacity-60"} onClick={async () => {
    if(busy.current)return;busy.current=true;
    setPending(true); setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      router.replace('/sign-in'); router.refresh();
    } catch { setError('No pudimos cerrar la sesión. Vuelve a intentarlo.'); } finally { busy.current=false;setPending(false); }
  }}>{quiet&&<LogOut aria-hidden="true" className="size-4"/>}{pending ? 'Cerrando…' : 'Cerrar sesión'}</button>{error && <p role="alert" className="mt-4 text-sm text-stone-600">{error}</p>}</div>;
}
