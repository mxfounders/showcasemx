import type { Metadata } from 'next';
import Link from 'next/link';
import { HandshakeIcon, LockIcon } from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import {
  CONTACT_STATUSES,
  OUTCOME_VALUES,
  awaitingReply,
  contactOutcomeTotals,
  listContacts,
  type ReplyStage,
} from '@/lib/data/contacts';
import { CONTACT_STATUS } from '@/lib/labels';
import { fmtNumber, fmtPercent } from '@/lib/format';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { AreaChart } from '@/components/charts/AreaChart';
import { ContactStatusBadge } from '@/components/domain/StatusBadge';
import { Badge, type Tone } from '@/components/ui/Badge';
import { ExportButton } from '@/components/actions/ExportButton';
import { ContactTimeline } from './ContactTimeline';

export const metadata: Metadata = { title: 'Contactos' };

const OUTCOME_VALUE_LABEL: Record<(typeof OUTCOME_VALUES)[number], string> = {
  under_1k: 'Menos de 1,000',
  '1k_5k': '1,000–5,000',
  '5k_25k': '5,000–25,000',
  '25k_100k': '25,000–100,000',
  over_100k: 'Más de 100,000',
};

// Where an unanswered request is in the reminder pass (SHCWS-61, docs/contacts.md).
const REPLY_STAGE: Record<ReplyStage, { label: string; tone: Tone }> = {
  waiting: { label: 'Más de 48 h', tone: 'neutral' },
  reminded48h: { label: 'Recordatorio 48 h', tone: 'amber' },
  reminded5d: { label: 'Recordatorio 5 días', tone: 'amber' },
  unanswered: { label: 'Sin respuesta', tone: 'terracotta' },
};

