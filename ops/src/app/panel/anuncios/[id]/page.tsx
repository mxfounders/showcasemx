import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLinkIcon, MegaphoneIcon, RefreshIcon, UndoIcon } from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import { isUuid } from '@/lib/http';
import { adBooking } from '@/lib/data/ads';
import {
  OPS_PAUSE_REASON,
  REMOVAL_ERROR,
  REMOVAL_LABEL,
  adToday,
  planRemoval,
  type RemovalReason,
} from '@/lib/ads';
import { DOC_KIND, docStatus } from '@/lib/billing';
import { fmtDate, fmtDateTime, fmtMoney, fmtNumber, fmtPercent } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DescriptionList } from '@/components/ui/DescriptionList';
import { Alert } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { AuditLine } from '@/components/domain/AuditLine';
import { ActionButton } from '@/components/actions/ActionButton';
import { WithdrawBooking, type RemovalOption } from './WithdrawBooking';

export const metadata: Metadata = { title: 'Reserva de anuncio' };

const PLACEMENT: Record<string, string> = {
  category: 'Categoría',
  home: 'Inicio',
  newsletter: 'Newsletter',
};

const PAUSE_REASON: Record<string, string> = {
  [OPS_PAUSE_REASON]: 'Pausada desde ops',
  platformRemoval: `Retirada · ${REMOVAL_LABEL.platformRemoval}`,
  policyRemoval: `Retirada · ${REMOVAL_LABEL.policyRemoval}`,
  dispute: 'Pausada por disputa',
};

const day = (value: string) => fmtDate(value + 'T12:00:00Z');

