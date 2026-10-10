import type { Metadata } from 'next';
import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { AD_FILTERS, adsOverview, type AdFilter } from '@/lib/data/ads';
import { fmtDate, fmtMoney, fmtNumber, fmtPercent } from '@/lib/format';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { Alert } from '@/components/ui/Field';
import { RelativeTime } from '@/components/ui/RelativeTime';

export const metadata: Metadata = { title: 'Anuncios' };

const FILTER_LABEL: Record<AdFilter, string> = {
  all: 'Todas',
  active: 'Activas hoy',
  upcoming: 'Próximas',
  paid: 'Pagadas',
  pending: 'En pago',
  refunds: 'Con reembolso',
  disputes: 'Disputas',
  failed: 'Fallidas o vencidas',
};

const STATUS: Record<string, { label: string; tone: Tone }> = {
  checkout: { label: 'En checkout', tone: 'neutral' },
  processing: { label: 'Procesando', tone: 'amber' },
  paid: { label: 'Pagada', tone: 'sage' },
  expired: { label: 'Vencida', tone: 'neutral' },
  failed: { label: 'Fallida', tone: 'terracotta' },
};

const PLACEMENT: Record<string, string> = {
  category: 'Categoría',
  home: 'Inicio',
  newsletter: 'Newsletter',
};

