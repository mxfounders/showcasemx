import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Fingerprint,
  LogOut,
  Power,
  PowerOff,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { requireAdminPage } from '@/lib/auth';
import { teamMembers } from '@/lib/data/team';
import { fmtDateTime } from '@/lib/format';
import { LEVEL } from '@/lib/labels';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, THead, TH, TBody, TR, TD } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { RelativeTime } from '@/components/ui/RelativeTime';
import { Alert } from '@/components/ui/Field';
import { ActionMenu, type MenuAction } from '@/components/actions/ActionMenu';
import { AddMember } from './AddMember';

export const metadata: Metadata = { title: 'Equipo' };

export default async function EquipoPage() {
  const user = await requireAdminPage();
  const members = await teamMembers();
  const activeAdmins = members.filter(m => m.level === 'admin' && !m.disabledAt).length;

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Quién puede entrar a ops. El acceso depende solo de esta lista: nunca de un perfil, dominio o rol del producto. Todo cambio pide modo seguro."
        actions={<AddMember />}
      />
      {activeAdmins < 2 && (
        <Alert tone="amber" className="mb-5" title="Solo hay un administrador">
          Si pierde su teléfono y sus códigos de respaldo, nadie podrá administrar ops sin tocar la
          base de datos. Sube a otra persona de confianza a administrador.
        </Alert>
      )}
      <Table label="Miembros del equipo">
        <THead>
          <TH>Miembro</TH>
          <TH>Nivel</TH>
          <TH>Autenticador</TH>
          <TH>Último acceso</TH>
          <TH align="right">Acciones 30 d</TH>
          <TH>Desde</TH>
          <TH />
        </THead>
        <TBody>
          {members.map(member => {
            const self = member.id === user.id;
            const reason = (
              title: string,
              description: string,
              destructive = false,
              typeToConfirm?: string,
            ) => ({ title, description, destructive, typeToConfirm });
            const actions: MenuAction[] = [];
            if (!member.disabledAt) {
              actions.push(
                member.level === 'reviewer'
                  ? {
                      label: 'Subir a administrador',
                      icon: <ArrowUpCircle />,
                      endpoint: '/api/team',
                      payload: { action: 'set_level', accountId: member.id, level: 'admin' },
                      success: 'Nivel actualizado',
                      confirm: reason(
                        `Hacer administrador a ${member.email}`,
                        'Podrá gestionar el equipo, suspender cuentas, exportar datos y ver la bitácora.',
                      ),
                    }
                  : {
                      label: 'Bajar a revisor',
                      icon: <ArrowDownCircle />,
                      endpoint: '/api/team',
                      payload: { action: 'set_level', accountId: member.id, level: 'reviewer' },
                      success: 'Nivel actualizado',
                      confirm: reason(
                        `Bajar a revisor a ${member.email}`,
                        'Perderá el acceso a Equipo, Bitácora, Sistema y a las acciones de administración.',
                      ),
                    },
              );
            }
            if (!self && !member.disabledAt) {
              actions.push({
                label: 'Cerrar sus sesiones',
                icon: <LogOut />,
                endpoint: '/api/team',
                payload: { action: 'revoke_sessions', accountId: member.id },
                success: 'Sesiones cerradas',
                confirm: reason(
                  'Cerrar sus sesiones de ops',
                  'Tendrá que volver a entrar con contraseña y código.',
                ),
              });
              actions.push({
                label: 'Reiniciar autenticador',
                icon: <Fingerprint />,
                endpoint: '/api/team',
                payload: { action: 'reset_totp', accountId: member.id },
                success: 'Autenticador reiniciado',
                confirm: reason(
                  'Reiniciar su verificación en dos pasos',
                  'Úsalo si perdió su teléfono. Sus sesiones se cierran y deberá configurarlo de nuevo en 3 días.',
                  true,
                ),
              });
            }
            if (!member.totpConfirmed && !member.disabledAt) {
              actions.push({
                label: 'Renovar invitación (3 días)',
                icon: <CalendarClock />,
                endpoint: '/api/team',
                payload: { action: 'renew_enrollment', accountId: member.id },
                success: 'Invitación renovada',
                confirm: reason(
                  'Renovar el plazo para configurar el autenticador',
                  'Tendrá 3 días más.',
                ),
              });
            }
            if (member.disabledAt) {
              actions.push({
                label: 'Reactivar acceso',
                icon: <Power />,
                endpoint: '/api/team',
                payload: { action: 'enable', accountId: member.id },
                success: 'Acceso reactivado',
                confirm: reason(`Reactivar a ${member.email}`, 'Podrá volver a entrar a ops.'),
              });
            } else {
              actions.push({
                label: 'Desactivar acceso',
                icon: <PowerOff />,
                danger: true,
                endpoint: '/api/team',
                payload: { action: 'disable', accountId: member.id },
                success: 'Acceso desactivado',
                confirm: reason(
                  `Desactivar a ${member.email}`,
                  self
                    ? 'Te quitarás el acceso a ti mismo de inmediato.'
                    : 'Sus sesiones se cierran. Conserva su historial y puedes reactivarlo.',
                  true,
                ),
              });
            }
            actions.push({
              label: 'Quitar del equipo',
              icon: <Trash2 />,
              danger: true,
              endpoint: '/api/team',
              payload: { action: 'remove', accountId: member.id },
              success: 'Miembro eliminado',
              confirm: reason(
                `Quitar a ${member.email} del equipo`,
                'Borra su membresía, autenticador y códigos. Su cuenta de shwcs y la bitácora se conservan.',
                true,
                member.email,
              ),
            });

            return (
              <TR key={member.id} highlight={Boolean(member.disabledAt)}>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} email={member.email} />
                    <div className="min-w-0">
                      <Link
                        href={`/panel/cuentas/${member.id}?tab=seguridad`}
                        className="block truncate font-medium hover:text-accent-fg"
                      >
                        {member.name ?? member.email}
                        {self && (
                          <span className="ml-1.5 text-[12px] font-normal text-muted">(tú)</span>
                        )}
                      </Link>
                      <p className="truncate text-[12px] text-muted">
                        {member.name
                          ? member.email
                          : member.grantedByEmail
                            ? `Agregado por ${member.grantedByEmail}`
                            : 'Alta por script'}
                      </p>
                    </div>
                  </div>
                </TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={LEVEL[member.level].tone}>{LEVEL[member.level].label}</Badge>
                    {member.disabledAt && <Badge tone="terracotta">Desactivado</Badge>}
                    {member.suspendedAt && <Badge tone="terracotta">Cuenta suspendida</Badge>}
                  </div>
                </TD>
                <TD>
                  {member.totpConfirmed ? (
                    <div>
                      <Badge tone="sage" icon={Fingerprint}>
                        Configurado
                      </Badge>
                      <p
                        className={`mt-1 text-[12px] ${member.backupCodesLeft <= 2 ? 'text-amber' : 'text-muted'}`}
                      >
                        {member.backupCodesLeft} códigos de respaldo
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Badge tone="amber" icon={RotateCcw}>
                        Pendiente
                      </Badge>
                      {member.enrollBy && (
                        <p
                          className={`mt-1 text-[12px] ${new Date(member.enrollBy) < new Date() ? 'text-terracotta' : 'text-muted'}`}
                        >
                          {new Date(member.enrollBy) < new Date()
                            ? 'Invitación vencida'
                            : `Vence ${fmtDateTime(member.enrollBy)}`}
                        </p>
                      )}
                    </div>
                  )}
                </TD>
                <TD className="text-[13px] text-muted">
                  <RelativeTime value={member.lastLoginAt} />
                  {member.activeSessions > 0 && (
                    <span
                      className="ml-1.5 inline-block size-1.5 rounded-full bg-sage align-middle"
                      title={`${member.activeSessions} sesiones abiertas`}
                    />
                  )}
                </TD>
                <TD align="right">{member.actions30d}</TD>
                <TD className="text-[13px] text-muted">
                  <RelativeTime value={member.createdAt} />
                </TD>
                <TD>
                  <div className="relative z-10 flex justify-end">
                    <ActionMenu actions={actions} label={`Acciones para ${member.email}`} />
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
      <p className="mt-3 text-[12px] text-muted">
        No puedes quitar ni bajar al último administrador. Para reiniciar tu propio autenticador o
        cerrar tus sesiones, usa Seguridad u otro administrador.
      </p>
    </>
  );
}
