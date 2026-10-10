import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  Eye,
  Globe,
  Heart,
  History,
  ImageIcon,
  LineChart,
  Lock,
  MessageSquare,
  MousePointerClick,
  Bookmark,
  Handshake,
  Flag,
  RefreshCcw,
} from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { isUuid } from '@/lib/http';
import { solutionDetail, type SolutionDetail } from '@/lib/data/solutions';
import { daysSince, fmtBytes, fmtDate, fmtDateTime, fmtNumber, fmtPercent } from '@/lib/format';
import { FIELD_LABELS, asList, asText, checklist, humanize, safeHref } from '@/lib/solution-fields';
import { fieldChanges, wordDiff, type FieldChange } from '@/lib/diff';
import { SOLUTION_REPORT_REASON, solutionStatus } from '@/lib/labels';
import { choice, param, type SearchParams } from '@/lib/url';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { DescriptionList } from '@/components/ui/DescriptionList';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { IdChip } from '@/components/ui/CopyButton';
import { ButtonLink } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { AreaChart } from '@/components/charts/AreaChart';
import { SolutionStatusBadge, ReportStatusBadge, AgeBadge } from '@/components/domain/StatusBadge';
import { Timeline } from '@/components/domain/Timeline';
import { AuditLine } from '@/components/domain/AuditLine';
import { ActionButton } from '@/components/actions/ActionButton';
import { DecisionPanel } from './DecisionPanel';
import { Gallery } from './Gallery';
import { ReviewKeys } from './ReviewKeys';

export const metadata: Metadata = { title: 'Postulación' };

const TABS = [
  'ficha',
  'cambios',
  'capturas',
  'historial',
  'actividad',
  'reportes',
  'comentarios',
] as const;
type Tab = (typeof TABS)[number];

function Chips({
  values,
  tone = 'neutral',
}: {
  values: string[];
  tone?: 'neutral' | 'blue' | 'lavender' | 'sage';
}) {
  if (!values.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map(value => (
        <Badge key={value} tone={tone}>
          {humanize(value)}
        </Badge>
      ))}
    </div>
  );
}

function Declared({ value, any }: { value: unknown; any: string }) {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return <Badge tone="sage">{any}</Badge>;
  return <Chips values={asList(value)} tone="blue" />;
}

function ExternalUrl({ value }: { value: unknown }) {
  const href = safeHref(value);
  if (!href)
    return asText(value) ? (
      <span className="text-terracotta">{asText(value)} (enlace no válido)</span>
    ) : null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-center gap-1 break-all text-accent-fg hover:underline"
    >
      {href.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      <ExternalLink aria-hidden className="size-3 shrink-0" />
    </a>
  );
}

