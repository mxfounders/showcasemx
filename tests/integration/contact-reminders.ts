// Opt-in integration test for reminders and «sin respuesta» (SHCWS-61). Runs the real
// pass (src/lib/contacts/reminders.ts) against the development database, scoped to its
// own requests, and simulates time by moving those requests' created_at back. Accounts
// are @example.invalid with contact emails off, so every notice is in-app only and
// nothing is sent. Every fixture is removed in `finally`.
//
//   RUN_CONTACT_REMINDERS_INTEGRATION=1 npx tsx --env-file=<repo>/.env.local \
//     tests/integration/contact-reminders.ts
//
// With APP_ORIGIN=http://localhost:3130 (a server of this checkout on the same database)
// it also reads the buyer's and the founder's pages in both languages. A like on a test
// listing first refreshes that server's cached catalogue, which may predate the fixtures.
// With RESEND_TEST_EMAILS=1 it sends the buyer's «sin respuesta» email once, through the
// real worker, to Resend's test inbox (delivered+…@resend.dev), and nowhere else.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { runContactReminders } from '../../src/lib/contacts/reminders';
import { contactReminderKey } from '../../src/lib/contacts/reminder-model';
import { getContact, listContacts, updateContact } from '../../src/lib/contacts/server';
import { sendContactMessage } from '../../src/lib/contacts/messages';
import { responseSignals } from '../../src/lib/solutions/response';
import { loadContactReminderEmail } from '../../src/lib/notifications/contact-reminder-email';
import { deliverNotifications } from '../../src/lib/notifications/server';
import type { PublishedProduct } from '../../src/lib/solutions/public';

if (process.env.RUN_CONTACT_REMINDERS_INTEGRATION !== '1') {
  console.log('Set RUN_CONTACT_REMINDERS_INTEGRATION=1 to run against the development database.');
  process.exit(0);
}
const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url || new URL(url).pathname !== '/neondb')
  throw Error('Refusing to run outside the dev database.');

const sql = neon(url),
  origin = process.env.APP_ORIGIN,
  tag = randomUUID().slice(0, 8),
  hash = (value: string) => createHash('sha256').update(value).digest('hex');
const roles = ['founder', 'other', 'b1', 'b2', 'b3', 'b4', 'b5'] as const;
type Role = (typeof roles)[number];
const ids = {} as Record<Role, string>,
  cookies = {} as Record<Role, string>;
const listing = { l1: randomUUID(), l2: randomUUID(), l3: randomUUID(), l4: randomUUID() };
const request = {
  r1: randomUUID(),
  r2: randomUUID(),
  r3: randomUUID(),
  r4: randomUUID(),
  r5: randomUUID(),
  r0: randomUUID(),
};
const scope = Object.values(request),
  extra: string[] = [];

const ficha = (name: string, contactEmail: string) => ({
  name,
  kind: 'Software',
  category: 'Ventas',
  categories: ['Ventas'],
  capabilities: ['cotizaciones-propuestas'],
  problem: `Cotizaciones para mayoristas ${tag}.`,
  audience: 'Equipos comerciales',
  website: `https://qa-reminders-${tag}.example`,
  contactEmail,
});
const age = (id: string, hours: number) =>
  sql`UPDATE contact_requests SET created_at=now()-make_interval(hours=>${hours}),updated_at=now()-make_interval(hours=>${hours}) WHERE id=${id}`;
const keys = async (id: string) =>
  (
    await sql`SELECT source_key FROM account_notifications WHERE source_key LIKE ${'contact-%' + id + '%'} AND source_key NOT LIKE 'contact:%' ORDER BY source_key`
  ).map(row => String(row.source_key));
let passed = 0;
const step = (label: string) => console.log(`ok ${++passed} - ${label}`);

