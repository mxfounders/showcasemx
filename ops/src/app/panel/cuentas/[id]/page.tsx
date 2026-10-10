import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Ban,
  BadgeCheck,
  EyeOff,
  Fingerprint,
  LogOut,
  MailCheck,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { isUuid } from '@/lib/http';
import { accountDetail, type AccountDetail } from '@/lib/data/accounts';
import { daysSince, fmtDate, fmtDateTime, fmtNumber } from '@/lib/format';
import { LEVEL, PROFILE, ROLE } from '@/lib/labels';
import { choice, type SearchParams } from '@/lib/url';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { DescriptionList } from '@/components/ui/DescriptionList';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { CopyButton, IdChip } from '@/components/ui/CopyButton';
import { Table, THead, TH, TBody, TR, TD, RowLink, EmptyRow } from '@/components/ui/Table';
import { Alert } from '@/components/ui/Field';
import {
  ContactStatusBadge,
  EmailStateBadge,
  SolutionStatusBadge,
} from '@/components/domain/StatusBadge';
import { AuditLine } from '@/components/domain/AuditLine';
import { ActionButton } from '@/components/actions/ActionButton';

export const metadata: Metadata = { title: 'Cuenta' };

const TABS = [
  'resumen',
  'seguridad',
  'publicaciones',
  'biblioteca',
  'contactos',
  'comunidad',
  'avisos',
  'bitacora',
] as const;

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3">
      <p className="text-[12.5px] text-muted">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tracking-tight">{fmtNumber(value)}</p>
    </div>
  );
}

