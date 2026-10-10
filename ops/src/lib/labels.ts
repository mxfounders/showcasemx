import type { Tone } from '@/components/ui/Badge';

export interface Label {
  label: string;
  tone: Tone;
}

function pick(
  map: Record<string, Label>,
  key: string | null | undefined,
  fallback?: string,
): Label {
  return (key && map[key]) || { label: fallback ?? key ?? '—', tone: 'neutral' };
}

export const SOLUTION_STATUS: Record<string, Label> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  pending: { label: 'Pendiente', tone: 'amber' },
  changes_requested: { label: 'Con cambios', tone: 'lavender' },
  published: { label: 'Publicada', tone: 'sage' },
  rejected: { label: 'Rechazada', tone: 'terracotta' },
  withdrawn: { label: 'Retirada', tone: 'terracotta' },
};
export const solutionStatus = (s: string | null | undefined) => pick(SOLUTION_STATUS, s);

export const REPORT_STATUS: Record<string, Label> = {
  open: { label: 'Abierto', tone: 'amber' },
  resolved: { label: 'Resuelto', tone: 'sage' },
  dismissed: { label: 'Descartado', tone: 'neutral' },
};
export const reportStatus = (s: string | null | undefined) => pick(REPORT_STATUS, s);

export const SOLUTION_REPORT_REASON: Record<string, string> = {
  misleading: 'Información engañosa',
  broken: 'Enlace o sitio roto',
  ownership: 'Propiedad en disputa',
  abuse: 'Abuso o contenido dañino',
};
export const COMMUNITY_REPORT_REASON: Record<string, string> = {
  spam: 'Spam',
  abuse: 'Abuso',
  impersonation: 'Suplantación',
  other: 'Otro',
};

export const REVIEW_REPORT_REASON: Record<string, string> = {
  fake: 'No parece real',
  conflict: 'Conflicto de interés',
  abuse: 'Ofensiva o con datos personales',
  spam: 'Spam',
  other: 'Otro',
};

export const CONTACT_STATUS: Record<string, Label> = {
  new: { label: 'Nueva', tone: 'blue' },
  conversation: { label: 'En conversación', tone: 'lavender' },
  closed: { label: 'Cerrada', tone: 'neutral' },
  withdrawn: { label: 'Retirada', tone: 'terracotta' },
};
export const contactStatus = (s: string | null | undefined) => pick(CONTACT_STATUS, s);

export const EMAIL_STATE: Record<string, Label> = {
  disabled: { label: 'Sin correo', tone: 'neutral' },
  pending: { label: 'En cola', tone: 'blue' },
  sending: { label: 'Enviando', tone: 'amber' },
  sent: { label: 'Enviado', tone: 'sage' },
  failed: { label: 'Fallido', tone: 'terracotta' },
  skipped: { label: 'Omitido', tone: 'neutral' },
  unavailable: { label: 'Sin proveedor', tone: 'amber' },
};
export const emailState = (s: string | null | undefined) => pick(EMAIL_STATE, s);

export const INQUIRY_REASON: Record<string, string> = {
  find: 'Encontrar una solución',
  submit: 'Presentar un proyecto',
  partnership: 'Alianza o comunidad',
  press: 'Prensa o contenido',
  support: 'Ayuda con mi cuenta',
  other: 'Otra conversación',
};
export const INQUIRY_URGENCY: Record<string, Label> = {
  exploring: { label: 'Explorando', tone: 'neutral' },
  month: { label: 'Este mes', tone: 'blue' },
  soon: { label: 'Pronto', tone: 'amber' },
};

export const PROFILE: Record<string, string> = {
  founder: 'Fundador',
  buyer: 'Comprador',
  both: 'Ambos',
  exploring: 'Explorando',
};
export const ROLE: Record<string, string> = {
  leadership: 'Fundador / Dirección',
  product_tech: 'Producto / Tecnología',
  sales_marketing: 'Ventas / Marketing',
  operations: 'Operaciones',
  finance_procurement: 'Finanzas / Compras',
  other: 'Otro rol',
};

export const LEVEL: Record<string, Label> = {
  admin: { label: 'Administrador', tone: 'blue' },
  reviewer: { label: 'Revisor', tone: 'lavender' },
};

export type AuditGroup =
  'auth' | 'security' | 'editorial' | 'accounts' | 'community' | 'team' | 'data' | 'other';

interface ActionLabel {
  label: string;
  tone: Tone;
  group: AuditGroup;
}