async function main() {
  try {
    for (const role of roles) {
      const id = randomUUID(),
        token = randomBytes(32).toString('hex');
      ids[role] = id;
      await sql`INSERT INTO auth_accounts(id,email,password_hash,name,email_verified_at)
        VALUES (${id},${`rem-${role}-${tag}@example.invalid`},${'scrypt-v1:qa:' + tag + role},${'QA ' + role},now())`;
      // Contact email off: notices stay in-app, nothing is queued to example.invalid.
      await sql`INSERT INTO notification_preferences(owner_id,contact_email,solution_email) VALUES (${id},false,false)
        ON CONFLICT (owner_id) DO UPDATE SET contact_email=false,solution_email=false`;
      await sql`INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES (${hash(token)},${id},now()+interval '1 hour')`;
      cookies[role] = `showcasemx-session=${token}`;
    }
    const publish = async (id: string, owner: string, name: string) => {
      const data = JSON.stringify(ficha(name, `rem-listing-${tag}@example.invalid`));
      await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at)
        VALUES (${id},${owner},${data}::jsonb,${data}::jsonb,'published',now())`;
    };
    await publish(listing.l1, ids.founder, `QA silenciosa ${tag}`);
    await publish(listing.l2, ids.other, `QA alternativa ${tag}`);
    await publish(listing.l3, ids.other, `QA ya contactada ${tag}`);
    await publish(listing.l4, ids.b4, `QA propia ${tag}`);
    const open = async (
      id: string,
      buyer: Role,
      solution: string,
      account = { id: ids[buyer], email: `rem-${buyer}-${tag}@example.invalid` },
    ) => {
      const details = JSON.stringify({
        name: 'QA',
        company: `Empresa ${buyer}`,
        size: 'pyme',
        timeline: 'Este mes',
        budget: '',
        need: 'Necesitamos cotizar a mayoristas cada semana sin errores.',
      });
      await sql`INSERT INTO contact_requests(id,buyer_id,recipient_id,solution_id,project_name,buyer_email,details,consent_version)
        SELECT ${id},${account.id},s.owner_id,s.id,s.published_data->>'name',${account.email},${details}::jsonb,'contact-v1'
        FROM founder_solutions s WHERE s.id=${solution}`;
      await sql`INSERT INTO contact_events(request_id,actor_id,status,message) VALUES (${id},${account.id},'new','Solicitud enviada con consentimiento.')`;
    };
    await open(request.r1, 'b1', listing.l1);
    await open(request.r2, 'b2', listing.l1);
    await open(request.r3, 'b3', listing.l1);
    await open(request.r4, 'b4', listing.l1);
    await open(request.r5, 'b5', listing.l1);
    await open(request.r0, 'b4', listing.l3);

    // ---- The three steps, in their times --------------------------------------------
    for (const id of [request.r1, request.r2, request.r3]) await age(id, 47);
    await age(request.r4, 2);
    await age(request.r5, 2);
    await age(request.r0, 2);
    let run = await runContactReminders({ only: scope });
    assert.deepEqual(run, { checked: 0, reminders: 0, marked: 0, notified: 0 }, 'nothing at 47 h');
    // R3 is answered within 48 hours: it never hears from the pass.
    assert.equal(
      (await sendContactMessage(request.r3, ids.founder, 'Hola, ¿hablamos el jueves?')).ok,
      true,
    );
    step('before 48 hours nothing is sent');

    for (const id of [request.r1, request.r2, request.r3]) await age(id, 49);
    run = await runContactReminders({ only: scope });
    assert.equal(run.reminders, 2, '48 h reminders');
    assert.deepEqual(await keys(request.r1), [contactReminderKey(request.r1, 'first')]);
    assert.deepEqual(await keys(request.r3), [], 'an answered request gets no reminder');
    const [first] =
      await sql`SELECT owner_id,title,href,email_state,category FROM account_notifications WHERE source_key=${contactReminderKey(request.r1, 'first')}`;
    assert.equal(first.owner_id, ids.founder);
    assert.equal(first.category, 'contact');
    assert.equal(
      first.title,
      `Recordatorio: Empresa b1 espera tu respuesta sobre QA silenciosa ${tag}`,
    );
    assert.equal(first.href, `/account/opportunities/${request.r1}`);
    assert.equal(first.email_state, 'disabled', 'contact email off: in-app only');
    run = await runContactReminders({ only: scope });
    assert.equal(run.reminders, 0, 'running again sends nothing');
    step('48 hours: one reminder to the founder, once');

    for (const id of [request.r1, request.r2]) await age(id, 121);
    run = await runContactReminders({ only: scope });
    assert.equal(run.reminders, 2, '5 day reminders');
    assert.deepEqual(await keys(request.r1), [
      contactReminderKey(request.r1, 'first'),
      contactReminderKey(request.r1, 'second'),
    ]);
    assert.equal((await runContactReminders({ only: scope })).reminders, 0);
    step('5 days: the second reminder, once');

    for (const id of [request.r1, request.r2]) await age(id, 169);
    run = await runContactReminders({ only: scope });
    assert.equal(run.marked, 2);
    assert.equal(run.notified, 2);
    const [notice] =
      await sql`SELECT owner_id,title,href FROM account_notifications WHERE source_key=${contactReminderKey(request.r1, 'unanswered')}`;
    assert.equal(notice.owner_id, ids.b1, 'the buyer hears about it');
    assert.equal(notice.title, `QA silenciosa ${tag} no respondió a tu solicitud`);
    assert.equal(notice.href, `/account/contacts/${request.r1}`);
    const [marked] =
      await sql`SELECT status,unanswered_at FROM contact_requests WHERE id=${request.r1}`;
    assert.equal(marked.status, 'new', '«sin respuesta» is not a status');
    assert.ok(marked.unanswered_at);
    assert.deepEqual(await runContactReminders({ only: scope }), {
      checked: 0,
      reminders: 0,
      marked: 0,
      notified: 0,
    });
    assert.equal((await getContact(request.r1, ids.b1))?.unanswered, true);
    assert.equal((await getContact(request.r1, ids.founder))?.unanswered, true);
    const inbox = await listContacts(ids.founder, true, '', 1);
    assert.equal(inbox.find(row => row.id === request.r1)?.unanswered, true);
    assert.equal(inbox.find(row => row.id === request.r3)?.unanswered, false);
    step('7 days: marked «sin respuesta», the buyer is told, nothing repeats');

    // ---- A late first run catches up without stale reminders -------------------------
    await age(request.r4, 24 * 10);
    await age(request.r5, 24 * 20);
    run = await runContactReminders({ only: [request.r4, request.r5] });
    assert.deepEqual(run, { checked: 2, reminders: 0, marked: 2, notified: 1 });
    assert.deepEqual(await keys(request.r4), [contactReminderKey(request.r4, 'unanswered')]);
    assert.deepEqual(await keys(request.r5), [], 'too old to be news: marked silently');
    step('a missed week marks without sending old reminders; old requests are marked silently');

    // ---- The response signal ---------------------------------------------------------
    const r2 = await getContact(request.r2, ids.b2);
    assert.ok(r2);
    await updateContact(request.r2, ids.b2, 'withdrawn', r2.version, '');
    let signal = (await responseSignals(listing.l1)).get(listing.l1);
    // R1, R4, R5 open and unanswered; R2 withdrawn after being marked still counts;
    // R3 answered. Before SHCWS-61 a withdrawal hid R2 and this read 4.
    assert.deepEqual(
      { requests: signal?.requests, answered: signal?.answered },
      { requests: 5, answered: 1 },
    );
    step('a request marked «sin respuesta» counts against the signal even once withdrawn');

    // ---- A late reply removes the label ---------------------------------------------
    assert.equal(
      (await sendContactMessage(request.r1, ids.founder, 'Perdón por la demora.')).ok,
      true,
    );
    const replied = await getContact(request.r1, ids.b1);
    assert.equal(replied?.unanswered, false);
    assert.equal(replied?.status, 'conversation');
    signal = (await responseSignals(listing.l1)).get(listing.l1);
    assert.equal(signal?.answered, 2, 'a late reply is an answer, with its slow time');
    step('a late reply removes the label and counts as answered');

    // ---- What the emails say ---------------------------------------------------------
    const products: PublishedProduct[] = Object.entries(listing).map(([, id]) => ({
      name: id === listing.l2 ? 'Alternativa' : id,
      description: 'Cotiza a mayoristas.',
      feature: '',
      category: 'Ventas',
      categories: ['Ventas'],
      capabilities: ['cotizaciones-propuestas'],
      response: null,
      detailUrl: `/soluciones/${id}`,
    }));
    const build = (key: string, owner: string) =>
      loadContactReminderEmail({
        title: 't',
        sourceKey: key,
        owner,
        origin: 'https://shwcs.example',
        catalog: async () => products,
      });
    const buyerMail = await build(contactReminderKey(request.r4, 'unanswered'), ids.b4);
    assert.equal(buyerMail.skip, false);
    if (!buyerMail.skip) {
      const html = buyerMail.paragraphs.join('\n');
      assert.ok(html.includes(`/es/soluciones/${listing.l2}`), 'the similar listing');
      for (const id of [listing.l1, listing.l3, listing.l4])
        assert.ok(!html.includes(`/es/soluciones/${id}`), `never ${id}`);
      assert.ok(html.includes('/es/contacto?motivo=find'), 'and the way to ask for help');
      assert.ok(!html.includes('cotizar a mayoristas cada semana'), 'never the buyer’s need');
      assert.deepEqual(buyerMail.extraTo, []);
    }
    const founderMail = await build(contactReminderKey(request.r4, 'second'), ids.founder);
    assert.equal(founderMail.skip, false);
    if (!founderMail.skip) {
      assert.ok(founderMail.paragraphs[0].includes('hace 10 días'));
      assert.deepEqual(founderMail.extraTo, [`rem-listing-${tag}@example.invalid`]);
    }
    assert.equal((await build(contactReminderKey(request.r1, 'first'), ids.founder)).skip, true);
    assert.equal((await build(contactReminderKey(request.r2, 'second'), ids.founder)).skip, true);
    assert.equal((await build(contactReminderKey(request.r4, 'unanswered'), ids.b5)).skip, true);
    step('emails: alternatives without the silent, owned or contacted listings; stale ones skip');

    // ---- A real send to Resend's test inbox (optional) -------------------------------
    // Delivery is scoped to this one notice; the address is delivered+…@resend.dev.
    if (process.env.RESEND_TEST_EMAILS === '1') {
      const mail = { id: randomUUID(), email: `delivered+shwcs-reminders-${tag}@resend.dev` };
      extra.push(mail.id);
      await sql`INSERT INTO auth_accounts(id,email,password_hash,name,email_verified_at)
        VALUES (${mail.id},${mail.email},${'scrypt-v1:qa:' + tag + 'mail'},'QA mail',now())`;
      await sql`INSERT INTO notification_preferences(owner_id,contact_email) VALUES (${mail.id},true)
        ON CONFLICT (owner_id) DO UPDATE SET contact_email=true`;
      const r6 = randomUUID();
      scope.push(r6);
      await open(r6, 'b5', listing.l1, mail);
      await age(r6, 169);
      assert.equal((await runContactReminders({ only: [r6] })).notified, 1);
      const [notice] =
        await sql`SELECT id,email_state FROM account_notifications WHERE source_key=${contactReminderKey(r6, 'unanswered')}`;
      assert.equal(notice.email_state, 'pending', 'verified and opted in: queued');
      const sent = await deliverNotifications({ ids: [String(notice.id)] });
      assert.equal(sent.available, true, 'Resend configured');
      assert.equal(sent.sent, 1);
      const [after] =
        await sql`SELECT email_state,provider_id FROM account_notifications WHERE id=${notice.id}`;
      assert.equal(after.email_state, 'sent');
      assert.ok(after.provider_id);
      // A reply before a retry: the notice no longer applies and is skipped, not sent.
      await sendContactMessage(r6, ids.founder, 'Ya te respondo, perdón.');
      await sql`UPDATE account_notifications SET email_state='pending',attempts=0,provider_id=NULL WHERE id=${notice.id}`;
      const again = await deliverNotifications({ ids: [String(notice.id)] });
      assert.deepEqual({ sent: again.sent, skipped: again.skipped }, { sent: 0, skipped: 1 });
      step('the buyer’s email goes out through the worker; a reply first makes it skip');
    }

    // ---- The pages (optional) --------------------------------------------------------
    if (origin) {
      const page = async (path: string, who: Role) => {
        const response = await fetch(origin + path, {
          headers: { cookie: cookies[who] },
          redirect: 'manual',
        });
        assert.equal(response.status, 200, path);
        return response.text();
      };
      // A like revalidates the 'catalog' tag, so the server's cached catalogue includes
      // this run's listings (alternatives come from it, like on a listing page).
      const like = await fetch(origin + '/api/solutions/social', {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json', cookie: cookies.b1 },
        body: JSON.stringify({ action: 'like', solutionId: listing.l2 }),
      });
      assert.equal(like.status, 200, 'like to refresh the catalogue');
      // Rendered text, not the dictionary that travels in the RSC payload: `>…<`.
      const buyerPage = await page(`/es/account/contacts/${request.r4}`, 'b4');
      assert.match(buyerPage, />Sin respuesta</);
      assert.ok(buyerPage.includes(`QA silenciosa ${tag} no respondió en 7 días`));
      assert.match(buyerPage, />Mientras tanto, alternativas parecidas</);
      assert.ok(buyerPage.includes(`/soluciones/${listing.l2}`), 'the similar listing');
      assert.ok(!buyerPage.includes(`/soluciones/${listing.l3}`), 'not the contacted one');
      assert.ok(!buyerPage.includes(`/soluciones/${listing.l4}`), 'not the buyer’s own');
      assert.match(await page(`/en/account/contacts/${request.r4}`, 'b4'), />No reply</);
      const founderPage = await page(`/es/account/opportunities/${request.r4}`, 'founder');
      assert.match(founderPage, />Sin respuesta</);
      assert.match(founderPage, />Pasaron 7 días sin respuesta/);
      assert.ok(
        !founderPage.includes('>Mientras tanto, alternativas parecidas<'),
        'alternatives are the buyer’s',
      );
      assert.match(await page('/es/account/opportunities', 'founder'), />Sin respuesta</);
      assert.match(await page('/es/account/contacts', 'b4'), />Sin respuesta</);
      const answered = await page(`/es/account/contacts/${request.r1}`, 'b1');
      assert.ok(!answered.includes('>Mientras tanto, alternativas parecidas<'));
      assert.ok(!answered.includes('>Sin respuesta<'), 'a late reply removes the label');
      step('pages: the label for both sides, alternatives for the buyer, in both languages');
    }
  } finally {
    const accounts = [...Object.values(ids), ...extra];
    await sql`DELETE FROM auth_accounts WHERE id = ANY(${accounts}::uuid[])`;
    const [left] =
      await sql`SELECT (SELECT count(*)::int FROM contact_requests WHERE id = ANY(${scope}::uuid[])) AS requests,
        (SELECT count(*)::int FROM founder_solutions WHERE id = ANY(${Object.values(listing)}::uuid[])) AS listings,
        (SELECT count(*)::int FROM account_notifications WHERE owner_id = ANY(${accounts}::uuid[])) AS notices`;
    console.log(
      `cleanup: ${left.requests} requests, ${left.listings} listings, ${left.notices} notices left`,
    );
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
