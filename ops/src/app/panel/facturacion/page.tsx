import type { Metadata } from 'next';
import Link from 'next/link';
import { DocumentIcon, MailIcon, RefreshIcon } from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import { billingOverview, type BillingItem, type Receptor } from '@/lib/data/billing';
import {
  BILLING_FILTERS,
  CFDI_USES,
  DOC_KIND,
  MAX_BILLING_ATTEMPTS,
  SAT_TAX_REGIMES,
  STUCK_HOURS,
  docStatus,
  errorHint,
  type BillingFilter,
} from '@/lib/billing';
import { fmtDateTime, fmtMoney } from '@/lib/format';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { Alert } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { ActionButton } from '@/components/actions/ActionButton';
import { ReissueDocument, type ReceptorFields } from './ReissueDocument';

export const metadata: Metadata = { title: 'Facturación' };

const FILTER_LABEL: Record<BillingFilter, string> = {
  atencion: 'Requieren atención',
  failed: 'Fallidos',
  pending: 'En cola',
  issued: 'Emitidos',
  skipped: 'Sin CFDI',
  all: 'Todos',
};

const fieldsOf = (r: Receptor): ReceptorFields => ({
  legalName: r.legalName ?? '',
  taxId: r.taxId ?? '',
  taxRegime: r.taxRegime ?? '',
  postalCode: r.postalCode ?? '',
  cfdiUse: r.cfdiUse ?? '',
  invoiceEmail: r.invoiceEmail ?? '',
});

const sameReceptor = (a: Receptor, b: Receptor) =>
  (['legalName', 'taxId', 'taxRegime', 'postalCode', 'cfdiUse'] as const).every(
    key => (a[key] ?? '') === (b[key] ?? ''),
  );

function ReceptorLine({ receptor }: { receptor: Receptor }) {
  return (
    <span>
      {receptor.legalName || 'Sin razón social'}
      {receptor.taxId && <span className="font-mono"> · {receptor.taxId}</span>}
      {receptor.taxRegime && (
        <span title={SAT_TAX_REGIMES[receptor.taxRegime]}> · régimen {receptor.taxRegime}</span>
      )}
      {receptor.postalCode && <span> · CP {receptor.postalCode}</span>}
      {receptor.cfdiUse && <span title={CFDI_USES[receptor.cfdiUse]}> · {receptor.cfdiUse}</span>}
    </span>
  );
}

function DocumentRow({ item, admin }: { item: BillingItem; admin: boolean }) {
  const status = docStatus(item.status);
  const hint = errorHint(item.lastError);
  const stuck =
    (item.status === 'pending' || item.status === 'processing') &&
    item.createdAt !== null &&
    Date.now() - Date.parse(item.createdAt) > STUCK_HOURS * 3_600_000;
  const actionable = item.status === 'failed' || item.status === 'pending';
  const profileDiffers =
    item.profile !== null &&
    item.profile.countryCode === 'MX' &&
    !sameReceptor(item.profile, item.receptor);
  const mexicanProfile = item.profile?.countryCode === 'MX';

  return (
    <li className="px-5 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            {stuck && <Badge tone="amber">Lleva más de {STUCK_HOURS} h en cola</Badge>}
            <p className="text-[14px] font-medium">
              {DOC_KIND[item.kind] ?? item.kind} · {fmtMoney(item.amount, item.currency)}
            </p>
          </div>
          <p className="mt-1 text-[12.5px] text-muted">
            <Link href={`/panel/anuncios/${item.campaignId}`} className="hover:text-accent-fg">
              {item.solutionName}
            </Link>{' '}
            ·{' '}
            {item.ownerId ? (
              <Link href={`/panel/cuentas/${item.ownerId}`} className="hover:text-accent-fg">
                {item.billingEmail}
              </Link>
            ) : (
              `${item.billingEmail} (cuenta eliminada)`
            )}{' '}
            · creado <RelativeTime value={item.createdAt} />
          </p>
          <p className="mt-1.5 text-[13px] text-fg-2">
            <span className="text-muted">Receptor: </span>
            <ReceptorLine receptor={item.receptor} />
          </p>
          {profileDiffers && item.profile && (
            <p className="mt-1 text-[13px] text-fg-2">
              <span className="text-muted">
                Sus datos actuales (cambiaron{' '}
                {item.profile.updatedAt ? fmtDateTime(item.profile.updatedAt) : ''}):{' '}
              </span>
              <ReceptorLine receptor={item.profile} />
            </p>
          )}
          {item.folio && (
            <p className="mt-1 font-mono text-[12.5px] text-muted">Folio fiscal {item.folio}</p>
          )}
          {item.lastError && (
            <div className="mt-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px]">
              <p>
                <span className="font-mono text-terracotta">{item.lastError}</span>
                <span className="text-muted">
                  {' '}
                  · {item.attempts}/{MAX_BILLING_ATTEMPTS} intentos
                  {item.status === 'pending' && item.nextAttemptAt && (
                    <>
                      {' '}
                      · siguiente <RelativeTime value={item.nextAttemptAt} />
                    </>
                  )}
                </span>
              </p>
              <p className="mt-0.5 text-fg-2">
                {hint?.hint ?? 'Código sin interpretación conocida: revisa la factura en Cord.'}
              </p>
            </div>
          )}
          {item.notifiedAt && (
            <p className="mt-1.5 text-[12px] text-muted">
              Se avisó al anunciante <RelativeTime value={item.notifiedAt} />.
            </p>
          )}
        </div>
        {admin && actionable && !item.locked && (
          <div className="flex shrink-0 flex-wrap gap-1.5 lg:max-w-[260px] lg:justify-end">
            <ActionButton
              label="Reintentar"
              icon={<RefreshIcon />}
              size="xs"
              endpoint="/api/billing"
              payload={{ action: 'retry', documentId: item.id }}
              success="Documento en cola"
              confirm={{
                title: 'Reintentar tal cual',
                description:
                  'Vuelve a la cola con los mismos datos y los intentos en cero. Úsalo cuando la causa ya se resolvió fuera (el PAC, el certificado del emisor).',
                confirmLabel: 'Reintentar',
              }}
            />
            {item.kind === 'invoice' && (
              <ReissueDocument
                documentId={item.id}
                initial={fieldsOf(profileDiffers && item.profile ? item.profile : item.receptor)}
                source={profileDiffers ? 'profile' : 'document'}
                hasProfile={mexicanProfile}
              />
            )}
            {item.ownerId && (
              <ActionButton
                label="Avisar al anunciante"
                icon={<MailIcon />}
                tone="ghost"
                size="xs"
                endpoint="/api/billing"
                payload={{ action: 'notify', documentId: item.id }}
                success="Aviso enviado"
                confirm={{
                  title: 'Avisar que sus datos fiscales impiden la factura',
                  description:
                    'Recibe un aviso en su cuenta y por correo con un enlace a Ajustes → Facturación. Úsalo cuando el error viene de sus datos. Como máximo uno al día por documento.',
                  confirmLabel: 'Avisar',
                }}
              />
            )}
          </div>
        )}
        {item.locked && (
          <Badge tone="amber" className="shrink-0">
            El producto lo está procesando
          </Badge>
        )}
      </div>
    </li>
  );
}