export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const status = choice(params, 'estado', CONTACT_STATUSES, 'all');
  const page = pageParam(params);
  const [data, outcomes, awaiting] = await Promise.all([
    listContacts({ status, q: param(params, 'q'), page }),
    contactOutcomeTotals(),
    awaitingReply(),
  ]);
  const total = data.statusCounts.all ?? 0;
  const answered = (data.statusCounts.conversation ?? 0) + (data.statusCounts.closed ?? 0);

  return (
    <>
      <PageHeader
        title="Contactos"
        description="Solicitudes de compradores a fundadores. Ops ve quién, a qué proyecto, en qué estado y cuándo; nunca qué escribieron."
        meta={
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
            <LockIcon aria-hidden className="size-3.5" /> Frontera de privacidad: sin detalles ni
            mensajes
          </span>
        }
        actions={<ExportButton kind="contacts" />}
      />
      <div className="mb-6 grid items-start gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Solicitudes por día" description="Últimos 30 días (UTC)." />
          <CardBody>
            <AreaChart
              title="Solicitudes de contacto por día"
              series={[{ key: 'requests', label: 'Solicitudes', color: 'series-1' }]}
              data={data.series}
              height={200}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Respuesta de fundadores" description="Del total histórico." />
          <CardBody className="space-y-3">
            <p className="text-[34px] font-semibold leading-none tracking-tight">
              {fmtPercent(answered, total)}
            </p>
            <p className="text-[13px] text-muted">
              {fmtNumber(answered)} de {fmtNumber(total)} solicitudes recibieron respuesta (en
              conversación o cerradas).
            </p>
            <ul className="space-y-1.5 pt-2 text-[13px]">
              {(['new', 'conversation', 'closed', 'withdrawn'] as const).map(key => (
                <li key={key} className="flex items-center justify-between">
                  <ContactStatusBadge status={key} />
                  <span className="num font-medium">{fmtNumber(data.statusCounts[key] ?? 0)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
      <Card className="mb-6">
        <CardHeader
          title="Resultados declarados por fundadores"
          description="Totales de oportunidades cerradas según lo que registra cada fundador. Ops nunca ve el resultado de una solicitud concreta y shwcs no verifica ventas."
        />
        <CardBody>
          {outcomes ? (
            <div className="grid gap-6 md:grid-cols-2">
              <ul className="space-y-1.5 text-[13px]">
                {(
                  [
                    ['Ganadas: se volvieron clientes', outcomes.won],
                    ['Perdidas', outcomes.lost],
                    ['No eran para el proyecto', outcomes.notFit],
                    ['Cerradas sin resultado', outcomes.unrecorded],
                  ] as const
                ).map(([label, value]) => (
                  <li key={label} className="flex items-center justify-between">
                    <span>{label}</span>
                    <span className="num font-medium">{fmtNumber(value)}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1.5 text-[13px]">
                <li className="text-muted">Valor aproximado de las ganadas (USD)</li>
                {OUTCOME_VALUES.map(key => (
                  <li key={key} className="flex items-center justify-between">
                    <span>{OUTCOME_VALUE_LABEL[key]}</span>
                    <span className="num font-medium">{fmtNumber(outcomes.values[key])}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              Sin datos: falta aplicar db/contact-outcomes.sql en esta base.
            </p>
          )}
        </CardBody>
      </Card>
      <Card className="mb-6">
        <CardHeader
          title="Sin respuesta del fundador"
          description="Solicitudes abiertas que el fundador no ha respondido en más de 48 h y las marcadas «sin respuesta» a los 7 días, la espera más larga primero. Recordatorios a las 48 h y a los 5 días; a los 7, el comprador recibe alternativas y la solicitud cuenta en la señal de respuesta. Solo metadatos."
        />
        <CardBody className="space-y-4">
          {awaiting ? (
            <>
              <ul className="flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
                <li>
                  <span className="num font-semibold">{fmtNumber(awaiting.totals.ignored)}</span>{' '}
                  <span className="text-muted">sin respuesta ahora</span>
                </li>
                <li>
                  <span className="num font-semibold">{fmtNumber(awaiting.totals.marked30d)}</span>{' '}
                  <span className="text-muted">marcadas en 30 días</span>
                </li>
                <li>
                  <span className="num font-semibold">
                    {fmtNumber(awaiting.totals.answeredLate)}
                  </span>{' '}
                  <span className="text-muted">respondidas después de marcarse</span>
                </li>
              </ul>
              <Table label="Solicitudes sin respuesta">
                <THead>
                  <TH>Proyecto</TH>
                  <TH>Fundador</TH>
                  <TH>Estado</TH>
                  <TH>Etapa</TH>
                  <TH align="right">Días sin respuesta</TH>
                  <TH>Creada</TH>
                  <TH />
                </THead>
                <TBody>
                  {awaiting.items.length === 0 ? (
                    <EmptyRow colSpan={7}>
                      <EmptyState
                        compact
                        icon={HandshakeIcon}
                        title="Ninguna solicitud espera respuesta"
                      />
                    </EmptyRow>
                  ) : (
                    awaiting.items.map(item => (
                      <TR key={item.id}>
                        <TD>
                          <Link
                            href={`/panel/postulaciones/${item.solutionId}`}
                            className="font-medium hover:text-accent-fg"
                          >
                            {item.projectName}
                          </Link>
                        </TD>
                        <TD className="max-w-[220px] truncate text-[13px]">
                          {item.recipientId ? (
                            <Link
                              href={`/panel/cuentas/${item.recipientId}`}
                              className="text-fg-2 hover:text-accent-fg"
                            >
                              {item.recipientEmail}
                            </Link>
                          ) : (
                            <span className="text-muted">eliminado</span>
                          )}
                        </TD>
                        <TD>
                          <ContactStatusBadge status={item.status} />
                        </TD>
                        <TD>
                          <Badge tone={REPLY_STAGE[item.stage].tone}>
                            {REPLY_STAGE[item.stage].label}
                          </Badge>
                        </TD>
                        <TD align="right">{fmtNumber(item.days)}</TD>
                        <TD className="whitespace-nowrap text-[13px] text-muted">
                          <RelativeTime value={item.createdAt} />
                        </TD>
                        <TD>
                          <ContactTimeline id={item.id} project={item.projectName} />
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
              {awaiting.total > awaiting.items.length && (
                <p className="text-[12.5px] text-muted">
                  Se muestran las {fmtNumber(awaiting.items.length)} con más espera de{' '}
                  {fmtNumber(awaiting.total)}.
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-muted">
              Sin datos: falta aplicar db/contact-reminders.sql en esta base.
            </p>
          )}
        </CardBody>
      </Card>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Estado"
          items={CONTACT_STATUSES.map(key => ({
            label: key === 'all' ? 'Todas' : CONTACT_STATUS[key].label,
            href: hrefWith('/panel/contactos', params, { estado: key === 'all' ? null : key }),
            active: status === key,
            count: data.statusCounts[key] ?? 0,
          }))}
        />
        <SearchField placeholder="Proyecto o correo…" className="lg:w-72" />
      </div>
      <Table label="Solicitudes de contacto">
        <THead>
          <TH>Proyecto</TH>
          <TH>Comprador</TH>
          <TH>Destinatario</TH>
          <TH>Estado</TH>
          <TH align="right">Cambios</TH>
          <TH>Última actividad</TH>
          <TH>Creada</TH>
          <TH />
        </THead>
        <TBody>
          {data.items.length === 0 ? (
            <EmptyRow colSpan={8}>
              <EmptyState compact icon={HandshakeIcon} title="Sin solicitudes en este filtro" />
            </EmptyRow>
          ) : (
            data.items.map(item => (
              <TR key={item.id}>
                <TD>
                  <Link
                    href={`/panel/postulaciones/${item.solutionId}`}
                    className="font-medium hover:text-accent-fg"
                  >
                    {item.projectName}
                  </Link>
                </TD>
                <TD className="max-w-[220px] truncate text-[13px]">
                  {item.buyerId ? (
                    <Link
                      href={`/panel/cuentas/${item.buyerId}`}
                      className="text-fg-2 hover:text-accent-fg"
                    >
                      {item.buyerEmail}
                    </Link>
                  ) : (
                    <span className="text-muted">eliminado</span>
                  )}
                </TD>
                <TD className="max-w-[220px] truncate text-[13px]">
                  {item.recipientId ? (
                    <Link
                      href={`/panel/cuentas/${item.recipientId}`}
                      className="text-fg-2 hover:text-accent-fg"
                    >
                      {item.recipientEmail}
                    </Link>
                  ) : (
                    <span className="text-muted">eliminado</span>
                  )}
                </TD>
                <TD>
                  <ContactStatusBadge status={item.status} />
                </TD>
                <TD align="right">{item.eventCount}</TD>
                <TD className="whitespace-nowrap text-[13px] text-muted">
                  <RelativeTime value={item.lastEventAt ?? item.updatedAt} />
                </TD>
                <TD className="whitespace-nowrap text-[13px] text-muted">
                  <RelativeTime value={item.createdAt} />
                </TD>
                <TD>
                  <ContactTimeline id={item.id} project={item.projectName} />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
      <Pagination
        page={page}
        hasMore={data.hasMore}
        total={data.total}
        pageSize={data.pageSize}
        hrefFor={target => hrefWith('/panel/contactos', params, { page: target })}
      />
    </>
  );
}
