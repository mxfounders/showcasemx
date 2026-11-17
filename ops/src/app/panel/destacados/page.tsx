import type { Metadata } from 'next';
import Link from 'next/link';
import { BlockIcon, StarIcon, VerifiedIcon } from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import { editorialCandidates, listRecognitions, type AwardRow } from '@/lib/data/recognition';
import { TIME_ZONE, fmtDate, fmtDateTime, fmtNumber } from '@/lib/format';
import { EDITORIAL_PER_MONTH, fmtMonth, fmtWeek, scopeLabel } from '@/lib/recognition';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Field';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { ActionButton } from '@/components/actions/ActionButton';
import { EditorialForm } from './EditorialForm';

export const metadata: Metadata = { title: 'Destacados' };

function groupBy<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return [...groups.entries()];
}

function plural(count: number, one: string, many: string) {
  return `${fmtNumber(count)} ${count === 1 ? one : many}`;
}

function SolutionLink({ award }: { award: AwardRow }) {
  return (
    <Link
      href={`/panel/postulaciones/${award.solutionId}`}
      className="font-medium hover:text-accent-fg"
    >
      {award.solutionName}
    </Link>
  );
}

function RevokeButton({ award, admin }: { award: AwardRow; admin: boolean }) {
  if (!admin || award.revokedAt) return null;
  return (
    <ActionButton
      label="Revocar"
      tone="ghost"
      size="xs"
      icon={<BlockIcon />}
      endpoint="/api/awards"
      payload={{ action: 'revoke', awardId: award.id }}
      success="Reconocimiento revocado"
      confirm={{
        title: '¿Revocar este reconocimiento?',
        description:
          'Deja de mostrarse en la ficha y en sus insignias. El lugar no pasa a otro proyecto. Queda en la bitácora.',
        destructive: true,
        confirmLabel: 'Revocar',
      }}
    />
  );
}

function Revoked({ award }: { award: AwardRow }) {
  if (!award.revokedAt) return null;
  return (
    <p className="mt-1 text-[12px] text-terracotta">
      Revocado {fmtDate(award.revokedAt)}: «{award.revokedReason}»
    </p>
  );
}

