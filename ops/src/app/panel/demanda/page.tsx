import type { Metadata } from 'next';
import { CursorClickIcon, SearchIcon, SearchXIcon } from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import { searchDemand, type DemandRow } from '@/lib/data/demand';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
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

export default async function DemandaPage() {
  await requireOps();
  const data = await searchDemand();
  return (
    <>
      <PageHeader
        title="Demanda"
        description="Lo que la gente busca en el catálogo, agregado por día: sin cuenta, dirección ni identificador. Las búsquedas sin resultados dicen a quién invitar y qué categorías faltan. Con DNT/GPC no se cuenta nada."
      />
      {!data.available ? (
        <EmptyState
          title="Aún no hay registro de búsquedas"
          description="Falta aplicar db/search-demand.sql en esta base."
        />
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
