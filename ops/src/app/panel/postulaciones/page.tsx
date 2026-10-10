import type { Metadata } from 'next';
import { Flag, ImageIcon, LayoutGrid, RefreshCcw } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import {
  listSolutions,
  solutionCategories,
  SOLUTION_SORTS,
  SOLUTION_STATUSES,
  type SolutionSort,
} from '@/lib/data/solutions';
import { fmtNumber } from '@/lib/format';
import { SOLUTION_STATUS } from '@/lib/labels';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { UrlSelect } from '@/components/ui/UrlSelect';
import { Table, THead, TH, TBody, TR, TD, RowLink, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { SolutionStatusBadge } from '@/components/domain/StatusBadge';
import { ExportButton } from '@/components/actions/ExportButton';

export const metadata: Metadata = { title: 'Postulaciones' };

export default async function PostulacionesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const status = choice(params, 'estado', SOLUTION_STATUSES, 'all');
  const sort = choice(params, 'orden', SOLUTION_SORTS, 'updated');
  const dir = choice(params, 'dir', ['asc', 'desc'] as const, sort === 'name' ? 'asc' : 'desc');
  const page = pageParam(params);
  const [data, categories] = await Promise.all([
    listSolutions({
      status,
      q: param(params, 'q'),
      catalog: param(params, 'proyecto'),
      category: param(params, 'categoria'),
      sort,
      dir,
      page,
    }),
    solutionCategories(),
  ]);

  const sortHref = (key: SolutionSort) =>
    hrefWith('/panel/postulaciones', params, {
      orden: key,
      dir: sort === key ? (dir === 'asc' ? 'desc' : 'asc') : key === 'name' ? 'asc' : 'desc',
    });
  const statusItems = SOLUTION_STATUSES.map(key => ({
    label: key === 'all' ? 'Todas' : SOLUTION_STATUS[key].label,
    href: hrefWith('/panel/postulaciones', params, { estado: key === 'all' ? null : key }),
    active: status === key,
    count: data.statusCounts[key] ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Postulaciones"
        description="Todas las fichas de fundadores en cualquier estado, con su borrador y su versión pública."
        actions={<ExportButton kind="solutions" />}
      />
      <div className="mb-4 space-y-3">
        <Segmented label="Estado" items={statusItems} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchField placeholder="Nombre, sitio, correo o ID…" className="sm:w-80" />
          <UrlSelect
            name="categoria"
            label="Categoría"
            options={[
              { value: '', label: 'Todas las categorías' },
              ...categories.map(c => ({ value: c, label: c })),
            ]}
          />
          <UrlSelect
            name="proyecto"
            label="Proyecto vinculado"
            options={[
              { value: '', label: 'Cualquier proyecto' },
              { value: 'cord', label: 'catalog:cord' },
              { value: 'flouvia', label: 'catalog:flouvia' },
            ]}
          />
        </div>
      </div>

      <Table label="Postulaciones">
        <THead>
          <TH sort={{ href: sortHref('name'), active: sort === 'name', direction: dir }}>Ficha</TH>
          <TH>Estado</TH>
          <TH>Propietario</TH>
          <TH>Señales</TH>
          <TH sort={{ href: sortHref('created'), active: sort === 'created', direction: dir }}>
            Creada
          </TH>
          <TH sort={{ href: sortHref('updated'), active: sort === 'updated', direction: dir }}>
            Actualizada
          </TH>
        </THead>
        <TBody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={6}>
              <EmptyState compact icon={LayoutGrid} title="Sin postulaciones en este filtro" />
            </EmptyRow>
          ) : (
            data.items.map(item => (
              <TR key={item.id}>
                <TD className="max-w-[320px]">
                  <RowLink href={`/panel/postulaciones/${item.id}`} className="block truncate">
                    {item.name}
                  </RowLink>
                  <p className="truncate text-[12px] text-muted">
                    {item.category || 'Sin categoría'}
                    {item.website
                      ? ` · ${item.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
                      : ''}
                  </p>
                </TD>
                <TD>
                  <div className="flex flex-col items-start gap-1">
                    <SolutionStatusBadge status={item.status} />
                    {item.unpublishedChanges && (
                      <span className="text-[11.5px] text-muted">Cambios sin publicar</span>
                    )}
                  </div>
                </TD>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={item.ownerName} email={item.ownerEmail} size="sm" />
                    <span className="max-w-[200px] truncate text-[13px] text-fg-2">
                      {item.ownerEmail}
                    </span>
                  </div>
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {item.catalogKey && <Badge tone="lavender">{item.catalogKey}</Badge>}
                    {item.hasPublished && item.status !== 'published' && (
                      <Badge tone="blue" icon={RefreshCcw}>
                        Pública
                      </Badge>
                    )}
                    {item.openReports > 0 && (
                      <Badge tone="terracotta" icon={Flag}>
                        {item.openReports}
                      </Badge>
                    )}
                    {item.mediaCount > 0 && <Badge icon={ImageIcon}>{item.mediaCount}</Badge>}
                    {!item.ownerVerified && <Badge tone="amber">Sin verificar</Badge>}
                  </div>
                </TD>
                <TD className="whitespace-nowrap text-[13px] text-muted">
                  <RelativeTime value={item.createdAt} />
                </TD>
                <TD className="whitespace-nowrap text-[13px] text-muted">
                  <RelativeTime value={item.updatedAt} />
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
        hrefFor={target => hrefWith('/panel/postulaciones', params, { page: target })}
      />
      <p className="num mt-1 text-[12px] text-subtle">
        {fmtNumber(data.statusCounts.all ?? 0)} fichas en total en la plataforma.
      </p>
    </>
  );
}
