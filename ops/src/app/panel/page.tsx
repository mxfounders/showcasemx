import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardCheck, Flag, Mail, Send, UserPlus, ScrollText } from 'lucide-react';
import { getDb } from '@/lib/db';

export const metadata: Metadata = { title: 'Inicio' };

function fmtDate(iso: string) {
  try { return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)); }
  catch { return iso; }
}

export default async function PanelHome() {
  const sql = getDb();

  const [pending, reports, inquiries, mail, newAccounts, auditLog] = await sql.transaction([
    sql`SELECT count(*)::int AS n FROM founder_solutions WHERE status IN ('pending', 'changes_requested')`,
    sql`SELECT count(*)::int AS n FROM solution_reports WHERE status = 'open'`,
    sql`SELECT count(*)::int AS n FROM contact_inquiries WHERE handled_at IS NULL`,
    sql`SELECT count(*)::int AS n FROM account_notifications WHERE email_state IN ('failed', 'pending', 'sending')`,
    sql`SELECT count(*)::int AS n FROM auth_accounts WHERE created_at >= now() - interval '7 days'`,
    sql`SELECT actor_email, action, subject_type, subject_id, created_at FROM ops_audit_log ORDER BY id DESC LIMIT 10`,
  ]);

  const cards = [
    { label: 'Pendientes de revisión', value: Number(pending[0]?.n ?? 0), href: '/panel/revision', Icon: ClipboardCheck },
    { label: 'Reportes abiertos', value: Number(reports[0]?.n ?? 0), href: '/panel/reportes', Icon: Flag },
    { label: 'Mensajes sin atender', value: Number(inquiries[0]?.n ?? 0), href: '/panel/mensajes', Icon: Mail },
    { label: 'Correos con problemas', value: Number(mail[0]?.n ?? 0), href: '/panel/correo', Icon: Send },
    { label: 'Cuentas nuevas (7 días)', value: Number(newAccounts[0]?.n ?? 0), href: '/panel/cuentas', Icon: UserPlus },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-stone-50/80 backdrop-blur-md border-b border-stone-200/70 px-4 sm:px-8 h-[60px] flex items-center">
        <h1 className="text-[16px] font-bold tracking-tight text-stone-800">Inicio operativo</h1>
      </header>

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map(({ label, value, href, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5 hover:border-[#3562cc] transition-colors"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#e4ebfc] text-[#365dc4]">
                <Icon className="size-4" strokeWidth={1.7} aria-hidden />
              </span>
              <span className="text-2xl font-bold text-stone-900">{value}</span>
              <span className="text-xs text-stone-500">{label}</span>
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <ScrollText className="size-4 text-stone-400" aria-hidden />
              <h2 className="text-sm font-bold text-stone-800">Actividad reciente</h2>
            </div>
            <Link href="/panel/bitacora" className="text-xs font-semibold text-[#365dc4]">Ver bitácora completa →</Link>
          </div>
          {auditLog.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-stone-400">Sin actividad todavía.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {auditLog.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-stone-700 truncate">{String(entry.actor_email)}</span>
                    <span className="text-stone-400">{String(entry.action)}</span>
                    <span className="text-stone-300 truncate hidden sm:inline">{String(entry.subject_type)}:{String(entry.subject_id).slice(0, 8)}</span>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">{fmtDate(String(entry.created_at))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
