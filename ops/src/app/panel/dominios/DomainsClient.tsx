'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DomainItem {
  solutionId: string; domain: string; expiresAt: string; verifiedAt: string | null;
  solutionName: string; ownerEmail: string;
}

export default function DomainsClient() {
  const [items, setItems] = useState<DomainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/domains')
      .then(r => r.json())
      .then(d => { if (d.ok) setItems(d.items ?? []); else setError(d.error ?? 'Error al cargar.'); })
      .catch(() => setError('No se pudo conectar.'))
      .finally(() => setLoading(false));
  }, []);

  const now = Date.now();

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center">
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Dominios</h1>
      </header>
      <div className="p-8">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Solución</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Dominio</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Estado</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Expira</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center text-stone-400 text-sm">Cargando…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-16 text-center text-stone-400 text-sm">Sin pruebas de dominio registradas.</td></tr>
                ) : items.map(item => {
                  const expired = new Date(item.expiresAt).getTime() < now && !item.verifiedAt;
                  return (
                    <tr key={item.solutionId} className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors">
                      <td className="px-5 py-4">
                        <Link href={`/panel/postulaciones?solution=${item.solutionId}`} className="font-semibold text-[#365dc4]">{item.solutionName}</Link>
                        <p className="mt-0.5 text-xs text-stone-400">{item.ownerEmail}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-stone-600">{item.domain}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.verifiedAt ? 'bg-green-100 text-green-800' : expired ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.verifiedAt ? 'Verificado' : expired ? 'Expirado' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-stone-400">{fmtDate(item.expiresAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}
