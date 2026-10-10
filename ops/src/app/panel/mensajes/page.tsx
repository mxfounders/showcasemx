import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, Inbox, Mail, RotateCcw, UserRound } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { INQUIRY_FILTERS, listInquiries } from '@/lib/data/inquiries';
import { INQUIRY_REASON, INQUIRY_URGENCY } from '@/lib/labels';
import { fmtDateTime } from '@/lib/format';
import { safeHref } from '@/lib/solution-fields';
import { choice, hrefWith, pageParam, param, type SearchParams } from '@/lib/url';
import { PageHeader } from '@/components/ui/PageHeader';
import { Segmented } from '@/components/ui/Tabs';
import { SearchField } from '@/components/ui/SearchField';
import { UrlSelect } from '@/components/ui/UrlSelect';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Avatar } from '@/components/ui/Avatar';
import { buttonClass } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { DescriptionList } from '@/components/ui/DescriptionList';
import { EmailStateBadge } from '@/components/domain/StatusBadge';
import { ActionButton } from '@/components/actions/ActionButton';
import { ExportButton } from '@/components/actions/ExportButton';
import { cn } from '@/components/ui/cn';

export const metadata: Metadata = { title: 'Mensajes' };

export default async function MensajesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOps();
  const params = await searchParams;
  const filter = choice(params, 'filtro', INQUIRY_FILTERS, 'pending');
  const page = pageParam(params);
  const data = await listInquiries({
    filter,
    q: param(params, 'q'),
    reason: param(params, 'motivo'),
    page,
  });
  const selectedId = param(params, 'id');
  const selected = data.items.find(item => item.id === selectedId) ?? data.items[0] ?? null;

  return (
    <>
      <PageHeader
        title="Mensajes"
        description="Lo que llega por el formulario de contacto de shwcs.site. Responde desde tu correo y márcalo como atendido."
        actions={<ExportButton kind="inquiries" />}
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          label="Estado"
          items={[
            {
              label: 'Pendientes',
              href: hrefWith('/panel/mensajes', params, { filtro: null, id: null }),
              active: filter === 'pending',
              count: data.counts.pending,
            },
            {
              label: 'Atendidos',
              href: hrefWith('/panel/mensajes', params, { filtro: 'handled', id: null }),
              active: filter === 'handled',
              count: data.counts.handled,
            },
            {
              label: 'Todos',
              href: hrefWith('/panel/mensajes', params, { filtro: 'all', id: null }),
              active: filter === 'all',
              count: data.counts.all,
            },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <UrlSelect
            name="motivo"
            label="Motivo"
            options={[
              { value: '', label: 'Todos los motivos' },
              ...Object.entries(INQUIRY_REASON).map(([value, label]) => ({ value, label })),
            ]}
          />
          <SearchField placeholder="Nombre, correo o texto…" className="sm:w-64" />
        </div>
      </div>

      {data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={filter === 'pending' ? CheckCircle2 : Inbox}
            title={filter === 'pending' ? 'Bandeja al día' : 'Sin mensajes'}
            description="Los mensajes del formulario de contacto aparecerán aquí."
          />
        </Card>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Card className="overflow-hidden">
            <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto">
              {data.items.map(item => {
                const urgency = INQUIRY_URGENCY[item.urgency];
                const active = selected?.id === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      href={hrefWith('/panel/mensajes', params, {
                        id: item.id,
                        page: page > 1 ? page : null,
                      })}
                      scroll={false}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'block px-4 py-3.5 transition',
                        active ? 'bg-accent-soft/60' : 'hover:bg-surface-2',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={cn(
                            'truncate text-[13.5px]',
                            item.handledAt ? 'font-medium text-fg-2' : 'font-semibold text-fg',
                          )}
                        >
                          {!item.handledAt && (
                            <span
                              aria-label="Sin atender"
                              className="mr-1.5 inline-block size-2 rounded-full bg-accent align-middle"
                            />
                          )}
                          {item.name}
                        </p>
                        <RelativeTime
                          value={item.createdAt}
                          className="shrink-0 text-[12px] text-muted"
                        />
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-muted">
                        {INQUIRY_REASON[item.reason] ?? item.reason} · {item.organization}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[12.5px] text-fg-2">{item.message}</p>
                      {urgency && urgency.tone !== 'neutral' && (
                        <Badge tone={urgency.tone} className="mt-2">
                          {urgency.label}
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>

          {selected && (
            <Card>
              <CardBody className="space-y-5 pt-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar name={selected.name} email={selected.email} size="lg" />
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold tracking-tight">{selected.name}</h2>
                      <p className="flex items-center gap-1 text-[13px] text-muted">
                        {selected.email}
                        <CopyButton value={selected.email} label="Copiar correo" />
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone="blue">
                          {INQUIRY_REASON[selected.reason] ?? selected.reason}
                        </Badge>
                        {INQUIRY_URGENCY[selected.urgency] && (
                          <Badge tone={INQUIRY_URGENCY[selected.urgency].tone}>
                            {INQUIRY_URGENCY[selected.urgency].label}
                          </Badge>
                        )}
                        {selected.handledAt ? (
                          <Badge tone="sage" icon={CheckCircle2}>
                            Atendido
                          </Badge>
                        ) : (
                          <Badge tone="amber">Pendiente</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent('Re: tu mensaje a shwcs')}`}
                      className={buttonClass('primary', 'sm')}
                    >
                      <Mail aria-hidden className="size-4" strokeWidth={1.9} />
                      Responder
                    </a>
                    {selected.handledAt ? (
                      <ActionButton
                        label="Reabrir"
                        icon={<RotateCcw />}
                        endpoint="/api/inquiries"
                        payload={{ id: selected.id, action: 'reopen' }}
                        success="Mensaje marcado como pendiente"
                      />
                    ) : (
                      <ActionButton
                        label="Marcar atendido"
                        icon={<CheckCircle2 />}
                        tone="success"
                        endpoint="/api/inquiries"
                        payload={{ id: selected.id }}
                        success="Mensaje atendido"
                      />
                    )}
                  </div>
                </div>
                <blockquote className="whitespace-pre-line rounded-2xl border border-line bg-surface-2 px-5 py-4 text-[14.5px] leading-relaxed text-fg">
                  {selected.message}
                </blockquote>
                <DescriptionList
                  columns={3}
                  items={[
                    { label: 'Empresa', value: selected.organization },
                    { label: 'Rol', value: selected.role },
                    {
                      label: 'Sitio',
                      value: safeHref(selected.website) ? (
                        <a
                          href={safeHref(selected.website) ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 text-accent-fg hover:underline"
                        >
                          {selected.website?.replace(/^https?:\/\//, '')}
                          <ExternalLink aria-hidden className="size-3" />
                        </a>
                      ) : null,
                    },
                    { label: 'Recibido', value: fmtDateTime(selected.createdAt) },
                    {
                      label: 'Aviso al equipo',
                      value: <EmailStateBadge state={selected.emailState} />,
                    },
                    {
                      label: 'Atendido',
                      value: selected.handledAt
                        ? `${fmtDateTime(selected.handledAt)} · ${selected.handledByEmail ?? 'ops'}`
                        : null,
                    },
                  ]}
                />
                {selected.accountId && (
                  <Link
                    href={`/panel/cuentas/${selected.accountId}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-fg hover:underline"
                  >
                    <UserRound aria-hidden className="size-4" /> Tiene cuenta en shwcs: ver cuenta
                  </Link>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      )}
      <Pagination
        page={page}
        hasMore={data.hasMore}
        hrefFor={target => hrefWith('/panel/mensajes', params, { page: target, id: null })}
      />
    </>
  );
}
