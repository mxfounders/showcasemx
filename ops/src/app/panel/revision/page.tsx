import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Flag,
  ImageIcon,
  RefreshCcw,
  ShieldQuestion,
  Sparkles,
} from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { listSolutions } from '@/lib/data/solutions';
import { daysSince, fmtDateTime } from '@/lib/format';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Kbd } from '@/components/ui/Kbd';
import { AgeBadge } from '@/components/domain/StatusBadge';
import { QueueKeys } from '@/components/domain/QueueKeys';

export const metadata: Metadata = { title: 'Revisión' };

const STATES = ['pending', 'changes_requested'] as const;

export default async function RevisionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const status = choice(params, 'estado', STATES, 'pending');
  const q = param(params, 'q');
  const page = pageParam(params);
  const data = await listSolutions({ status, q, sort: 'waiting', dir: 'asc', page, pageSize: 25 });

  return (
    <>
      <QueueKeys />
      <PageHeader
        title="Revisión"
        description="Fichas que esperan una decisión editorial, la más antigua primero. Publicar copia el borrador a la ficha pública; nada se publica solo."
        meta={
          <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
            <Kbd>j</Kbd>
            <Kbd>k</Kbd> para moverte · <Kbd>↵</Kbd> para abrir
          </span>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Estado"
          items={[
            {
              label: 'Pendientes',
              href: hrefWith('/panel/revision', params, { estado: null }),
              active: status === 'pending',
              count: data.statusCounts.pending ?? 0,
            },
            {
              label: 'Esperando al fundador',
              href: hrefWith('/panel/revision', params, { estado: 'changes_requested' }),
              active: status === 'changes_requested',
              count: data.statusCounts.changes_requested ?? 0,
            },
          ]}
        />
        <SearchField placeholder="Buscar por nombre, sitio o correo…" className="sm:w-80" />
      </div>

      {status === 'changes_requested' && (
        <p className="mb-4 text-[13px] text-muted">
          Pediste cambios a estas fichas. Vuelven a «Pendientes» cuando el fundador las reenvía;
          desde aquí también puedes publicarlas o rechazarlas.
        </p>
      )}

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface shadow-card">
          <EmptyState
            icon={q ? ShieldQuestion : CheckCircle2}
            title={
              q
                ? 'Sin coincidencias'
                : status === 'pending'
                  ? 'No hay nada pendiente'
                  : 'Nadie tiene cambios pendientes'
            }
            description={
              q
                ? 'Prueba con otro nombre, dominio o correo.'
                : 'Cuando un fundador envíe una ficha aparecerá aquí.'
            }
          />
        </div>
      ) : (
        <ol className="space-y-2.5">
          {data.items.map((item, index) => {
            const days = daysSince(item.updatedAt);
            const position = (page - 1) * data.pageSize + index + 1;
            return (
              <li key={item.id}>
                <Link
                  data-queue-item
                  href={`/panel/postulaciones/${item.id}?from=revision`}
                  className="group flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card outline-none transition hover:border-line-strong hover:shadow-pop focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/15 sm:px-5"
                >
                  <span className="num hidden w-6 shrink-0 text-right text-[12.5px] font-medium text-subtle sm:block">
                    {position}
                  </span>
                  <Avatar name={item.ownerName} email={item.ownerEmail} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[14.5px] font-semibold text-fg group-hover:text-accent-fg">
                        {item.name}
                      </p>
                      {item.hasPublished && (
                        <Badge
                          tone="blue"
                          icon={RefreshCcw}
                          title="Ya tiene una versión pública; esta es una actualización"
                        >
                          Actualización
                        </Badge>
                      )}
                      {item.catalogKey && <Badge tone="lavender">catalog:{item.catalogKey}</Badge>}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted">
                      <span className="truncate">{item.ownerEmail}</span>
                      {item.category && <span>· {item.category}</span>}
                      <span title={fmtDateTime(item.updatedAt)}>
                        · enviada {fmtDateTime(item.updatedAt)}
                      </span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.ownerNew && (
                        <Badge tone="amber" icon={Sparkles}>
                          Cuenta nueva
                        </Badge>
                      )}
                      {!item.ownerVerified && <Badge tone="amber">Correo sin verificar</Badge>}
                      {item.openReports > 0 && (
                        <Badge tone="terracotta" icon={Flag}>
                          {item.openReports} reportes
                        </Badge>
                      )}
                      {item.mediaCount > 0 && (
                        <Badge icon={ImageIcon}>{item.mediaCount} capturas</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <AgeBadge days={days} />
                    <ArrowRight
                      aria-hidden
                      className="size-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-accent-fg"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}

      <Pagination
        page={page}
        hasMore={data.hasMore}
        total={data.total}
        pageSize={data.pageSize}
        hrefFor={target => hrefWith('/panel/revision', params, { page: target })}
      />
    </>
  );
}