function SecurityTab({ d }: { d: AccountDetail }) {
  const a = d.account;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Acceso al producto" description="Cómo entra esta cuenta a shwcs.site." />
        <CardBody>
          <DescriptionList
            columns={3}
            items={[
              {
                label: 'Verificación en dos pasos',
                value: a.twoFactorAt ? (
                  <Badge tone="sage" icon={Fingerprint}>
                    Activa desde {fmtDate(a.twoFactorAt)}
                  </Badge>
                ) : (
                  <Badge>Desactivada</Badge>
                ),
              },
              {
                label: 'Códigos de respaldo',
                value: a.twoFactorAt ? `${a.backupCodesLeft} disponibles` : null,
              },
              {
                label: 'Google',
                value: a.googleEmail
                  ? `${a.googleEmail} · vinculada ${fmtDate(a.googleLinkedAt)}`
                  : 'No vinculada',
              },
              {
                label: 'Recuperaciones de contraseña vivas',
                value: String(d.pendingTokens.passwordResets),
              },
              {
                label: 'Verificaciones de correo vivas',
                value: String(d.pendingTokens.emailVerifications),
              },
              {
                label: 'Accesos a medio camino (2FA)',
                value: String(d.pendingTokens.loginChallenges),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`Sesiones activas en el producto (${d.productSessionList.length})`}
          description="Sin dirección IP: la política de privacidad solo contempla el dispositivo."
        />
        <Table className="rounded-none border-x-0 border-b-0 shadow-none">
          <THead>
            <TH>Dispositivo</TH>
            <TH>Inició</TH>
            <TH>Último uso</TH>
            <TH>Vence</TH>
          </THead>
          <TBody>
            {d.productSessionList.length === 0 ? (
              <EmptyRow colSpan={4}>
                <p className="py-4 text-center text-[13px] text-muted">Sin sesiones abiertas.</p>
              </EmptyRow>
            ) : (
              d.productSessionList.map(session => (
                <TR key={session.id}>
                  <TD className="font-medium">{session.device}</TD>
                  <TD className="text-muted">{fmtDateTime(session.createdAt)}</TD>
                  <TD className="text-muted">
                    <RelativeTime value={session.lastSeenAt} />
                  </TD>
                  <TD className="text-muted">{fmtDate(session.expiresAt)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      {a.ops && (
        <Card>
          <CardHeader
            title="Miembro de ops"
            description="Acceso al backoffice, separado de las sesiones del producto."
          />
          <CardBody className="space-y-5">
            <DescriptionList
              columns={3}
              items={[
                {
                  label: 'Nivel',
                  value: (
                    <Badge tone={LEVEL[a.ops.level]?.tone ?? 'neutral'}>
                      {LEVEL[a.ops.level]?.label ?? a.ops.level}
                    </Badge>
                  ),
                },
                {
                  label: 'Estado',
                  value: a.ops.disabledAt ? (
                    <Badge tone="terracotta">Desactivado {fmtDate(a.ops.disabledAt)}</Badge>
                  ) : (
                    <Badge tone="sage">Activo</Badge>
                  ),
                },
                {
                  label: 'Autenticador',
                  value: a.ops.totpAt
                    ? `Configurado ${fmtDate(a.ops.totpAt)}`
                    : a.ops.enrollBy
                      ? `Pendiente · vence ${fmtDateTime(a.ops.enrollBy)}`
                      : 'Pendiente',
                },
                { label: 'Códigos de respaldo', value: `${a.ops.backupCodesLeft} disponibles` },
                { label: 'Acceso otorgado por', value: a.ops.grantedBy ?? 'Script de alta' },
                { label: 'Miembro desde', value: fmtDate(a.ops.since) },
              ]}
            />
            <div className="overflow-hidden rounded-xl border border-line">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-surface-2 text-2xs font-semibold uppercase tracking-[0.07em] text-muted">
                  <tr>
                    <th className="px-3 py-2">Sesión de ops</th>
                    <th className="px-3 py-2">IP</th>
                    <th className="px-3 py-2">Último uso</th>
                    <th className="px-3 py-2">Modo seguro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {d.opsSessions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-muted">
                        Sin sesiones de ops abiertas.
                      </td>
                    </tr>
                  ) : (
                    d.opsSessions.map(session => (
                      <tr key={session.id}>
                        <td className="px-3 py-2 font-medium">{session.device}</td>
                        <td className="px-3 py-2 font-mono text-[12px] text-muted">
                          {session.ip ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          <RelativeTime value={session.lastSeenAt} />
                        </td>
                        <td className="px-3 py-2">
                          {session.elevatedUntil && new Date(session.elevatedUntil) > new Date() ? (
                            <Badge tone="blue">Activo</Badge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireOps();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const d = await accountDetail(id);
  if (!d) notFound();
  const query = await searchParams;
  const tab = choice(query, 'tab', TABS, 'resumen');
  const a = d.account;
  const admin = user.level === 'admin';
  const self = user.id === a.id;
  const base = `/panel/cuentas/${id}?tab=`;
  const endpoint = `/api/accounts/${id}/actions`;
  const lastSeen = d.productSessionList[0]?.lastSeenAt ?? null;
  const commentsCount = d.community.comments.length;

  return (
    <>
      <Link
        href="/panel/cuentas"
        className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-muted hover:text-fg"
      >
        ← Cuentas
      </Link>

      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar name={a.name} email={a.email} size="xl" />
          <div className="min-w-0">
            <h1 className="truncate text-[26px] font-semibold leading-tight tracking-[-0.02em]">
              {a.name ?? a.email}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-[13.5px] text-muted">
              {a.email}
              <CopyButton value={a.email} label="Copiar correo" />
              {a.organization && <span>· {a.organization}</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.suspendedAt && (
                <Badge tone="terracotta" icon={Ban}>
                  Suspendida
                </Badge>
              )}
              {a.emailVerifiedAt ? (
                <Badge tone="sage" icon={BadgeCheck}>
                  Correo verificado
                </Badge>
              ) : (
                <Badge tone="amber">Correo sin verificar</Badge>
              )}
              {a.twoFactorAt && (
                <Badge tone="sage" icon={Fingerprint}>
                  2FA
                </Badge>
              )}
              {a.googleEmail && <Badge>Google</Badge>}
              {a.isOps && a.ops && (
                <Badge tone="blue" icon={ShieldCheck}>
                  Ops · {LEVEL[a.ops.level]?.label}
                </Badge>
              )}
              {a.profile && <Badge tone="lavender">{PROFILE[a.profile] ?? a.profile}</Badge>}
              <Badge>Registrada hace {daysSince(a.createdAt)} días</Badge>
              <IdChip value={a.id} display={a.id.slice(0, 8)} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {admin && !a.emailVerifiedAt && (
            <ActionButton
              label="Verificar correo"
              icon={<MailCheck />}
              endpoint={endpoint}
              payload={{ action: 'verify_email' }}
              success="Correo marcado como verificado"
              confirm={{
                title: 'Verificar el correo manualmente',
                description:
                  'Úsalo solo si confirmaste por otro medio que la persona controla este correo. Requiere modo seguro.',
                confirmLabel: 'Verificar',
              }}
            />
          )}
          {!self && (
            <ActionButton
              label="Cerrar sesiones"
              icon={<LogOut />}
              endpoint={endpoint}
              payload={{ action: 'revoke_sessions' }}
              success="Sesiones cerradas"
              disabled={!admin && a.isOps}
              confirm={{
                title: 'Cerrar todas sus sesiones',
                description:
                  'Cierra las sesiones del producto y de ops de esta cuenta en todos sus dispositivos.',
                confirmLabel: 'Cerrar sesiones',
              }}
            />
          )}
          {admin &&
            !self &&
            (a.suspendedAt ? (
              <ActionButton
                label="Reactivar"
                icon={<RotateCcw />}
                tone="success"
                endpoint={endpoint}
                payload={{ action: 'reactivate' }}
                success="Cuenta reactivada"
                confirm={{
                  title: 'Reactivar la cuenta',
                  description: 'Podrá volver a iniciar sesión.',
                  confirmLabel: 'Reactivar',
                }}
              />
            ) : (
              <ActionButton
                label="Suspender"
                icon={<Ban />}
                tone="danger"
                endpoint={endpoint}
                payload={{ action: 'suspend' }}
                success="Cuenta suspendida"
                confirm={{
                  title: 'Suspender la cuenta',
                  description:
                    'No podrá entrar ni al producto ni a ops y sus sesiones se cierran al instante. Sus fichas siguen publicadas; usa «Despublicar todo» si también deben salir.',
                  destructive: true,
                  confirmLabel: 'Suspender',
                  typeToConfirm: a.email,
                }}
              />
            ))}
          {admin && !self && (
            <ActionButton
              label="Despublicar todo"
              icon={<EyeOff />}
              tone="danger"
              endpoint={endpoint}
              payload={{ action: 'unpublish_all' }}
              success="Contenido retirado"
              confirm={{
                title: 'Despublicar todo su contenido',
                description:
                  'Retira del catálogo todas sus fichas publicadas y vuelve privadas sus listas públicas. Los borradores se conservan.',
                destructive: true,
                confirmLabel: 'Despublicar todo',
                typeToConfirm: a.email,
              }}
            />
          )}
        </div>
      </header>

      {a.suspendedAt && (
        <Alert
          title={`Suspendida ${fmtDateTime(a.suspendedAt)}${a.suspendedByEmail ? ` por ${a.suspendedByEmail}` : ''}`}
          className="mb-5"
        >
          {a.suspendedReason ?? 'Sin motivo registrado.'}
        </Alert>
      )}

      <div className="mb-5">
        <Tabs
          label="Secciones de la cuenta"
          items={[
            { label: 'Resumen', href: base + 'resumen', active: tab === 'resumen' },
            {
              label: 'Seguridad',
              href: base + 'seguridad',
              active: tab === 'seguridad',
              count: d.productSessionList.length,
            },
            {
              label: 'Publicaciones',
              href: base + 'publicaciones',
              active: tab === 'publicaciones',
              count: d.solutions.length,
            },
            {
              label: 'Biblioteca',
              href: base + 'biblioteca',
              active: tab === 'biblioteca',
              count: d.lists.length,
            },
            {
              label: 'Contactos',
              href: base + 'contactos',
              active: tab === 'contactos',
              count: d.contactsSent.length + d.contactsReceived.length,
            },
            {
              label: 'Comunidad',
              href: base + 'comunidad',
              active: tab === 'comunidad',
              count: commentsCount,
            },
            {
              label: 'Avisos',
              href: base + 'avisos',
              active: tab === 'avisos',
              count: d.notifications.length,
            },
            {
              label: 'Bitácora',
              href: base + 'bitacora',
              active: tab === 'bitacora',
              count: d.audit.length,
            },
          ]}
        />
      </div>

      {tab === 'resumen' && (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Identidad"
              description="Datos descriptivos: no otorgan permisos ni propiedad."
            />
            <CardBody>
              <DescriptionList
                items={[
                  { label: 'Nombre', value: a.name },
                  { label: 'Empresa', value: a.organization },
                  { label: 'Perfil', value: a.profile ? (PROFILE[a.profile] ?? a.profile) : null },
                  { label: 'Rol', value: a.role ? (ROLE[a.role] ?? a.role) : null },
                  {
                    label: 'Vista de inicio',
                    value: a.dashboardMode ? (PROFILE[a.dashboardMode] ?? a.dashboardMode) : null,
                  },
                  { label: 'Foto', value: a.hasAvatar ? 'Subida' : 'Sin foto' },
                  { label: 'Registrada', value: fmtDateTime(a.createdAt) },
                  {
                    label: 'Correo verificado',
                    value: a.emailVerifiedAt ? fmtDateTime(a.emailVerifiedAt) : 'No',
                  },
                  {
                    label: 'Última actividad en el producto',
                    value: lastSeen ? <RelativeTime value={lastSeen} /> : 'Sin sesiones abiertas',
                  },
                  {
                    label: 'Newsletter',
                    value: a.newsletter
                      ? a.newsletter.unsubscribedAt
                        ? `Se dio de baja ${fmtDate(a.newsletter.unsubscribedAt)}`
                        : `Suscrita desde ${fmtDate(a.newsletter.since)}`
                      : 'No suscrita',
                  },
                  {
                    label: 'Avisos por correo',
                    value: a.preferences
                      ? `Contactos: ${a.preferences.contactEmail ? 'sí' : 'no'} · Fichas: ${a.preferences.solutionEmail ? 'sí' : 'no'}`
                      : 'Predeterminado',
                  },
                ]}
              />
            </CardBody>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Fichas" value={d.solutions.length} />
            <Kpi label="Publicadas" value={d.solutions.filter(s => s.hasPublished).length} />
            <Kpi label="Solicitudes enviadas" value={d.contactsSent.length} />
            <Kpi label="Solicitudes recibidas" value={d.contactsReceived.length} />
            <Kpi label="Guardados" value={a.savedCount} />
            <Kpi label="Listas" value={d.lists.length} />
          </div>
        </div>
      )}

      {tab === 'seguridad' && <SecurityTab d={d} />}

      {tab === 'publicaciones' && (
        <Table label="Publicaciones">
          <THead>
            <TH>Ficha</TH>
            <TH>Estado</TH>
            <TH align="right">Vistas 30 d</TH>
            <TH>Señales</TH>
            <TH>Actualizada</TH>
          </THead>
          <TBody>
            {d.solutions.length === 0 ? (
              <EmptyRow colSpan={5}>
                <EmptyState compact icon={UserRound} title="No ha creado fichas" />
              </EmptyRow>
            ) : (
              d.solutions.map(solution => (
                <TR key={solution.id}>
                  <TD>
                    <RowLink href={`/panel/postulaciones/${solution.id}`}>{solution.name}</RowLink>
                    <p className="text-[12px] text-muted">
                      {solution.category || 'Sin categoría'} · v{solution.version}
                    </p>
                  </TD>
                  <TD>
                    <SolutionStatusBadge status={solution.status} />
                  </TD>
                  <TD align="right">{fmtNumber(solution.views30d)}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {solution.catalogKey && <Badge tone="lavender">{solution.catalogKey}</Badge>}
                      {solution.openReports > 0 && (
                        <Badge tone="terracotta">{solution.openReports} reportes</Badge>
                      )}
                      {solution.mediaCount > 0 && <Badge>{solution.mediaCount} capturas</Badge>}
                    </div>
                  </TD>
                  <TD className="text-muted">
                    <RelativeTime value={solution.updatedAt} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      )}

      {tab === 'biblioteca' && (
        <div className="space-y-4">
          <Alert tone="blue">
            Ops ve cuántos proyectos guardó ({fmtNumber(a.savedCount)}) y el nombre de sus listas,
            nunca cuáles guardó, sus notas ni el propósito privado de cada lista.
          </Alert>
          <Table label="Listas">
            <THead>
              <TH>Lista</TH>
              <TH>Visibilidad</TH>
              <TH align="right">Proyectos</TH>
              <TH align="right">Me gusta</TH>
              <TH align="right">Comentarios</TH>
              <TH>Actualizada</TH>
            </THead>
            <TBody>
              {d.lists.length === 0 ? (
                <EmptyRow colSpan={6}>
                  <p className="py-4 text-center text-[13px] text-muted">Sin listas.</p>
                </EmptyRow>
              ) : (
                d.lists.map(list => (
                  <TR key={list.id}>
                    <TD className="font-medium">
                      {list.visibility === 'public' ? (
                        <Link
                          href={`/panel/comunidad?q=${encodeURIComponent(list.name)}`}
                          className="hover:text-accent-fg"
                        >
                          {list.name}
                        </Link>
                      ) : (
                        list.name
                      )}
                      {list.categories.length > 0 && (
                        <p className="text-[12px] font-normal text-muted">
                          {list.categories.join(', ')}
                        </p>
                      )}
                    </TD>
                    <TD>
                      {list.visibility === 'public' ? (
                        <Badge tone="sage">Pública</Badge>
                      ) : (
                        <Badge>Privada</Badge>
                      )}
                    </TD>
                    <TD align="right">{list.itemCount}</TD>
                    <TD align="right">{list.likes}</TD>
                    <TD align="right">{list.comments}</TD>
                    <TD className="text-muted">
                      <RelativeTime value={list.updatedAt} />
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
      )}

      {tab === 'contactos' && (
        <div className="space-y-6">
          <Alert tone="blue">
            Solo metadatos: proyecto, contraparte, estado y fechas. El contenido de las solicitudes
            y las respuestas nunca se muestra en ops.
          </Alert>
          {[
            { title: 'Solicitudes que envió', rows: d.contactsSent, counterpart: 'Destinatario' },
            {
              title: 'Solicitudes que recibió',
              rows: d.contactsReceived,
              counterpart: 'Comprador',
            },
          ].map(group => (
            <Card key={group.title}>
              <CardHeader title={`${group.title} (${group.rows.length})`} />
              <Table className="rounded-none border-x-0 border-b-0 shadow-none">
                <THead>
                  <TH>Proyecto</TH>
                  <TH>{group.counterpart}</TH>
                  <TH>Estado</TH>
                  <TH align="right">Eventos</TH>
                  <TH>Creada</TH>
                </THead>
                <TBody>
                  {group.rows.length === 0 ? (
                    <EmptyRow colSpan={5}>
                      <p className="py-4 text-center text-[13px] text-muted">Ninguna.</p>
                    </EmptyRow>
                  ) : (
                    group.rows.map(row => (
                      <TR key={row.id}>
                        <TD>
                          <Link
                            href={`/panel/postulaciones/${row.solutionId}`}
                            className="font-medium hover:text-accent-fg"
                          >
                            {row.projectName}
                          </Link>
                        </TD>
                        <TD className="text-muted">{row.counterpartEmail ?? '—'}</TD>
                        <TD>
                          <ContactStatusBadge status={row.status} />
                        </TD>
                        <TD align="right">{row.eventCount}</TD>
                        <TD className="text-muted">
                          <RelativeTime value={row.createdAt} />
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </Card>
          ))}
        </div>
      )}

      {tab === 'comunidad' && (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title={`Comentarios públicos (${commentsCount})`} />
            <CardBody>
              {commentsCount === 0 ? (
                <p className="text-[13px] text-muted">No ha comentado.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {d.community.comments.map(comment => (
                    <li key={comment.id} className="flex gap-3 py-3 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] text-muted">
                          {comment.kind === 'list' ? 'En la lista' : 'En la ficha'}{' '}
                          <Link
                            href={
                              comment.kind === 'list'
                                ? `/panel/comunidad?q=${encodeURIComponent(comment.targetName)}`
                                : `/panel/postulaciones/${comment.targetId}?tab=comentarios`
                            }
                            className="font-medium text-fg-2 hover:text-accent-fg"
                          >
                            {comment.targetName}
                          </Link>{' '}
                          como «{comment.authorName}» · <RelativeTime value={comment.createdAt} />
                        </p>
                        <p className="mt-1 whitespace-pre-line text-[13.5px] text-fg-2">
                          {comment.body}
                        </p>
                      </div>
                      <ActionButton
                        label="Borrar"
                        tone="ghost"
                        size="xs"
                        endpoint="/api/community"
                        payload={{
                          action:
                            comment.kind === 'list' ? 'delete_comment' : 'delete_solution_comment',
                          commentId: comment.id,
                        }}
                        success="Comentario borrado"
                        confirm={{
                          title: 'Borrar este comentario',
                          description: 'El texto queda copiado en la bitácora.',
                          destructive: true,
                          confirmLabel: 'Borrar',
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <div className="space-y-4">
            {[
              {
                title: 'Listas que le gustan',
                items: d.community.likes,
                href: (name: string) => `/panel/comunidad?q=${encodeURIComponent(name)}`,
              },
              {
                title: 'Listas que guardó',
                items: d.community.savedLists,
                href: (name: string) => `/panel/comunidad?q=${encodeURIComponent(name)}`,
              },
              {
                title: 'Fichas que le gustan',
                items: d.community.solutionLikes,
                href: (_name: string, itemId?: string) => `/panel/postulaciones/${itemId}`,
              },
            ].map(group => (
              <Card key={group.title}>
                <CardHeader title={`${group.title} (${group.items.length})`} />
                <CardBody>
                  {group.items.length === 0 ? (
                    <p className="text-[13px] text-muted">Ninguna.</p>
                  ) : (
                    <ul className="space-y-1.5 text-[13px]">
                      {group.items.map(item => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <Link
                            href={group.href(item.name, item.id)}
                            className="truncate text-fg-2 hover:text-accent-fg"
                          >
                            {item.name}
                          </Link>
                          <RelativeTime value={item.createdAt} className="shrink-0 text-muted" />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'avisos' && (
        <Table label="Avisos">
          <THead>
            <TH>Aviso</TH>
            <TH>Tipo</TH>
            <TH>Correo</TH>
            <TH>Leído</TH>
            <TH>Creado</TH>
          </THead>
          <TBody>
            {d.notifications.length === 0 ? (
              <EmptyRow colSpan={5}>
                <p className="py-4 text-center text-[13px] text-muted">Sin avisos.</p>
              </EmptyRow>
            ) : (
              d.notifications.map(n => (
                <TR key={n.id}>
                  <TD className="font-medium">{n.title}</TD>
                  <TD className="text-muted">{n.category === 'contact' ? 'Contacto' : 'Ficha'}</TD>
                  <TD>
                    <EmailStateBadge state={n.emailState} />
                    {n.attempts > 0 && (
                      <span className="ml-1.5 text-[12px] text-muted">{n.attempts} intentos</span>
                    )}
                  </TD>
                  <TD className="text-muted">
                    {n.readAt ? <RelativeTime value={n.readAt} /> : 'No'}
                  </TD>
                  <TD className="text-muted">
                    <RelativeTime value={n.createdAt} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      )}

      {tab === 'bitacora' && (
        <Card>
          <CardHeader
            title="Bitácora de esta cuenta"
            description="Accesos fallidos con su correo, acciones de ops sobre ella y, si es del equipo, lo que hizo en ops."
          />
          <CardBody>
            {d.audit.length === 0 ? (
              <p className="text-[13px] text-muted">Sin registros.</p>
            ) : (
              <div className="divide-y divide-line">
                {d.audit.map(entry => (
                  <AuditLine key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </>
  );
}
