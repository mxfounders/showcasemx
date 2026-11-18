import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  CloseCircleIcon,
  CursorClickIcon,
  ExternalLinkIcon,
  MailCheckIcon,
  MailIcon,
  RefreshIcon,
} from '@/components/icons/gota';
import { requireOps } from '@/lib/auth';
import { isUuid } from '@/lib/http';
import { campaignDetail } from '@/lib/data/newsletter';
import { CAMPAIGN_STATUS, problemLabel, productPreview } from '@/lib/newsletter';
import { PROFILE, ROLE } from '@/lib/labels';
import { fmtDateTime, fmtNumber } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Field';
import { Stat } from '@/components/ui/Stat';
import { DescriptionList } from '@/components/ui/DescriptionList';
import { ButtonLink } from '@/components/ui/Button';
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from '@/components/ui/Table';
import { ActionButton } from '@/components/actions/ActionButton';
import { CampaignEditor, TestSend } from './CampaignEditor';

export const metadata: Metadata = { title: 'Campaña del newsletter' };

function segmentText(segment: { profiles: string[]; roles: string[] }) {
  const parts = [
    segment.profiles.length
      ? `Perfil: ${segment.profiles.map(p => PROFILE[p] ?? p).join(', ')}`
      : null,
    segment.roles.length ? `Rol: ${segment.roles.map(r => ROLE[r] ?? r).join(', ')}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Todas las suscripciones confirmadas';
}

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOps();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const campaign = await campaignDetail(id);
  if (!campaign) notFound();
  const admin = user.level === 'admin';
  const draft = campaign.status === 'draft';
  const status = CAMPAIGN_STATUS[campaign.status] ?? CAMPAIGN_STATUS.draft;
  const tested = campaign.testedVersion === campaign.version;
  const preview = draft ? await productPreview(id, 'es') : null;
  const audience = preview?.ok ? preview.preview.audience : undefined;
  const problems = preview?.ok ? preview.preview.problems : [];
  const text = preview?.ok ? preview.preview.message?.text : undefined;
  const pending = (campaign.states.pending ?? 0) + (campaign.states.sending ?? 0);

  return (
    <>
      <PageHeader
        back={{ href: '/panel/newsletter/campanas', label: 'Campañas' }}
        title={campaign.content.es.subject || 'Campaña sin asunto'}
        description={
          campaign.kind === 'new_this_week'
            ? `Borrador semanal de «Nuevo esta semana» (semana del ${campaign.week}), preparado con las fichas aprobadas en los últimos siete días. Revísalo: nada sale sin una persona.`
            : 'Campaña escrita en ops.'
        }
        meta={
          <>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            <Badge>Versión {campaign.version}</Badge>
            {draft &&
              (tested ? (
                <Badge tone="sage">Probada esta versión</Badge>
              ) : (
                <Badge tone="amber">
                  {campaign.testedVersion
                    ? `La última prueba fue de la versión ${campaign.testedVersion}`
                    : 'Sin prueba'}
                </Badge>
              ))}
          </>
        }
        actions={
          admin ? (
            <div className="flex flex-wrap gap-2">
              {campaign.kind === 'new_this_week' && draft && (
                <ActionButton
                  label="Actualizar fichas"
                  icon={<RefreshIcon />}
                  endpoint="/api/newsletter/campaigns"
                  payload={{ action: 'refresh', id, version: campaign.version }}
                  success="Fichas actualizadas"
                  confirm={{
                    title: 'Actualizar las fichas del borrador',
                    description:
                      'Vuelve a leer las fichas aprobadas en los últimos siete días y reemplaza el texto del borrador por el de la plantilla. Se pierde lo que hayas editado y hará falta otra prueba.',
                    field: null,
                    confirmLabel: 'Actualizar',
                  }}
                />
              )}
              {['queued', 'sending'].includes(campaign.status) && (
                <ActionButton
                  label="Continuar envío"
                  icon={<RefreshIcon />}
                  endpoint="/api/newsletter/campaigns"
                  payload={{ action: 'resume', id }}
                  success="Envío retomado"
                />
              )}
              {['draft', 'queued', 'sending'].includes(campaign.status) && (
                <ActionButton
                  label="Cancelar"
                  icon={<CloseCircleIcon />}
                  tone="danger"
                  endpoint="/api/newsletter/campaigns"
                  payload={{ action: 'cancel', id }}
                  success="Campaña cancelada"
                  confirm={{
                    title: 'Cancelar la campaña',
                    description:
                      'Deja de enviarla. Lo que ya salió no se puede recuperar. Pide modo seguro.',
                    destructive: true,
                    confirmLabel: 'Cancelar campaña',
                  }}
                />
              )}
            </div>
          ) : undefined
        }
      />

      {draft ? (
        <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card>
            <CardHeader
              title="Contenido y segmento"
              description="Cada vez que guardas nace una versión nueva."
            />
            <CardBody>
              {admin ? (
                <CampaignEditor
                  id={id}
                  version={campaign.version}
                  content={campaign.content}
                  segment={campaign.segment}
                />
              ) : (
                <p className="text-[13px] text-muted">Solo un administrador edita campañas.</p>
              )}
            </CardBody>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="1 · Vista previa"
                description="Como la renderiza el producto, marcada como prueba."
              />
              <CardBody className="space-y-4">
                {preview && !preview.ok && <Alert>{preview.error}</Alert>}
                {problems.length > 0 && (
                  <Alert tone="amber" title="Antes de probar">
                    <ul className="list-disc pl-4">
                      {problems.map(code => (
                        <li key={code}>{problemLabel(code)}</li>
                      ))}
                    </ul>
                  </Alert>
                )}
                {audience && (
                  <DescriptionList
                    columns={1}
                    items={[
                      { label: 'Segmento', value: segmentText(campaign.segment) },
                      {
                        label: 'Llegaría a',
                        value: `${fmtNumber(audience.confirmed)} confirmadas (${fmtNumber(audience.english)} en inglés)`,
                      },
                      ...(audience.sendable !== audience.confirmed
                        ? [
                            {
                              label: 'En este entorno',
                              value: `Fuera de producción solo se escribe a direcciones @resend.dev: ${fmtNumber(audience.sendable)}.`,
                            },
                          ]
                        : []),
                    ]}
                  />
                )}
                <div className="flex flex-wrap gap-2">
                  <ButtonLink
                    href={`/api/newsletter/campaigns/${id}/preview?locale=es`}
                    external
                    icon={<ExternalLinkIcon />}
                  >
                    Abrir en español
                  </ButtonLink>
                  {campaign.content.en && (
                    <ButtonLink
                      href={`/api/newsletter/campaigns/${id}/preview?locale=en`}
                      external
                      icon={<ExternalLinkIcon />}
                    >
                      Abrir en inglés
                    </ButtonLink>
                  )}
                </div>
                {text && (
                  <details>
                    <summary className="cursor-pointer text-[13px] font-medium text-fg-2">
                      Versión de texto
                    </summary>
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-mono text-[12px] text-fg-2">
                      {text}
                    </pre>
                  </details>
                )}
              </CardBody>
            </Card>
            {admin && (
              <Card>
                <CardHeader
                  title="2 · Prueba"
                  description="Obligatoria: se envía exactamente la versión que llegó a la prueba. Sus clics no se cuentan."
                />
                <CardBody>
                  <TestSend id={id} version={campaign.version} defaultTo={user.email} />
                  {campaign.testedAt && (
                    <p className="mt-3 text-[12.5px] text-muted">
                      Última prueba: versión {campaign.testedVersion},{' '}
                      {fmtDateTime(campaign.testedAt)}
                      {campaign.people.testedBy ? ` por ${campaign.people.testedBy}` : ''}.
                    </p>
                  )}
                </CardBody>
              </Card>
            )}
            {admin && (
              <Card>
                <CardHeader
                  title="3 · Enviar"
                  description="Pide modo seguro y un motivo. Se envía a las suscripciones confirmadas del segmento en el momento en que empieza."
                />
                <CardBody>
                  <ActionButton
                    label={`Enviar la versión ${campaign.version}`}
                    icon={<MailIcon />}
                    tone="solid"
                    disabled={!tested || problems.length > 0}
                    endpoint="/api/newsletter/campaigns"
                    payload={{ action: 'send', id, version: campaign.version }}
                    success="Campaña en cola"
                    confirm={{
                      title: 'Enviar la campaña',
                      description: audience
                        ? `Saldrá a ${fmtNumber(audience.sendable)} ${audience.sendable === 1 ? 'dirección' : 'direcciones'} (${segmentText(campaign.segment)}). No se puede deshacer.`
                        : 'No se puede deshacer.',
                      placeholder: 'Campaña revisada y probada; lista para enviar',
                      typeToConfirm: 'ENVIAR',
                      confirmLabel: 'Enviar ahora',
                    }}
                  />
                  {!tested && (
                    <p className="mt-3 text-[12.5px] text-muted">
                      Se habilita cuando la última prueba es de la versión {campaign.version}.
                    </p>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Destinatarios"
              value={fmtNumber(campaign.recipients)}
              icon={<MailIcon aria-hidden className="size-4" />}
              hint={pending ? `${fmtNumber(pending)} por enviar` : undefined}
            />
            <Stat
              label="Entregados"
              value={fmtNumber(campaign.delivered)}
              icon={<MailCheckIcon aria-hidden className="size-4" />}
              hint={`${fmtNumber(campaign.sent)} aceptados por Resend · ${fmtNumber(campaign.failed)} fallidos`}
            />
            <Stat
              label="Clics"
              value={fmtNumber(campaign.clicks)}
              icon={<CursorClickIcon aria-hidden className="size-4" />}
              hint="Totales por enlace, nunca por persona. Incluye los de filtros de seguridad del correo."
            />
            <Stat
              label="Bajas, rebotes y quejas"
              value={fmtNumber(campaign.unsubscribed + campaign.bounced + campaign.complained)}
              icon={<CloseCircleIcon aria-hidden className="size-4" />}
              hint={`${fmtNumber(campaign.unsubscribed)} bajas · ${fmtNumber(campaign.bounced)} rebotes · ${fmtNumber(campaign.complained)} quejas`}
            />
          </section>
          <div className="grid items-start gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Clics por enlace" />
              <CardBody>
                <Table label="Clics por enlace">
                  <THead>
                    <TH>Enlace</TH>
                    <TH align="right">Clics</TH>
                  </THead>
                  <TBody>
                    {campaign.links.length === 0 ? (
                      <EmptyRow colSpan={2}>Todavía sin clics.</EmptyRow>
                    ) : (
                      campaign.links.map(link => (
                        <TR key={link.link}>
                          <TD className="max-w-[28rem] break-all font-mono text-[12px]">
                            {link.url}
                          </TD>
                          <TD align="right" className="num">
                            {fmtNumber(link.clicks)}
                          </TD>
                        </TR>
                      ))
                    )}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Detalle" />
              <CardBody>
                <DescriptionList
                  items={[
                    { label: 'Segmento', value: segmentText(campaign.segment), wide: true },
                    { label: 'Versión enviada', value: `v${campaign.version}` },
                    { label: 'En cola', value: fmtDateTime(campaign.queuedAt) },
                    { label: 'Empezó', value: fmtDateTime(campaign.startedAt) },
                    { label: 'Terminó', value: fmtDateTime(campaign.finishedAt) },
                    { label: 'Cancelada', value: fmtDateTime(campaign.cancelledAt) },
                    {
                      label: 'Creada por',
                      value:
                        campaign.people.createdBy ??
                        (campaign.kind === 'new_this_week' ? 'Cron semanal' : null),
                    },
                    { label: 'Probada por', value: campaign.people.testedBy },
                    { label: 'Enviada por', value: campaign.people.queuedBy },
                    {
                      label: 'Estados',
                      value: Object.entries(campaign.states)
                        .map(([state, n]) => `${state}: ${n}`)
                        .join(' · '),
                      wide: true,
                    },
                  ]}
                />
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
