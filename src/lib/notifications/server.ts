import { authSql } from '@/lib/auth/security';
import { recoveryConfig } from '@/lib/auth/recovery';
import { escapeHtml, renderEmailHtml } from '@/lib/notifications/email-template';
import { welcomeEmail } from '@/lib/notifications/welcome-email';
import { listingNotificationEmail, type ListingEvent } from '@/lib/notifications/listing-email';
import { publicProducts } from '@/lib/solutions/public';
import { categories as taxonomyCategories } from '@/lib/taxonomy';
import { contactNotificationEmail } from '@/lib/notifications/contact-email';
import { reviewRequestEmail } from '@/lib/notifications/review-request-email';
import { loadSearchAlertEmail } from '@/lib/notifications/alert-email';
import { loadFollowDigestEmail } from '@/lib/notifications/follow-email';
import { getDictionary } from '@/i18n/get-dictionary';
export async function notificationPreferences(owner: string) {
  const sql = authSql();
  const [row] =
    // Contact alerts are on unless turned off (SHCWS-13, db/contact-alerts-default.sql).
    await sql`SELECT a.email_verified_at,COALESCE(p.contact_email,true) AS contact_email,COALESCE(p.solution_email,true) AS solution_email,COALESCE(p.community_email,false) AS community_email,COALESCE(p.weekly_email,true) AS weekly_email,COALESCE(p.alert_email,true) AS alert_email FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=${owner}`;
  return {
    verified: !!row?.email_verified_at,
    contactEmail: !!row?.contact_email,
    solutionEmail: !!row?.solution_email,
    communityEmail: !!row?.community_email,
    weeklyEmail: !!row?.weekly_email,
    alertEmail: !!row?.alert_email,
    emailAvailable: !!recoveryConfig(),
  };
}
// Options object, not positional params: four call sites already needed
// different subsets of idempotencyKey/replyTo/html, which made positional
// args error-prone (easy to shift an argument into the wrong slot).
export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  idempotencyKey?: string;
  replyTo?: string;
  /** Extra email headers, e.g. List-Unsubscribe for the weekly summary (RFC 8058). */
  headers?: Record<string, string>;
}) {
  const config = recoveryConfig();
  if (!config) throw Error('Email unavailable');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      ...(opts.idempotencyKey ? { 'Idempotency-Key': opts.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: config.from,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      ...(opts.headers ? { headers: opts.headers } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw Error('Delivery unavailable');
  const result = await response.json();
  return typeof result.id === 'string' ? result.id : null;
}
/**
 * Sends pending notification emails. The daily cron drains everything; a contact
 * request or reply calls it right away for just that conversation (SHCWS-13), so the
 * other side hears within seconds and the cron stays as the retry.
 */
export async function deliverNotifications({
  contactRequestId,
  ids = [],
  categories = [],
}: { contactRequestId?: string; ids?: string[]; categories?: string[] } = {}) {
  const config = recoveryConfig();
  if (!config)
    return { available: false, processed: 0, sent: 0, skipped: 0, pending: 0, failed: 0 };
  const sql = authSql();
  // Provider idempotency is bounded to 24h. Do not automatically retry uncertain older sends.
  await sql`UPDATE account_notifications SET email_state='failed' WHERE (email_state='sending' OR (email_state='pending' AND attempts>0)) AND created_at<now()-interval '23 hours'`;
  // Hobby runs this worker daily, so drain a useful bounded batch per invocation.
  const rows =
    await sql`WITH candidates AS (SELECT id FROM account_notifications WHERE attempts<5 AND next_attempt_at<=now() AND (email_state='pending' OR (email_state='sending' AND locked_at<now()-interval '5 minutes'))
      AND (${contactRequestId ?? null}::uuid IS NULL OR (category='contact' AND href IN ('/account/opportunities/'||${contactRequestId ?? ''},'/account/contacts/'||${contactRequestId ?? ''})))
      AND (cardinality(${ids}::uuid[])=0 OR id=ANY(${ids}::uuid[]))
      AND (cardinality(${categories}::text[])=0 OR category=ANY(${categories}::text[]))
      ORDER BY created_at LIMIT 25 FOR UPDATE SKIP LOCKED) UPDATE account_notifications n SET email_state='sending',locked_at=now(),attempts=attempts+1 FROM candidates c WHERE n.id=c.id RETURNING n.*`;
  const contactLabels = rows.some(row => row.category === 'contact')
    ? (await getDictionary('es')).contacts
    : null;
  let sent = 0,
    skipped = 0;
  for (const row of rows) {
    try {
      const [recipient] =
        // Security notices and the one-off welcome don't depend on Preferencias de avisos
        // or on a verified address (SHCWS-154/153); contact and listing alerts do.
        await sql`SELECT a.email,a.profile FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=${row.owner_id}
          AND (CASE WHEN ${row.category} IN ('security','account') THEN true
            WHEN ${row.category}='contact' THEN a.email_verified_at IS NOT NULL AND COALESCE(p.contact_email,true)
            WHEN ${row.category}='community' THEN a.email_verified_at IS NOT NULL AND COALESCE(p.community_email,false)
            WHEN ${row.category}='alert' THEN a.email_verified_at IS NOT NULL AND COALESCE(p.alert_email,true)
              AND EXISTS(SELECT 1 FROM search_alert_matches m JOIN founder_solutions s ON s.id=m.solution_id AND s.published_data IS NOT NULL WHERE m.notice_key=${row.source_key})
            ELSE a.email_verified_at IS NOT NULL AND COALESCE(p.solution_email,true) END)`;
      if (!recipient) {
        await sql`UPDATE account_notifications SET email_state='skipped',locked_at=NULL WHERE id=${row.id}`;
        skipped++;
        continue;
      }
      const title = String(row.title),
        href = `${config.origin}${row.href}`,
        prefs = `${config.origin}/account/settings/notifications`;
      let to: string[] = [String(recipient.email)];
      let email = {
        subject: title,
        heading: title,
        button: 'Ver detalles',
        paragraphs: [
          'Hay novedades en tu cuenta de shwcs. Abre tu cuenta para consultar los detalles.',
        ],
        text: `${title}.\n\nAbre tu cuenta para consultar los detalles.`,
      };
      let buttonHref = href,
        footerNote = 'Puedes ajustar qué avisos te llegan por correo desde Preferencias de avisos.';
      if (row.category === 'account' && String(row.source_key).startsWith('welcome:')) {
        // Only catalog pages that have listings today, busiest first.
        const counts = new Map<string, number>();
        for (const product of await publicProducts().catch(() => []))
          for (const label of product.categories) counts.set(label, (counts.get(label) ?? 0) + 1);
        const pages = taxonomyCategories
          .filter(category => counts.has(category.label))
          .sort((a, b) => (counts.get(b.label) ?? 0) - (counts.get(a.label) ?? 0));
        const welcome = welcomeEmail({
          profile: recipient.profile ? String(recipient.profile) : null,
          origin: config.origin,
          categories: pages,
        });
        email = {
          subject: welcome.subject,
          heading: welcome.heading,
          button: welcome.button.label,
          paragraphs: welcome.paragraphs,
          text: [
            welcome.heading,
            '',
            ...welcome.paragraphs.map(p => p.replace(/<[^>]+>/g, '')),
          ].join('\n'),
        };
        buttonHref = welcome.button.href;
        footerNote = 'Te escribimos una sola vez, al terminar de crear tu cuenta.';
      }
      if (row.category === 'security') {
        // What happened and on which device are in the title; this adds when. «No fui yo»
        // leads to choosing a new password, which closes every open session
        // (consumeReset); a GET link must never change anything by itself (CLAUDE.md §5).
        const when = new Date(String(row.created_at)).toLocaleString('es-MX', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Mexico_City',
        });
        email = {
          subject: title,
          heading: title,
          button: 'No fui yo',
          paragraphs: [
            `<strong>Cuándo:</strong> ${escapeHtml(when)} (hora del centro de México).`,
            'Si fuiste tú, no tienes que hacer nada. Si no, elige una contraseña nueva ahora: eso cierra todas las sesiones abiertas de tu cuenta.',
          ],
          text: `${title}.\nCuándo: ${when} (hora del centro de México).\n\nSi no fuiste tú, elige una contraseña nueva: eso cierra todas las sesiones abiertas.`,
        };
        buttonHref = `${config.origin}/es/forgot-password`;
        footerNote = 'Los avisos de seguridad siempre se envían; no se pueden desactivar.';
      }
      if (row.category === 'community') {
        // Grouped counts for the curator's public list (db/community-notices.sql). Who
        // liked or saved it is never part of the notice.
        email = {
          subject: title,
          heading: title,
          button: 'Ver mi lista',
          paragraphs: [
            'Hubo actividad en tu lista pública de shwcs. Contamos me gusta, guardados y comentarios por día; no mostramos quién dio me gusta ni quién la guardó.',
          ],
          text: `${title}.\n\nContamos me gusta, guardados y comentarios por día; no mostramos quién dio me gusta ni quién la guardó.`,
        };
        footerNote =
          'Recibes esto porque activaste los avisos de tus listas por correo en Preferencias de avisos.';
      }
      if (row.category === 'community' && String(row.source_key).startsWith('follow:')) {
        // Weekly summary of followed lists and curators (SHCWS-121, follow-email.ts).
        const built = await loadFollowDigestEmail({
          title,
          sourceKey: String(row.source_key),
          owner: String(row.owner_id),
          origin: config.origin,
        });
        email = { ...built, button: built.button.label };
        buttonHref = built.button.href;
        footerNote = built.footerNote;
      }
      if (row.category === 'alert') {
        // Saved-search alerts (SHCWS-47, alert-email.ts): the listings that matched.
        const built = await loadSearchAlertEmail({
          title,
          sourceKey: String(row.source_key),
          origin: config.origin,
        });
        if (built) {
          email = { ...built, button: built.button.label };
          buttonHref = built.button.href;
          footerNote = built.footerNote;
        }
      }
      if (row.category === 'solution') {
        // Listing notices link to /account/solutions/<id>…, except «on a public list»
        // (listed:<list>:<solution>, which links to the list); the source key says what
        // happened (db/listing-notices.sql). The reporter is never looked up.
        const source = String(row.source_key),
          kind = source.slice(0, source.indexOf(':')),
          key = source.slice(source.indexOf(':') + 1),
          solutionId =
            kind === 'listed'
              ? key.split(':')[1]
              : /^\/account\/solutions\/([0-9a-f-]{36})/.exec(String(row.href))?.[1];
        const [listing] = solutionId
          ? await sql`SELECT COALESCE(published_data->>'name',data->>'name') AS name FROM founder_solutions WHERE id=${solutionId}`
          : [];
        let event: ListingEvent = { kind: 'other' };
        if (kind === 'solution') {
          const [found] =
            await sql`SELECT status,message FROM solution_events WHERE id::text=${key}`;
          if (found)
            event = {
              kind: 'decision',
              status: String(found.status),
              message: String(found.message ?? ''),
            };
        } else if (kind === 'comment') {
          const [found] =
            await sql`SELECT author_name,body FROM solution_comments WHERE id::text=${key}`;
          if (found)
            event = {
              kind: 'comment',
              author: String(found.author_name),
              body: String(found.body),
            };
        } else if (kind === 'listed') {
          const [found] =
            await sql`SELECT name FROM buyer_lists WHERE id::text=${key.split(':')[0]} AND visibility='public'`;
          if (found)
            event = {
              kind: 'listed',
              listName: String(found.name),
              listUrl: `${config.origin}/es/comunidad/${key.split(':')[0]}`,
            };
        } else if (kind === 'report') {
          const [found] = await sql`SELECT reason FROM solution_reports WHERE id::text=${key}`;
          if (found) event = { kind: 'report', reason: String(found.reason) };
        } else if (kind === 'review') {
          const [found] =
            await sql`SELECT rating,headline FROM solution_reviews WHERE id::text=${key}`;
          if (found)
            event = {
              kind: 'review',
              rating: Number(found.rating),
              headline: String(found.headline),
            };
        } else if (kind === 'question') {
          // A public question (SHCWS-57): only the alias and text, both already public.
          const [found] =
            await sql`SELECT author_name,body FROM solution_questions WHERE id::text=${key} AND hidden_at IS NULL`;
          if (found)
            event = {
              kind: 'question',
              author: String(found.author_name),
              body: String(found.body),
            };
        }
        if (solutionId && listing?.name) {
          const built = listingNotificationEmail({
            title,
            solutionId,
            solutionName: String(listing.name),
            origin: config.origin,
            event,
          });
          email = {
            subject: built.subject,
            heading: built.heading,
            // Sponsored-slot notices open the slot's own page, not the listing.
            button: kind === 'ad' ? 'Ver mi espacio patrocinado' : built.button.label,
            paragraphs: built.paragraphs,
            text: built.text,
          };
          buttonHref = kind === 'ad' ? `${config.origin}/es${row.href}` : built.button.href;
        }
      }
      if (row.category === 'contact' && String(row.source_key).startsWith('review-request:')) {
        // shwcs asks the buyer for a review 30 days after a conversation (SHCWS-135,
        // db/review-invitations.sql). Nothing from the conversation goes in the email.
        const solutionId = /^\/account\/reviews\/([0-9a-f-]{36})$/.exec(String(row.href))?.[1];
        const [listing] = solutionId
          ? await sql`SELECT published_data->>'name' AS name FROM founder_solutions WHERE id=${solutionId} AND published_data IS NOT NULL`
          : [];
        if (solutionId && listing?.name) {
          const built = reviewRequestEmail({
            title,
            solutionId,
            solutionName: String(listing.name),
            origin: config.origin,
          });
          email = { ...built, button: built.button.label };
          buttonHref = built.button.href;
        }
      }
      const [event] =
        row.category === 'contact' && contactLabels
          ? await sql`SELECT e.status,e.kind,e.actor_id,e.message,r.project_name,r.details,r.recipient_id,s.data->>'contactEmail' AS listing_email
              FROM contact_events e JOIN contact_requests r ON r.id=e.request_id LEFT JOIN founder_solutions s ON s.id=r.solution_id
              WHERE 'contact:'||e.id::text=${String(row.source_key)}`
          : [];
      if (event && contactLabels) {
        const toRecipient = String(event.recipient_id) === String(row.owner_id);
        email = contactNotificationEmail({
          title,
          event: {
            status: String(event.status),
            kind: String(event.kind ?? 'status'),
            message: String(event.message ?? ''),
            projectName: String(event.project_name),
            details: (event.details ?? {}) as Record<string, unknown>,
            fromOtherSide: String(event.actor_id) !== String(row.owner_id),
          },
          toRecipient,
          labels: contactLabels,
        });
        // A new lead also goes to the listing's private contact address, declared by the
        // same owner whose account email is verified (CLAUDE.md §7: never shown publicly).
        const listing = String(event.listing_email ?? '')
          .trim()
          .toLowerCase();
        if (
          event.status === 'new' &&
          event.kind !== 'message' &&
          toRecipient &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(listing) &&
          !to.includes(listing)
        )
          to = [...to, listing];
      }
      const html = renderEmailHtml({
        origin: config.origin,
        preheader: email.subject,
        heading: email.heading,
        paragraphs: email.paragraphs,
        button: { label: email.button, href: buttonHref },
        footerNote,
      });
      const provider = await sendEmail({
        to,
        subject: email.subject,
        text: `${email.text}\n\n${email.button}: ${buttonHref}\n\nPreferencias de avisos: ${prefs}`,
        html,
        idempotencyKey: String(row.id),
      });
      await sql`UPDATE account_notifications SET email_state='sent',provider_id=${provider},locked_at=NULL WHERE id=${row.id}`;
      sent++;
    } catch {
      await sql`UPDATE account_notifications SET email_state=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,next_attempt_at=now()+interval '5 minutes'*power(2,attempts),locked_at=NULL WHERE id=${row.id}`;
    }
  }
  const [totals] =
    await sql`SELECT count(*) FILTER(WHERE email_state='pending')::int AS pending,count(*) FILTER(WHERE email_state='failed')::int AS failed FROM account_notifications`;
  return {
    available: true,
    processed: rows.length,
    sent,
    skipped,
    pending: Number(totals?.pending ?? 0),
    failed: Number(totals?.failed ?? 0),
  };
}