export default async function AnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOps();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const booking = await adBooking(id);
  if (booking === undefined) notFound();
  if (booking === null)
    return (
      <Alert tone="amber" title="Esta base todavía no tiene los anuncios">
        Aplica db/ad-campaigns.sql y db/billing.sql en este entorno.
      </Alert>
    );

  const now = new Date();
  const today = adToday(now);
  const end = booking.servedUntil ?? booking.endsOn;
  const admin = user.level === 'admin';
  const removable = {
    status: booking.status,
    startsOn: booking.startsOn,
    endsOn: booking.endsOn,
    servedUntil: booking.servedUntil,
    totalAmount: booking.total,
    refundRequested: booking.refundRequested,
    pauseReason: booking.pauseReason,
    disputeStatus: booking.disputeStatus,
  };
  const option = (reason: RemovalReason): RemovalOption => {
    const plan = planRemoval(removable, reason, now);
    return plan.ok
      ? {
          ok: true,
          refund: plan.refund,
          servedUntil: plan.servedUntil,
          firstRefundable: plan.firstRefundable,
        }
      : { ok: false, message: REMOVAL_ERROR[plan.error] };
  };
  const options = {
    platformRemoval: option('platformRemoval'),
    policyRemoval: option('policyRemoval'),
  };
  const paid = booking.status === 'paid';
  const disputed = booking.disputeStatus === 'open';
  const canPause = paid && !booking.pausedAt && !disputed && today < end;
  const canResume = paid && booking.pauseReason === OPS_PAUSE_REASON && !disputed;
  const pendingRefund = booking.refundRequested - booking.refunded;
  const canRetry = paid && pendingRefund > 0 && booking.hasPayment && !disputed;
  const impressions = booking.metrics.reduce((sum, m) => sum + m.impressions, 0);
  const clicks = booking.metrics.reduce((sum, m) => sum + m.clicks, 0);

  return (
    <>
      <PageHeader
        back={{ href: '/panel/anuncios', label: 'Anuncios' }}
        title={booking.solutionName}
        description={`${PLACEMENT[booking.placement] ?? booking.placement}${booking.scope ? ` · ${booking.scope}` : ''} · ${day(booking.startsOn)} → ${day(booking.endsOn)}`}
        meta={
          <>
            <Badge tone={paid ? 'sage' : 'neutral'} dot>
              {paid ? 'Pagada' : booking.status}
            </Badge>
            {booking.pauseReason && (
              <Badge tone={booking.pauseReason === OPS_PAUSE_REASON ? 'amber' : 'terracotta'}>
                {PAUSE_REASON[booking.pauseReason] ?? booking.pauseReason}
              </Badge>
            )}
            {booking.canceledAt && <Badge tone="terracotta">Cancelada por el anunciante</Badge>}
            {booking.disputeStatus && (
              <Badge tone={booking.disputeStatus === 'won' ? 'sage' : 'terracotta'}>
                Disputa{' '}
                {booking.disputeStatus === 'open'
                  ? 'abierta'
                  : booking.disputeStatus === 'won'
                    ? 'ganada'
                    : 'perdida'}
              </Badge>
            )}
            {!booking.listingPublished && <Badge tone="amber">La ficha no está publicada</Badge>}
          </>
        }
        actions={
          admin && paid ? (
            <>
              {canResume && (
                <ActionButton
                  label="Reanudar"
                  icon={<UndoIcon />}
                  endpoint="/api/ads"
                  payload={{ action: 'resume', bookingId: booking.id }}
                  success="Reserva reanudada"
                  confirm={{
                    title: 'Reanudar la reserva',
                    description:
                      'Vuelve a mostrarse en los días que le quedan. Los días que estuvo pausada no se reponen solos.',
                    confirmLabel: 'Reanudar',
                  }}
                />
              )}
              {canPause && (
                <ActionButton
                  label="Pausar"
                  endpoint="/api/ads"
                  payload={{ action: 'pause', bookingId: booking.id }}
                  success="Reserva pausada"
                  confirm={{
                    title: 'Pausar la reserva',
                    description:
                      'Deja de mostrarse sin reembolso (el producto tarda hasta 5 min en notarlo). Si la pausa es por causas de shwcs y dura 4 h o más en un día, los términos cuentan ese día como no entregado: el anunciante puede pedir reposición o reembolso. Para reembolsar lo no servido, usa Retirar.',
                    confirmLabel: 'Pausar',
                    templates: ['Ficha en revisión por un reporte abierto.'],
                  }}
                />
              )}
              {canRetry && (
                <ActionButton
                  label="Reintentar reembolso"
                  icon={<RefreshIcon />}
                  endpoint="/api/ads"
                  payload={{ action: 'retry_refund', bookingId: booking.id }}
                  success="Reembolso enviado"
                  confirm={{
                    title: `Reintentar el reembolso de ${fmtMoney(pendingRefund, booking.currency)}`,
                    description:
                      'Repite el mismo reembolso con la misma clave de idempotencia: si Stripe ya lo había creado, no se duplica.',
                    confirmLabel: 'Reintentar',
                  }}
                />
              )}
              <WithdrawBooking
                bookingId={booking.id}
                version={booking.version}
                currency={booking.currency}
                options={options}
              />
            </>
          ) : undefined
        }
      />

      {disputed && (
        <Alert tone="amber" className="mb-4" title="Disputa abierta">
          Mientras la disputa siga abierta no se reembolsa fuera del proceso de Stripe; la reserva
          sigue pausada.
        </Alert>
      )}
      {canRetry && (
        <Alert tone="amber" className="mb-4" title="Reembolso sin confirmar">
          Se pidieron {fmtMoney(booking.refundRequested, booking.currency)} y Stripe ha confirmado{' '}
          {fmtMoney(booking.refunded, booking.currency)}. Si acabas de reembolsar, espera al webhook
          antes de reintentar.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Cobro" />
            <CardBody>
              <DescriptionList
                columns={3}
                items={[
                  {
                    label: 'Tarifa diaria',
                    value: fmtMoney(booking.dailyAmount, booking.currency),
                  },
                  { label: 'Subtotal', value: fmtMoney(booking.subtotal, booking.currency) },
                  {
                    label: 'Impuestos',
                    value: booking.tax !== null ? fmtMoney(booking.tax, booking.currency) : null,
                  },
                  {
                    label: 'Total cobrado',
                    value:
                      booking.total !== null ? fmtMoney(booking.total, booking.currency) : null,
                  },
                  {
                    label: 'Reembolso pedido',
                    value: fmtMoney(booking.refundRequested, booking.currency),
                  },
                  {
                    label: 'Reembolso confirmado',
                    value: fmtMoney(booking.refunded, booking.currency),
                  },
                  { label: 'Pagada', value: booking.paidAt ? fmtDateTime(booking.paidAt) : null },
                  {
                    label: 'Deja de servirse el',
                    value: day(end),
                  },
                  {
                    label: 'Pago en Stripe',
                    value: booking.paymentRef ? `pi…${booking.paymentRef}` : null,
                    mono: true,
                  },
                ]}
              />
              {booking.invoiceUrl && (
                <a
                  href={booking.invoiceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent-fg hover:underline"
                >
                  Factura de Stripe <ExternalLinkIcon aria-hidden className="size-3.5" />
                </a>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Rendimiento"
              description={`${fmtNumber(impressions)} impresiones · ${fmtNumber(clicks)} clics · CTR ${fmtPercent(clicks, impressions)}`}
            />
            {booking.metrics.length === 0 ? (
              <CardBody>
                <EmptyState compact icon={MegaphoneIcon} title="Todavía sin impresiones" />
              </CardBody>
            ) : (
              <Table label="Rendimiento por día">
                <THead>
                  <TH>Día</TH>
                  <TH align="right">Impresiones</TH>
                  <TH align="right">Clics</TH>
                </THead>
                <TBody>
                  {booking.metrics.map(m => (
                    <TR key={m.day}>
                      <TD>{day(m.day)}</TD>
                      <TD align="right">{fmtNumber(m.impressions)}</TD>
                      <TD align="right">{fmtNumber(m.clicks)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Documentos fiscales"
              description="Factura al pagar y nota de crédito por cada reembolso."
              action={
                <Link
                  href="/panel/facturacion"
                  className="text-[13px] font-medium text-accent-fg hover:underline"
                >
                  Facturación
                </Link>
              }
            />
            <CardBody>
              {booking.documents.length === 0 ? (
                <p className="text-[13px] text-muted">Sin documentos todavía.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {booking.documents.map(doc => {
                    const status = docStatus(doc.status);
                    return (
                      <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-medium">
                            {DOC_KIND[doc.kind] ?? doc.kind} · {fmtMoney(doc.amount, doc.currency)}
                          </p>
                          <p className="text-[12px] text-muted">
                            {doc.folio
                              ? `Folio ${doc.folio}`
                              : doc.lastError
                                ? `Error ${doc.lastError} · ${doc.attempts} intentos`
                                : fmtDateTime(doc.createdAt)}
                          </p>
                        </div>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Reserva" />
            <CardBody>
              <DescriptionList
                columns={1}
                items={[
                  {
                    label: 'Ficha',
                    value: booking.solutionId ? (
                      <Link
                        href={`/panel/postulaciones/${booking.solutionId}`}
                        className="hover:text-accent-fg"
                      >
                        {booking.solutionName}
                      </Link>
                    ) : (
                      `${booking.solutionName} (ficha eliminada)`
                    ),
                  },
                  {
                    label: 'Correo de facturación',
                    value: booking.ownerId ? (
                      <Link
                        href={`/panel/cuentas/${booking.ownerId}`}
                        className="hover:text-accent-fg"
                      >
                        {booking.billingEmail}
                      </Link>
                    ) : (
                      booking.billingEmail
                    ),
                  },
                  { label: 'Creada', value: fmtDateTime(booking.createdAt) },
                  {
                    label: 'Pausada',
                    value: booking.pausedAt ? fmtDateTime(booking.pausedAt) : null,
                  },
                  {
                    label: 'Cancelada',
                    value: booking.canceledAt ? fmtDateTime(booking.canceledAt) : null,
                  },
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Bitácora" />
            <CardBody>
              {booking.audit.length === 0 ? (
                <p className="text-[13px] text-muted">
                  Nadie ha actuado sobre esta reserva desde ops.
                </p>
              ) : (
                <div className="divide-y divide-line">
                  {booking.audit.map(entry => (
                    <AuditLine
                      key={entry.id}
                      compact
                      entry={{ ...entry, subjectType: 'ad_campaign', subjectId: booking.id }}
                    />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
