import type { Metadata } from 'next';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { DOMAIN_FILTERS, listDomains, type DomainFilter } from '@/lib/data/domains';
import { daysSince, fmtDate } from '@/lib/format';
import { choice, hrefWith, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge, type Tone } from '@/components/ui/Badge';
import { SolutionStatusBadge } from '@/components/domain/StatusBadge';

export const metadata: Metadata = { title: 'Dominios' };

const STATE: Record<Exclude<DomainFilter, 'all'>, { label: string; tone: Tone }> = {
  verified: { label: 'Verificado', tone: 'sage' },
  stale: { label: 'Revalidar (+90 días)', tone: 'amber' },
  pending: { label: 'Pendiente', tone: 'blue' },
  expired: { label: 'Desafío vencido', tone: 'terracotta' },
};

export default async function DominiosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const filter = choice(params, 'filtro', DOMAIN_FILTERS, 'all');
  const data = await listDomains(filter, param(params, 'q'));

  return (
    <>
      <PageHeader
        title="Dominios"
        description="Pruebas TXT de control de dominio. Demuestran que alguien controla el DNS del host, no identidad legal ni resultados."
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Estado"
          items={DOMAIN_FILTERS.map(key => ({
            label: key === 'all' ? 'Todos' : STATE[key].label.split(' (')[0],
            href: hrefWith('/panel/dominios', params, { filtro: key === 'all' ? null : key }),
            active: filter === key,
            count: data.counts[key],
          }))}
        />
        <SearchField placeholder="Dominio, ficha o correo…" className="lg:w-72" />
      </div>
      <Table label="Dominios">
        <THead>
          <TH>Dominio</TH>
          <TH>Estado</TH>
          <TH>Ficha</TH>
          <TH>Propietario</TH>
          <TH>Verificado</TH>
          <TH>Desafío vence</TH>
        </THead>
        <TBody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={6}>
              <EmptyState compact icon={Globe} title="Sin dominios en este filtro" />
            </EmptyRow>
          ) : (
            data.items.map(item => (
              <TR key={item.solutionId}>
                <TD className="font-mono text-[12.5px]">{item.domain}</TD>
                <TD>
                  <Badge tone={STATE[item.state].tone} dot>
                    {STATE[item.state].label}
                  </Badge>
                </TD>
                <TD>
                  <Link
                    href={`/panel/postulaciones/${item.solutionId}`}
                    className="font-medium hover:text-accent-fg"
                  >
                    {item.solutionName}
                  </Link>
                  <div className="mt-1">
                    <SolutionStatusBadge status={item.solutionStatus} />
                  </div>
                </TD>
                <TD className="text-[13px]">
                  <Link
                    href={`/panel/cuentas/${item.ownerId}`}
                    className="text-fg-2 hover:text-accent-fg"
                  >
                    {item.ownerEmail}
                  </Link>
                </TD>
                <TD className="text-[13px] text-muted">
                  {item.verifiedAt
                    ? `${fmtDate(item.verifiedAt)} · hace ${daysSince(item.verifiedAt)} d`
                    : '—'}
                </TD>
                <TD className="text-[13px] text-muted">
                  {item.verifiedAt ? '—' : fmtDate(item.expiresAt)}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </>
  );
}