function Prose({ value }: { value: unknown }) {
  const text = asText(value);
  return text ? <p className="whitespace-pre-line leading-relaxed">{text}</p> : null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FichaTab({
  detail,
  productOrigin,
}: {
  detail: SolutionDetail;
  productOrigin: string | null;
}) {
  const d = detail.solution.data;
  const founders = Array.isArray(d.founders) ? (d.founders as Array<Record<string, unknown>>) : [];
  const links = Array.isArray(d.projectLinks)
    ? (d.projectLinks as Array<Record<string, unknown>>)
    : [];
  const site = detail.siteImage;
  return (
    <div className="space-y-6">
      <Section title="Lo esencial">
        <DescriptionList
          items={[
            { label: 'Nombre', value: asText(d.name) },
            { label: 'Tipo', value: asText(d.kind) },
            {
              label: 'Categorías',
              value: (
                <Chips
                  values={asList(d.categories).length ? asList(d.categories) : asList([d.category])}
                  tone="lavender"
                />
              ),
              wide: true,
            },
            { label: 'Problema que resuelve', value: <Prose value={d.problem} />, wide: true },
            { label: 'Cliente ideal', value: <Prose value={d.audience} />, wide: true },
            { label: 'Cuándo no encaja', value: <Prose value={d.notFor} />, wide: true },
            { label: 'Sitio web', value: <ExternalUrl value={d.website} /> },
            { label: 'Demo', value: <ExternalUrl value={d.demoUrl} /> },
            {
              label: 'Correo privado de contacto',
              value: asText(d.contactEmail) ? (
                <span className="inline-flex items-center gap-1.5">
                  <Lock aria-hidden className="size-3.5 text-subtle" />
                  {asText(d.contactEmail)}
                  <Badge>Nunca público</Badge>
                </span>
              ) : null,
              wide: true,
            },
          ]}
        />
      </Section>

      <Section title="Mercado">
        <DescriptionList
          items={[
            {
              label: 'Capacidades',
              value: <Chips values={asList(d.capabilities)} tone="blue" />,
              wide: true,
            },
            {
              label: 'Industrias',
              value: <Declared value={d.industries} any="Cualquier industria" />,
            },
            {
              label: 'Tamaños de empresa',
              value: <Declared value={d.companySizes} any="Cualquier tamaño" />,
            },
          ]}
        />
      </Section>

      <Section title="Para evaluar">
        <DescriptionList
          items={[
            { label: 'Alcance', value: <Prose value={d.scope} />, wide: true },
            { label: 'Precio', value: <Prose value={d.pricing} />, wide: true },
            { label: 'Modelo de precio', value: <Chips values={asList(d.pricingModel)} /> },
            {
              label: 'Rango de precio',
              value: asText(d.priceBand) ? humanize(asText(d.priceBand)) : null,
            },
            { label: 'Implementación', value: <Prose value={d.implementation} />, wide: true },
            {
              label: 'Tiempo de arranque',
              value: asText(d.setupTime) ? humanize(asText(d.setupTime)) : null,
            },
            { label: 'Soporte', value: <Prose value={d.support} /> },
            {
              label: 'Integraciones declaradas',
              value:
                Array.isArray(d.integrationKeys) && d.integrationKeys.length === 0 ? (
                  <Badge>No se conecta con otras herramientas</Badge>
                ) : (
                  <Chips values={asList(d.integrationKeys)} />
                ),
              wide: true,
            },
            { label: 'Integraciones (texto)', value: <Prose value={d.integrations} />, wide: true },
            {
              label: 'Cumplimiento',
              value: <Chips values={asList(d.compliance)} tone="sage" />,
              wide: true,
            },
            { label: 'Evidencia', value: <Prose value={d.evidence} />, wide: true },
            { label: 'Enlace de evidencia', value: <ExternalUrl value={d.evidenceUrl} /> },
          ]}
        />
      </Section>

      <Section title={`Creadores (${founders.length})`}>
        {founders.length === 0 ? (
          <p className="text-[13px] text-muted">No declaró personas creadoras.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {founders.map((founder, index) => (
              <div key={index} className="rounded-xl border border-line bg-surface-2 p-3.5">
                <p className="text-[13.5px] font-semibold">
                  {asText(founder.name) || 'Sin nombre'}
                  {asText(founder.role) && (
                    <span className="font-normal text-muted"> · {asText(founder.role)}</span>
                  )}
                </p>
                {asText(founder.bio) && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-fg-2">
                    {asText(founder.bio)}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
                  {(Array.isArray(founder.links)
                    ? (founder.links as Array<Record<string, unknown>>)
                    : []
                  ).map((link, i) => (
                    <ExternalUrl key={i} value={link.url} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Enlaces del proyecto (${links.length})`}>
        {links.length === 0 ? (
          <p className="text-[13px] text-muted">Sin enlaces adicionales.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {links.map((link, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-[13px]"
              >
                <span className="font-medium">{asText(link.label) || 'Enlace'}</span>
                <ExternalUrl value={link.url} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Portada del sitio (og:image)">
        {!site ? (
          <p className="text-[13px] text-muted">
            Todavía no se ha intentado leer la portada del sitio.
          </p>
        ) : (
          <DescriptionList
            items={[
              {
                label: 'Estado',
                value: site.stored ? (
                  <Badge tone="sage" dot>
                    Guardada como copia propia
                  </Badge>
                ) : (
                  <Badge tone="terracotta" dot>
                    Falló
                  </Badge>
                ),
              },
              { label: 'Motivo del fallo', value: site.failure },
              { label: 'Página leída', value: <ExternalUrl value={site.sourceUrl} /> },
              { label: 'Imagen original', value: <ExternalUrl value={site.imageUrl} /> },
              {
                label: 'Tamaño',
                value:
                  site.width && site.height
                    ? `${site.width}×${site.height} · ${fmtBytes(site.bytes ?? 0)}`
                    : null,
              },
              { label: 'Leída', value: fmtDateTime(site.fetchedAt) },
              { label: 'Oculta por el fundador', value: d.hideSiteImage ? 'Sí' : 'No' },
            ]}
          />
        )}
        {productOrigin && detail.solution.publishedData && (
          <a
            href={`${productOrigin}/es/soluciones/${detail.solution.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-fg hover:underline"
          >
            Ver la ficha pública en shwcs <ExternalLink aria-hidden className="size-3.5" />
          </a>
        )}
      </Section>
    </div>
  );
}

function ChangeView({ change }: { change: FieldChange }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="mb-2 text-[13px] font-semibold">{change.label}</p>
      {change.kind === 'text' && (
        <p className="whitespace-pre-line text-[13.5px] leading-relaxed">
          {wordDiff(String(change.before ?? ''), String(change.after ?? '')).map((token, index) =>
            token.kind === 'same' ? (
              <span key={index}>{token.text}</span>
            ) : token.kind === 'added' ? (
              <ins key={index} className="rounded bg-sage-soft px-0.5 text-sage no-underline">
                {token.text}
              </ins>
            ) : (
              <del key={index} className="rounded bg-terracotta-soft px-0.5 text-terracotta">
                {token.text}
              </del>
            ),
          )}
        </p>
      )}
      {change.kind === 'list' && (
        <div className="flex flex-wrap gap-1.5">
          {(change.added ?? []).map(value => (
            <Badge key={'+' + value} tone="sage">
              + {humanize(value)}
            </Badge>
          ))}
          {(change.removed ?? []).map(value => (
            <Badge key={'-' + value} tone="terracotta">
              − {humanize(value)}
            </Badge>
          ))}
          {!change.added?.length && !change.removed?.length && (
            <span className="text-[13px] text-muted">
              Cambió el orden o pasó de «sin respuesta» a «cualquiera».
            </span>
          )}
        </div>
      )}
      {change.kind === 'other' && (
        <p className="text-[13px] text-muted">
          {Array.isArray(change.before)
            ? `${change.before.length} elementos`
            : change.before === undefined
              ? 'Sin valor'
              : 'Valor anterior'}{' '}
          →{' '}
          {Array.isArray(change.after)
            ? `${change.after.length} elementos`
            : change.after === undefined
              ? 'sin valor'
              : 'valor nuevo'}
        </p>
      )}
    </div>
  );
}

export default async function SolutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const query = await searchParams;
  const detail = await solutionDetail(id);
  if (!detail) notFound();

  const s = detail.solution;
  const tab = choice(query, 'tab', TABS, 'ficha') as Tab;
  const fromQueue = param(query, 'from') === 'revision';
  const base = `/panel/postulaciones/${id}${fromQueue ? '?from=revision&' : '?'}`;
  const changes = fieldChanges(s.publishedData, s.data, FIELD_LABELS);
  const screenshots = (
    Array.isArray(s.data.screenshots)
      ? (s.data.screenshots as Array<{ id?: string; caption?: string }>)
      : []
  )
    .map(shot => {
      const media = detail.media.find(m => m.id === shot.id);
      return media
        ? { id: media.id, caption: asText(shot.caption), width: media.width, height: media.height }
        : null;
    })
    .filter((shot): shot is NonNullable<typeof shot> => shot !== null);
  const unselected = detail.media.length - screenshots.length;
  const items = checklist(s.data);
  const required = items.filter(item => item.required);
  const status = solutionStatus(s.status);
  const isPending = s.status === 'pending';
  const queueHref = (target: string | null) =>
    target ? `/panel/postulaciones/${target}?from=revision` : null;
  const nextHref = fromQueue ? queueHref(detail.queue.nextId) : null;
  const prevHref = fromQueue ? queueHref(detail.queue.prevId) : null;
  const productOrigin = process.env.PRODUCT_APP_ORIGIN?.trim() || null;
  const openReports = detail.reports.filter(report => report.status === 'open').length;

  return (
    <>
      {fromQueue && <ReviewKeys prevHref={prevHref} nextHref={nextHref} />}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={fromQueue ? '/panel/revision' : '/panel/postulaciones'}
          className="group inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-fg"
        >
          <ArrowLeft aria-hidden className="size-4 transition group-hover:-translate-x-0.5" />
          {fromQueue ? 'Cola de revisión' : 'Postulaciones'}
        </Link>
        {fromQueue && isPending && (
          <div className="flex items-center gap-2 text-[12.5px] text-muted">
            <span className="num">
              {detail.queue.position} de {detail.queue.pendingTotal}
            </span>
            <ButtonLink
              href={prevHref ?? '#'}
              tone="secondary"
              size="xs"
              icon={ArrowLeft}
              aria-disabled={!prevHref}
              className={!prevHref ? 'pointer-events-none opacity-40' : ''}
            >
              <Kbd className="border-0 bg-transparent shadow-none">k</Kbd>
            </ButtonLink>
            <ButtonLink
              href={nextHref ?? '#'}
              tone="secondary"
              size="xs"
              iconRight={ArrowRight}
              aria-disabled={!nextHref}
              className={!nextHref ? 'pointer-events-none opacity-40' : ''}
            >
              <Kbd className="border-0 bg-transparent shadow-none">j</Kbd>
            </ButtonLink>
          </div>
        )}
      </div>

      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">
              {asText(s.data.name) || '(sin nombre)'}
            </h1>
            <SolutionStatusBadge status={s.status} />
            {s.publishedData && s.status !== 'published' && (
              <Badge tone="blue" icon={RefreshCcw}>
                Tiene versión pública
              </Badge>
            )}
            {s.catalogKey && <Badge tone="lavender">catalog:{s.catalogKey}</Badge>}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span>
              Versión <span className="num font-medium text-fg-2">{s.version}</span>
            </span>
            <span>Creada {fmtDate(s.createdAt)}</span>
            <span>
              Actualizada <RelativeTime value={s.updatedAt} />
            </span>
            {s.publishedAt && <span>Publicada {fmtDate(s.publishedAt)}</span>}
            {isPending && <AgeBadge days={daysSince(s.updatedAt)} />}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <IdChip value={s.id} display={s.id.slice(0, 8)} />
          {safeHref(s.data.website) && (
            <ButtonLink href={safeHref(s.data.website)!} external tone="secondary" icon={Globe}>
              Abrir sitio
            </ButtonLink>
          )}
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <Tabs
            label="Secciones de la postulación"
            items={[
              { label: 'Ficha', href: `${base}tab=ficha`, active: tab === 'ficha' },
              ...(s.publishedData
                ? [
                    {
                      label: 'Cambios',
                      href: `${base}tab=cambios`,
                      active: tab === 'cambios',
                      count: changes.length,
                    },
                  ]
                : []),
              {
                label: 'Capturas',
                href: `${base}tab=capturas`,
                active: tab === 'capturas',
                count: screenshots.length,
              },
              {
                label: 'Historial',
                href: `${base}tab=historial`,
                active: tab === 'historial',
                count: detail.events.length,
              },
              { label: 'Actividad', href: `${base}tab=actividad`, active: tab === 'actividad' },
              {
                label: 'Reportes',
                href: `${base}tab=reportes`,
                active: tab === 'reportes',
                count: detail.reports.length,
              },
              {
                label: 'Comentarios',
                href: `${base}tab=comentarios`,
                active: tab === 'comentarios',
                count: detail.comments.length,
              },
            ]}
          />

          <Card>
            <CardBody className="pt-5">
              {tab === 'ficha' && <FichaTab detail={detail} productOrigin={productOrigin} />}

              {tab === 'cambios' &&
                (changes.length === 0 ? (
                  <EmptyState
                    compact
                    icon={CheckCircle2}
                    title="Sin diferencias"
                    description="El borrador es idéntico a la versión pública."
                  />
                ) : (
                  <div className="space-y-3">
                    <p className="text-[13px] text-muted">
                      Diferencias entre la versión pública (publicada {fmtDate(s.publishedAt)}) y el
                      borrador actual.{' '}
                      <ins className="rounded bg-sage-soft px-1 text-sage no-underline">nuevo</ins>{' '}
                      <del className="rounded bg-terracotta-soft px-1 text-terracotta">
                        eliminado
                      </del>
                    </p>
                    {changes.map(change => (
                      <ChangeView key={change.key} change={change} />
                    ))}
                  </div>
                ))}

              {tab === 'capturas' && (
                <div className="space-y-4">
                  {screenshots.length === 0 ? (
                    <EmptyState
                      compact
                      icon={ImageIcon}
                      title="Sin capturas seleccionadas"
                      description="Subir capturas es opcional para publicar."
                    />
                  ) : (
                    <Gallery shots={screenshots} />
                  )}
                  {unselected > 0 && (
                    <p className="text-[12.5px] text-muted">
                      {unselected}{' '}
                      {unselected === 1 ? 'archivo subido no está' : 'archivos subidos no están'} en
                      la ficha; permanecen privados del fundador.
                    </p>
                  )}
                </div>
              )}

              {tab === 'historial' && (
                <div className="space-y-8">
                  {detail.events.length === 0 ? (
                    <EmptyState compact icon={History} title="Sin eventos" />
                  ) : (
                    <Timeline
                      items={detail.events.map(event => {
                        const label = solutionStatus(event.status);
                        return {
                          id: event.id,
                          tone: label.tone,
                          title: (
                            <span className="flex flex-wrap items-center gap-2">
                              <Badge tone={label.tone}>{label.label}</Badge>
                              <span className="text-[12.5px] font-normal text-muted">
                                {event.actorEmail ?? 'Sistema'}
                                {event.actorIsOps && ' · ops'}
                              </span>
                            </span>
                          ),
                          body: event.message,
                          at: event.createdAt,
                        };
                      })}
                    />
                  )}
                  {detail.audit.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
                        En la bitácora de ops
                      </h3>
                      <div className="divide-y divide-line">
                        {detail.audit.map(entry => (
                          <AuditLine
                            key={entry.id}
                            entry={{ ...entry, subjectType: 'solution', subjectId: s.id }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'actividad' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { label: 'Vistas (total)', value: detail.metrics.viewsAll, Icon: Eye },
                      {
                        label: 'Clics al sitio',
                        value: detail.metrics.clicksAll,
                        Icon: MousePointerClick,
                      },
                      {
                        label: 'CTR',
                        value: fmtPercent(detail.metrics.clicksAll, detail.metrics.viewsAll),
                        Icon: LineChart,
                      },
                      { label: 'Solicitudes', value: detail.metrics.contacts, Icon: Handshake },
                      { label: 'Me gusta', value: detail.metrics.likes, Icon: Heart },
                      { label: 'Guardados', value: detail.metrics.saves, Icon: Bookmark },
                    ].map(({ label, value, Icon }) => (
                      <div key={label} className="rounded-xl border border-line p-3.5">
                        <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
                          <Icon aria-hidden className="size-3.5" /> {label}
                        </p>
                        <p className="mt-1 text-xl font-semibold tracking-tight">
                          {typeof value === 'number' ? fmtNumber(value) : value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <AreaChart
                    title="Vistas y clics de esta ficha, 30 días"
                    series={[
                      { key: 'views', label: 'Vistas', color: 'series-1' },
                      { key: 'clicks', label: 'Clics al sitio', color: 'series-2' },
                    ]}
                    data={detail.metrics.days}
                    height={220}
                  />
                  <p className="text-[12px] text-muted">
                    Eventos agregados, no personas únicas. Las vistas del propietario y con DNT/GPC
                    no se cuentan.
                  </p>
                </div>
              )}

              {tab === 'reportes' &&
                (detail.reports.length === 0 ? (
                  <EmptyState compact icon={Flag} title="Sin reportes" />
                ) : (
                  <ul className="divide-y divide-line">
                    {detail.reports.map(report => (
                      <li key={report.id} className="py-3.5 first:pt-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <ReportStatusBadge status={report.status} />
                          <span className="text-[13.5px] font-medium">
                            {SOLUTION_REPORT_REASON[report.reason] ?? report.reason}
                          </span>
                          <span className="text-[12.5px] text-muted">
                            · {report.reporterEmail ?? 'cuenta eliminada'} ·{' '}
                            <RelativeTime value={report.createdAt} />
                          </span>
                        </div>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-fg-2">
                          {report.details}
                        </p>
                        {report.decision && (
                          <p className="mt-1.5 text-[12.5px] text-muted">
                            Decisión de {report.reviewerEmail ?? 'ops'}: «{report.decision}»
                          </p>
                        )}
                      </li>
                    ))}
                    {openReports > 0 && (
                      <li className="pt-3">
                        <ButtonLink
                          href="/panel/reportes"
                          tone="primary"
                          size="sm"
                          iconRight={ArrowRight}
                        >
                          Resolver en Reportes
                        </ButtonLink>
                      </li>
                    )}
                  </ul>
                ))}

              {tab === 'comentarios' &&
                (detail.comments.length === 0 ? (
                  <EmptyState compact icon={MessageSquare} title="Sin comentarios públicos" />
                ) : (
                  <ul className="divide-y divide-line">
                    {detail.comments.map(comment => (
                      <li key={comment.id} className="flex gap-3 py-3.5 first:pt-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px]">
                            <span className="font-medium">{comment.authorName}</span>
                            <span className="text-muted">
                              {' '}
                              · {comment.authorEmail ?? 'cuenta eliminada'} ·{' '}
                              <RelativeTime value={comment.createdAt} />
                            </span>
                          </p>
                          <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-fg-2">
                            {comment.body}
                          </p>
                        </div>
                        <ActionButton
                          label="Borrar"
                          tone="ghost"
                          size="xs"
                          endpoint="/api/community"
                          payload={{ action: 'delete_solution_comment', commentId: comment.id }}
                          success="Comentario borrado"
                          confirm={{
                            title: 'Borrar este comentario',
                            description:
                              'Se elimina de la ficha pública. El texto queda copiado en la bitácora.',
                            destructive: true,
                            confirmLabel: 'Borrar comentario',
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                ))}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <Card>
            <CardHeader
              title="Decisión"
              description={`Estado actual: ${status.label.toLowerCase()} · v${s.version}`}
            />
            <CardBody>
              <DecisionPanel
                solutionId={s.id}
                status={s.status}
                version={s.version}
                nextHref={nextHref}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Propietario" />
            <CardBody className="space-y-3">
              <Link href={`/panel/cuentas/${s.ownerId}`} className="group flex items-center gap-3">
                <Avatar name={s.ownerName} email={s.ownerEmail} />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium group-hover:text-accent-fg">
                    {s.ownerName ?? s.ownerEmail}
                  </p>
                  <p className="truncate text-[12.5px] text-muted">
                    {s.ownerName ? s.ownerEmail : (s.ownerOrganization ?? 'Sin empresa')}
                  </p>
                </div>
              </Link>
              <div className="flex flex-wrap gap-1.5">
                {s.ownerVerifiedAt ? (
                  <Badge tone="sage" dot>
                    Correo verificado
                  </Badge>
                ) : (
                  <Badge tone="amber" dot>
                    Correo sin verificar
                  </Badge>
                )}
                {s.ownerSuspendedAt && (
                  <Badge tone="terracotta" dot>
                    Suspendida
                  </Badge>
                )}
                <Badge>Cuenta de {daysSince(s.ownerCreatedAt)} días</Badge>
                <Badge>
                  {s.ownerSolutions} {s.ownerSolutions === 1 ? 'ficha' : 'fichas'}
                </Badge>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Requisitos para publicar"
              description={`${required.filter(item => item.done).length} de ${required.length} obligatorios`}
            />
            <CardBody>
              <ul className="space-y-1.5">
                {items.map(item => (
                  <li key={item.label} className="flex items-center gap-2 text-[13px]">
                    {item.done ? (
                      <CheckCircle2 aria-hidden className="size-4 shrink-0 text-sage" />
                    ) : (
                      <Circle
                        aria-hidden
                        className={`size-4 shrink-0 ${item.required ? 'text-terracotta' : 'text-subtle'}`}
                      />
                    )}
                    <span
                      className={
                        item.done
                          ? 'text-fg-2'
                          : item.required
                            ? 'font-medium text-terracotta'
                            : 'text-muted'
                      }
                    >
                      {item.label}
                    </span>
                    {!item.required && (
                      <span className="ml-auto text-[11px] text-subtle">opcional</span>
                    )}
                    <span className="sr-only">{item.done ? 'completo' : 'pendiente'}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11.5px] text-muted">
                Que esté completa no significa que sea buena; decide con criterio editorial.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Dominio" />
            <CardBody className="text-[13px]">
              {detail.domainProof ? (
                <div className="space-y-1.5">
                  <p className="font-mono text-[12.5px]">{detail.domainProof.domain}</p>
                  {detail.domainProof.verifiedAt ? (
                    <Badge
                      tone={daysSince(detail.domainProof.verifiedAt) > 90 ? 'amber' : 'sage'}
                      dot
                    >
                      Verificado {fmtDate(detail.domainProof.verifiedAt)}
                      {daysSince(detail.domainProof.verifiedAt) > 90 ? ' · revalidar' : ''}
                    </Badge>
                  ) : (
                    <Badge tone="amber" dot>
                      Pendiente · vence {fmtDate(detail.domainProof.expiresAt)}
                    </Badge>
                  )}
                  <p className="text-[11.5px] text-muted">
                    El TXT prueba control del dominio, no identidad legal.
                  </p>
                </div>
              ) : (
                <p className="text-muted">Sin verificación de dominio.</p>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
