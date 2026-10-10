import type { Metadata } from 'next';
import { CheckCircle2, Laptop, LogOut, ShieldAlert, XCircle } from 'lucide-react';
import { requireOps } from '@/lib/auth';
import { mySecurity, securityOverview } from '@/lib/data/security';
import { verifyAuditChain } from '@/lib/data/audit';
import { configStatus } from '@/lib/env';
import { auditAction } from '@/lib/labels';
import { fmtDateTime, fmtNumber, fmtPercent } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Stat } from '@/components/ui/Stat';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { AreaChart } from '@/components/charts/AreaChart';
import { AuditLine } from '@/components/domain/AuditLine';
import { ActionButton } from '@/components/actions/ActionButton';
import { BackupCodesButton, ChainVerifier, SecureModeCard } from './SecurityControls';

export const metadata: Metadata = { title: 'Seguridad' };

function Posture({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      {ok ? (
        <CheckCircle2 aria-hidden className="mt-0.5 size-[18px] shrink-0 text-sage" />
      ) : (
        <XCircle aria-hidden className="mt-0.5 size-[18px] shrink-0 text-amber" />
      )}
      <div>
        <p className="text-[13.5px] font-medium text-fg">
          <span className="sr-only">{ok ? 'Correcto: ' : 'Pendiente: '}</span>
          {label}
        </p>
        <p className="text-[12.5px] text-muted">{detail}</p>
      </div>
    </li>
  );
}

