import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, ScrollText } from 'lucide-react';
import { requireAdminPage } from '@/lib/auth';
import { auditFacets, listAudit, verifyAuditChain } from '@/lib/data/audit';
import { AUDIT_GROUP_LABEL, auditAction, type AuditGroup } from '@/lib/labels';
import { fmtDateTime } from '@/lib/format';
import { hrefWith, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SearchField } from '@/components/ui/SearchField';
import { UrlSelect } from '@/components/ui/UrlSelect';
import { DateRange } from '@/components/ui/DateRange';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { subjectHref } from '@/components/domain/AuditLine';
import { ExportButton } from '@/components/actions/ExportButton';
import { ChainVerifier } from '../seguridad/SecurityControls';

export const metadata: Metadata = { title: 'Bitácora' };

const GROUPS = Object.keys(AUDIT_GROUP_LABEL) as AuditGroup[];

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const cursorRaw = param(params, 'cursor');
  const group = GROUPS.includes(param(params, 'grupo') as AuditGroup)
    ? (param(params, 'grupo') as AuditGroup)
    : '';
  const [data, facets, chain] = await Promise.all([
    listAudit({
      actor: param(params, 'actor'),
      action: param(params, 'accion'),
      group,
      subjectType: param(params, 'tipo'),
      subjectId: param(params, 'sujeto'),
      q: param(params, 'q'),
      from: param(params, 'from'),
      to: param(params, 'to'),
      cursor: /^\d{1,18}$/.test(cursorRaw) ? Number(cursorRaw) : null,
    }),
    auditFacets(),
    verifyAuditChain(),
  ]);
  const filtered = ['actor', 'accion', 'grupo', 'tipo', 'sujeto', 'q', 'from', 'to'].some(key =>
    param(params, key),
  );

  return (
    <>
      <PageHeader
        title="Bitácora"
        description="Cada acción de ops, cada acceso y cada fallo, en orden. Solo admite inserciones y cada evento lleva el hash del anterior."
        actions={<ExportButton kind="audit" label="Exportar bitácora" />}
      />
      <div className="mb-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <UrlSelect
              name="grupo"
              label="Grupo"
              options={[
                { value: '', label: 'Todos los grupos' },
                ...GROUPS.map(key => ({ value: key, label: AUDIT_GROUP_LABEL[key] })),
              ]}
            />
            <UrlSelect
              name="accion"
              label="Acción"
              options={[
                { value: '', label: 'Todas las acciones' },
                ...facets.actions.map(a => ({
                  value: a.value,
                  label: `${auditAction(a.value).label} (${a.n})`,
                })),
              ]}
            />
            <UrlSelect
              name="actor"
              label="Actor"
              options={[
                { value: '', label: 'Cualquier actor' },
                ...facets.actors.map(a => ({ value: a.value, label: `${a.value} (${a.n})` })),
              ]}
            />
            <UrlSelect
              name="tipo"
              label="Tipo de sujeto"
              options={[
                { value: '', label: 'Cualquier sujeto' },
                ...facets.types.map(t => ({ value: t.value, label: `${t.value} (${t.n})` })),
              ]}
            />
            <DateRange />
            <SearchField placeholder="Motivo, sujeto, IP…" className="w-full sm:w-64" />
            {filtered && (
              <Link
                href="/panel/bitacora"
                className="text-[13px] font-medium text-accent-fg hover:underline"
              >
                Quitar filtros
              </Link>
            )}
          </div>

          <Card>
            {data.items.length === 0 ? (
              <EmptyState icon={ScrollText} title="Sin eventos con estos filtros" />
            ) : (
              <ul className="divide-y divide-line">
                {data.items.map(entry => {
                  const label = auditAction(entry.action);
                  const href = subjectHref(entry.subjectType, entry.subjectId, entry.metadata);
                  const hasMeta = Object.keys(entry.metadata).length > 0;
                  return (
                    <li key={entry.id}>
                      <details className="group/row [&_summary::-webkit-details-marker]:hidden">
                        <summary className="flex cursor-pointer list-none items-start gap-3 px-5 py-3.5 transition hover:bg-surface-2">
                          <ChevronRight
                            aria-hidden
                            className="mt-0.5 size-4 shrink-0 text-subtle transition group-open/row:rotate-90"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone={label.tone} dot>
                                {label.label}
                              </Badge>
                              <span className="text-[13px] font-medium text-fg">
                                {entry.actorEmail}
                              </span>
                              <span className="text-[12px] text-muted">
                                {entry.subjectType}:
                                {entry.subjectId.length > 24
                                  ? entry.subjectId.slice(0, 8) + '…'
                                  : entry.subjectId}
                              </span>
                            </div>
                            {entry.reason && (
                              <p className="mt-1 line-clamp-2 text-[13px] text-fg-2">
                                «{entry.reason}»
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[12.5px] text-muted">
                              {fmtDateTime(entry.createdAt)}
                            </p>
                            {entry.seq !== null && (
                              <p className="num font-mono text-[11px] text-subtle">#{entry.seq}</p>
                            )}
                          </div>
                        </summary>
                        <div className="space-y-3 border-t border-line bg-surface-2 px-5 py-4 pl-12 text-[12.5px]">
                          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            <div>
                              <dt className="label-micro">Acción</dt>
                              <dd className="font-mono">{entry.action}</dd>
                            </div>
                            <div>
                              <dt className="label-micro">IP</dt>
                              <dd className="font-mono">{entry.ip ?? '—'}</dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="label-micro">Sujeto</dt>
                              <dd className="break-all font-mono">
                                {entry.subjectType} · {entry.subjectId}
                              </dd>
                            </div>
                            {entry.rowHash && (
                              <div className="sm:col-span-2">
                                <dt className="label-micro">Hash del evento</dt>
                                <dd className="break-all font-mono text-muted">{entry.rowHash}</dd>
                              </div>
                            )}
                          </dl>
                          {hasMeta && (
                            <pre className="overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-[11.5px] leading-relaxed text-fg-2">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          )}
                          <div className="flex flex-wrap gap-3">
                            {href && (
                              <Link
                                href={href}
                                className="font-medium text-accent-fg hover:underline"
                              >
                                Abrir el sujeto
                              </Link>
                            )}
                            <Link
                              href={hrefWith(
                                '/panel/bitacora',
                                {},
                                { tipo: entry.subjectType, sujeto: entry.subjectId },
                              )}
                              className="font-medium text-accent-fg hover:underline"
                            >
                              Todo lo de este sujeto
                            </Link>
                            <Link
                              href={hrefWith('/panel/bitacora', {}, { actor: entry.actorEmail })}
                              className="font-medium text-accent-fg hover:underline"
                            >
                              Todo lo de este actor
                            </Link>
                          </div>
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <div className="flex justify-between">
            {cursorRaw ? (
              <ButtonLink
                href={hrefWith('/panel/bitacora', params, { cursor: null })}
                tone="secondary"
              >
                Más recientes
              </ButtonLink>
            ) : (
              <span />
            )}
            {data.nextCursor && (
              <ButtonLink
                href={hrefWith('/panel/bitacora', params, { cursor: data.nextCursor })}
                tone="secondary"
              >
                Más antiguos
              </ButtonLink>
            )}
          </div>
        </div>
        <Card className="xl:sticky xl:top-6">
          <CardHeader title="Integridad" description="Recalcula todos los hashes en la base." />
          <CardBody>
            <ChainVerifier initial={chain} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
