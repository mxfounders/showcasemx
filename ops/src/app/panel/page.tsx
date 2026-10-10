import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Flag,
  Inbox,
  KeyRound,
  Mail,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { dashboardData } from '@/lib/data/dashboard';
import { daysSince, fmtNumber, TIME_ZONE } from '@/lib/format';
import {
  INQUIRY_REASON,
  INQUIRY_URGENCY,
  COMMUNITY_REPORT_REASON,
  REVIEW_REPORT_REASON,
  SOLUTION_REPORT_REASON,
} from '@/lib/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Sparkline } from '@/components/charts/Sparkline';
import { AreaChart } from '@/components/charts/AreaChart';
import { AgeBadge } from '@/components/domain/StatusBadge';
import { AuditLine } from '@/components/domain/AuditLine';
import { Alert } from '@/components/ui/Field';

export const metadata: Metadata = { title: 'Inicio' };

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat('es-MX', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: TIME_ZONE,
    }).format(new Date()),
  );
  return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
}

function QueueRow({
  href,
  title,
  meta,
  aside,
}: {
  href: string;
  title: string;
  meta: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-2"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-fg group-hover:text-accent-fg">
            {title}
          </p>
          <p className="truncate text-[12.5px] text-muted">{meta}</p>
        </div>
        {aside}
      </Link>
    </li>
  );
}