export default async function DestacadosPage() {
  const user = await requireOps();
  const admin = user.level === 'admin';
  let data: Awaited<ReturnType<typeof listRecognitions>>;
  try {
    data = await listRecognitions();
  } catch {
    return (
      <>
        <PageHeader title="Destacados" />
        <Alert tone="amber" title="No se pudieron leer los reconocimientos">
          Comprueba que db/solution-recognition.sql esté aplicada en esta base.
        </Alert>
      </>
    );
  }
  const candidates = admin ? await editorialCandidates(user.id) : [];
  const defaultMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());

  const editorial = data.awards.filter(award => award.kind === 'editorial');
  const weekly = data.awards.filter(award => award.kind === 'weekly');
  const weeks = groupBy(weekly, award => `${award.periodStart}|${award.periodEnd}`);
  const months = groupBy(editorial, award => award.periodStart);

  return (
    <>
      <PageHeader
        title="Destacados"
        description="Reconocimientos raros, fechados y revocables. El Top de la semana se calcula solo con actividad de cuentas verificadas; la Selección shwcs la elige el equipo."
        meta={
          <>
            <Badge tone="blue" icon={VerifiedIcon}>
              {plural(data.verifiedCount, 'ficha verificada', 'fichas verificadas')}
            </Badge>
            <Badge tone="sage" icon={StarIcon}>
              {plural(
                editorial.filter(a => !a.revokedAt).length,
                'selección vigente',
                'selecciones vigentes',
              )}
            </Badge>
            <Badge tone="amber" icon={StarIcon}>
              {plural(
                weekly.filter(a => !a.revokedAt).length,
                'puesto semanal vigente',
                'puestos semanales vigentes',
              )}
            </Badge>
          </>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Selección shwcs"
            description={`Elegida por el equipo para un mes, como máximo ${EDITORIAL_PER_MONTH} por mes. El motivo es público.`}
          />
          <CardBody className="space-y-6">
            {admin ? (
              <EditorialForm candidates={candidates} defaultMonth={defaultMonth} />
            ) : (
              <p className="text-[13px] text-muted">
                Solo un administrador puede elegir o revocar una Selección shwcs.
              </p>
            )}
            {months.length === 0 ? (
              <EmptyState
                compact
                icon={StarIcon}
                title="Todavía no hay selecciones"
                description="Cuando el equipo elija una, aparecerá aquí y en la ficha pública."
              />
            ) : (
              <div className="space-y-5">
                {months.map(([month, awards]) => (
                  <section key={month}>
                    <h3 className="label-micro mb-2">{fmtMonth(month)}</h3>
                    <ul className="divide-y divide-line rounded-xl border border-line">
                      {awards.map(award => (
                        <li
                          key={award.id}
                          className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <SolutionLink award={award} />
                              {award.revokedAt ? (
                                <Badge tone="terracotta">Revocada</Badge>
                              ) : (
                                <Badge tone="sage" icon={StarIcon}>
                                  Vigente
                                </Badge>
                              )}
                              {!award.solutionPublished && (
                                <Badge tone="amber">Ya no está publicada</Badge>
                              )}
                            </div>
                            <p className="mt-1 text-[13px] leading-relaxed text-fg-2">
                              «{award.note}»
                            </p>
                            <p className="mt-1 text-[12px] text-muted">
                              {award.awardedByEmail ?? 'ops'} · {fmtDateTime(award.awardedAt)}
                            </p>
                            <Revoked award={award} />
                          </div>
                          <RevokeButton award={award} admin={admin} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Top de la semana"
            description="Lunes a domingo en hora de Ciudad de México. Cuenta likes, guardados, comentarios y reseñas de cuentas verificadas que no son del dueño. Un proyecto compite si lo movieron al menos 3 cuentas; una categoría da un puesto por cada dos que compiten, como máximo 3, y ninguno con menos de 3."
          />
          <CardBody className="space-y-5">
            {data.runs.length === 0 ? (
              <EmptyState
                compact
                className="rounded-xl border border-line"
                title="Aún no se calcula ninguna semana"
                description="El trabajo diario calcula la última semana terminada la primera vez que corre después del lunes."
              />
            ) : (
              <Table label="Semanas calculadas">
                <THead>
                  <TH>Semana</TH>
                  <TH align="right">Compitieron</TH>
                  <TH align="right">Puestos</TH>
                  <TH>Calculada</TH>
                </THead>
                <TBody>
                  {data.runs.map(run => {
                    const end = new Date(`${run.periodStart}T00:00:00Z`);
                    end.setUTCDate(end.getUTCDate() + 6);
                    return (
                      <TR key={run.periodStart}>
                        <TD className="text-[13px]">
                          {fmtWeek(run.periodStart, end.toISOString().slice(0, 10))}
                        </TD>
                        <TD align="right" className="num">
                          {run.competitors}
                        </TD>
                        <TD align="right" className="num">
                          {run.awarded === 0 ? (
                            <span className="text-muted">Sin premio</span>
                          ) : (
                            run.awarded
                          )}
                        </TD>
                        <TD className="text-[13px] text-muted">{fmtDateTime(run.computedAt)}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            )}

            {weeks.map(([key, awards]) => {
              const [start, end] = key.split('|');
              return (
                <section key={key}>
                  <h3 className="label-micro mb-2">{fmtWeek(start, end)}</h3>
                  <Table label={`Puestos de la semana ${fmtWeek(start, end)}`}>
                    <THead>
                      <TH>Ranking</TH>
                      <TH align="right">Puesto</TH>
                      <TH>Proyecto</TH>
                      <TH align="right">Puntaje</TH>
                      <TH>
                        <span className="sr-only">Acciones</span>
                      </TH>
                    </THead>
                    <TBody>
                      {awards.map(award => (
                        <TR key={award.id}>
                          <TD className="text-[13px]">{scopeLabel(award.scope)}</TD>
                          <TD align="right" className="num font-semibold">
                            #{award.rank}
                          </TD>
                          <TD>
                            <SolutionLink award={award} />
                            <Revoked award={award} />
                          </TD>
                          <TD align="right" className="num text-muted">
                            {award.score !== null ? fmtNumber(award.score) : '—'}
                          </TD>
                          <TD align="right">
                            <RevokeButton award={award} admin={admin} />
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </section>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
