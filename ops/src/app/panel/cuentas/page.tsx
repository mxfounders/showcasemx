import type { Metadata } from 'next';
import { Ban, Fingerprint, Users } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import {
  ACCOUNT_FILTERS,
  ACCOUNT_SORTS,
  listAccounts,
  type AccountFilter,
  type AccountSort,
} from '@/lib/data/accounts';
import { PROFILE } from '@/lib/labels';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { Table, THead, TH, TBody, TR, TD, RowLink, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { ExportButton } from '@/components/actions/ExportButton';

export const metadata: Metadata = { title: 'Cuentas' };

const FILTER_LABEL: Record<AccountFilter, string> = {
  all: 'Todas',
  recent: 'Nuevas (7 d)',
  founders: 'Fundadores',
  buyers: 'Compradores',
  unverified: 'Sin verificar',
  suspended: 'Suspendidas',
  ops: 'Equipo ops',
  twofactor: 'Con 2FA',
};

export default async function CuentasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const filter = choice(params, 'filtro', ACCOUNT_FILTERS, 'all');
  const sort = choice(params, 'orden', ACCOUNT_SORTS, 'created');
  const dir = choice(params, 'dir', ['asc', 'desc'] as const, sort === 'email' ? 'asc' : 'desc');
  const page = pageParam(params);
  const data = await listAccounts({ filter, q: param(params, 'q'), sort, dir, page });
  const sortHref = (key: AccountSort) =>
    hrefWith('/panel/cuentas', params, {
      orden: key,
      dir: sort === key ? (dir === 'asc' ? 'desc' : 'asc') : key === 'email' ? 'asc' : 'desc',
    });

  return (
    <>
      <PageHeader
        title="Cuentas"
        description="Cada persona registrada en shwcs. Una sola cuenta puede comprar y publicar; el perfil describe, no da permisos."
        actions={<ExportButton kind="accounts" />}
      />
      <div className="mb-4 space-y-3">
        <Segmented
          label="Filtro"
          items={ACCOUNT_FILTERS.map(key => ({
            label: FILTER_LABEL[key],
            href: hrefWith('/panel/cuentas', params, { filtro: key === 'all' ? null : key }),
            active: filter === key,
            count: data.counts[key],
          }))}
        />
        <SearchField placeholder="Correo, nombre, empresa o ID…" className="sm:w-96" />
      </div>
      <Table label="Cuentas">
        <THead>
          <TH sort={{ href: sortHref('email'), active: sort === 'email', direction: dir }}>
            Cuenta
          </TH>
          <TH>Estado</TH>
          <TH
            sort={{ href: sortHref('solutions'), active: sort === 'solutions', direction: dir }}
            align="right"
          >
            Fichas
          </TH>
          <TH align="right">Contactos</TH>
          <TH sort={{ href: sortHref('seen'), active: sort === 'seen', direction: dir }}>
            Última actividad
          </TH>
          <TH sort={{ href: sortHref('created'), active: sort === 'created', direction: dir }}>
            Registro
          </TH>
        </THead>
        <TBody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={6}>
              <EmptyState compact icon={Users} title="Sin cuentas en este filtro" />
            </EmptyRow>
          ) : (
            data.items.map(account => (
              <TR key={account.id} highlight={Boolean(account.suspendedAt)}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={account.name} email={account.email} />
                    <div className="min-w-0">
                      <RowLink
                        href={`/panel/cuentas/${account.id}`}
                        className="block max-w-[280px] truncate"
                      >
                        {account.name ?? account.email}
                      </RowLink>
                      <p className="max-w-[280px] truncate text-[12px] text-muted">
                        {account.name ? account.email : ''}
                        {account.organization
                          ? `${account.name ? ' · ' : ''}${account.organization}`
                          : ''}
                        {!account.name && !account.organization && account.profile
                          ? PROFILE[account.profile]
                          : ''}
                      </p>
                    </div>
                  </div>
                </TD>
                <TD>
                  <div className="relative z-10 flex flex-wrap gap-1">
                    {account.suspendedAt && (
                      <Badge tone="terracotta" icon={Ban}>
                        Suspendida
                      </Badge>
                    )}
                    {account.isOps && (
                      <Badge tone="blue">
                        {account.opsLevel === 'admin' ? 'Admin' : 'Revisor'}
                      </Badge>
                    )}
                    {!account.emailVerifiedAt && <Badge tone="amber">Sin verificar</Badge>}
                    {account.twoFactor && (
                      <Badge tone="sage" icon={Fingerprint}>
                        2FA
                      </Badge>
                    )}
                    {account.google && <Badge>Google</Badge>}
                  </div>
                </TD>
                <TD align="right">
                  <span className="text-fg">{account.solutionCount}</span>
                  {account.publishedCount > 0 && (
                    <span className="text-muted"> · {account.publishedCount} pub.</span>
                  )}
                </TD>
                <TD align="right" className="text-muted">
                  {account.contactsSent} ↗ · {account.contactsReceived} ↙
                </TD>
                <TD className="whitespace-nowrap text-[13px] text-muted">
                  <RelativeTime value={account.lastSeenAt} />
                  {account.activeSessions > 0 && (
                    <span
                      className="ml-1.5 inline-block size-1.5 rounded-full bg-sage align-middle"
                      title={`${account.activeSessions} sesiones activas`}
                    />
                  )}
                </TD>
                <TD className="whitespace-nowrap text-[13px] text-muted">
                  <RelativeTime value={account.createdAt} />
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
        hrefFor={target => hrefWith('/panel/cuentas', params, { page: target })}
      />
    </>
  );
}
