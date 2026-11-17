import type { Metadata } from 'next';
import { CursorClickIcon, SearchIcon, SearchXIcon } from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import {
  ALERT_TOPIC_SORTS,
  alertTopics,
  searchDemand,
  type AlertTopicRow,
  type AlertTopicSort,
  type DemandRow,
} from '@/lib/data/demand';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { choice, hrefWith, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata: Metadata = { title: 'Demanda' };

function QueryTable({ rows, empty }: { rows: DemandRow[]; empty: string }) {
  return (
    <Table label="Búsquedas">
      <THead>
        <TR>
          <TH>Búsqueda</TH>
          <TH className="text-right">Veces</TH>
          <TH className="text-right">Sin resultados</TH>
          <TH className="text-right">Con clic</TH>
        </TR>
      </THead>
      <TBody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={4}>
            <p className="py-6 text-center text-[13px] text-muted">{empty}</p>
          </EmptyRow>
        ) : (
          rows.map(row => (
            <TR key={row.query}>
              <TD className="font-medium text-fg">{row.query}</TD>
              <TD className="num text-right">{fmtNumber(row.searches)}</TD>
              <TD className="num text-right">{fmtNumber(row.empty)}</TD>
              <TD className="num text-right">{fmtPercent(row.clicks, row.searches)}</TD>
            </TR>
          ))
        )}
      </TBody>
    </Table>
  );
}

const SCOPE_LABEL: Record<AlertTopicRow['scope'], string> = {
  search: 'Búsqueda',
  explorar: 'Categoría',
  industria: 'Industria',
  colecciones: 'Colección',
};

/**
 * Saved-search alerts by topic (SHCWS-175): how many alerts, from how many accounts, and
 * whether the catalogue has given them anything lately. Counts only, never who.
 */
