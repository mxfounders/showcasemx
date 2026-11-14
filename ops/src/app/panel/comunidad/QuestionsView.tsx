import Link from 'next/link';
import { EyeOffIcon, FlagIcon, MessagesIcon, UndoIcon } from '@/components/icons/gota';
import { QUESTION_FILTERS, questionsOverview, type QuestionFilter } from '@/lib/data/questions';
import { choice, hrefWith, param, type SearchParams } from '@/lib/url';
import { Segmented } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { ActionButton } from '@/components/actions/ActionButton';

const FILTER_LABEL: Record<QuestionFilter, string> = {
  all: 'Todas',
  visible: 'Visibles',
  hidden: 'Ocultas',
  unanswered: 'Sin respuesta',
};

/**
 * Every public question on a listing, so ops can hide one without waiting for a report
 * (SHCWS-57). Hiding asks for modo seguro and a reason its author will read; restoring
 * is the same action the report queue uses.
 */
export async function QuestionsView({ params, page }: { params: SearchParams; page: number }) {
  const filter = choice(params, 'filtro', QUESTION_FILTERS, 'all');
  const data = await questionsOverview(filter, param(params, 'q'), page);
  if (!data)
    return (
      <Alert tone="amber" title="Esta base todavía no tiene preguntas">
        Aplica db/solution-questions.sql en este entorno.
      </Alert>
    );

  return (
    <>
      <div className="mb-4">
        <Segmented
          label="Filtro de preguntas"
          items={QUESTION_FILTERS.map(key => ({
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
          <EmptyState icon={MessagesIcon} title="Sin preguntas en este filtro" />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {data.items.map(question => (
              <li key={question.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {question.hidden ? (
                      <Badge tone="terracotta" icon={EyeOffIcon}>
                        Oculta
                      </Badge>
                    ) : question.answer ? (
                      <Badge tone="sage">Respondida</Badge>
                    ) : (
                      <Badge>Sin respuesta</Badge>
                    )}
                    {question.openReports > 0 && (
                      <Link href="/panel/reportes?tipo=preguntas">
                        <Badge tone="amber" icon={FlagIcon}>
                          {question.openReports}{' '}
                          {question.openReports === 1 ? 'reporte' : 'reportes'}
                        </Badge>
                      </Link>
                    )}
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-[14px] font-medium leading-relaxed">
                    {question.body}
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    <span className="font-medium text-fg">{question.authorName}</span> ·{' '}
                    <Link
                      href={`/panel/cuentas/${question.authorId}`}
                      className="hover:text-accent-fg"
                    >
                      {question.authorEmail}
                    </Link>{' '}
                    · en{' '}
                    <Link
                      href={`/panel/postulaciones/${question.solutionId}`}
                      className="font-medium text-fg-2 hover:text-accent-fg"
                    >
                      {question.solutionName}
                    </Link>{' '}
                    · <RelativeTime value={question.createdAt} />
                  </p>
                  {question.answer && (
                    <p className="mt-2 whitespace-pre-line rounded-xl border border-line bg-surface-2 px-3 py-2 text-[13px] text-fg-2">
                      <span className="font-medium text-fg">Respuesta del proyecto: </span>
                      {question.answer}
                    </p>
                  )}
                  {question.hidden && question.hiddenReason && (
                    <p className="mt-2 text-[12.5px] text-muted">
                      Su autor lee: «{question.hiddenReason}»
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {question.hidden ? (
                    <ActionButton
                      label="Restaurar"
                      icon={<UndoIcon />}
                      tone="ghost"
                      size="xs"
                      endpoint="/api/question-reports"
                      payload={{ action: 'restore', questionId: question.id }}
                      success="Pregunta restaurada"
                      confirm={{
                        title: 'Restaurar la pregunta',
                        description: 'Vuelve a la ficha con su respuesta, si la tiene.',
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
                      endpoint="/api/questions"
                      payload={{ action: 'hide', questionId: question.id }}
                      success="Pregunta oculta"
                      confirm={{
                        title: 'Ocultar la pregunta',
                        description:
                          'Sale de la ficha y de sus datos estructurados, con su respuesta. Su autor la sigue viendo con este motivo; se puede restaurar. Pide modo seguro.',
                        field: 'message',
                        fieldLabel: 'Motivo que verá su autor',
                        maxLength: 500,
                        destructive: true,
                        confirmLabel: 'Ocultar',
                        templates: [
                          'Incluye datos personales de otra persona.',
                          'No es una pregunta sobre el producto.',
                          'Es publicidad de otro producto.',
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
