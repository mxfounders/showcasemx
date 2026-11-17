import Link from 'next/link';
import type { ReactNode } from 'react';
import { northStar } from '@/lib/data/north';
import { delta, fmtSpan, rate } from '@/lib/north';
import { fmtDate, fmtMoney, fmtNumber } from '@/lib/format';
import { Card, CardHeader } from '@/components/ui/Card';
import { cn } from '@/components/ui/cn';

const TONE = {
  sage: 'bg-sage-soft text-sage',
  terracotta: 'bg-terracotta-soft text-terracotta',
  neutral: 'bg-surface-3 text-muted',
} as const;

function Change({
  current,
  previous,
  better = 'up',
  format = fmtNumber,
  against,
}: {
  current: number | null;
  previous: number | null;
  better?: 'up' | 'down';
  format?: (value: number) => string;
  against: string;
}) {
  const d = delta(current, previous, better);
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
      <span className={cn('num rounded-full px-1.5 py-0.5 font-medium', TONE[d.tone])}>
        {d.arrow}{' '}
        {d.change === null
          ? 'sin comparación'
          : d.change === 0
            ? 'igual'
            : format(Math.abs(d.change))}
      </span>
      <span>
        {against}: {previous === null ? '—' : format(previous)}
      </span>
    </p>
  );
}

