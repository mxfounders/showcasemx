import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertIcon, MessageAlertIcon, SearchXIcon } from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import {
  BRIEF_ALERT_HOURS,
  BRIEF_FILTERS,
  briefsAvailable,
  listBriefs,
  unmetDemandTopics,
  type BriefFilter,
  type BriefListRow,
} from '@/lib/data/briefs';
import { fmtNumber } from '@/lib/format';
import { choice, hrefWith, pageParam, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Field';

export const metadata: Metadata = { title: 'Necesidades' };

const FILTER_LABEL: Record<BriefFilter, string> = {
  pending: 'Sin atender',
  open: 'Abiertas',
  hidden: 'Ocultas',
  all: 'Todas',
};

function briefStatus(row: BriefListRow): { label: string; tone: Tone } {
  if (row.hiddenAt) return { label: 'Oculta', tone: 'terracotta' };
  if (row.closedAt) return { label: 'Cerrada por el comprador', tone: 'neutral' };
  if (new Date(row.expiresAt) <= new Date()) return { label: 'Vencida', tone: 'neutral' };
  return { label: 'Abierta', tone: 'sage' };
}

/**
 * Necesidades (SHCWS-60): buyer briefs to attend, oldest unattended first, with an alert
 * after a day without a proposal or a short list; and last week's searches that found
 * nothing, grouped by topic. Ops reads the brief because the buyer sent it to be attended
 * (brief-v1); proposals and conversations stay as private as contact requests (§44).
 */
export default async function NecesidadesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  if (!(await briefsAvailable()))
    return (
      <>
        <PageHeader title="Necesidades" />
        <EmptyState
          icon={MessageAlertIcon}
          title="Sin datos"
          description="Falta aplicar db/buyer-briefs.sql en esta base de datos."
        />
      </>
    );
  const filter = choice(params, 'estado', BRIEF_FILTERS, 'pending');
  const page = pageParam(params);
  const [data, demand] = await Promise.all([listBriefs({ filter, page }), unmetDemandTopics()]);

  return (
    <>
      <PageHeader
        title="Necesidades"
        description="Lo que publican los compradores en «Publica tu necesidad». Atiende las nuevas: revisa a quién llegó, oculta lo que no corresponde y arma una lista corta cuando no hay propuestas."
      />
      {data.counts.late > 0 && (
        <Alert tone="amber" className="mb-6" title="Necesidades sin atender">
          {fmtNumber(data.counts.late)} llevan más de {BRIEF_ALERT_HOURS} h sin propuestas ni lista
          corta.
        </Alert>
      )}
      <div className="mb-4">
        <Segmented
          label="Filtrar necesidades"
          items={BRIEF_FILTERS.map(key => ({
            label: FILTER_LABEL[key],
            href: hrefWith('/panel/necesidades', params, {
              estado: key === 'pending' ? null : key,
            }),
            active: filter === key,
            count: data.counts[key],
          }))}
        />
      </div>
      <Card className="mb-8">
        <Table label="Necesidades">
          <THead>
            <TH>Necesidad</TH>
            <TH>Publicada</TH>
            <TH>Estado</TH>
            <TH align="right">Llegó a</TH>
            <TH align="right">Propuestas</TH>
            <TH>Lista corta</TH>
          </THead>
          <TBody>
            {data.rows.length === 0 ? (
              <EmptyRow colSpan={6}>
                <EmptyState
                  compact
                  icon={MessageAlertIcon}
                  title={filter === 'pending' ? 'Nada pendiente' : 'Sin necesidades'}
                  description={
                    filter === 'pending'
                      ? 'Todas las necesidades abiertas tienen propuestas o lista corta.'
                      : undefined
                  }
                />
              </EmptyRow>
            ) : (
              data.rows.map(row => {
                const status = briefStatus(row);
                const late =
                  status.label === 'Abierta' &&
                  row.proposals === 0 &&
                  !row.shortlisted &&
                  row.ageHours >= BRIEF_ALERT_HOURS;
                return (
                  <TR key={row.id}>
                    <TD className="max-w-md">
                      <Link
                        href={`/panel/necesidades/${row.id}`}
                        className="line-clamp-2 font-medium text-fg hover:underline"
                      >
                        {row.problem}
                      </Link>
                      <p className="mt-1 text-[12.5px] text-muted">
                        {row.categories.join(', ')} · {row.companySize}
                        {row.country ? ` · ${row.country}` : ''} · {row.buyerEmail}
                      </p>
                    </TD>
                    <TD className="whitespace-nowrap text-[13px] text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        {late && (
                          <AlertIcon
                            aria-label={`Más de ${BRIEF_ALERT_HOURS} h sin atender`}
                            className="size-4 text-amber"
                          />
                        )}
                        <RelativeTime value={row.createdAt} />
                      </span>
                    </TD>
                    <TD>
                      <Badge tone={status.tone}>{status.label}</Badge>
                    </TD>
                    <TD align="right">{fmtNumber(row.matches)}</TD>
                    <TD align="right">{fmtNumber(row.proposals)}</TD>
                    <TD>{row.shortlisted ? <Badge tone="blue">Enviada</Badge> : '—'}</TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>
      <Pagination
        page={page}
        hasMore={data.hasMore}
        hrefFor={next => hrefWith('/panel/necesidades', params, { page: next })}
      />

      <Card className="mt-8">
        <CardHeader
          title="Búsquedas sin resultados por tema"
          description="Últimos 7 días, agrupadas por la categoría o industria a la que apuntan sus palabras. Un tema con muchas búsquedas vacías dice qué proyectos invitar. Solo conteos agregados, sin personas."
        />
        <CardBody>
          {demand.status !== 'ok' ? (
            <p className="text-[13px] text-muted">
              {demand.status === 'missing'
                ? 'Sin datos: falta aplicar db/search-demand.sql en esta base.'
                : demand.status === 'unconfigured'
                  ? 'Para agrupar por tema, ops necesita PRODUCT_APP_ORIGIN y CATALOG_REVALIDATE_SECRET. La lista sin agrupar está en Demanda.'
                  : 'No se pudo consultar el producto ahora. La lista sin agrupar está en Demanda.'}{' '}
              <Link href="/panel/demanda" className="text-accent-fg hover:underline">
                Ir a Demanda
              </Link>
            </p>
          ) : demand.topics.length === 0 ? (
            <EmptyState
              compact
              icon={SearchXIcon}
              title="Sin búsquedas vacías"
              description="En los últimos 7 días todas las búsquedas encontraron algo."
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {demand.topics.map(topic => (
                <li
                  key={`${topic.kind}:${topic.value}`}
                  className="rounded-xl border border-line p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium text-fg">{topic.title || 'Sin tema reconocido'}</h3>
                    <span className="num text-[13px] text-muted">
                      {fmtNumber(topic.empty)} sin resultados
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-subtle">
                    {topic.kind === 'category'
                      ? 'Categoría'
                      : topic.kind === 'industry'
                        ? 'Industria'
                        : 'Sin categoría ni industria'}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {topic.queries.slice(0, 8).map(query => (
                      <li key={query.query}>
                        <Badge>
                          {query.query} · {fmtNumber(query.empty)}
                        </Badge>
                      </li>
                    ))}
                    {topic.queries.length > 8 && (
                      <li className="text-[12.5px] text-muted">
                        y {fmtNumber(topic.queries.length - 8)} más
                      </li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
