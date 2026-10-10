import type { Metadata } from 'next';
import { CheckCircle2, Database, HardDrive, Server, XCircle } from 'lucide-react';
import { requireAdminPage } from '@/lib/auth';
import { probeProduct, systemOverview } from '@/lib/data/system';
import { configStatus } from '@/lib/env';
import { fmtBytes, fmtDateTime, fmtDuration, fmtNumber } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { EmailStateBadge } from '@/components/domain/StatusBadge';

export const metadata: Metadata = { title: 'Sistema' };
export const dynamic = 'force-dynamic';

const HYGIENE: Record<string, string> = {
  expired_sessions: 'Sesiones del producto vencidas',
  expired_ops_sessions: 'Sesiones de ops vencidas',
  expired_resets: 'Recuperaciones de contraseña vencidas',
  expired_verifications: 'Verificaciones de correo vencidas',
  expired_challenges: 'Accesos 2FA del producto vencidos',
  expired_ops_challenges: 'Accesos 2FA de ops vencidos',
  expired_google_states: 'Estados OAuth de Google vencidos',
  stale_rate_limits: 'Contadores de intentos de más de 1 día',
  stale_visitors: 'Huellas de visitantes de más de 3 días',
};

function Check({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      {ok ? (
        <CheckCircle2 aria-hidden className="size-[18px] shrink-0 text-sage" />
      ) : (
        <XCircle aria-hidden className="size-[18px] shrink-0 text-terracotta" />
      )}
      <span className="flex-1 text-[13.5px] font-medium">{label}</span>
      <span className={`text-right text-[12.5px] ${ok ? 'text-muted' : 'text-terracotta'}`}>
        {detail}
      </span>
    </li>
  );
}