function AlertTopicsCard({
  data,
  params,
  sort,
  dir,
}: {
  data: Awaited<ReturnType<typeof alertTopics>>;
  params: SearchParams;
  sort: AlertTopicSort;
  dir: 'asc' | 'desc';
}) {
  // Clicking the active column flips the direction; another column starts descending.
  const header = (key: AlertTopicSort) => ({
    href: hrefWith('/panel/demanda', params, {
      orden: key === 'alerts' ? null : key,
      dir: sort === key && dir === 'desc' ? 'asc' : null,
    }),
    active: sort === key,
    direction: dir,
  });
  return (
    <Card className="mb-6">
      <CardHeader
        title="Alertas activas por tema"
        description="Lo que los compradores pidieron que les avisemos: alertas, cuántas cuentas distintas y si el catálogo les trajo algo en los últimos 30 días. Un tema sin coincidencias dice a quién invitar. Solo conteos: nunca qué cuenta creó cada alerta."
      />
      <CardBody className="space-y-4">
        {!data.available ? (
          <p className="text-[13px] text-muted">
            Sin datos: falta aplicar db/search-alerts.sql en esta base.
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
              <li>
                <span className="num font-semibold">{fmtNumber(data.totals.alerts)}</span>{' '}
                <span className="text-muted">alertas activas</span>
              </li>
              <li>
                <span className="num font-semibold">{fmtNumber(data.totals.accounts)}</span>{' '}
                <span className="text-muted">cuentas</span>
              </li>
              <li>
                <span className="num font-semibold">{fmtNumber(data.totals.topics)}</span>{' '}
                <span className="text-muted">temas</span>
              </li>
              <li>
                <span className="num font-semibold">{fmtNumber(data.totals.unserved)}</span>{' '}
                <span className="text-muted">temas sin coincidencias en 30 días</span>
              </li>
            </ul>
            <Table label="Alertas activas por tema">
              <THead>
                <TH>Tema</TH>
                <TH>Dónde</TH>
                <TH align="right" sort={header('alerts')}>
                  Alertas
                </TH>
                <TH align="right" sort={header('accounts')}>
                  Cuentas
                </TH>
                <TH align="right" sort={header('matches')}>
                  Coincidencias en 30 días
                </TH>
                <TH sort={header('last')}>Última coincidencia</TH>
              </THead>
              <TBody>
                {data.rows.length === 0 ? (
                  <EmptyRow colSpan={6}>
                    <p className="py-6 text-center text-[13px] text-muted">
                      Nadie ha creado una alerta todavía.
                    </p>
                  </EmptyRow>
                ) : (
                  data.rows.map(row => (
                    <TR key={`${row.scope}:${row.topic ?? ''}:${row.label}`}>
                      <TD className="font-medium text-fg">{row.label}</TD>
                      <TD>
                        <Badge>{SCOPE_LABEL[row.scope] ?? row.scope}</Badge>
                      </TD>
                      <TD align="right">{fmtNumber(row.alerts)}</TD>
                      <TD align="right">{fmtNumber(row.accounts)}</TD>
                      <TD align="right">{fmtNumber(row.matches30d)}</TD>
                      <TD className="whitespace-nowrap text-[13px] text-muted">
                        {row.lastMatchAt ? <RelativeTime value={row.lastMatchAt} /> : 'Nunca'}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
            {data.totals.topics > data.rows.length && (
              <p className="text-[12.5px] text-muted">
                Se muestran {fmtNumber(data.rows.length)} de {fmtNumber(data.totals.topics)} temas.
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

export default async function DemandaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const sort = choice(params, 'orden', ALERT_TOPIC_SORTS, 'alerts');
  const dir = choice(params, 'dir', ['asc', 'desc'] as const, 'desc');
  const [data, alerts] = await Promise.all([searchDemand(), alertTopics(sort, dir)]);
  const alertsCard = <AlertTopicsCard data={alerts} params={params} sort={sort} dir={dir} />;
  return (
    <>
      <PageHeader
        title="Demanda"
        description="Lo que la gente busca en el catálogo, agregado por día: sin cuenta, dirección ni identificador. Las búsquedas sin resultados y las alertas sin coincidencias dicen a quién invitar y qué categorías faltan. Con DNT/GPC no se cuenta nada."
      />
      {!data.available ? (
        <>
          <EmptyState
            title="Aún no hay registro de búsquedas"
            description="Falta aplicar db/search-demand.sql en esta base."
          />
          <div className="mt-6">{alertsCard}</div>
        </>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Búsquedas (7 días)"
              value={data.totals.searches}
              trend={data.weeks.map(week => week.searches)}
              icon={<SearchIcon aria-hidden className="size-4" />}
            />
            <Stat
              label="Sin resultados"
              value={data.totals.empty}
              hint={`${fmtPercent(data.totals.empty, data.totals.searches)} de las búsquedas`}
              trend={data.weeks.map(week => week.empty)}
              icon={<SearchXIcon aria-hidden className="size-4" />}
            />
            <Stat
              label="Terminaron en una ficha"
              value={data.totals.clicks}
              hint={`${fmtPercent(data.totals.clicks, data.totals.searches)} de las búsquedas`}
              trend={data.weeks.map(week => week.clicks)}
              icon={<CursorClickIcon aria-hidden className="size-4" />}
            />
            <Stat label="Búsquedas distintas" value={data.totals.queries} />
          </section>
          <div className="mb-6 grid items-start gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader
                title="Sin resultados esta semana"
                description="Las 20 más frecuentes de los últimos 7 días: demanda que el catálogo todavía no atiende."
              />
              <CardBody>
                <QueryTable rows={data.unmet} empty="Ninguna búsqueda se quedó sin resultados." />
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title="Lo más buscado"
                description="Las 20 búsquedas más frecuentes de los últimos 7 días."
              />
              <CardBody>
                <QueryTable rows={data.top} empty="Todavía no hay búsquedas registradas." />
              </CardBody>
            </Card>
          </div>
          {alertsCard}
          <Card>
            <CardHeader
              title="Tendencia semanal"
              description="Semanas de lunes a domingo, las últimas 8."
            />
            <CardBody>
              <Table label="Tendencia semanal">
                <THead>
                  <TR>
                    <TH>Semana</TH>
                    <TH className="text-right">Búsquedas</TH>
                    <TH className="text-right">Sin resultados</TH>
                    <TH className="text-right">Con clic</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.weeks.length === 0 ? (
                    <EmptyRow colSpan={4}>
                      <p className="py-6 text-center text-[13px] text-muted">Sin datos todavía.</p>
                    </EmptyRow>
                  ) : (
                    data.weeks.map(week => (
                      <TR key={week.week}>
                        <TD className="num">{week.week}</TD>
                        <TD className="num text-right">{fmtNumber(week.searches)}</TD>
                        <TD className="num text-right">
                          {fmtNumber(week.empty)} · {fmtPercent(week.empty, week.searches)}
                        </TD>
                        <TD className="num text-right">{fmtPercent(week.clicks, week.searches)}</TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
