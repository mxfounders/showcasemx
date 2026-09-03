'use client';

import { useState, useEffect } from 'react';

interface Project { id: string; name: string; views: number; clicks: number; requests: number; }
interface Day { day: string; views: number; clicks: number; requests: number; }

export default function MetricasClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/metrics')
      .then(r => r.json())
      .then(d => { if (d.ok) { setProjects(d.projects ?? []); setDays(d.days ?? []); } else setError(d.error ?? 'Error al cargar.'); })
      .catch(() => setError('No se pudo conectar.'))
      .finally(() => setLoading(false));
  }, []);

  const totals = projects.reduce((acc, p) => ({ views: acc.views + p.views, clicks: acc.clicks + p.clicks, requests: acc.requests + p.requests }), { views: 0, clicks: 0, requests: 0 });
  const max = Math.max(1, ...days.map(d => Math.max(d.views, d.clicks)));

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center">
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Métricas</h1>
      </header>
      <div className="p-8 space-y-6">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {loading ? (
          <p className="text-sm text-stone-400 py-10 text-center">Cargando…</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <StatCard label="Vistas (30 días)" value={totals.views} />
              <StatCard label="Clics (30 días)" value={totals.clicks} />
              <StatCard label="Solicitudes (30 días)" value={totals.requests} />
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-4">Actividad diaria</p>
              <div className="overflow-x-auto">
                <svg viewBox="0 0 600 160" className="w-full h-40 min-w-[500px]" role="img" aria-label="Vistas y clics de los últimos 30 días">
                  <polyline
                    fill="none" stroke="#3562cc" strokeWidth="2"
                    points={days.map((d, i) => `${(i / Math.max(1, days.length - 1)) * 600},${160 - (d.views / max) * 150}`).join(' ')}
                  />
                  <polyline
                    fill="none" stroke="#7fb069" strokeWidth="2" strokeDasharray="4 3"
                    points={days.map((d, i) => `${(i / Math.max(1, days.length - 1)) * 600},${160 - (d.clicks / max) * 150}`).join(' ')}
                  />
                </svg>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-stone-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#3562cc] inline-block" /> Vistas</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#7fb069] inline-block border-dashed border-t" /> Clics</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50">
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Proyecto</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Vistas</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Clics</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">Solicitudes</th>
                      <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-stone-400">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-10 text-center text-stone-400 text-sm">Sin proyectos publicados.</td></tr>
                    ) : projects.map(p => (
                      <tr key={p.id} className="border-b border-stone-100 last:border-0">
                        <td className="px-5 py-3 text-stone-800">{p.name}</td>
                        <td className="px-5 py-3 text-stone-500">{p.views}</td>
                        <td className="px-5 py-3 text-stone-500">{p.clicks}</td>
                        <td className="px-5 py-3 text-stone-500">{p.requests}</td>
                        <td className="px-5 py-3 text-stone-500">{p.views > 0 ? `${((p.clicks / p.views) * 100).toFixed(1)}%` : '0%'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <p className="text-2xl font-bold text-stone-900">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{label}</p>
    </div>
  );
}
