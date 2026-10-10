// Security alerts for ops accounts, sent straight to Resend's HTTP API (same
// approach as the product, no SDK). Optional: without RESEND_API_KEY and a sender
// the alert is skipped and Sistema shows it as not configured. Never include
// codes, tokens or links that grant access in these messages.

function config() {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.OPS_ALERT_FROM?.trim() || process.env.AUTH_EMAIL_FROM?.trim();
  return key && from ? { key, from } : null;
}

export interface AlertDetails {
  device?: string;
  ip?: string | null;
  actor?: string;
}

export async function sendSecurityAlert(
  to: string,
  subject: string,
  summary: string,
  details: AlertDetails = {},
): Promise<boolean> {
  const settings = config();
  if (!settings) return false;
  const when = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(new Date());
  const lines = [
    summary,
    '',
    `Cuándo: ${when} (hora del centro de México)`,
    details.device ? `Dispositivo: ${details.device}` : null,
    details.ip ? `Dirección IP: ${details.ip}` : null,
    details.actor ? `Realizado por: ${details.actor}` : null,
    '',
    'Si no reconoces esta actividad, avisa a un administrador de ops de inmediato y cambia tu contraseña.',
    '',
    '— shwcs ops',
  ].filter((line): line is string => line !== null);
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${settings.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: settings.from,
        to: [to],
        subject: `[shwcs ops] ${subject}`,
        text: lines.join('\n'),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error('[ops/mail] alert rejected', response.status);
    return response.ok;
  } catch (err) {
    console.error('[ops/mail] alert unreachable', err instanceof Error ? err.message : err);
    return false;
  }
}
