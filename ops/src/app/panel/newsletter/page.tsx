import type { Metadata } from 'next';
import Link from 'next/link';
import { Newspaper, UserCheck, UserMinus, UserPlus } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { newsletterOverview, NEWSLETTER_FILTERS } from '@/lib/data/newsletter';
import { PROFILE, ROLE } from '@/lib/labels';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
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

export const metadata: Metadata = { title: 'Newsletter' };

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const filter = choice(params, 'filtro', NEWSLETTER_FILTERS, 'active');
  const page = pageParam(params);
  const data = await newsletterOverview({ filter, q: param(params, 'q'), page });
  const t = data.totals;

  return (
    <>
      <PageHeader
        title="Newsletter"
        description="Suscripciones con consentimiento explícito. Las campañas todavía no se envían desde aquí; la baja firmada funciona desde cada correo."
        actions={<ExportButton kind="newsletter" />}
      />
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Activas"
          value={t.active}
          icon={<UserCheck aria-hidden className="size-4" />}
        />
        <Stat
          label="Altas en 30 días"
          value={t.new30d}
          icon={<UserPlus aria-hidden className="size-4" />}
        />
        <Stat
          label="Bajas en 30 días"
          value={t.left30d}
          icon={<UserMinus aria-hidden className="size-4" />}
        />
        <Stat
          label="Histórico"
          value={t.all}
          icon={<Newspaper aria-hidden className="size-4" />}
          hint={`${t.unsubscribed} se dieron de baja`}
        />
      </section>
      <div className="mb-6 grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Suscripciones activas" description="Últimos 90 días." />
          <CardBody>
            <AreaChart
              title="Suscripciones activas por día"
              series={[{ key: 'active', label: 'Activas', color: 'series-1' }]}
              data={data.growth}
              height={200}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Segmentos" description="Declarados por cada persona." />
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
              label: 'Activas',
              href: hrefWith('/panel/newsletter', params, { filtro: null }),
              active: filter === 'active',
              count: t.active,
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
          <TH>Perfil</TH>
          <TH>Rol</TH>
          <TH>Consentimiento</TH>
          <TH>Alta</TH>
          <TH>Baja</TH>
        </THead>
        <TBody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={6}>
              <EmptyState compact icon={Newspaper} title="Sin suscripciones en este filtro" />
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
                <TD className="text-muted">
                  {item.profile ? (PROFILE[item.profile] ?? item.profile) : '—'}
                </TD>
                <TD className="text-muted">{item.role ? (ROLE[item.role] ?? item.role) : '—'}</TD>
                <TD>
                  <Badge>{item.consentVersion}</Badge>
                </TD>
                <TD className="text-muted">
                  <RelativeTime value={item.createdAt} />
                </TD>
                <TD className="text-muted">
                  {item.unsubscribedAt ? <RelativeTime value={item.unsubscribedAt} /> : '—'}
                </TD>
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