export default async function FacturacionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireOps();
  const params = await searchParams;
  const filter = choice(params, 'filtro', BILLING_FILTERS, 'atencion');
  const page = pageParam(params);
  const data = await billingOverview(filter, param(params, 'q'), page);

  if (!data)
    return (
      <>
        <PageHeader title="Facturación" />
        <Alert tone="amber" title="Esta base todavía no tiene la facturación">
          Aplica db/ad-campaigns.sql y db/billing.sql en este entorno.
        </Alert>
      </>
    );

  return (
    <>
      <PageHeader
        title="Facturación"
        description="CFDI de los espacios patrocinados, emitidos por Cord. Aquí aparecen los que fallaron tras sus reintentos y los que llevan más de un día en cola."
      />
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Fallidos"
          value={data.stats.failed}
          tone={data.stats.failed > 0 ? 'danger' : 'default'}
          hint={`Tras ${MAX_BILLING_ATTEMPTS} intentos sin éxito`}
        />
        <Stat
          label="Atascados en cola"
          value={data.stats.stuck}
          tone={data.stats.stuck > 0 ? 'attention' : 'default'}
          hint={`Más de ${STUCK_HOURS} h sin emitirse · ${data.stats.queued} en cola en total`}
        />
        <Stat label="Emitidos (30 días)" value={data.stats.issued30d} />
        <Stat label="Sin CFDI" value={data.stats.skipped} hint="Compradores fuera de México" />
      </section>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Filtro"
          items={BILLING_FILTERS.map(key => ({
            label: FILTER_LABEL[key],
            href: hrefWith('/panel/facturacion', params, {
              filtro: key === 'atencion' ? null : key,
            }),
            active: filter === key,
          }))}
        />
        <SearchField placeholder="Ficha, correo, razón social, RFC o folio…" className="lg:w-80" />
      </div>
      {data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={DocumentIcon}
            title={
              filter === 'atencion' ? 'Nada requiere atención' : 'Sin documentos en este filtro'
            }
            description={
              filter === 'atencion'
                ? 'Ningún CFDI falló ni lleva más de un día en cola.'
                : undefined
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {data.items.map(item => (
              <DocumentRow key={item.id} item={item} admin={user.level === 'admin'} />
            ))}
          </ul>
        </Card>
      )}
      <Pagination
        page={page}
        hasMore={data.hasMore}
        total={data.total}
        pageSize={data.pageSize}
        hrefFor={target => hrefWith('/panel/facturacion', params, { page: target })}
      />
    </>
  );
}
