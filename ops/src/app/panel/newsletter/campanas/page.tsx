import type { Metadata } from 'next';
import Link from 'next/link';
import { NewspaperIcon } from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import { campaignList } from '@/lib/data/newsletter';
import { CAMPAIGN_STATUS, newsletterProductConfigured } from '@/lib/newsletter';
import { fmtNumber } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Field';
import { NewCampaignButtons } from './NewCampaignButtons';

export const metadata: Metadata = { title: 'Campañas del newsletter' };

export default async function CampaignsPage() {
  const user = await requireOps();
  const campaigns = await campaignList();

  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Las campañas se escriben aquí, se prueban con un envío a un correo y solo entonces se envían a las suscripciones confirmadas. El producto hace el envío; ops nunca manda correos."
        actions={user.level === 'admin' && campaigns ? <NewCampaignButtons /> : undefined}
      />
      <div className="mb-6">
        <Tabs
          label="Secciones del newsletter"
          items={[
            { label: 'Suscripciones', href: '/panel/newsletter', active: false },
            {
              label: 'Campañas',
              href: '/panel/newsletter/campanas',
              active: true,
              count: campaigns?.length,
            },
          ]}
        />
      </div>
      {!newsletterProductConfigured() && (
        <Alert tone="amber" className="mb-4" title="Sin conexión con el producto">
          Falta PRODUCT_APP_ORIGIN u OPS_NEWSLETTER_SECRET en ops: se pueden escribir borradores,
          pero no previsualizarlos, probarlos ni enviarlos.
        </Alert>
      )}
      {!campaigns ? (
        <Alert title="Falta la migración">
          Aplica db/newsletter-sending.sql en esta base para usar las campañas.
        </Alert>
      ) : (
        <Table label="Campañas">
          <THead>
            <TH>Asunto</TH>
            <TH>Estado</TH>
            <TH align="right">Destinatarios</TH>
            <TH align="right">Enviados</TH>
            <TH align="right">Entregados</TH>
            <TH align="right">Clics</TH>
            <TH align="right">Rebotes</TH>
            <TH align="right">Quejas</TH>
            <TH align="right">Bajas</TH>
            <TH>Actualizada</TH>
          </THead>
          <TBody>
            {campaigns.length === 0 ? (
              <EmptyRow colSpan={10}>
                <EmptyState
                  compact
                  icon={NewspaperIcon}
                  title="Todavía no hay campañas"
                  description="El cron diario prepara el borrador de «Nuevo esta semana» cuando hay fichas nuevas; también puedes crearlo o escribir una campaña."
                />
              </EmptyRow>
            ) : (
              campaigns.map(item => {
                const status = CAMPAIGN_STATUS[item.status] ?? CAMPAIGN_STATUS.draft;
                return (
                  <TR key={item.id}>
                    <TD className="max-w-[22rem]">
                      <Link
                        href={`/panel/newsletter/campanas/${item.id}`}
                        className="font-medium hover:text-accent-fg"
                      >
                        {item.subject || 'Sin asunto'}
                      </Link>
                      <p className="text-[12px] text-muted">
                        {item.kind === 'new_this_week'
                          ? `Nuevo esta semana · semana del ${item.week}`
                          : 'Manual'}{' '}
                        · v{item.version}
                      </p>
                    </TD>
                    <TD>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </TD>
                    <TD align="right" className="num">
                      {fmtNumber(item.recipients)}
                    </TD>
                    <TD align="right" className="num">
                      {fmtNumber(item.sent)}
                    </TD>
                    <TD align="right" className="num">
                      {fmtNumber(item.delivered)}
                    </TD>
                    <TD align="right" className="num">
                      {fmtNumber(item.clicks)}
                    </TD>
                    <TD align="right" className="num">
                      {fmtNumber(item.bounced)}
                    </TD>
                    <TD align="right" className="num">
                      {fmtNumber(item.complained)}
                    </TD>
                    <TD align="right" className="num">
                      {fmtNumber(item.unsubscribed)}
                    </TD>
                    <TD className="text-muted">
                      <RelativeTime value={item.updatedAt} />
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      )}
    </>
  );
}
