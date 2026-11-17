import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MailIcon,
  NewspaperIcon,
  PersonCheckIcon,
  PersonMinusIcon,
  PersonPlusIcon,
} from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import { campaignList, newsletterOverview, NEWSLETTER_FILTERS } from '@/lib/data/newsletter';
import { PROFILE, ROLE } from '@/lib/labels';
import { UNSUBSCRIBE_REASON } from '@/lib/newsletter';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented, Tabs } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Badge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { BarList } from '@/components/charts/BarList';
import { AreaChart } from '@/components/charts/AreaChart';
import { ExportButton } from '@/components/actions/ExportButton';
import { ActionButton } from '@/components/actions/ActionButton';

export const metadata: Metadata = { title: 'Newsletter' };

function Status({
  item,
}: {
  item: Awaited<ReturnType<typeof newsletterOverview>>['items'][number];
}) {
  if (item.unsubscribedAt)
    return (
      <Badge
        tone={
          item.unsubscribeReason === 'bounce' || item.unsubscribeReason === 'complaint'
            ? 'terracotta'
            : 'neutral'
        }
      >
        Baja · {UNSUBSCRIBE_REASON[item.unsubscribeReason ?? ''] ?? 'sin motivo registrado'}
      </Badge>
    );
  if (item.confirmedAt) return <Badge tone="sage">Confirmada</Badge>;
  return (
    <Badge
      tone="amber"
      title={item.confirmSentAt ? 'Se le pidió confirmar' : 'Nunca se le pidió confirmar'}
    >
      {item.confirmSentAt ? 'Pendiente' : 'Sin pedir confirmación'}
    </Badge>
  );
}

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireOps();
  const admin = user.level === 'admin';
  const params = await searchParams;
  const filter = choice(params, 'filtro', NEWSLETTER_FILTERS, 'confirmed');
  const page = pageParam(params);
  const [data, campaigns] = await Promise.all([
    newsletterOverview({ filter, q: param(params, 'q'), page }),
    campaignList(),
  ]);
  const t = data.totals;

  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Solo las suscripciones confirmadas por correo (doble opt-in) reciben campañas. Las anteriores a la confirmación esperan a que alguien les pida confirmar. Bajas, rebotes y quejas dejan de recibir al instante."
        actions={
          <div className="flex flex-wrap gap-2">
            {admin && t.neverAsked > 0 && (
              <ActionButton
                label={`Pedir confirmación (${t.neverAsked})`}
                icon={<MailIcon />}
                endpoint="/api/newsletter"
                payload={{ action: 'reconfirm' }}
                success="Pidiendo confirmación"
                confirm={{
                  title: 'Pedir confirmación a las suscripciones anteriores',
                  description: `Envía un único correo a ${t.neverAsked} ${t.neverAsked === 1 ? 'dirección que nunca confirmó' : 'direcciones que nunca confirmaron'} para que confirmen si quieren seguir recibiendo el newsletter. Quien no confirme no recibe campañas. Fuera de producción solo sale a @resend.dev. Pide modo seguro.`,
                  field: null,
                  confirmLabel: 'Enviar',
                }}
              />
            )}
            <ExportButton kind="newsletter" />
          </div>
        }
      />
      <div className="mb-6">
        <Tabs
          label="Secciones del newsletter"
          items={[
            { label: 'Suscripciones', href: '/panel/newsletter', active: true, count: t.confirmed },
            {
              label: 'Campañas',
              href: '/panel/newsletter/campanas',
              active: false,
              count: campaigns?.length,
            },
          ]}
        />
      </div>
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Confirmadas"
          value={t.confirmed}
          icon={<PersonCheckIcon aria-hidden className="size-4" />}
          hint={`${t.new30d} confirmaron en 30 días`}
        />
        <Stat
          label="Sin confirmar"
          value={t.pending}
          icon={<PersonPlusIcon aria-hidden className="size-4" />}
          hint={`${t.neverAsked} nunca recibieron el correo de confirmación`}
        />
        <Stat
          label="Bajas en 30 días"
          value={t.left30d}
          icon={<PersonMinusIcon aria-hidden className="size-4" />}
          hint={`${t.unsubscribed} en total`}
        />
        <Stat
          label="Rebotes y quejas"
          value={t.bounced + t.complained}
          icon={<NewspaperIcon aria-hidden className="size-4" />}
          hint={`${t.bounced} rebotes · ${t.complained} quejas (avisos de Resend)`}
        />
      </section>
      <div className="mb-6 grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Suscripciones confirmadas" description="Últimos 90 días." />
          <CardBody>
            <AreaChart
              title="Suscripciones confirmadas por día"
              series={[{ key: 'active', label: 'Confirmadas', color: 'series-1' }]}
              data={data.growth}
              height={200}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Segmentos"
            description="De las confirmadas, declarados por cada persona."
          />
          <CardBody className="space-y-6">
            <div>
              <p className="label-micro mb-3">Perfil</p>
              <BarList
                items={data.profiles.map(row => ({
                  label: PROFILE[row.key] ?? row.key,
                  value: row.n,
                }))}
              />
            </div>
            <div>
              <p className="label-micro mb-3">Rol</p>
              <BarList
                items={data.roles.map(row => ({ label: ROLE[row.key] ?? row.key, value: row.n }))}
              />
            </div>
          </CardBody>
        </Card>
      </div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Estado"
          items={[
            {
              label: 'Confirmadas',
              href: hrefWith('/panel/newsletter', params, { filtro: null }),
              active: filter === 'confirmed',
              count: t.confirmed,
            },
            {
              label: 'Sin confirmar',
              href: hrefWith('/panel/newsletter', params, { filtro: 'pending' }),
              active: filter === 'pending',
              count: t.pending,
            },
            {
              label: 'Bajas',
              href: hrefWith('/panel/newsletter', params, { filtro: 'unsubscribed' }),
              active: filter === 'unsubscribed',
              count: t.unsubscribed,
            },
            {
              label: 'Todas',
              href: hrefWith('/panel/newsletter', params, { filtro: 'all' }),
              active: filter === 'all',
              count: t.all,
            },
          ]}
        />
        <SearchField placeholder="Buscar correo…" className="lg:w-72" />
      </div>
      <Table label="Suscripciones">
        <THead>
          <TH>Correo</TH>
          <TH>Estado</TH>
          <TH>Perfil</TH>
          <TH>Rol</TH>
          <TH>Idioma</TH>
          <TH>Alta</TH>
          <TH>Confirmación o baja</TH>
          {admin && <TH align="right">Acción</TH>}
        </THead>
        <TBody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={admin ? 8 : 7}>
              <EmptyState compact icon={NewspaperIcon} title="Sin suscripciones en este filtro" />
            </EmptyRow>
          ) : (
            data.items.map(item => (
              <TR key={item.email}>
                <TD className="font-medium">
                  {item.accountId ? (
                    <Link
                      href={`/panel/cuentas/${item.accountId}`}
                      className="hover:text-accent-fg"
                    >
                      {item.email}
                    </Link>
                  ) : (
                    item.email
                  )}
                </TD>
                <TD>
                  <Status item={item} />
                </TD>
                <TD className="text-muted">
                  {item.profile ? (PROFILE[item.profile] ?? item.profile) : '—'}
                </TD>
                <TD className="text-muted">{item.role ? (ROLE[item.role] ?? item.role) : '—'}</TD>
                <TD className="text-muted">
                  {item.locale === 'en' ? 'Inglés' : item.locale === 'es' ? 'Español' : '—'}
                </TD>
                <TD className="text-muted">
                  <RelativeTime value={item.createdAt} />
                </TD>
                <TD className="text-muted">
                  {item.unsubscribedAt ? (
                    <RelativeTime value={item.unsubscribedAt} />
                  ) : item.confirmedAt ? (
                    <RelativeTime value={item.confirmedAt} />
                  ) : (
                    '—'
                  )}
                </TD>
                {admin && (
                  <TD align="right">
                    {!item.unsubscribedAt && (
                      <ActionButton
                        label="Dar de baja"
                        size="xs"
                        tone="ghost"
                        endpoint="/api/newsletter"
                        payload={{ action: 'unsubscribe', email: item.email }}
                        success="Baja registrada"
                        confirm={{
                          title: `Dar de baja ${item.email}`,
                          description:
                            'Para solicitudes de baja recibidas por correo. Deja de recibir campañas al instante. Pide modo seguro.',
                          placeholder: 'Pidió la baja por correo a hola@shwcs.site',
                          destructive: true,
                          confirmLabel: 'Dar de baja',
                        }}
                      />
                    )}
                  </TD>
                )}
              </TR>
            ))
          )}
        </TBody>
      </Table>
      <Pagination
        page={page}
        hasMore={data.hasMore}
        total={data.total}
        pageSize={data.pageSize}
        hrefFor={target => hrefWith('/panel/newsletter', params, { page: target })}
      />
    </>
  );
}
