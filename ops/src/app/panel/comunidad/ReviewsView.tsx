import Link from 'next/link';
import { EyeOffIcon, FlagIcon, StarIcon, UndoIcon } from '@/components/icons/gota';
import { REVIEW_FILTERS, reviewsOverview, type ReviewFilter } from '@/lib/data/reviews';
import { choice, hrefWith, param, type SearchParams } from '@/lib/url';
import { Segmented } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { ActionButton } from '@/components/actions/ActionButton';
import { ReviewSignalBadges } from '@/components/domain/ReviewSignal';

const FILTER_LABEL: Record<ReviewFilter, string> = {
  all: 'Todas',
  published: 'Públicas',
  hidden: 'Ocultas',
  unverified: 'Sin verificar',
};

/**
 * Every review, so ops can hide one without waiting for a report (SHCWS-142). Hiding
 * asks for modo seguro and a reason its author will read; restoring is the same action
 * the report queue already uses.
 */
export async function ReviewsView({ params, page }: { params: SearchParams; page: number }) {
  const filter = choice(params, 'filtro', REVIEW_FILTERS, 'all');
  const data = await reviewsOverview(filter, param(params, 'q'), page);
  if (!data)
    return (
      <Alert tone="amber" title="Esta base todavía no tiene reseñas">
        Aplica db/solution-reviews.sql en este entorno.
      </Alert>
    );

  return (
    <>
      <div className="mb-4">
        <Segmented
          label="Filtro de reseñas"
          items={REVIEW_FILTERS.map(key => ({
            label: FILTER_LABEL[key],
            href: hrefWith('/panel/comunidad', params, {
              filtro: key === 'all' ? null : key,
              page: null,
            }),
            active: filter === key,
          }))}
        />
      </div>
      {data.items.length === 0 ? (
        <Card>
          <EmptyState icon={StarIcon} title="Sin reseñas en este filtro" />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {data.items.map(review => (
              <li key={review.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="num text-[13px] font-semibold text-amber"
                      aria-label={`${review.rating} de 5 estrellas`}
                    >
                      {'★'.repeat(review.rating)}
                      <span className="text-subtle">{'★'.repeat(5 - review.rating)}</span>
                    </span>
                    <p className="text-[14px] font-medium">{review.headline}</p>
                    {review.hidden ? (
                      <Badge tone="terracotta" icon={EyeOffIcon}>
                        Oculta
                      </Badge>
                    ) : review.authorVerified ? (
                      <Badge tone="sage">Pública</Badge>
                    ) : (
                      <Badge>Solo la ve su autor (correo sin verificar)</Badge>
                    )}
                    <ReviewSignalBadges signal={review.signal} />
                    {review.openReports > 0 && (
                      <Link href="/panel/reportes?tipo=resenas">
                        <Badge tone="amber" icon={FlagIcon}>
                          {review.openReports} {review.openReports === 1 ? 'reporte' : 'reportes'}
                        </Badge>
                      </Link>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">
                    <span className="font-medium text-fg">{review.authorName}</span> ·{' '}
                    <Link
                      href={`/panel/cuentas/${review.authorId}`}
                      className="hover:text-accent-fg"
                    >
                      {review.authorEmail}
                    </Link>{' '}
                    · en{' '}
                    <Link
                      href={`/panel/postulaciones/${review.solutionId}`}
                      className="font-medium text-fg-2 hover:text-accent-fg"
                    >
                      {review.solutionName}
                    </Link>{' '}
                    · <RelativeTime value={review.createdAt} />
                    {review.recommends ? ' · la recomienda' : ' · no la recomienda'}
                  </p>
                  <dl className="mt-2 space-y-1.5 text-[13.5px] leading-relaxed text-fg-2">
                    <div>
                      <dt className="inline font-medium text-fg">Para qué la usa: </dt>
                      <dd className="inline whitespace-pre-line">{review.useCase}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-fg">Lo mejor: </dt>
                      <dd className="inline whitespace-pre-line">{review.pros}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium text-fg">Lo que mejoraría: </dt>
                      <dd className="inline whitespace-pre-line">{review.cons}</dd>
                    </div>
                    {review.reply && (
                      <div>
                        <dt className="inline font-medium text-fg">Respuesta del fundador: </dt>
                        <dd className="inline whitespace-pre-line">{review.reply}</dd>
                      </div>
                    )}
                  </dl>
                  {review.hidden && review.hiddenReason && (
                    <p className="mt-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-[12.5px] text-fg-2">
                      <span className="font-medium">Motivo que ve su autor:</span> «
                      {review.hiddenReason}»
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {review.hidden ? (
                    <ActionButton
                      label="Restaurar"
                      icon={<UndoIcon />}
                      tone="ghost"
                      size="xs"
                      endpoint="/api/review-reports"
                      payload={{ action: 'restore', reviewId: review.id }}
                      success="Reseña restaurada"
                      confirm={{
                        title: 'Restaurar la reseña',
                        description: 'Vuelve a ser pública con su contenido actual.',
                        field: 'message',
                        fieldLabel: 'Motivo',
                        confirmLabel: 'Restaurar',
                      }}
                    />
                  ) : (
                    <ActionButton
                      label="Ocultar"
                      icon={<EyeOffIcon />}
                      tone="ghost"
                      size="xs"
                      endpoint="/api/reviews"
                      payload={{ action: 'hide', reviewId: review.id }}
                      success="Reseña oculta"
                      confirm={{
                        title: `Ocultar «${review.headline}»`,
                        description:
                          'Sale de la ficha pública y deja de contar en el orden del catálogo. Su autor la sigue viendo con este motivo y puede editarla; se puede restaurar. Pide modo seguro.',
                        field: 'message',
                        fieldLabel: 'Motivo que verá su autor',
                        maxLength: 500,
                        destructive: true,
                        confirmLabel: 'Ocultar',
                        templates: [
                          'Incluye datos personales de otra persona.',
                          'No describe una experiencia propia con el producto.',
                          'Tiene un conflicto de interés con el proveedor.',
                        ],
                      }}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <Pagination
        page={page}
        hasMore={data.hasMore}
        total={data.total}
        pageSize={data.pageSize}
        hrefFor={target => hrefWith('/panel/comunidad', params, { page: target })}
      />
    </>
  );
}
