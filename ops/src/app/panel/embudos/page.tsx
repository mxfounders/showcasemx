import type { Metadata } from 'next';
import { requireOps } from '@/lib/auth';
import { funnels, type FunnelWeek } from '@/lib/data/funnels';
import {
  BUYER_STEPS,
  CHANNEL_KEYS,
  FOUNDER_STEPS,
  channelLabel,
  conversions,
  emptyCounts,
  readChannel,
} from '@/lib/funnels';
import { fmtDate, fmtNumber } from '@/lib/format';
import { choice, hrefWith, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { UrlSelect } from '@/components/ui/UrlSelect';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';

export const metadata: Metadata = { title: 'Embudos' };

const WEEK_RANGES = ['8', '12'] as const;

type Step = { key: string; label: string; unit: 'visits' | 'accounts' };

function Rate({ rate }: { rate: number | null }) {
  return <span className="text-muted">{rate === null ? '—' : `${rate} %`}</span>;
}

/** The whole window as one funnel: each step's count and its conversion from the last. */
function FunnelBars({ steps, counts }: { steps: readonly Step[]; counts: Record<string, number> }) {
  const rows = conversions(steps, counts);
  const top = Math.max(...rows.map(row => row.value), 1);
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const row = rows[index];
        const crosses = index > 0 && steps[index - 1].unit !== step.unit;
        return (
          <li key={step.key}>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-fg-2">
                {step.label}
                <span className="ml-2 text-[11.5px] text-subtle">
                  {step.unit === 'visits' ? 'visitas' : 'cuentas'}
                </span>
              </span>
              <span className="num shrink-0">
                <span className="font-semibold text-fg">{fmtNumber(row.value)}</span>
                {index > 0 && (
                  <>
                    {' · '}
                    <Rate rate={row.rate} />
                    {crosses && <span className="text-subtle"> *</span>}
                  </>
                )}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-surface-3">
              <div
                className={
                  step.unit === 'visits'
                    ? 'h-full rounded-full bg-series-2'
                    : 'h-full rounded-full bg-series-1'
                }
                style={{ width: `${row.value > 0 ? Math.max(2, (row.value / top) * 100) : 0}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function WeeksTable({
  steps,
  rows,
  pick,
  label,
}: {
  steps: readonly Step[];
  rows: FunnelWeek[];
  pick: (row: FunnelWeek) => Record<string, number>;
  label: string;
}) {
  return (
    <Table className="rounded-none border-x-0 border-b-0 shadow-none" label={label}>
      <THead>
        <TH>Semana</TH>
        {steps.map(step => (
          <TH key={step.key} align="right">
            {step.label}
          </TH>
        ))}
      </THead>
      <TBody>
        {[...rows].reverse().map(row => {
          const counts = conversions(steps, pick(row) as Record<string, number>);
          return (
            <TR key={row.week}>
              <TD className="whitespace-nowrap text-[13px] text-fg-2">
                {fmtDate(row.week + 'T12:00:00Z')}
              </TD>
              {counts.map((cell, index) => (
                <TD key={cell.key} align="right" className="whitespace-nowrap">
                  <span className="num font-medium text-fg">{fmtNumber(cell.value)}</span>
                  {index > 0 && (
                    <span className="num ml-1.5 text-[12px]">
                      <Rate rate={cell.rate} />
                    </span>
                  )}
                </TD>
              ))}
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

export default async function EmbudosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const channel = readChannel(param(params, 'canal'));
  const weeks = choice(params, 'semanas', WEEK_RANGES, '8');
  const data = await funnels(channel, Number(weeks));

  const header = (
    <PageHeader
      title="Embudos"
      description="Dónde se cae la gente, del comprador y del fundador, por semana (lunes a domingo, hora del centro de México). Los pasos de visitas son conteos agregados por visita, sin identificar a nadie; los de cuentas siguen a las cuentas creadas esa semana hasta hoy."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <UrlSelect
            name="canal"
            label="Canal"
            options={[
              { value: '', label: 'Todos los canales' },
              ...CHANNEL_KEYS.map(key => ({ value: key, label: channelLabel(key) })),
            ]}
          />
          <Segmented
            label="Semanas"
            items={WEEK_RANGES.map(key => ({
              label: `${key} semanas`,
              href: hrefWith('/panel/embudos', params, { semanas: key === '8' ? null : key }),
              active: weeks === key,
            }))}
          />
        </div>
      }
    />
  );
  if (!data.available)
    return (
      <>
        {header}
        <EmptyState
          title="Aún no hay registro de visitas"
          description="Falta aplicar db/traffic-attribution.sql en esta base."
        />
      </>
    );

  const buyer = emptyCounts(BUYER_STEPS);
  const founder = emptyCounts(FOUNDER_STEPS);
  for (const row of data.rows) {
    for (const step of BUYER_STEPS) buyer[step.key] += row.buyer[step.key];
    for (const step of FOUNDER_STEPS) founder[step.key] += row.founder[step.key];
  }
  const scope = channel ? `Canal: ${channelLabel(channel)}.` : 'Todos los canales.';

  return (
    <>
      {header}
      {channel === 'unknown' && (
        <p className="mb-4 text-[13px] text-muted">
          «Sin dato» solo existe para cuentas (DNT/GPC o creadas antes del conteo): los pasos de
          visitas salen en cero.
        </p>
      )}
      <Card className="mb-6">
        <CardHeader
          title="Comprador"
          description={`${scope} Visita → explora (búsqueda, categoría o ficha) → ficha → registro → guarda → solicitud o brief → respuesta. Una cuenta cuenta en cada paso hasta el más lejano al que llegó: quien escribió sin guardar ya pasó por «guardar». «Comprador»: cuentas que no vinieron a publicar o que eligieron comprador, ambos o explorador.`}
        />
        <CardBody>
          <FunnelBars steps={BUYER_STEPS} counts={buyer} />
          <p className="mt-4 text-[12px] text-muted">
            * Visitas y cuentas son unidades distintas: la conversión de ficha a registro compara
            conteos de la misma semana, no a las mismas personas. Solicitud incluye «Cuéntanos qué
            necesitas»{data.briefs ? ' y briefs publicados' : ''}; respuesta, la primera del
            fundador{data.briefs ? ', una propuesta o una lista corta del equipo' : ''} o el mensaje
            atendido.
          </p>
        </CardBody>
        <WeeksTable
          steps={BUYER_STEPS}
          rows={data.rows}
          pick={row => row.buyer}
          label="Embudo del comprador por semana"
        />
      </Card>
      <Card>
        <CardHeader
          title="Fundador"
          description={`${scope} Visita a /aplicar → registro → onboarding → borrador → enviado → publicado → primera solicitud → primera respuesta. «Fundador»: cuentas cuya visita pasó por /aplicar o cuyo registro lleva a publicar, que eligieron fundador o ambos, o que tienen una ficha.`}
        />
        <CardBody>
          <FunnelBars steps={FOUNDER_STEPS} counts={founder} />
          <p className="mt-4 text-[12px] text-muted">
            * Muchas cuentas de fundador no pasan por /aplicar (llegan desde el inicio o la cuenta),
            así que esa conversión puede pasar del 100 %.
          </p>
        </CardBody>
        <WeeksTable
          steps={FOUNDER_STEPS}
          rows={data.rows}
          pick={row => row.founder}
          label="Embudo del fundador por semana"
        />
      </Card>
    </>
  );
}
