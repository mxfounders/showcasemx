import type { Metadata } from 'next';
import Link from 'next/link';
import { Handshake, Lock } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { CONTACT_STATUSES, listContacts } from '@/lib/data/contacts';
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
import { ExportButton } from '@/components/actions/ExportButton';
import { ContactTimeline } from './ContactTimeline';

export const metadata: Metadata = { title: 'Contactos' };

export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const status = choice(params, 'estado', CONTACT_STATUSES, 'all');
  const page = pageParam(params);
  const data = await listContacts({ status, q: param(params, 'q'), page });
  const total = data.statusCounts.all ?? 0;
  const answered = (data.statusCounts.conversation ?? 0) + (data.statusCounts.closed ?? 0);

  return (
    <>
      <PageHeader
        title="Contactos"
        description="Solicitudes de compradores a fundadores. Ops ve quién, a qué proyecto, en qué estado y cuándo; nunca qué escribieron."
        meta={
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
            <Lock aria-hidden className="size-3.5" /> Frontera de privacidad: sin detalles ni
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
              <EmptyState compact icon={Handshake} title="Sin solicitudes en este filtro" />
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