/** Human wording for ops_audit_log.action. Unknown actions fall back to the raw key. */
export const AUDIT_ACTIONS: Record<string, ActionLabel> = {
  login_success: { label: 'Inició sesión', tone: 'sage', group: 'auth' },
  login_failed: { label: 'Contraseña incorrecta', tone: 'terracotta', group: 'auth' },
  login_throttled: {
    label: 'Acceso bloqueado por intentos',
    tone: 'terracotta',
    group: 'security',
  },
  login_totp_failed: { label: 'Código 2FA incorrecto', tone: 'terracotta', group: 'auth' },
  login_totp_replay: { label: 'Código 2FA reutilizado', tone: 'terracotta', group: 'security' },
  logout: { label: 'Cerró sesión', tone: 'neutral', group: 'auth' },
  totp_enrolled: { label: 'Configuró su autenticador', tone: 'sage', group: 'security' },
  enroll_code_failed: { label: 'Código de alta incorrecto', tone: 'amber', group: 'security' },
  enroll_expired: { label: 'Invitación 2FA vencida', tone: 'amber', group: 'security' },
  elevation_granted: { label: 'Activó modo seguro', tone: 'blue', group: 'security' },
  elevation_failed: { label: 'Falló el modo seguro', tone: 'terracotta', group: 'security' },
  session_revoked_failed_elevation: {
    label: 'Sesión cerrada por códigos fallidos',
    tone: 'terracotta',
    group: 'security',
  },
  session_binding_mismatch: {
    label: 'Cookie usada desde otro navegador',
    tone: 'terracotta',
    group: 'security',
  },
  session_revoked: { label: 'Cerró una sesión', tone: 'amber', group: 'security' },
  sessions_revoked_others: { label: 'Cerró sus otras sesiones', tone: 'amber', group: 'security' },
  backup_codes_regenerated: {
    label: 'Regeneró códigos de respaldo',
    tone: 'blue',
    group: 'security',
  },
  security_alert_sent: { label: 'Alerta de seguridad enviada', tone: 'neutral', group: 'security' },
  audit_chain_verified: { label: 'Verificó la bitácora', tone: 'neutral', group: 'security' },
  ops_lockdown: { label: 'Cerró todas las sesiones de ops', tone: 'terracotta', group: 'security' },
  solution_publish: { label: 'Publicó una ficha', tone: 'sage', group: 'editorial' },
  solution_reject: { label: 'Rechazó una ficha', tone: 'terracotta', group: 'editorial' },
  solution_changes_requested: { label: 'Pidió cambios', tone: 'lavender', group: 'editorial' },
  solution_withdraw: { label: 'Retiró una publicación', tone: 'terracotta', group: 'editorial' },
  solution_delete_comment: {
    label: 'Borró un comentario de ficha',
    tone: 'amber',
    group: 'community',
  },
  report_resolve: { label: 'Resolvió un reporte', tone: 'sage', group: 'editorial' },
  report_dismiss: { label: 'Descartó un reporte', tone: 'neutral', group: 'editorial' },
  report_withdraw: { label: 'Retiró por reporte', tone: 'terracotta', group: 'editorial' },
  community_report_resolve: {
    label: 'Resolvió reporte de comunidad',
    tone: 'sage',
    group: 'community',
  },
  community_report_dismiss: {
    label: 'Descartó reporte de comunidad',
    tone: 'neutral',
    group: 'community',
  },
  community_report_takedown: {
    label: 'Retiró contenido reportado',
    tone: 'terracotta',
    group: 'community',
  },
  review_report_resolve: { label: 'Resolvió reporte de reseña', tone: 'sage', group: 'community' },
  review_report_dismiss: {
    label: 'Descartó reporte de reseña',
    tone: 'neutral',
    group: 'community',
  },
  review_report_hide: { label: 'Ocultó una reseña', tone: 'terracotta', group: 'community' },
  review_restore: { label: 'Restauró una reseña', tone: 'sage', group: 'community' },
  community_unpublish_list: { label: 'Despublicó una lista', tone: 'amber', group: 'community' },
  community_delete_comment: {
    label: 'Borró un comentario de lista',
    tone: 'amber',
    group: 'community',
  },
  verify_email: { label: 'Verificó un correo', tone: 'blue', group: 'accounts' },
  suspend: { label: 'Suspendió una cuenta', tone: 'terracotta', group: 'accounts' },
  reactivate: { label: 'Reactivó una cuenta', tone: 'sage', group: 'accounts' },
  unpublish_all: { label: 'Despublicó todo de una cuenta', tone: 'terracotta', group: 'accounts' },
  revoke_sessions: { label: 'Cerró sesiones de una cuenta', tone: 'amber', group: 'accounts' },
  team_add: { label: 'Dio acceso a ops', tone: 'blue', group: 'team' },
  team_remove: { label: 'Quitó acceso a ops', tone: 'terracotta', group: 'team' },
  team_disable: { label: 'Desactivó a un miembro', tone: 'amber', group: 'team' },
  team_enable: { label: 'Reactivó a un miembro', tone: 'sage', group: 'team' },
  team_set_level: { label: 'Cambió un nivel', tone: 'lavender', group: 'team' },
  team_reset_totp: { label: 'Reinició un 2FA', tone: 'amber', group: 'team' },
  team_revoke_sessions: { label: 'Cerró sesiones de un miembro', tone: 'amber', group: 'team' },
  team_renew_enrollment: { label: 'Renovó invitación 2FA', tone: 'blue', group: 'team' },
  inquiry_handled: { label: 'Atendió un mensaje', tone: 'sage', group: 'other' },
  inquiry_reopened: { label: 'Reabrió un mensaje', tone: 'neutral', group: 'other' },
  mail_retry: { label: 'Reintentó un correo', tone: 'blue', group: 'other' },
  export: { label: 'Exportó datos', tone: 'amber', group: 'data' },
};

export function auditAction(action: string): ActionLabel {
  if (AUDIT_ACTIONS[action]) return AUDIT_ACTIONS[action];
  if (action.startsWith('export_')) return { label: 'Exportó datos', tone: 'amber', group: 'data' };
  return { label: action.replace(/_/g, ' '), tone: 'neutral', group: 'other' };
}

export const AUDIT_GROUP_LABEL: Record<AuditGroup, string> = {
  auth: 'Acceso',
  security: 'Seguridad',
  editorial: 'Editorial',
  accounts: 'Cuentas',
  community: 'Comunidad',
  team: 'Equipo',
  data: 'Datos',
  other: 'Otros',
};

export const SECURITY_ACTIONS = Object.entries(AUDIT_ACTIONS)
  .filter(([, value]) => value.group === 'auth' || value.group === 'security')
  .map(([key]) => key);
