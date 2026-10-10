import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle2,
  EyeOff,
  Flag,
  MessageSquare,
  RotateCcw,
  ScrollText,
  Star,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { requireOps } from '@/lib/auth';
import {
  listCommunityReports,
  listReviewReports,
  listSolutionReports,
  reportCounts,
  REPORT_STATUSES,
} from '@/lib/data/reports';
import {
  COMMUNITY_REPORT_REASON,
  REPORT_STATUS,
  REVIEW_REPORT_REASON,
  SOLUTION_REPORT_REASON,
} from '@/lib/labels';
import { choice, hrefWith, pageParam, type SearchParams } from '@/lib/url';
import { daysSince } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented, Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { AgeBadge, ReportStatusBadge } from '@/components/domain/StatusBadge';
import { ActionButton } from '@/components/actions/ActionButton';

export const metadata: Metadata = { title: 'Reportes' };

function decisionConfirm(title: string, description: string, destructive = false) {
  return {
    title,
    description,
    destructive,
    field: 'message' as const,
    fieldLabel: 'Decisión (queda en el reporte y en la bitácora)',
    minLength: 10,
    placeholder: 'Qué revisaste y por qué decides esto.',
  };
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const kind = choice(params, 'tipo', ['fichas', 'comunidad', 'resenas'] as const, 'fichas');
  const status = choice(params, 'estado', REPORT_STATUSES, 'open');
  const page = pageParam(params);
  const [counts, solutionReports, communityReports, reviewReports] = await Promise.all([
    reportCounts(),
    kind === 'fichas' ? listSolutionReports(status, page) : null,
    kind === 'comunidad' ? listCommunityReports(status, page) : null,
    kind === 'resenas' ? listReviewReports(status, page) : null,
  ]);
  const data = solutionReports ?? communityReports ?? reviewReports!;

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Denuncias de visitantes con cuenta. No puedes resolver un reporte que presentaste tú; una ficha propia sí la puedes decidir en Revisión."
      />
      <div className="mb-4 space-y-3">
        <Tabs
          label="Tipo de reporte"
          items={[
            {
              label: 'Fichas',
              href: hrefWith('/panel/reportes', params, { tipo: null, page: null }),
              active: kind === 'fichas',
              count: counts.solutionOpen,
              icon: Flag,
            },
            {
              label: 'Comunidad',
              href: hrefWith('/panel/reportes', params, { tipo: 'comunidad', page: null }),
              active: kind === 'comunidad',
              count: counts.communityOpen,
              icon: MessageSquare,
            },
            {
              label: 'Reseñas',
              href: hrefWith('/panel/reportes', params, { tipo: 'resenas', page: null }),
              active: kind === 'resenas',
              count: counts.reviewOpen,
              icon: Star,
            },
          ]}
        />
        <Segmented
          label="Estado"
          items={REPORT_STATUSES.map(key => ({
            label: key === 'all' ? 'Todos' : REPORT_STATUS[key].label + 's',
            href: hrefWith('/panel/reportes', params, { estado: key === 'open' ? null : key }),
            active: status === key,
          }))}
        />
      </div>

      {data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={CheckCircle2}
            title={status === 'open' ? 'No hay reportes abiertos' : 'Sin reportes en este filtro'}
            description="Cuando alguien reporte una ficha, una reseña o un contenido de la comunidad aparecerá aquí."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {solutionReports?.items.map(report => (
            <li key={report.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReportStatusBadge status={report.status} />
                      <Badge tone="terracotta">
                        {SOLUTION_REPORT_REASON[report.reason] ?? report.reason}
                      </Badge>
                      {report.status === 'open' && <AgeBadge days={daysSince(report.createdAt)} />}
                      {report.openOnSolution > 1 && (
                        <Badge tone="amber">
                          {report.openOnSolution} reportes abiertos sobre esta ficha
                        </Badge>
                      )}
                    </div>
                    <Link
                      href={`/panel/postulaciones/${report.solutionId}?tab=reportes`}
                      className="block text-[15px] font-semibold hover:text-accent-fg"
                    >
                      {report.solutionName}
                    </Link>
                    <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg-2">
                      {report.details}
                    </p>
                    <p className="text-[12.5px] text-muted">
                      Reportó {report.reporterEmail ?? 'una cuenta eliminada'} ·{' '}
                      <RelativeTime value={report.createdAt} /> · Propietario{' '}
                      <Link
                        href={`/panel/cuentas/${report.ownerId}`}
                        className="hover:text-accent-fg"
                      >
                        {report.ownerEmail}
                      </Link>{' '}
                      · {report.solutionPublished ? 'ficha publicada' : 'ficha no publicada'}
                    </p>
                    {report.decision && (
                      <div className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px]">
                        <span className="font-medium">{report.reviewerEmail ?? 'ops'}:</span>{' '}
                        {report.decision}
                        {report.resolvedAt && (
                          <span className="text-muted">
                            {' '}
                            · <RelativeTime value={report.resolvedAt} />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {report.status === 'open' && (
                    <div className="flex shrink-0 flex-wrap gap-2 lg:w-[220px] lg:flex-col">
                      <ActionButton
                        label="Resolver sin cambios"
                        icon={<CheckCircle2 />}
                        tone="success"
                        endpoint="/api/reports"
                        payload={{
                          reportId: report.id,
                          decision: 'resolve',
                          version: report.version,
                        }}
                        success="Reporte resuelto"
                        confirm={decisionConfirm(
                          'Resolver el reporte',
                          'Revisaste la ficha y no requiere retirarse.',
                        )}
                      />
                      <ActionButton
                        label="Descartar"
                        icon={<X />}
                        endpoint="/api/reports"
                        payload={{
                          reportId: report.id,
                          decision: 'dismiss',
                          version: report.version,
                        }}
                        success="Reporte descartado"
                        confirm={decisionConfirm(
                          'Descartar el reporte',
                          'El reporte no procede (spam, error o sin fundamento).',
                        )}
                      />
                      {report.solutionPublished && (
                        <ActionButton
                          label="Retirar la ficha"
                          icon={<Undo2 />}
                          tone="danger"
                          endpoint="/api/reports"
                          payload={{
                            reportId: report.id,
                            decision: 'withdraw',
                            version: report.version,
                          }}
                          success="Ficha retirada del catálogo"
                          confirm={decisionConfirm(
                            'Retirar la ficha del catálogo',
                            'Deja de ser pública de inmediato; el borrador y las capturas se conservan.',
                            true,
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
          {communityReports?.items.map(report => (
            <li key={report.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReportStatusBadge status={report.status} />
                      <Badge tone="terracotta">
                        {COMMUNITY_REPORT_REASON[report.reason] ?? report.reason}
                      </Badge>
                      <Badge
                        tone="lavender"
                        icon={report.subjectType === 'comment' ? MessageSquare : ScrollText}
                      >
                        {report.subjectType === 'comment' ? 'Comentario' : 'Lista'}
                      </Badge>
                      {report.status === 'open' && <AgeBadge days={daysSince(report.createdAt)} />}
                    </div>
                    <p className="text-[15px] font-semibold">
                      <Link
                        href={`/panel/comunidad?q=${encodeURIComponent(report.listName)}`}
                        className="hover:text-accent-fg"
                      >
                        {report.listName}
                      </Link>
                      <span className="text-[13px] font-normal text-muted">
                        {' '}
                        · por «{report.curatorName || 'sin firma'}» ·{' '}
                        {report.listVisibility === 'public' ? 'pública' : 'ya privada'}
                      </span>
                    </p>
                    {report.subjectType === 'comment' && (
                      <blockquote className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-fg-2">
                        {report.commentBody ?? (
                          <span className="text-muted">El comentario ya no existe.</span>
                        )}
                        {report.commentAuthorName && (
                          <span className="mt-1 block text-[12px] text-muted">
                            — {report.commentAuthorName} (
                            {report.commentAuthorEmail ?? 'cuenta eliminada'})
                          </span>
                        )}
                      </blockquote>
                    )}
                    <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg-2">
                      {report.details}
                    </p>
                    <p className="text-[12.5px] text-muted">
                      Reportó {report.reporterEmail ?? 'una cuenta eliminada'} ·{' '}
                      <RelativeTime value={report.createdAt} /> · Dueño de la lista{' '}
                      <Link
                        href={`/panel/cuentas/${report.ownerId}`}
                        className="hover:text-accent-fg"
                      >
                        {report.ownerEmail}
                      </Link>
                    </p>
                    {report.decision && (
                      <div className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px]">
                        <span className="font-medium">{report.reviewerEmail ?? 'ops'}:</span>{' '}
                        {report.decision}
                      </div>
                    )}
                  </div>
                  {report.status === 'open' && (
                    <div className="flex shrink-0 flex-wrap gap-2 lg:w-[220px] lg:flex-col">
                      <ActionButton
                        label="Resolver sin cambios"
                        icon={<CheckCircle2 />}
                        tone="success"
                        endpoint="/api/community-reports"
                        payload={{
                          reportId: report.id,
                          decision: 'resolve',
                          version: report.version,
                        }}
                        success="Reporte resuelto"
                        confirm={decisionConfirm(
                          'Resolver el reporte',
                          'Revisaste el contenido y puede quedarse.',
                        )}
                      />
                      <ActionButton
                        label="Descartar"
                        icon={<X />}
                        endpoint="/api/community-reports"
                        payload={{
                          reportId: report.id,
                          decision: 'dismiss',
                          version: report.version,
                        }}
                        success="Reporte descartado"
                        confirm={decisionConfirm('Descartar el reporte', 'El reporte no procede.')}
                      />
                      <ActionButton
                        label={
                          report.subjectType === 'comment' ? 'Borrar comentario' : 'Volver privada'
                        }
                        icon={<Trash2 />}
                        tone="danger"
                        endpoint="/api/community-reports"
                        payload={{
                          reportId: report.id,
                          decision: 'takedown',
                          version: report.version,
                        }}
                        success="Contenido retirado"
                        confirm={decisionConfirm(
                          report.subjectType === 'comment'
                            ? 'Borrar el comentario'
                            : 'Volver privada la lista',
                          report.subjectType === 'comment'
                            ? 'Se elimina definitivamente; el reporte conserva tu decisión.'
                            : 'Deja de ser pública; sus notas privadas no se tocan.',
                          true,
                        )}
                      />
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
          {reviewReports?.items.map(report => (
            <li key={report.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReportStatusBadge status={report.status} />
                      <Badge tone="terracotta">
                        {REVIEW_REPORT_REASON[report.reason] ?? report.reason}
                      </Badge>
                      {report.review?.hidden && (
                        <Badge tone="amber" icon={EyeOff}>
                          Reseña oculta
                        </Badge>
                      )}
                      {report.reportedByOwner && (
                        <Badge tone="lavender">Reportada por el dueño</Badge>
                      )}
                      {report.status === 'open' && <AgeBadge days={daysSince(report.createdAt)} />}
                    </div>
                    <Link
                      href={`/panel/postulaciones/${report.solutionId}`}
                      className="block text-[15px] font-semibold hover:text-accent-fg"
                    >
                      {report.solutionName}
                    </Link>
                    {report.review ? (
                      <blockquote className="space-y-1.5 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-fg-2">
                        <p className="font-medium text-fg">
                          {'★'.repeat(report.review.rating)}
                          {'☆'.repeat(5 - report.review.rating)} · {report.review.headline}
                        </p>
                        <p>
                          <span className="text-muted">Uso:</span> {report.review.useCase}
                        </p>
                        <p>
                          <span className="text-muted">Lo mejor:</span> {report.review.pros}
                        </p>
                        <p>
                          <span className="text-muted">Mejoraría:</span> {report.review.cons}
                        </p>
                        <span className="block text-[12px] text-muted">
                          — {report.review.authorName} ·{' '}
                          {report.review.authorId ? (
                            <Link
                              href={`/panel/cuentas/${report.review.authorId}`}
                              className="hover:text-accent-fg"
                            >
                              {report.review.authorEmail}
                            </Link>
                          ) : (
                            'cuenta eliminada'
                          )}
                        </span>
                      </blockquote>
                    ) : (
                      <p className="text-[13px] text-muted">Su autor borró la reseña.</p>
                    )}
                    <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg-2">
                      {report.details}
                    </p>
                    <p className="text-[12.5px] text-muted">
                      Reportó {report.reporterEmail ?? 'una cuenta eliminada'} ·{' '}
                      <RelativeTime value={report.createdAt} />
                    </p>
                    {report.decision && (
                      <div className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px]">
                        <span className="font-medium">{report.reviewerEmail ?? 'ops'}:</span>{' '}
                        {report.decision}
                      </div>
                    )}
                  </div>
                  {(report.status === 'open' || report.review?.hidden) && (
                    <div className="flex shrink-0 flex-wrap gap-2 lg:w-[220px] lg:flex-col">
                      {report.status === 'open' && (
                        <>
                          <ActionButton
                            label="Resolver sin cambios"
                            icon={<CheckCircle2 />}
                            tone="success"
                            endpoint="/api/review-reports"
                            payload={{
                              reportId: report.id,
                              decision: 'resolve',
                              version: report.version,
                            }}
                            success="Reporte resuelto"
                            confirm={decisionConfirm(
                              'Resolver el reporte',
                              'Revisaste la reseña y cumple las reglas.',
                            )}
                          />
                          <ActionButton
                            label="Descartar"
                            icon={<X />}
                            endpoint="/api/review-reports"
                            payload={{
                              reportId: report.id,
                              decision: 'dismiss',
                              version: report.version,
                            }}
                            success="Reporte descartado"
                            confirm={decisionConfirm(
                              'Descartar el reporte',
                              'El reporte no procede.',
                            )}
                          />
                          {report.review && !report.review.hidden && (
                            <ActionButton
                              label="Ocultar la reseña"
                              icon={<EyeOff />}
                              tone="danger"
                              endpoint="/api/review-reports"
                              payload={{
                                reportId: report.id,
                                decision: 'hide',
                                version: report.version,
                              }}
                              success="Reseña oculta"
                              confirm={decisionConfirm(
                                'Ocultar la reseña',
                                'Deja de ser pública. Su autor la conserva y verá tu decisión como motivo, así que escríbela para esa persona.',
                                true,
                              )}
                            />
                          )}
                        </>
                      )}
                      {report.review?.hidden && (
                        <ActionButton
                          label="Restaurar la reseña"
                          icon={<RotateCcw />}
                          endpoint="/api/review-reports"
                          payload={{ action: 'restore', reviewId: report.review.id }}
                          success="Reseña restaurada"
                          confirm={decisionConfirm(
                            'Restaurar la reseña',
                            'Vuelve a ser pública con su contenido actual.',
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Pagination
        page={page}
        hasMore={data.hasMore}
        hrefFor={target => hrefWith('/panel/reportes', params, { page: target })}
      />
    </>
  );
}