export default async function PanelHome() {
  const user = await requireOps();
  const data = await dashboardData(user);
  const k = data.kpis;
  const firstName = (user.name ?? user.email.split('@')[0]).split(/\s+/)[0];
  const todayRaw = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  }).format(new Date());
  const today = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const allClear = k.pending + k.openReports + k.inquiries + k.mailFailed === 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          <>
            {today} ·{' '}
            {allClear ? 'No hay nada esperando tu atención.' : 'Esto es lo que necesita atención.'}
          </>
        }
        actions={
          k.pending > 0 ? (
            <ButtonLink href="/panel/revision" tone="solid" icon={ClipboardCheck}>
              Revisar {k.pending} {k.pending === 1 ? 'ficha' : 'fichas'}
            </ButtonLink>
          ) : undefined
        }
      />

      {(data.previousLogin || data.failedSincePrevious > 0) && (
        <div className="mb-6 flex flex-col gap-3">
          {data.failedSincePrevious > 0 && (
            <Alert
              tone="amber"
              title={`${data.failedSincePrevious} ${data.failedSincePrevious === 1 ? 'intento fallido' : 'intentos fallidos'} con tu correo desde tu último acceso`}
            >
              Si no fuiste tú, revisa{' '}
              <Link href="/panel/seguridad" className="font-semibold underline">
                Seguridad
              </Link>{' '}
              y cierra las sesiones que no reconozcas.
            </Alert>
          )}
          {data.previousLogin && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] text-muted shadow-card">
              <KeyRound aria-hidden className="size-4 text-subtle" />
              <span>Tu acceso anterior:</span>
              <span className="font-medium text-fg-2">
                {data.previousLogin.device ?? 'dispositivo desconocido'}
              </span>
              {data.previousLogin.ip && (
                <span className="font-mono text-[12px]">{data.previousLogin.ip}</span>
              )}
              <span>·</span>
              <RelativeTime value={data.previousLogin.at} />
              <Link
                href="/panel/seguridad"
                className="ml-auto font-medium text-accent-fg hover:underline"
              >
                Ver mi actividad
              </Link>
            </div>
          )}
        </div>
      )}

      <section aria-label="Pendientes" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat
          label="Fichas por revisar"
          value={k.pending}
          tone="attention"
          href="/panel/revision"
          icon={<ClipboardCheck aria-hidden className="size-4" />}
          hint={
            !k.oldestPending
              ? 'Cola vacía'
              : daysSince(k.oldestPending) === 0
                ? 'La más antigua llegó hoy'
                : `La más antigua espera ${daysSince(k.oldestPending)} ${daysSince(k.oldestPending) === 1 ? 'día' : 'días'}`
          }
        />
        <Stat
          label="Reportes abiertos"
          value={k.openReports}
          tone="danger"
          href="/panel/reportes"
          icon={<Flag aria-hidden className="size-4" />}
          hint="Fichas y comunidad"
        />
        <Stat
          label="Mensajes sin atender"
          value={k.inquiries}
          tone="attention"
          href="/panel/mensajes"
          icon={<Inbox aria-hidden className="size-4" />}
          hint="Formulario de contacto"
        />
        <Stat
          label="Correos fallidos"
          value={k.mailFailed}
          tone="danger"
          href="/panel/correo"
          icon={<Mail aria-hidden className="size-4" />}
          hint={k.mailQueued ? `${fmtNumber(k.mailQueued)} en cola` : 'Nada en cola'}
        />
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Actividad del catálogo"
            description="Vistas y clics al sitio oficial, últimos 30 días (días en UTC)."
            action={
              <ButtonLink href="/panel/metricas" tone="ghost" size="xs" iconRight={ArrowRight}>
                Métricas
              </ButtonLink>
            }
          />
          <CardBody>
            <AreaChart
              title="Vistas y clics por día"
              series={[
                { key: 'views', label: 'Vistas', color: 'series-1' },
                { key: 'clicks', label: 'Clics al sitio', color: 'series-2' },
              ]}
              data={data.series}
              height={300}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="La plataforma" description="Inventario real, no conversiones." />
          <CardBody className="space-y-0 divide-y divide-line">
            {[
              {
                label: 'Cuentas',
                value: k.accounts,
                hint: `+${fmtNumber(k.accounts7d)} esta semana`,
                trend: data.series.map(d => d.signups),
                href: '/panel/cuentas',
              },
              {
                label: 'Fichas publicadas',
                value: k.published,
                hint: 'Visibles en el catálogo',
                trend: data.series.map(d => d.publishes),
                href: '/panel/postulaciones?estado=published',
              },
              {
                label: 'Solicitudes de contacto',
                value: k.contacts,
                hint: `+${fmtNumber(k.contacts7d)} esta semana`,
                trend: data.series.map(d => d.contacts),
                href: '/panel/contactos',
              },
              {
                label: 'Suscriptores',
                value: k.subscribers,
                hint: 'Newsletter activo',
                href: '/panel/newsletter',
              },
              {
                label: 'Listas públicas',
                value: k.publicLists,
                hint: 'Comunidad',
                href: '/panel/comunidad',
              },
            ].map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-[13px] text-muted group-hover:text-fg">{item.label}</p>
                  <p className="text-lg font-semibold tracking-tight text-fg">
                    {fmtNumber(item.value)}
                  </p>
                  <p className="text-[12px] text-muted">{item.hint}</p>
                </div>
                {item.trend && (
                  <Sparkline
                    values={item.trend}
                    label={`Tendencia de ${item.label.toLowerCase()}, 30 días`}
                  />
                )}
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Cola de revisión"
            description="La más antigua primero"
            action={
              <ButtonLink href="/panel/revision" tone="ghost" size="xs" iconRight={ArrowRight}>
                Todas
              </ButtonLink>
            }
          />
          <CardBody>
            {data.reviews.length === 0 ? (
              <EmptyState
                compact
                icon={CheckCircle2}
                title="Todo revisado"
                description="No hay fichas esperando decisión."
              />
            ) : (
              <ul>
                {data.reviews.map(item => (
                  <QueueRow
                    key={item.id}
                    href={`/panel/postulaciones/${item.id}?from=revision`}
                    title={item.name}
                    meta={
                      <>
                        {item.ownerEmail}
                        {item.hasPublished && ' · actualización'}
                      </>
                    }
                    aside={<AgeBadge days={daysSince(item.updatedAt)} />}
                  />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Reportes abiertos"
            description="Moderación pendiente"
            action={
              <ButtonLink href="/panel/reportes" tone="ghost" size="xs" iconRight={ArrowRight}>
                Todos
              </ButtonLink>
            }
          />
          <CardBody>
            {data.reports.length === 0 ? (
              <EmptyState compact icon={CheckCircle2} title="Sin reportes abiertos" />
            ) : (
              <ul>
                {data.reports.map(item => (
                  <QueueRow
                    key={item.id}
                    href={`/panel/reportes?tipo=${item.kind === 'solution' ? 'fichas' : item.kind === 'review' ? 'resenas' : 'comunidad'}`}
                    title={item.subject}
                    meta={
                      item.kind === 'solution'
                        ? (SOLUTION_REPORT_REASON[item.reason] ?? item.reason)
                        : item.kind === 'review'
                          ? `Reseña · ${REVIEW_REPORT_REASON[item.reason] ?? item.reason}`
                          : `Comunidad · ${COMMUNITY_REPORT_REASON[item.reason] ?? item.reason}`
                    }
                    aside={<AgeBadge days={daysSince(item.createdAt)} />}
                  />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Mensajes"
            description="Formulario de contacto"
            action={
              <ButtonLink href="/panel/mensajes" tone="ghost" size="xs" iconRight={ArrowRight}>
                Bandeja
              </ButtonLink>
            }
          />
          <CardBody>
            {data.inquiries.length === 0 ? (
              <EmptyState compact icon={CheckCircle2} title="Bandeja al día" />
            ) : (
              <ul>
                {data.inquiries.map(item => {
                  const urgency = INQUIRY_URGENCY[item.urgency];
                  return (
                    <QueueRow
                      key={item.id}
                      href={`/panel/mensajes?id=${item.id}`}
                      title={item.name}
                      meta={INQUIRY_REASON[item.reason] ?? item.reason}
                      aside={
                        urgency ? (
                          <Badge tone={urgency.tone}>{urgency.label}</Badge>
                        ) : (
                          <AgeBadge days={daysSince(item.createdAt)} />
                        )
                      }
                    />
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Actividad reciente del equipo"
            description="Cada acción de ops queda en la bitácora encadenada."
            action={
              user.level === 'admin' ? (
                <ButtonLink href="/panel/bitacora" tone="ghost" size="xs" iconRight={ArrowRight}>
                  Bitácora
                </ButtonLink>
              ) : undefined
            }
          />
          <CardBody>
            {data.activity.length === 0 ? (
              <EmptyState compact icon={Sparkles} title="Sin actividad todavía" />
            ) : (
              <div className="divide-y divide-line">
                {data.activity.map(entry => (
                  <AuditLine key={entry.id} entry={entry} compact />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Salud" description="Señales rápidas del sistema" />
          <CardBody className="space-y-3 text-[13.5px]">
            <HealthRow ok label="Base de datos" detail={`Respondió en ${data.elapsedMs} ms`} />
            <HealthRow
              ok={k.mailFailed === 0}
              label="Correo transaccional"
              detail={k.mailFailed ? `${k.mailFailed} fallidos` : 'Sin fallos'}
            />
            <HealthRow
              ok={k.deadLetters === 0}
              label="Limpieza de archivos"
              detail={k.deadLetters ? `${k.deadLetters} sin poder borrar` : 'Cola sana'}
            />
            <HealthRow
              ok={k.pending === 0 || daysSince(k.oldestPending) < 7}
              label="Tiempo de revisión"
              detail={
                k.oldestPending
                  ? `${daysSince(k.oldestPending)} días la más antigua`
                  : 'Sin pendientes'
              }
            />
            {user.level === 'admin' && (
              <ButtonLink
                href="/panel/sistema"
                tone="secondary"
                size="sm"
                className="mt-2 w-full"
                iconRight={ArrowRight}
              >
                Ver sistema
              </ButtonLink>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function HealthRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3">
      {ok ? (
        <CheckCircle2 aria-hidden className="size-[18px] shrink-0 text-sage" />
      ) : (
        <ShieldAlert aria-hidden className="size-[18px] shrink-0 text-terracotta" />
      )}
      <span className="flex-1 font-medium text-fg-2">{label}</span>
      <span className={ok ? 'text-muted' : 'font-medium text-terracotta'}>
        <span className="sr-only">{ok ? 'Correcto: ' : 'Atención: '}</span>
        {detail}
      </span>
    </div>
  );
}