function Tile({
  index,
  label,
  value,
  unit,
  change,
  detail,
  definition,
  href,
}: {
  index: number;
  label: string;
  value: string;
  unit?: string;
  change?: ReactNode;
  detail?: ReactNode;
  definition: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="flex items-baseline gap-2 text-[13px] font-medium text-muted">
        <span className="num text-[11.5px] text-subtle">{index}</span>
        {label}
      </p>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em] text-fg">
        <span className="num">{value}</span>
        {unit && <span className="ml-1.5 text-[13px] font-medium text-muted">{unit}</span>}
      </p>
      {change}
      {detail && <p className="mt-1.5 text-[12.5px] text-fg-2">{detail}</p>}
      <p className="mt-2 text-[11.5px] leading-relaxed text-subtle">{definition}</p>
    </>
  );
  const className =
    'flex flex-col rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong';
  return href ? (
    <Link href={href} className={cn(className, 'group')}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * The north-star metrics (docs/strategy.md) and the business ones, on the first screen
 * of ops (SHCWS-110). Every number comes from the database; what the database cannot
 * know says so instead of showing a zero.
 */
export async function NorthStarMetrics() {
  const m = await northStar();
  const p = m.periods;
  const lastMonth = `mismo tramo de ${new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: 'America/Mexico_City' }).format(p.prevStart)}`;
  const monthStart = `al 1 de ${new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: 'America/Mexico_City' }).format(p.curStart)}`;
  const rateCur = rate(m.contacts.receivedAnsweredCur, m.contacts.receivedCur);
  const ratePrev = rate(m.contacts.receivedAnsweredPrev, m.contacts.receivedPrev);
  const pct = (value: number) => `${value} pts`;

  return (
    <Card className="mt-6">
      <CardHeader
        title="Métricas norte"
        description={`Del 1 de ${new Intl.DateTimeFormat('es-MX', { month: 'long', timeZone: 'America/Mexico_City' }).format(p.curStart)} a hoy, contra el mismo tramo del mes anterior (hora del centro de México).`}
      />
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          index={1}
          label="Solicitudes respondidas"
          value={fmtNumber(m.contacts.answeredCur)}
          change={
            <Change
              current={m.contacts.answeredCur}
              previous={m.contacts.answeredPrev}
              against={lastMonth}
            />
          }
          detail={`Briefs atendidos: ${fmtNumber(m.briefs.handledCur)} (de ${fmtNumber(m.briefs.receivedCur)} recibidos; antes ${fmtNumber(m.briefs.handledPrev)})`}
          definition="Solicitudes cuya primera respuesta del fundador llegó en el periodo. Brief: «Cuéntanos qué necesitas» atendido en Mensajes."
          href="/panel/contactos"
        />
        <Tile
          index={2}
          label="Fichas con ≥3 reseñas verificadas"
          value={fmtNumber(m.reviews.listingsNow)}
          change={
            <Change
              current={m.reviews.listingsNow}
              previous={m.reviews.listingsThen}
              against={monthStart}
            />
          }
          definition="Publicadas, con 3 o más reseñas públicas de cuentas con correo verificado que no son de su dueño. El valor al 1 del mes se reconstruye por fechas y no ve retiros posteriores."
          href="/panel/comunidad?vista=resenas"
        />
        <Tile
          index={3}
          label="Respuesta de fundadores"
          value={rateCur === null ? '—' : `${rateCur} %`}
          unit={
            m.contacts.medianCur === null ? undefined : `mediana ${fmtSpan(m.contacts.medianCur)}`
          }
          change={<Change current={rateCur} previous={ratePrev} format={pct} against={lastMonth} />}
          detail={`Mediana antes: ${fmtSpan(m.contacts.medianPrev)} · ${fmtNumber(m.contacts.receivedAnsweredCur)} de ${fmtNumber(m.contacts.receivedCur)} respondidas`}
          definition="De las solicitudes recibidas en el periodo, cuántas ya tienen respuesta y cuánto tardó la primera. Las de los últimos días todavía pueden responderse."
          href="/panel/contactos"
        />
        <Tile
          index={4}
          label="Fundadores que vuelven"
          value={fmtNumber(m.founders.returningCur)}
          unit={`de ${fmtNumber(m.founders.founders)}`}
          change={
            <Change
              current={m.founders.returningCur}
              previous={m.founders.returningPrev}
              against="las 4 semanas anteriores"
            />
          }
          detail={`${fmtNumber(m.founders.everyWeekCur)} activos las 4 semanas · ${fmtNumber(m.founders.activeCur)} al menos una`}
          definition="Dueños de una ficha activos en 2 o más de las últimas 4 semanas. Señales con fecha: inicios de sesión, último uso de cada sesión, respuestas, envíos a revisión y avisos leídos. Subestima: una sesión solo guarda su último uso."
        />
        <Tile
          index={5}
          label="Visitas desde buscadores e IA"
          value="Sin fuente"
          definition="La base guarda vistas y clics por ficha y día, sin su origen. El origen solo lo ve PostHog (con consentimiento) y ops no tiene acceso a PostHog. Falta decidir cómo medirlo."
        />
        <Tile
          index={6}
          label="Fichas publicadas"
          value={fmtNumber(m.listings.publishedNow)}
          change={
            <Change
              current={m.listings.publishedNow}
              previous={m.listings.publishedThen}
              against={monthStart}
            />
          }
          detail={`${fmtNumber(m.listings.pendingNow)} en revisión · ${fmtNumber(m.listings.submittedCur)} enviadas (antes ${fmtNumber(m.listings.submittedPrev)}) · revisión: mediana ${fmtSpan(m.listings.reviewCur)} (antes ${fmtSpan(m.listings.reviewPrev)})`}
          definition="Tiempo de revisión: desde el último envío hasta la decisión (publicar, pedir cambios o rechazar), para las decisiones del periodo."
          href="/panel/postulaciones"
        />
        <div className="sm:col-span-2">
          {m.ads === null ? (
            <Tile
              index={7}
              label="Anuncios"
              value="—"
              definition="Esta base todavía no tiene db/ad-campaigns.sql."
            />
          ) : m.ads.length === 0 ? (
            <Tile
              index={7}
              label="Ingresos de anuncios"
              value={fmtMoney(0, 'usd')}
              detail="Ninguna reserva pagada todavía."
              definition="Cobrado en el periodo menos lo reembolsado de esas reservas. Reservas futuras: pagadas que empiezan después de hoy."
              href="/panel/anuncios"
            />
          ) : (
            <Tile
              index={7}
              label="Ingresos de anuncios"
              value={m.ads.map(a => fmtMoney(a.netCur, a.currency)).join(' · ')}
              change={m.ads.map(a => (
                <Change
                  key={a.currency}
                  current={a.netCur}
                  previous={a.netPrev}
                  format={value => fmtMoney(value, a.currency)}
                  against={lastMonth}
                />
              ))}
              detail={`Reservas futuras: ${m.ads
                .map(
                  a =>
                    `${fmtNumber(a.futureNow)} por ${fmtMoney(a.futureAmountNow, a.currency)} (hace un mes: ${fmtNumber(a.futureThen)})`,
                )
                .join(' · ')}`}
              definition={`Cobrado en el periodo menos lo reembolsado de esas reservas, impuestos incluidos, por moneda. Reservas futuras: pagadas que empiezan después de hoy (${fmtDate(p.today + 'T12:00:00Z')}).`}
              href="/panel/anuncios"
            />
          )}
        </div>
      </div>
    </Card>
  );
}