export default async function AnunciosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const filter = choice(params, 'filtro', AD_FILTERS, 'all');
  const page = pageParam(params);
  const data = await adsOverview(filter, param(params, 'q'), page);

  if (!data)
    return (
      <>
        <PageHeader title="Anuncios" description="Espacios patrocinados pagados con Stripe." />
        <Alert tone="amber" title="Esta base todavía no tiene los anuncios">
          Aplica db/ad-campaigns.sql en este entorno para ver campañas, pagos y reembolsos aquí.
        </Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title="Anuncios"
        description="Espacios patrocinados pagados con Stripe. Vista de solo lectura: pausar o retirar con reembolso se decide en el producto, donde vive la lógica de cobro."
      />
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Ingresos cobrados"
          value={
            data.totals.length
              ? data.totals.map(t => fmtMoney(t.revenue, t.currency)).join(' · ')
              : '—'
          }
          hint="Total pagado, impuestos incluidos"
        />
        <Stat
          label="Campañas activas hoy"
          value={data.totals.reduce((sum, t) => sum + t.active, 0)}
        />
        <Stat
          label="Reembolsado"
          value={
            data.totals.some(t => t.refunded > 0)
              ? data.totals
                  .filter(t => t.refunded > 0)
                  .map(t => fmtMoney(t.refunded, t.currency))
                  .join(' · ')
              : '0'
          }
        />
        <Stat
          label="Disputas abiertas"
          value={data.totals.reduce((sum, t) => sum + t.disputes, 0)}
          tone="danger"
        />
      </section>

      <Card className="mb-6">
        <CardHeader
          title="Espacios y tarifas"
          description="Inventario configurado en ad_placements y ad_rates."
        />
        <CardBody>
          {data.placements.length === 0 ? (
            <p className="text-[13px] text-muted">Sin espacios configurados.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {data.placements.map(placement => (
                <li key={placement.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-semibold">
                      {PLACEMENT[placement.id] ?? placement.id}
                    </p>
                    {placement.enabled ? (
                      <Badge tone="sage" dot>
                        Activo
                      </Badge>
                    ) : (
                      <Badge dot>Apagado</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {placement.slots} {placement.slots === 1 ? 'lugar' : 'lugares'} por día
                  </p>
                  <p className="mt-2 text-[13px] text-fg-2">
                    {placement.rates.length
                      ? placement.rates
                          .map(rate => `${fmtMoney(rate.dailyAmount, rate.currency)}/día`)
                          .join(' · ')
                      : 'Sin tarifa'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Filtro"
          items={AD_FILTERS.map(key => ({
            label: FILTER_LABEL[key],
            href: hrefWith('/panel/anuncios', params, { filtro: key === 'all' ? null : key }),
            active: filter === key,
          }))}
        />
        <SearchField placeholder="Ficha o correo de facturación…" className="lg:w-72" />
      </div>

      <Table label="Campañas">
        <THead>
          <TH>Campaña</TH>
          <TH>Espacio</TH>
          <TH>Fechas</TH>
          <TH>Estado</TH>
          <TH align="right">Total</TH>
          <TH align="right">Rendimiento</TH>
          <TH>Creada</TH>
        </THead>
        <TBody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={7}>
              <EmptyState compact icon={Megaphone} title="Sin campañas en este filtro" />
            </EmptyRow>
          ) : (
            data.items.map(item => {
              const status = STATUS[item.status] ?? { label: item.status, tone: 'neutral' as Tone };
              return (
                <TR key={item.id}>
                  <TD>
                    {item.solutionId ? (
                      <Link
                        href={`/panel/postulaciones/${item.solutionId}`}
                        className="font-medium hover:text-accent-fg"
                      >
                        {item.solutionName}
                      </Link>
                    ) : (
                      <span className="font-medium">{item.solutionName}</span>
                    )}
                    <p className="text-[12px] text-muted">
                      {item.ownerId ? (
                        <Link
                          href={`/panel/cuentas/${item.ownerId}`}
                          className="hover:text-accent-fg"
                        >
                          {item.billingEmail}
                        </Link>
                      ) : (
                        item.billingEmail
                      )}
                      {item.paymentRef && (
                        <span className="font-mono"> · pi…{item.paymentRef}</span>
                      )}
                    </p>
                  </TD>
                  <TD className="text-[13px]">
                    {PLACEMENT[item.placement] ?? item.placement}
                    {item.scope && <span className="text-muted"> · {item.scope}</span>}
                  </TD>
                  <TD className="whitespace-nowrap text-[13px] text-muted">
                    {fmtDate(item.startsOn + 'T12:00:00Z')} → {fmtDate(item.endsOn + 'T12:00:00Z')}
                    {item.servedUntil && (
                      <p className="text-[11.5px]">
                        Servida hasta {fmtDate(item.servedUntil + 'T12:00:00Z')}
                      </p>
                    )}
                  </TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                      {item.pausedAt && (
                        <Badge tone="amber" title={item.pauseReason ?? undefined}>
                          Pausada
                        </Badge>
                      )}
                      {item.canceledAt && <Badge tone="terracotta">Cancelada</Badge>}
                      {item.disputeStatus && (
                        <Badge tone={item.disputeStatus === 'won' ? 'sage' : 'terracotta'}>
                          Disputa{' '}
                          {item.disputeStatus === 'open'
                            ? 'abierta'
                            : item.disputeStatus === 'won'
                              ? 'ganada'
                              : 'perdida'}
                        </Badge>
                      )}
                    </div>
                  </TD>
                  <TD align="right">
                    <span className="text-fg">
                      {fmtMoney(item.total ?? item.subtotal, item.currency)}
                    </span>
                    {(item.refunded > 0 || item.refundRequested > 0) && (
                      <p className="text-[11.5px] text-terracotta">
                        −{fmtMoney(item.refunded, item.currency)}
                        {item.refundRequested > item.refunded
                          ? ` (${fmtMoney(item.refundRequested - item.refunded, item.currency)} en trámite)`
                          : ''}
                      </p>
                    )}
                  </TD>
                  <TD align="right" className="text-[13px]">
                    {fmtNumber(item.impressions)} imp. · {fmtNumber(item.clicks)} clics
                    <p className="text-[11.5px] text-muted">
                      CTR {fmtPercent(item.clicks, item.impressions)}
                    </p>
                  </TD>
                  <TD className="whitespace-nowrap text-[13px] text-muted">
                    <RelativeTime value={item.createdAt} />
                  </TD>
                </TR>
              );
            })
          )}
        </TBody>
      </Table>
      <Pagination
        page={page}
        hasMore={data.hasMore}
        total={data.total}
        pageSize={data.pageSize}
        hrefFor={target => hrefWith('/panel/anuncios', params, { page: target })}
      />
    </>
  );
}
