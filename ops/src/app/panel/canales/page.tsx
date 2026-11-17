import type { Metadata } from 'next';
import Link from 'next/link';
import { requireOps } from '@/lib/auth';
import { CHANNEL_RANGES, channelReport, type SiteRow } from '@/lib/data/channels';
import { LANDING_LABEL, channelLabel } from '@/lib/funnels';
import { fmtDate, fmtNumber, fmtPercent } from '@/lib/format';
import { choice, hrefWith, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { EmptyState } from '@/components/ui/EmptyState';
import { BarList } from '@/components/charts/BarList';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';

export const metadata: Metadata = { title: 'Canales' };

const dash = (value: string) => value || '—';

function SitesTable({ rows, label, empty }: { rows: SiteRow[]; label: string; empty: string }) {
  return (
    <Table label={label}>
      <THead>
        <TH>Sitio</TH>
        <TH align="right">Visitas</TH>
        <TH align="right">Llegaron a una ficha</TH>
      </THead>
      <TBody>
        {rows.length === 0 ? (
          <EmptyRow colSpan={3}>
            <p className="py-6 text-center text-[13px] text-muted">{empty}</p>
          </EmptyRow>
        ) : (
          rows.map(row => (
            <TR key={row.site || '(sin sitio)'}>
              <TD className="font-medium text-fg">
                {row.site || <span className="text-muted">Sin sitio (no envió origen)</span>}
              </TD>
              <TD align="right">{fmtNumber(row.visits)}</TD>
              <TD align="right">{fmtNumber(row.listing)}</TD>
            </TR>
          ))
        )}
      </TBody>
    </Table>
  );
}

export default async function CanalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const range = choice(params, 'rango', CHANNEL_RANGES, '30');
  const data = await channelReport(range);

  const header = (
    <PageHeader
      title="Canales"
      description="De dónde llegan las visitas y las cuentas nuevas. Visitas: una por pestaña y visita, contadas por día y canal, sin cuenta, dirección ni identificador; con DNT/GPC no se cuenta nada. Cuentas: el canal de la visita en la que se registraron."
      actions={
        <Segmented
          label="Periodo"
          items={CHANNEL_RANGES.map(key => ({
            label: `${key} días`,
            href: hrefWith('/panel/canales', params, { rango: key === '30' ? null : key }),
            active: range === key,
          }))}
        />
      }
    />
  );
  if (!data.available)
    return (
      <>
        {header}
        <EmptyState
          title="Aún no hay registro de canales"
          description="Falta aplicar db/traffic-attribution.sql en esta base."
        />
      </>
    );

  const total = data.channels.reduce(
    (acc, row) => ({ visits: acc.visits + row.visits, signups: acc.signups + row.signups }),
    { visits: 0, signups: 0 },
  );
  const searchAndAi = data.channels
    .filter(row => row.channel === 'organic' || row.channel === 'ai')
    .reduce((acc, row) => acc + row.visits, 0);
  const badgeVisits = data.badge.reduce((acc, row) => acc + row.visits, 0);

  return (
    <>
      {header}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={`Visitas (${range} días)`} value={total.visits} />
        <Stat
          label="Cuentas nuevas"
          value={total.signups}
          hint={`${fmtPercent(total.signups, total.visits)} de las visitas`}
        />
        <Stat
          label="Buscadores e IA"
          value={searchAndAi}
          hint={`${fmtPercent(searchAndAi, total.visits)} de las visitas`}
        />
        <Stat
          label="Por la insignia"
          value={badgeVisits}
          hint={`desde ${fmtNumber(data.badge.filter(row => row.site).length)} sitios`}
        />
      </section>

      <Card className="mb-6">
        <CardHeader
          title="Por canal"
          description={`Cada paso cuenta una vez por visita. «Exploró»: buscó, abrió una categoría o llegó a una ficha. Registros: cuentas creadas en el periodo según el canal de su visita; «Sin dato» son cuentas con DNT/GPC o anteriores al conteo${data.since ? ` (desde el ${fmtDate(data.since + 'T12:00:00Z')})` : ''}.`}
        />
        <Table className="rounded-none border-x-0 border-b-0 shadow-none" label="Visitas por canal">
          <THead>
            <TH>Canal</TH>
            <TH align="right">Visitas</TH>
            <TH align="right">Exploró</TH>
            <TH align="right">Ficha</TH>
            <TH align="right">/aplicar</TH>
            <TH align="right">Registros</TH>
            <TH align="right">De fundador</TH>
            <TH align="right">Visita → registro</TH>
          </THead>
          <TBody>
            {data.channels.length === 0 ? (
              <EmptyRow colSpan={8}>
                <p className="py-6 text-center text-[13px] text-muted">
                  Ninguna visita contada en este periodo.
                </p>
              </EmptyRow>
            ) : (
              data.channels.map(row => (
                <TR key={row.channel}>
                  <TD>
                    <Link
                      href={`/panel/embudos?canal=${row.channel}`}
                      className="font-medium hover:text-accent-fg"
                    >
                      {channelLabel(row.channel)}
                    </Link>
                  </TD>
                  <TD align="right">{fmtNumber(row.visits)}</TD>
                  <TD align="right">{fmtNumber(row.browse)}</TD>
                  <TD align="right">{fmtNumber(row.listing)}</TD>
                  <TD align="right">{fmtNumber(row.apply)}</TD>
                  <TD align="right">{fmtNumber(row.signups)}</TD>
                  <TD align="right">{fmtNumber(row.founderSignups)}</TD>
                  <TD align="right" className="text-muted">
                    {row.visits > 0 ? fmtPercent(row.signups, row.visits) : '—'}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title="Fuentes y campañas"
          description="utm_source, utm_medium y utm_campaign normalizados (o el buscador, la red o el sitio que enlazó). Las convenciones están en docs/attribution.md."
        />
        <Table
          className="rounded-none border-x-0 border-b-0 shadow-none"
          label="Visitas y registros por fuente y campaña"
        >
          <THead>
            <TH>Canal</TH>
            <TH>Fuente</TH>
            <TH>Medio</TH>
            <TH>Campaña</TH>
            <TH align="right">Visitas</TH>
            <TH align="right">Registros</TH>
          </THead>
          <TBody>
            {data.sources.length === 0 ? (
              <EmptyRow colSpan={6}>
                <p className="py-6 text-center text-[13px] text-muted">Sin datos todavía.</p>
              </EmptyRow>
            ) : (
              data.sources.map(row => (
                <TR key={`${row.channel}|${row.source}|${row.medium}|${row.campaign}`}>
                  <TD>
                    <Badge>{channelLabel(row.channel)}</Badge>
                  </TD>
                  <TD className="font-medium text-fg">{dash(row.source)}</TD>
                  <TD className="text-muted">{dash(row.medium)}</TD>
                  <TD className="text-muted">{dash(row.campaign)}</TD>
                  <TD align="right">{fmtNumber(row.visits)}</TD>
                  <TD align="right">{fmtNumber(row.signups)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <div className="mb-6 grid items-start gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Insignia (ref=badge)"
            description="Visitas que llegaron desde una insignia, por el sitio que la muestra. Solo el dominio que el navegador envía como origen, nunca la página."
          />
          <SitesTable
            rows={data.badge}
            label="Visitas por insignia y sitio"
            empty="Nadie ha llegado por una insignia todavía."
          />
        </Card>
        <Card>
          <CardHeader
            title="Otros sitios que enlazan"
            description="Visitas sin etiqueta desde sitios que no son buscadores, asistentes de IA, redes ni correo web."
          />
          <SitesTable
            rows={data.referrers}
            label="Visitas por sitio de origen"
            empty="Ningún otro sitio en este periodo."
          />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Dónde aterrizan buscadores e IA"
          description="Página de llegada de las visitas desde buscadores y asistentes de IA."
        />
        <CardBody>
          <BarList
            items={data.landings.map(row => ({
              label: `${channelLabel(row.channel)} · ${LANDING_LABEL[row.landing] ?? row.landing}`,
              value: row.visits,
            }))}
            emptyLabel="Ninguna visita desde buscadores o IA en este periodo."
          />
        </CardBody>
      </Card>
    </>
  );
}