export default async function SistemaPage() {
  await requireAdminPage();
  const [system, product] = await Promise.all([systemOverview(), probeProduct()]);
  const config = configStatus();
  const s = system.storage;
  const leftovers = Object.values(system.hygiene).reduce((sum, value) => sum + value, 0);

  return (
    <>
      <PageHeader
        title="Sistema"
        description="Salud de la base compartida, almacenamiento, colas y configuración. Todo se lee en vivo al abrir la página."
      />
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Latencia de base de datos"
          value={fmtDuration(system.pingMs)}
          icon={<Database aria-hidden className="size-4" />}
          hint={`PostgreSQL ${system.database.version.split(' ')[0]}`}
        />
        <Stat
          label="Tamaño de la base"
          value={fmtBytes(system.database.bytes)}
          hint={`${system.database.connections} conexiones · ${system.database.name}`}
          icon={<HardDrive aria-hidden className="size-4" />}
        />
        <Stat
          label="Producto (shwcs.site)"
          value={!product.configured ? 'Sin configurar' : product.ok ? 'En línea' : 'Caído'}
          tone={product.configured && !product.ok ? 'danger' : 'default'}
          hint={
            product.ms !== null
              ? `${fmtDuration(product.ms)}${product.status ? ` · HTTP ${product.status}` : ''}${product.error ? ` · ${product.error}` : ''}`
              : 'Falta PRODUCT_APP_ORIGIN'
          }
          icon={<Server aria-hidden className="size-4" />}
        />
        <Stat
          label="Residuos por limpiar"
          value={leftovers}
          tone="attention"
          hint="Tokens y contadores vencidos"
        />
      </section>

      <div className="mb-6 grid items-start gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Almacenamiento (Vercel Blob)"
            description="Contado desde las filas que apuntan a cada objeto."
          />
          <CardBody>
            <ul className="divide-y divide-line text-[13.5px]">
              <li className="flex justify-between py-2">
                <span className="text-muted">Capturas</span>
                <span className="num">
                  {fmtNumber(s.media)} · {fmtBytes(s.mediaBytes)}
                </span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted">Versiones responsivas</span>
                <span className="num">
                  {fmtNumber(s.renditions)} · {fmtBytes(s.renditionBytes)}
                </span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted">Portadas del sitio</span>
                <span className="num">
                  {fmtNumber(s.siteOk)} ok · {fmtNumber(s.siteFailed)} fallidas ·{' '}
                  {fmtBytes(s.siteBytes)}
                </span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted">Avatares</span>
                <span className="num">{fmtNumber(s.avatars)}</span>
              </li>
            </ul>
            <ul className="mt-2 divide-y divide-line">
              <Check
                ok={s.orphansDead === 0}
                label="Objetos sin poder borrar"
                detail={s.orphansDead ? `${s.orphansDead} tras 5 intentos` : 'Ninguno'}
              />
              <Check
                ok={s.orphansQueued < 500}
                label="Cola de borrado"
                detail={
                  s.orphansQueued
                    ? `${fmtNumber(s.orphansQueued)} pendientes${s.oldestOrphan ? ` · desde ${fmtDateTime(s.oldestOrphan)}` : ''}`
                    : 'Vacía'
                }
              />
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Colas"
            description="Avisos transaccionales que esperan al worker diario."
          />
          <CardBody>
            {system.queues.length === 0 ? (
              <p className="text-[13px] text-muted">Nada pendiente ni fallido.</p>
            ) : (
              <ul className="divide-y divide-line">
                {system.queues.map(queue => (
                  <li
                    key={queue.state}
                    className="flex items-center justify-between gap-3 py-2.5 text-[13.5px]"
                  >
                    <EmailStateBadge state={queue.state} />
                    <span className="num">{fmtNumber(queue.n)}</span>
                    <span className="text-[12px] text-muted">
                      más antiguo <RelativeTime value={queue.oldest} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="label-micro mb-1 mt-5">Higiene</h3>
            <ul className="divide-y divide-line">
              {Object.entries(system.hygiene).map(([key, value]) => (
                <li key={key} className="flex items-center justify-between py-2 text-[13px]">
                  <span className="text-muted">{HYGIENE[key] ?? key}</span>
                  <span className={`num font-medium ${value > 1000 ? 'text-amber' : 'text-fg'}`}>
                    {fmtNumber(value)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] text-muted">
              El cron del producto limpia tokens y contadores; sesiones vencidas se purgan al
              iniciar sesión.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Configuración de ops"
            description="Solo presencia; nunca se muestran valores."
          />
          <CardBody>
            <ul className="divide-y divide-line">
              <Check
                ok={config.database}
                label="Base de datos"
                detail={config.database ? 'Conectada' : 'Falta DATABASE_URL'}
              />
              <Check
                ok={config.totpKey}
                label="OPS_TOTP_KEY"
                detail={config.totpKey ? '32 bytes válidos' : 'Ausente o inválida'}
              />
              <Check
                ok={config.productOrigin}
                label="PRODUCT_APP_ORIGIN"
                detail={config.productOrigin ? 'Configurado' : 'Ausente'}
              />
              <Check
                ok={config.mediaProxy}
                label="Proxy de capturas"
                detail={config.mediaProxy ? 'OPS_MEDIA_SECRET listo' : 'Sin capturas en revisión'}
              />
              <Check
                ok={config.catalogRevalidate}
                label="Revalidación del catálogo"
                detail={config.catalogRevalidate ? 'Inmediata al publicar' : 'Cae al TTL de 300 s'}
              />
              <Check
                ok={config.securityAlerts}
                label="Alertas por correo"
                detail={config.securityAlerts ? 'Resend configurado' : 'Desactivadas'}
              />
              <Check
                ok={config.ipAllowlist > 0}
                label="Allowlist de IP"
                detail={
                  config.ipAllowlist ? `${config.ipAllowlist} reglas` : 'Abierto a cualquier red'
                }
              />
            </ul>
          </CardBody>
        </Card>
      </div>

      <Table label="Tablas principales">
        <THead>
          <TH>Tabla</TH>
          <TH align="right">Filas (estimadas)</TH>
          <TH align="right">Tamaño</TH>
          <TH>Último autovacuum</TH>
          <TH>Último análisis</TH>
        </THead>
        <TBody>
          {system.tables.map(table => (
            <TR key={table.name}>
              <TD className="font-mono text-[12.5px]">{table.name}</TD>
              <TD align="right">{fmtNumber(table.rows)}</TD>
              <TD align="right">{fmtBytes(table.bytes)}</TD>
              <TD className="text-[13px] text-muted">
                <RelativeTime value={table.lastVacuum} />
              </TD>
              <TD className="text-[13px] text-muted">
                <RelativeTime value={table.lastAnalyze} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <p className="mt-3 text-[12px] text-muted">
        Hora del servidor de base de datos: {fmtDateTime(system.database.serverTime)}.
      </p>
    </>
  );
}
