import type { Metadata } from 'next';
import Link from 'next/link';
import { BarChart3, Eye, Handshake, MousePointerClick, UserPlus } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { METRIC_RANGES, platformMetrics } from '@/lib/data/metrics';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { choice, hrefWith, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { AreaChart } from '@/components/charts/AreaChart';

export const metadata: Metadata = { title: 'Métricas' };

function FunnelStep({
  label,
  value,
  of,
  first,
}: {
  label: string;
  value: number;
  of: number;
  first?: boolean;
}) {
  const width = of > 0 ? Math.max(4, (value / of) * 100) : 0;
  return (
    <li>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-fg-2">{label}</span>
        <span className="num">
          <span className="font-semibold text-fg">{fmtNumber(value)}</span>
          {!first && <span className="text-muted"> · {fmtPercent(value, of)}</span>}
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-series-1"
          style={{ width: `${first ? 100 : width}%` }}
        />
      </div>
    </li>
  );
}

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const range = choice(params, 'rango', METRIC_RANGES, '30');
  const data = await platformMetrics(range);
  const sum = (key: 'views' | 'clicks' | 'requests' | 'signups' | 'likes' | 'saves') =>
    data.series.reduce((acc, row) => acc + row[key], 0);

  return (
    <>
      <PageHeader
        title="Métricas"
        description="Eventos agregados reales: no son personas únicas, ventas ni ROI. Vistas del propietario y con DNT/GPC no se cuentan."
        actions={
          <Segmented
            label="Periodo"
            items={METRIC_RANGES.map(key => ({
              label: `${key} días`,
              href: hrefWith('/panel/metricas', params, { rango: key === '30' ? null : key }),
              active: range === key,
            }))}
          />
        }
      />
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Vistas de fichas"
          value={sum('views')}
          trend={data.series.map(d => d.views)}
          icon={<Eye aria-hidden className="size-4" />}
        />
        <Stat
          label="Clics al sitio oficial"
          value={sum('clicks')}
          hint={`CTR ${fmtPercent(sum('clicks'), sum('views'))}`}
          trend={data.series.map(d => d.clicks)}
          icon={<MousePointerClick aria-hidden className="size-4" />}
        />
        <Stat
          label="Solicitudes de contacto"
          value={sum('requests')}
          hint={`${fmtPercent(sum('requests'), sum('views'))} de las vistas`}
          trend={data.series.map(d => d.requests)}
          icon={<Handshake aria-hidden className="size-4" />}
        />
        <Stat
          label="Cuentas nuevas"
          value={sum('signups')}
          trend={data.series.map(d => d.signups)}
          icon={<UserPlus aria-hidden className="size-4" />}
        />
      </section>
      <div className="mb-6 grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Vistas y clics"
            description="Mismo eje: ambos son eventos sobre fichas publicadas."
          />
          <CardBody>
            <AreaChart
              title="Vistas y clics por día"
              series={[
                { key: 'views', label: 'Vistas', color: 'series-1' },
                { key: 'clicks', label: 'Clics al sitio', color: 'series-2' },
              ]}
              data={data.series}
              height={260}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Embudo del periodo"
            description="De ver una ficha a recibir respuesta."
          />
          <CardBody>
            <ol className="space-y-4">
              <FunnelStep first label="Vistas" value={data.funnel.views} of={data.funnel.views} />
              <FunnelStep
                label="Clics al sitio"
                value={data.funnel.clicks}
                of={data.funnel.views}
              />
              <FunnelStep label="Solicitudes" value={data.funnel.requests} of={data.funnel.views} />
              <FunnelStep
                label="Con respuesta"
                value={data.funnel.answered}
                of={data.funnel.requests}
              />
            </ol>
            <p className="mt-4 text-[12px] text-muted">
              El último paso se mide sobre las solicitudes, no sobre las vistas.
            </p>
          </CardBody>
        </Card>
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Solicitudes y cuentas nuevas"
            description="Conteos de personas actuando, en el mismo eje."
          />
          <CardBody>
            <AreaChart
              title="Solicitudes y cuentas nuevas por día"
              series={[
                { key: 'requests', label: 'Solicitudes', color: 'series-1' },
                { key: 'signups', label: 'Cuentas nuevas', color: 'series-3' },
              ]}
              data={data.series}
              height={200}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Señales sociales"
            description="Me gusta a fichas y guardados en biblioteca."
          />
          <CardBody>
            <AreaChart
              title="Me gusta y guardados por día"
              series={[
                { key: 'likes', label: 'Me gusta', color: 'series-1' },
                { key: 'saves', label: 'Guardados', color: 'series-2' },
              ]}
              data={data.series}
              height={200}
            />
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader
          title="Fichas publicadas"
          description={`Ordenadas por vistas en ${range} días. Me gusta, comentarios y guardados son históricos.`}
        />
        <Table
          className="rounded-none border-x-0 border-b-0 shadow-none"
          label="Rendimiento por ficha"
        >
          <THead>
            <TH>Ficha</TH>
            <TH align="right">Vistas</TH>
            <TH align="right">Clics</TH>
            <TH align="right">CTR</TH>
            <TH align="right">Solicitudes</TH>
            <TH align="right">Me gusta</TH>
            <TH align="right">Comentarios</TH>
            <TH align="right">Guardados</TH>
          </THead>
          <TBody>
            {data.projects.length === 0 ? (
              <EmptyRow colSpan={8}>
                <EmptyState compact icon={BarChart3} title="Sin fichas publicadas" />
              </EmptyRow>
            ) : (
              data.projects.map(project => (
                <TR key={project.id}>
                  <TD>
                    <Link
                      href={`/panel/postulaciones/${project.id}?tab=actividad`}
                      className="font-medium hover:text-accent-fg"
                    >
                      {project.name}
                    </Link>
                    {project.catalogKey && (
                      <Badge tone="lavender" className="ml-2">
                        {project.catalogKey}
                      </Badge>
                    )}
                  </TD>
                  <TD align="right">{fmtNumber(project.views)}</TD>
                  <TD align="right">{fmtNumber(project.clicks)}</TD>
                  <TD align="right" className="text-muted">
                    {fmtPercent(project.clicks, project.views)}
                  </TD>
                  <TD align="right">{fmtNumber(project.requests)}</TD>
                  <TD align="right">{fmtNumber(project.likes)}</TD>
                  <TD align="right">{fmtNumber(project.comments)}</TD>
                  <TD align="right">{fmtNumber(project.saves)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </>
  );
}