export default async function SeguridadPage() {
  const user = await requireOps();
  const admin = user.level === 'admin';
  const [mine, overview, chain] = await Promise.all([
    mySecurity(user.id, user.email, user.sessionId),
    admin ? securityOverview() : null,
    admin ? verifyAuditChain() : null,
  ]);
  const config = configStatus();
  const others = mine.sessions.filter(session => !session.current).length;
  const failed7d = overview
    ? ['login_failed', 'login_totp_failed', 'login_totp_replay'].reduce(
        (sum, key) => sum + (overview.byAction[key]?.d7 ?? 0),
        0,
      )
    : 0;
  const failed24h = overview
    ? ['login_failed', 'login_totp_failed', 'login_totp_replay'].reduce(
        (sum, key) => sum + (overview.byAction[key]?.d1 ?? 0),
        0,
      )
    : 0;

  return (
    <>
      <PageHeader
        title="Seguridad"
        description="Tu acceso a ops y, para administradores, la postura de seguridad de todo el backoffice."
      />

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              title={`Tus sesiones de ops (${mine.sessions.length})`}
              description="Cada sesión queda atada al navegador que la creó, dura 8 h y se cierra tras 30 min sin uso. Máximo 5 a la vez."
              action={
                others > 0 ? (
                  <ActionButton
                    label="Cerrar las demás"
                    icon={<LogOut />}
                    tone="danger"
                    size="xs"
                    endpoint="/api/me/sessions"
                    payload={{ action: 'revoke_others' }}
                    success="Sesiones cerradas"
                    confirm={{
                      title: 'Cerrar tus otras sesiones',
                      description: `Se cierran ${others} sesiones en otros dispositivos. Esta sigue abierta.`,
                      field: null,
                      confirmLabel: 'Cerrar sesiones',
                      destructive: true,
                    }}
                  />
                ) : undefined
              }
            />
            <CardBody>
              <ul className="divide-y divide-line">
                {mine.sessions.map(session => (
                  <li
                    key={session.id}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-muted">
                      <Laptop aria-hidden className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium">
                        {session.device}
                        {session.current && (
                          <Badge tone="sage" dot>
                            Esta sesión
                          </Badge>
                        )}
                        {session.elevated && <Badge tone="blue">Modo seguro</Badge>}
                      </p>
                      <p className="text-[12.5px] text-muted">
                        <span className="font-mono">{session.ip ?? 'IP desconocida'}</span> · inició{' '}
                        {fmtDateTime(session.createdAt)} · último uso{' '}
                        <RelativeTime value={session.lastSeenAt} />
                      </p>
                    </div>
                    {!session.current && (
                      <ActionButton
                        label="Cerrar"
                        tone="ghost"
                        size="xs"
                        endpoint="/api/me/sessions"
                        payload={{ action: 'revoke', id: session.id }}
                        success="Sesión cerrada"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Tu actividad de acceso"
              description="Inicios de sesión, intentos fallidos con tu correo y cambios de seguridad."
            />
            <CardBody>
              {mine.events.length === 0 ? (
                <p className="text-[13px] text-muted">Sin eventos.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {mine.events.map(event => {
                    const label = auditAction(event.action);
                    return (
                      <li key={event.id} className="flex items-center gap-3 py-2.5">
                        <Badge tone={label.tone} dot>
                          {label.label}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">
                          {[event.device, event.ip].filter(Boolean).join(' · ')}
                        </span>
                        <RelativeTime
                          value={event.createdAt}
                          className="shrink-0 text-[12px] text-muted"
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Modo seguro" />
            <CardBody>
              <SecureModeCard />
            </CardBody>
          </Card>
          <Card>
            <CardHeader
              title="Verificación en dos pasos"
              description={
                mine.totpConfirmedAt
                  ? `Configurada ${fmtDateTime(mine.totpConfirmedAt)}`
                  : undefined
              }
            />
            <CardBody>
              <BackupCodesButton left={mine.backupCodesLeft} />
              <p className="mt-4 text-[12px] text-muted">
                ¿Cambiaste de teléfono? Pide a otro administrador que reinicie tu autenticador desde
                Equipo.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {overview && chain && (
        <>
          <div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold tracking-tight">Todo el backoffice</h2>
            <ActionButton
              label="Cerrar todas las sesiones de ops"
              icon={<LogOut />}
              tone="danger"
              endpoint="/api/security/lockdown"
              payload={{}}
              success="Sesiones del equipo cerradas"
              confirm={{
                title: 'Cerrar las sesiones de todo el equipo',
                description:
                  'Para un incidente: todos, menos tú, tendrán que volver a entrar con contraseña y código. Requiere modo seguro.',
                destructive: true,
                confirmLabel: 'Cerrar todas',
                typeToConfirm: 'CERRAR SESIONES',
              }}
            />
          </div>
          <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat
              label="Accesos fallidos (24 h)"
              value={failed24h}
              tone="danger"
              hint={`${fmtNumber(failed7d)} en 7 días`}
              icon={<ShieldAlert aria-hidden className="size-4" />}
            />
            <Stat
              label="Bloqueos por intentos (7 d)"
              value={overview.byAction.login_throttled?.d7 ?? 0}
              tone="attention"
            />
            <Stat
              label="Cookies reutilizadas (7 d)"
              value={overview.byAction.session_binding_mismatch?.d7 ?? 0}
              tone="danger"
              hint="Sesión usada desde otro navegador"
            />
            <Stat
              label="Sesiones de ops abiertas"
              value={overview.team.opsSessions}
              hint={`${overview.team.elevatedSessions} en modo seguro`}
            />
          </section>

          <div className="mb-6 grid items-start gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Accesos a ops"
                description="Exitosos contra fallidos (contraseña, código o bloqueo), 14 días."
              />
              <CardBody>
                <AreaChart
                  title="Accesos exitosos y fallidos por día"
                  series={[
                    { key: 'success', label: 'Exitosos', color: 'series-1' },
                    { key: 'failed', label: 'Fallidos', color: 'series-2' },
                  ]}
                  data={overview.series}
                  height={200}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title="Bitácora encadenada"
                description="Solo inserción, con hash por evento."
              />
              <CardBody>
                <ChainVerifier initial={chain} />
              </CardBody>
            </Card>
          </div>

          <div className="mb-6 grid items-start gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader
                title="Postura"
                description="Configuración de este despliegue (sin revelar valores)."
              />
              <CardBody>
                <ul className="divide-y divide-line">
                  <Posture
                    ok={config.totpKey}
                    label="Clave de cifrado TOTP"
                    detail={
                      config.totpKey
                        ? 'OPS_TOTP_KEY válida (AES-256-GCM).'
                        : 'Falta OPS_TOTP_KEY: nadie podrá validar códigos.'
                    }
                  />
                  <Posture
                    ok={overview.team.pendingEnrollment === 0}
                    label="Todo el equipo con autenticador"
                    detail={`${overview.team.enrolled} de ${overview.team.active} miembros activos (${fmtPercent(overview.team.enrolled, overview.team.active)}).`}
                  />
                  <Posture
                    ok={overview.team.admins >= 2}
                    label="Al menos dos administradores"
                    detail={`${overview.team.admins} activos. Con uno solo, perder su teléfono bloquea la administración.`}
                  />
                  <Posture
                    ok={overview.team.lowBackup === 0}
                    label="Códigos de respaldo suficientes"
                    detail={
                      overview.team.lowBackup
                        ? `${overview.team.lowBackup} miembros con 2 o menos.`
                        : 'Nadie está por quedarse sin códigos.'
                    }
                  />
                  <Posture
                    ok={config.ipAllowlist > 0}
                    label="Lista de IPs permitidas"
                    detail={
                      config.ipAllowlist
                        ? `${config.ipAllowlist} reglas en OPS_IP_ALLOWLIST.`
                        : 'Opcional: OPS_IP_ALLOWLIST restringe ops a tu red o VPN.'
                    }
                  />
                  <Posture
                    ok={config.securityAlerts}
                    label="Alertas de seguridad por correo"
                    detail={
                      config.securityAlerts
                        ? 'Nuevos dispositivos y cambios de equipo se avisan por correo.'
                        : 'Configura RESEND_API_KEY y OPS_ALERT_FROM para avisos de acceso.'
                    }
                  />
                  <Posture
                    ok={config.production}
                    label="Cookies __Host- y HSTS"
                    detail={
                      config.production
                        ? 'Activas en producción.'
                        : 'Se activan solo en producción.'
                    }
                  />
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title="Límites de intentos activos"
                description="Identidades con intentos en la última hora, por tipo."
              />
              <CardBody>
                {overview.buckets.length === 0 ? (
                  <p className="text-[13px] text-muted">
                    Sin actividad limitada en la última hora.
                  </p>
                ) : (
                  <ul className="space-y-2 text-[13px]">
                    {overview.buckets.map(bucket => (
                      <li key={bucket.scope} className="flex items-center justify-between gap-3">
                        <span className="truncate font-mono text-[12px] text-fg-2">
                          {bucket.scope}
                        </span>
                        <span className="num shrink-0 text-muted">
                          {bucket.identities} · máx.{' '}
                          <span className="font-semibold text-fg">{bucket.maxAttempts}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-[11.5px] text-muted">
                  Las identidades se guardan como hash; ops nunca ve la IP o el correo detrás de un
                  límite.
                </p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Producto" description="Seguridad de las cuentas de shwcs.site." />
              <CardBody className="space-y-3 text-[13.5px]">
                <p className="flex justify-between">
                  <span className="text-muted">Cuentas con 2FA</span>
                  <span className="num font-medium">
                    {fmtNumber(overview.product.twoFactor)} de{' '}
                    {fmtNumber(overview.product.accounts)}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">Sesiones abiertas</span>
                  <span className="num font-medium">{fmtNumber(overview.product.sessions)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">Suspendidas</span>
                  <span className="num font-medium">{fmtNumber(overview.product.suspended)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">Correo sin verificar</span>
                  <span className="num font-medium">{fmtNumber(overview.product.unverified)}</span>
                </p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Eventos de seguridad recientes"
              description="Accesos, fallos, modo seguro y cambios de autenticador de todo el equipo."
            />
            <CardBody>
              <div className="divide-y divide-line">
                {overview.events.map(event => (
                  <AuditLine key={event.id} entry={event} />
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
