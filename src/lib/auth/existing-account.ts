import { authSql } from '@/lib/auth/security';
import { hashToken } from '@/lib/auth/password';
import { recoveryConfig } from '@/lib/auth/recovery';
import { renderEmailHtml } from '@/lib/notifications/email-template';
import { sendEmail } from '@/lib/notifications/server';

/**
 * Someone tried to create an account with an email that already has one (SHCWS-155). The
 * screen never says so; the owner gets this email instead, so a person who forgot they
 * signed up isn't left waiting. At most one a day per address, so a burst of attempts
 * can't flood someone's inbox. Runs after the response (`after()`).
 */
export async function existingAccountNotice(email: string) {
  const config = recoveryConfig();
  if (!config) return;
  const sql = authSql();
  const [limit] = await sql`INSERT INTO auth_rate_limits (key, window_start, attempts)
    VALUES (${`register-existing:${hashToken(email)}`}, date_trunc('day', now()), 1)
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.window_start = EXCLUDED.window_start THEN auth_rate_limits.attempts + 1 ELSE 1 END,
      window_start = EXCLUDED.window_start RETURNING attempts`;
  if (Number(limit?.attempts) > 1) return;
  const [account] =
    await sql`SELECT id FROM auth_accounts WHERE email = ${email} AND suspended_at IS NULL`;
  if (!account) return;
  const signIn = `${config.origin}/es/sign-in`,
    reset = `${config.origin}/es/forgot-password`;
  const heading = 'Ya tienes una cuenta en shwcs';
  const paragraphs = [
    'Alguien, probablemente tú, intentó crear una cuenta en shwcs con este correo, pero ya existe una. No creamos otra.',
    `Entra con tu contraseña de siempre. Si no la recuerdas, <a href="${reset}" style="color:#365DC4;">elige una nueva</a>.`,
    'Si no fuiste tú, no tienes que hacer nada: nadie entró a tu cuenta y no cambió nada.',
  ];
  await sendEmail({
    to: email,
    subject: heading,
    text: [
      heading,
      '',
      'Alguien, probablemente tú, intentó crear una cuenta en shwcs con este correo, pero ya existe una. No creamos otra.',
      `Entrar: ${signIn}`,
      `Elegir una contraseña nueva: ${reset}`,
      '',
      'Si no fuiste tú, no tienes que hacer nada: nadie entró a tu cuenta y no cambió nada.',
    ].join('\n'),
    html: renderEmailHtml({
      origin: config.origin,
      preheader: heading,
      heading,
      paragraphs,
      button: { label: 'Entrar', href: signIn },
      footerNote: 'Te escribimos porque se intentó crear una cuenta con esta dirección.',
    }),
    idempotencyKey: `register-existing:${account.id}:${new Date().toISOString().slice(0, 10)}`,
  });
}
