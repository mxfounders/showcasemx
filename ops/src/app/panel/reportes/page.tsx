import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircleIcon,
  CloseIcon,
  CommentIcon,
  EyeOffIcon,
  FlagIcon,
  InboxIcon,
  LogIcon,
  MessageAlertIcon,
  StarIcon,
  TrashIcon,
  UndoIcon,
} from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import {
  listCommentReports,
  listCommunityReports,
  listQuestionReports,
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
import { ReviewSignalBadges } from '@/components/domain/ReviewSignal';

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
  const kind = choice(
    params,
    'tipo',
    ['fichas', 'comunidad', 'resenas', 'comentarios', 'preguntas'] as const,
    'fichas',
  );
  const status = choice(params, 'estado', REPORT_STATUSES, 'open');
  const page = pageParam(params);
  const [
    counts,
    solutionReports,
    communityReports,
    reviewReports,
    commentReports,
    questionReports,
  ] = await Promise.all([
    reportCounts(),
    kind === 'fichas' ? listSolutionReports(status, page) : null,
    kind === 'comunidad' ? listCommunityReports(status, page) : null,
    kind === 'resenas' ? listReviewReports(status, page) : null,
    kind === 'comentarios' ? listCommentReports(status, page) : null,
    kind === 'preguntas' ? listQuestionReports(status, page) : null,
  ]);
  const data =
    solutionReports ?? communityReports ?? reviewReports ?? commentReports ?? questionReports!;

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
              icon: FlagIcon,
            },
            {
              label: 'Comunidad',
              href: hrefWith('/panel/reportes', params, { tipo: 'comunidad', page: null }),
              active: kind === 'comunidad',
              count: counts.communityOpen,
              icon: CommentIcon,
            },
            {
              label: 'Reseñas',
              href: hrefWith('/panel/reportes', params, { tipo: 'resenas', page: null }),
              active: kind === 'resenas',
              count: counts.reviewOpen,
              icon: StarIcon,
            },
            {
              label: 'Comentarios de fichas',
              href: hrefWith('/panel/reportes', params, { tipo: 'comentarios', page: null }),
              active: kind === 'comentarios',
              count: counts.commentOpen,
              icon: MessageAlertIcon,
            },
            {
              label: 'Preguntas',
              href: hrefWith('/panel/reportes', params, { tipo: 'preguntas', page: null }),
              active: kind === 'preguntas',
              count: counts.questionOpen,
              icon: InboxIcon,
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
            icon={CheckCircleIcon}
            title={status === 'open' ? 'No hay reportes abiertos' : 'Sin reportes en este filtro'}
            description="Cuando alguien reporte una ficha, una reseña, un comentario, una pregunta o un contenido de la comunidad aparecerá aquí."
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
                        icon={<CheckCircleIcon />}
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
                        icon={<CloseIcon />}
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
                          icon={<UndoIcon />}
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
                        icon={report.subjectType === 'comment' ? CommentIcon : LogIcon}
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
                        icon={<CheckCircleIcon />}
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
                        icon={<CloseIcon />}
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
                        icon={<TrashIcon />}
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
                        <Badge tone="amber" icon={EyeOffIcon}>
                          Reseña oculta
                        </Badge>
                      )}
                      {report.reportedByOwner && (
                        <Badge tone="lavender">Reportada por el dueño</Badge>
                      )}
                      <ReviewSignalBadges signal={report.signal} />
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
                            icon={<CheckCircleIcon />}
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
                            icon={<CloseIcon />}
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
                              icon={<EyeOffIcon />}
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
                          icon={<UndoIcon />}
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
          {commentReports?.items.map(report => (
            <li key={report.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReportStatusBadge status={report.status} />
                      <Badge tone="terracotta">
                        {COMMUNITY_REPORT_REASON[report.reason] ?? report.reason}
                      </Badge>
                      {report.comment?.hidden && (
                        <Badge tone="amber" icon={EyeOffIcon}>
                          Comentario oculto
                        </Badge>
                      )}
                      {report.reportedByOwner && (
                        <Badge tone="lavender">Reportado por el dueño de la ficha</Badge>
                      )}
                      {report.openOnComment > 1 && (
                        <Badge tone="amber">{report.openOnComment} reportes abiertos</Badge>
                      )}
                      {report.status === 'open' && <AgeBadge days={daysSince(report.createdAt)} />}
                    </div>
                    <Link
                      href={`/panel/postulaciones/${report.solutionId}?tab=comentarios`}
                      className="block text-[15px] font-semibold hover:text-accent-fg"
                    >
                      {report.solutionName}
                    </Link>
                    {report.comment ? (
                      <blockquote className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-fg-2">
                        <p className="whitespace-pre-line">{report.comment.body}</p>
                        <span className="mt-1 block text-[12px] text-muted">
                          — {report.comment.authorName} ·{' '}
                          {report.comment.authorId ? (
                            <Link
                              href={`/panel/cuentas/${report.comment.authorId}`}
                              className="hover:text-accent-fg"
                            >
                              {report.comment.authorEmail}
                            </Link>
                          ) : (
                            'cuenta eliminada'
                          )}
                        </span>
                        {report.comment.hidden && report.comment.hiddenReason && (
                          <span className="mt-1 block text-[12px] text-muted">
                            Motivo que ve su autor: «{report.comment.hiddenReason}»
                          </span>
                        )}
                      </blockquote>
                    ) : (
                      <p className="text-[13px] text-muted">El comentario ya no existe.</p>
                    )}
                    <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg-2">
                      {report.details}
                    </p>
                    <p className="text-[12.5px] text-muted">
                      Reportó {report.reporterEmail ?? 'una cuenta eliminada'} ·{' '}
                      <RelativeTime value={report.createdAt} /> ·{' '}
                      {report.solutionPublished ? 'ficha publicada' : 'ficha no publicada'}
                    </p>
                    {report.decision && (
                      <div className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px]">
                        <span className="font-medium">{report.reviewerEmail ?? 'ops'}:</span>{' '}
                        {report.decision}
                      </div>
                    )}
                  </div>
                  {(report.status === 'open' || report.comment?.hidden) && (
                    <div className="flex shrink-0 flex-wrap gap-2 lg:w-[220px] lg:flex-col">
                      {report.status === 'open' && (
                        <>
                          <ActionButton
                            label="Resolver sin cambios"
                            icon={<CheckCircleIcon />}
                            tone="success"
                            endpoint="/api/solution-comment-reports"
                            payload={{
                              reportId: report.id,
                              decision: 'resolve',
                              version: report.version,
                            }}
                            success="Reporte resuelto"
                            confirm={decisionConfirm(
                              'Resolver el reporte',
                              'Revisaste el comentario y puede quedarse.',
                            )}
                          />
                          <ActionButton
                            label="Descartar"
                            icon={<CloseIcon />}
                            endpoint="/api/solution-comment-reports"
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
                          {report.comment && !report.comment.hidden && (
                            <ActionButton
                              label="Ocultar el comentario"
                              icon={<EyeOffIcon />}
                              tone="danger"
                              endpoint="/api/solution-comment-reports"
                              payload={{
                                reportId: report.id,
                                decision: 'hide',
                                version: report.version,
                              }}
                              success="Comentario oculto"
                              confirm={{
                                ...decisionConfirm(
                                  'Ocultar el comentario',
                                  'Sale de la ficha, de su número de comentarios, del orden del catálogo y de los reconocimientos. Su autor lo conserva y verá tu decisión como motivo, así que escríbela para esa persona.',
                                  true,
                                ),
                                maxLength: 500,
                              }}
                            />
                          )}
                        </>
                      )}
                      {report.comment?.hidden && (
                        <ActionButton
                          label="Restaurar el comentario"
                          icon={<UndoIcon />}
                          endpoint="/api/solution-comment-reports"
                          payload={{ action: 'restore', commentId: report.comment.id }}
                          success="Comentario restaurado"
                          confirm={decisionConfirm(
                            'Restaurar el comentario',
                            'Vuelve a ser público y a contar en la ficha.',
                          )}
                        />
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </li>
          ))}
          {questionReports?.items.map(report => (
            <li key={report.id}>
              <Card className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ReportStatusBadge status={report.status} />
                      <Badge tone="terracotta">
                        {COMMUNITY_REPORT_REASON[report.reason] ?? report.reason}
                      </Badge>
                      {report.question?.hidden && (
                        <Badge tone="amber" icon={EyeOffIcon}>
                          Pregunta oculta
                        </Badge>
                      )}
                      {report.reportedByOwner && (
                        <Badge tone="lavender">Reportada por el dueño de la ficha</Badge>
                      )}
                      {report.openOnQuestion > 1 && (
                        <Badge tone="amber">{report.openOnQuestion} reportes abiertos</Badge>
                      )}
                      {report.status === 'open' && <AgeBadge days={daysSince(report.createdAt)} />}
                    </div>
                    <Link
                      href={`/panel/postulaciones/${report.solutionId}`}
                      className="block text-[15px] font-semibold hover:text-accent-fg"
                    >
                      {report.solutionName}
                    </Link>
                    {report.question ? (
                      <blockquote className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[13.5px] text-fg-2">
                        <p className="whitespace-pre-line">{report.question.body}</p>
                        <span className="mt-1 block text-[12px] text-muted">
                          — {report.question.authorName} ·{' '}
                          {report.question.authorId ? (
                            <Link
                              href={`/panel/cuentas/${report.question.authorId}`}
                              className="hover:text-accent-fg"
                            >
                              {report.question.authorEmail}
                            </Link>
                          ) : (
                            'cuenta eliminada'
                          )}
                        </span>
                        {report.question.answer && (
                          <span className="mt-1.5 block whitespace-pre-line text-[12.5px]">
                            <span className="font-medium text-fg">Respuesta del proyecto: </span>
                            {report.question.answer}
                          </span>
                        )}
                        {report.question.hidden && report.question.hiddenReason && (
                          <span className="mt-1 block text-[12px] text-muted">
                            Motivo que ve su autor: «{report.question.hiddenReason}»
                          </span>
                        )}
                      </blockquote>
                    ) : (
                      <p className="text-[13px] text-muted">Su autor borró la pregunta.</p>
                    )}
                    <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-fg-2">
                      {report.details}
                    </p>
                    <p className="text-[12.5px] text-muted">
                      Reportó {report.reporterEmail ?? 'una cuenta eliminada'} ·{' '}
                      <RelativeTime value={report.createdAt} /> ·{' '}
                      {report.solutionPublished ? 'ficha publicada' : 'ficha no publicada'}
                    </p>
                    {report.decision && (
                      <div className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px]">
                        <span className="font-medium">{report.reviewerEmail ?? 'ops'}:</span>{' '}
                        {report.decision}
                      </div>
                    )}
                  </div>
                  {(report.status === 'open' || report.question?.hidden) && (
                    <div className="flex shrink-0 flex-wrap gap-2 lg:w-[220px] lg:flex-col">
                      {report.status === 'open' && (
                        <>
                          <ActionButton
                            label="Resolver sin cambios"
                            icon={<CheckCircleIcon />}
                            tone="success"
                            endpoint="/api/question-reports"
                            payload={{
                              reportId: report.id,
                              decision: 'resolve',
                              version: report.version,
                            }}
                            success="Reporte resuelto"
                            confirm={decisionConfirm(
                              'Resolver el reporte',
                              'Revisaste la pregunta y puede quedarse.',
                            )}
                          />
                          <ActionButton
                            label="Descartar"
                            icon={<CloseIcon />}
                            endpoint="/api/question-reports"
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
                          {report.question && !report.question.hidden && (
                            <ActionButton
                              label="Ocultar la pregunta"
                              icon={<EyeOffIcon />}
                              tone="danger"
                              endpoint="/api/question-reports"
                              payload={{
                                reportId: report.id,
                                decision: 'hide',
                                version: report.version,
                              }}
                              success="Pregunta oculta"
                              confirm={{
                                ...decisionConfirm(
                                  'Ocultar la pregunta',
                                  'Sale de la ficha y de sus datos estructurados, con su respuesta. Su autor la conserva y verá tu decisión como motivo, así que escríbela para esa persona.',
                                  true,
                                ),
                                maxLength: 500,
                              }}
                            />
                          )}
                        </>
                      )}
                      {report.question?.hidden && (
                        <ActionButton
                          label="Restaurar la pregunta"
                          icon={<UndoIcon />}
                          endpoint="/api/question-reports"
                          payload={{ action: 'restore', questionId: report.question.id }}
                          success="Pregunta restaurada"
                          confirm={decisionConfirm(
                            'Restaurar la pregunta',
                            'Vuelve a la ficha con su respuesta, si la tiene.',
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
