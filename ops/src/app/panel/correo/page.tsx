import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Mail, RefreshCw } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { mailOverview, MAIL_FILTERS, type MailFilter } from '@/lib/data/mail';
import { fmtNumber } from '@/lib/format';
import { choice, hrefWith, pageParam, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { StackedBar } from '@/components/charts/StackedBar';
import { AreaChart } from '@/components/charts/AreaChart';
import { EmailStateBadge } from '@/components/domain/StatusBadge';
import { ActionButton } from '@/components/actions/ActionButton';

export const metadata: Metadata = { title: 'Correo' };

const FILTER_LABEL: Record<MailFilter, string> = {
  problems: 'Con problemas',
  failed: 'Fallidos',
  queued: 'En cola',
  sent: 'Enviados',
  all: 'Todos',
};

export default async function CorreoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireOps();
  const params = await searchParams;
  const filter = choice(params, 'filtro', MAIL_FILTERS, 'problems');
  const page = pageParam(params);
  const data = await mailOverview(filter, page);
  const c = data.stateCounts;

  return (
    <>
      <PageHeader
        title="Correo"
        description="Avisos transaccionales del producto (solicitudes y fichas). Ops no envía correos: reintentar los regresa a la cola del worker diario."
        actions={
          user.level === 'admin' && (c.failed ?? 0) > 0 ? (
            <ActionButton
              label="Reintentar fallidos recientes"
              icon={<RefreshCw />}
              tone="primary"
              endpoint="/api/mail"
              payload={{ action: 'retry_all_failed' }}
              success="Avisos devueltos a la cola"
              confirm={{
                title: 'Reintentar todos los fallidos',
                description:
                  'Solo los creados en las últimas 23 horas: la idempotencia del proveedor dura 24 h y más atrás podría duplicarse un envío.',
                field: null,
                confirmLabel: 'Reintentar',
              }}
            />
          ) : undefined
        }
      />
      <div className="mb-6 grid items-start gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Estado de la bandeja" description="Todos los avisos generados." />
          <CardBody>
            <StackedBar
              label="Avisos por estado"
              segments={[
                { label: 'Enviados', value: c.sent ?? 0, className: 'bg-sage' },
                {
                  label: 'En cola',
                  value: (c.pending ?? 0) + (c.sending ?? 0),
                  className: 'bg-accent',
                },
                { label: 'Fallidos', value: c.failed ?? 0, className: 'bg-terracotta' },
                {
                  label: 'Sin correo',
                  value: (c.disabled ?? 0) + (c.skipped ?? 0),
                  className: 'bg-line-strong',
                },
              ]}
            />
            <p className="mt-4 text-[12.5px] text-muted">
              «Sin correo» = la persona desactivó ese tipo de aviso o no había proveedor. Mensajes
              del formulario:{' '}
              {Object.entries(data.inquiryStates)
                .map(([state, n]) => `${state} ${fmtNumber(n)}`)
                .join(' · ') || 'ninguno'}
              .
            </p>
          </CardBody>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Últimos 14 días" description="Por fecha de creación del aviso." />
          <CardBody>
            <AreaChart
              title="Avisos enviados y fallidos por día"
              series={[
                { key: 'sent', label: 'Enviados', color: 'series-1' },
                { key: 'failed', label: 'Fallidos', color: 'series-2' },
              ]}
              data={data.daily}
              height={180}
            />
          </CardBody>
        </Card>
      </div>
      <div className="mb-4">
        <Segmented
          label="Filtro"
          items={MAIL_FILTERS.map(key => ({
            label: FILTER_LABEL[key],
            href: hrefWith('/panel/correo', params, { filtro: key === 'problems' ? null : key }),
            active: filter === key,
          }))}
        />
      </div>
      <Table label="Avisos">
        <THead>
          <TH>Aviso</TH>
          <TH>Destinatario</TH>
          <TH>Estado</TH>
          <TH align="right">Intentos</TH>
          <TH>Próximo intento</TH>
          <TH>Creado</TH>
          <TH />
        </THead>
        <TBody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={7}>
              <EmptyState
                compact
                icon={filter === 'problems' ? CheckCircle2 : Mail}
                title={
                  filter === 'problems' ? 'Sin problemas de entrega' : 'Sin avisos en este filtro'
                }
              />
            </EmptyRow>
          ) : (
            data.items.map(item => (
              <TR key={item.id}>
                <TD>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-[12px] text-muted">
                    {item.category === 'contact' ? 'Solicitud de contacto' : 'Ficha'}
                  </p>
                </TD>
                <TD className="text-[13px]">
                  <Link
                    href={`/panel/cuentas/${item.ownerId}?tab=avisos`}
                    className="text-fg-2 hover:text-accent-fg"
                  >
                    {item.ownerEmail}
                  </Link>
                </TD>
                <TD>
                  <EmailStateBadge state={item.emailState} />
                </TD>
                <TD align="right">{item.attempts}</TD>
                <TD className="text-[13px] text-muted">
                  {['pending', 'sending'].includes(item.emailState) ? (
                    <RelativeTime value={item.nextAttemptAt} />
                  ) : (
                    '—'
                  )}
                </TD>
                <TD className="text-[13px] text-muted">
                  <RelativeTime value={item.createdAt} />
                </TD>
                <TD>
                  {['failed', 'pending'].includes(item.emailState) && (
                    <ActionButton
                      label="Reintentar"
                      icon={<RefreshCw />}
                      tone="ghost"
                      size="xs"
                      endpoint="/api/mail"
                      payload={{ action: 'retry', id: item.id }}
                      success="Aviso devuelto a la cola"
                    />
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      <Pagination
        page={page}
        hasMore={data.hasMore}
        hrefFor={target => hrefWith('/panel/correo', params, { page: target })}
      />
    </>
  );
}
