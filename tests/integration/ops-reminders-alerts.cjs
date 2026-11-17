// Opt-in integration test for the two ops boards of SHCWS-61 and SHCWS-175: requests the
// founder never answered in /panel/contactos, and saved-search alerts by topic in
// /panel/demanda. Fixtures go straight into the development database (an ops session is
// inserted, never created through login), the pages are read from a running ops app on
// the same database, and every fixture is removed in `finally`. Nothing is sent.
//
//   RUN_OPS_REMINDERS_INTEGRATION=1 OPS_ORIGIN=http://localhost:3131 \
//     node --env-file=<repo>/.env.local tests/integration/ops-reminders-alerts.cjs
const assert = require('node:assert/strict'),
  { createHash, randomBytes, randomUUID } = require('node:crypto');
if (process.env.RUN_OPS_REMINDERS_INTEGRATION !== '1') {
  console.log('Set RUN_OPS_REMINDERS_INTEGRATION=1 against a running ops app (OPS_ORIGIN).');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless');
const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url || new URL(url).pathname !== '/neondb')
  throw Error('Refusing to run outside the dev database.');
const sql = neon(url),
  origin = process.env.OPS_ORIGIN || 'http://localhost:3131',
  tag = randomUUID().slice(0, 8),
  hash = value => createHash('sha256').update(value).digest('hex');
const roles = ['ops', 'founder', 'a1', 'a2', 'a3', 'a4', 'suspended', 'searcher'];
const ids = {},
  email = role => `opsrem-${role}-${tag}@example.invalid`,
  listing = randomUUID(),
  requests = {
    waiting: randomUUID(),
    ignored: randomUUID(),
    late: randomUUID(),
    fresh: randomUUID(),
  },
  secret = `SECRETO-${tag}`,
  message = `MENSAJE-${tag}`,
  nomina = `Nómina · Retail · QA ${tag}`,
  ventas = `«mayoreo ${tag}»`;
let opsCookie = '';
let passed = 0;
const step = label => console.log(`ok ${++passed} - ${label}`);
const page = async path => {
  const response = await fetch(origin + path, {
    headers: { cookie: opsCookie },
    redirect: 'manual',
  });
  assert.equal(response.status, 200, path);
  return response.text();
};
// Where `marker` is rendered as text (`>text<`), not in the dev-mode RSC debug payload,
// which carries the same values earlier in the document.
const at = (html, marker) => html.indexOf(`>${marker}<`);
/** The text of each cell in the table row that contains `marker`. */
const row = (html, marker) => {
  const index = at(html, marker);
  assert.ok(index >= 0, `row for ${marker}`);
  const start = html.lastIndexOf('<tr', index),
    end = html.indexOf('</tr>', index);
  return [...html.slice(start, end).matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(match =>
    match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim(),
  );
};

(async () => {
  try {
    for (const role of roles) {
      ids[role] = randomUUID();
      await sql`INSERT INTO auth_accounts(id,email,password_hash,name,email_verified_at,suspended_at)
        VALUES (${ids[role]},${email(role)},${'scrypt-v1:qa:' + tag + role},${'QA ' + role},now(),
          ${role === 'suspended' ? new Date().toISOString() : null})`;
      await sql`INSERT INTO notification_preferences(owner_id,contact_email,solution_email,alert_email)
        VALUES (${ids[role]},false,false,false) ON CONFLICT (owner_id) DO NOTHING`;
    }
    const token = randomBytes(32).toString('hex');
    await sql`INSERT INTO solution_reviewers(account_id,level) VALUES (${ids.ops},'reviewer')`;
    await sql`INSERT INTO ops_sessions(token_hash,account_id,expires_at) VALUES (${hash(token)},${ids.ops},now()+interval '1 hour')`;
    opsCookie = `ops-session=${token}`;

    // ---- SHCWS-61: requests without a reply ------------------------------------------
    const data = JSON.stringify({
      name: `QA ops ${tag}`,
      kind: 'Software',
      category: 'Nómina',
      categories: ['Nómina'],
      problem: 'Nómina para tiendas.',
      audience: 'Retail',
      website: `https://qa-opsrem-${tag}.example`,
      contactEmail: email('founder'),
    });
    await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at)
      VALUES (${listing},${ids.founder},${data}::jsonb,${data}::jsonb,'published',now())`;
    const open = async (key, buyer, hours) => {
      const details = JSON.stringify({
        name: 'QA',
        company: 'Empresa QA',
        size: 'pyme',
        timeline: 'Este mes',
        budget: '',
        need: `Necesidad privada ${secret} que ops nunca ve.`,
      });
      await sql`INSERT INTO contact_requests(id,buyer_id,recipient_id,solution_id,project_name,buyer_email,details,consent_version,created_at,updated_at)
        VALUES (${requests[key]},${ids[buyer]},${ids.founder},${listing},${`QA ${key} ${tag}`},${email(buyer)},${details}::jsonb,'contact-v1',
          now()-make_interval(hours=>${hours}),now()-make_interval(hours=>${hours}))`;
      await sql`INSERT INTO contact_events(request_id,actor_id,status,message,kind)
        VALUES (${requests[key]},${ids[buyer]},'new',${message},'message')`;
    };
    await open('waiting', 'a1', 50);
    await open('ignored', 'a2', 24 * 8);
    await open('late', 'a3', 24 * 9);
    await open('fresh', 'a4', 10);
    const remind = (key, suffix) =>
      sql`INSERT INTO account_notifications(owner_id,category,source_key,title,href)
        VALUES (${ids.founder},'contact',${`contact-reminder:${requests[key]}:${suffix}`},'QA','/account')`;
    await remind('waiting', '48h');
    await remind('ignored', '48h');
    await remind('ignored', '5d');
    await sql`UPDATE contact_requests SET unanswered_at=now()-interval '1 day' WHERE id = ANY(${[requests.ignored, requests.late]}::uuid[])`;
    // «late» was answered after being marked.
    await sql`INSERT INTO contact_events(request_id,actor_id,status,message,kind)
      VALUES (${requests.late},${ids.founder},'conversation',${message},'message')`;
    await sql`UPDATE contact_requests SET status='conversation' WHERE id=${requests.late}`;

    const contacts = await page('/panel/contactos');
    assert.match(contacts, /Sin respuesta del fundador/);
    const waiting = row(contacts, `QA waiting ${tag}`);
    assert.ok(waiting.includes(email('founder')), 'the founder, as metadata');
    assert.ok(waiting.includes('Recordatorio 48 h'));
    assert.ok(waiting.includes('2'), 'two days without reply');
    const ignored = row(contacts, `QA ignored ${tag}`);
    assert.ok(ignored.includes('Sin respuesta'));
    assert.ok(ignored.includes('8'));
    // The answered one and the 10-hour-old one are not in the board (the general table
    // below still lists every request, so look only inside the board's own table).
    const board = contacts.slice(
      contacts.indexOf('aria-label="Solicitudes sin respuesta"'),
      contacts.indexOf('aria-label="Solicitudes de contacto"'),
    );
    assert.ok(board.includes(`QA waiting ${tag}`), 'the board is where we look');
    assert.ok(!board.includes(`QA late ${tag}`), 'answered late: not ignored any more');
    assert.ok(!board.includes(`QA fresh ${tag}`), 'under 48 hours: not yet');
    for (const marker of [secret, message, email('a1'), email('a2')])
      assert.ok(!board.includes(marker), `the board never shows ${marker}`);
    assert.ok(!contacts.includes(secret) && !contacts.includes(message), 'no details or messages');
    step('/panel/contactos lists unanswered requests with their stage, metadata only');

    // ---- SHCWS-175: alerts by topic ---------------------------------------------------
    const alert = (owner, scope, topic, label) =>
      sql`INSERT INTO search_alerts(id,owner_id,scope,topic,query,filters,signature,label)
        VALUES (${randomUUID()},${ids[owner]},${scope},${topic},'',${JSON.stringify({ industria: ['Retail'] })}::jsonb,
          ${`qa:${tag}:${scope}:${topic}`},${label}) RETURNING id`;
    for (const owner of ['a1', 'a2', 'a3', 'a4', 'suspended'])
      await alert(owner, 'explorar', 'nomina', nomina);
    const [searchAlert] =
      await sql`INSERT INTO search_alerts(id,owner_id,scope,topic,query,signature,label,last_matched_at)
      VALUES (${randomUUID()},${ids.searcher},'search',NULL,${'mayoreo ' + tag},${`qa:${tag}:search`},${ventas},now())
      RETURNING id`;
    await sql`INSERT INTO search_alert_matches(alert_id,solution_id,baseline,matched_at)
      VALUES (${searchAlert.id},${listing},false,now())`;

    const demand = await page('/panel/demanda');
    assert.match(demand, /Alertas activas por tema/);
    const topic = row(demand, nomina);
    // Topic, where, alerts, accounts, matches in 30 days, last match.
    assert.deepEqual(topic, [nomina, 'Categoría', '4', '4', '0', 'Nunca']);
    const search = row(demand, ventas);
    assert.deepEqual(search.slice(0, 5), [ventas, 'Búsqueda', '1', '1', '1']);
    assert.ok(at(demand, nomina) < at(demand, ventas), 'most alerts first');
    for (const role of ['a1', 'a2', 'a3', 'a4', 'suspended', 'searcher'])
      assert.ok(!demand.includes(email(role)), 'never who created an alert');
    assert.ok(!demand.includes(ids.a1), 'never an account id');
    const byMatches = await page('/panel/demanda?orden=matches');
    assert.ok(at(byMatches, ventas) < at(byMatches, nomina), 'sorted by matches');
    const ascending = await page('/panel/demanda?dir=asc');
    assert.ok(at(ascending, ventas) < at(ascending, nomina), 'fewest alerts first');
    step('/panel/demanda counts alerts, accounts and matches by topic, sortable, never who');
  } finally {
    await sql`DELETE FROM auth_accounts WHERE id = ANY(${Object.values(ids)}::uuid[])`;
    const [left] =
      await sql`SELECT (SELECT count(*)::int FROM contact_requests WHERE id = ANY(${Object.values(requests)}::uuid[])) AS requests,
        (SELECT count(*)::int FROM search_alerts WHERE signature LIKE ${`qa:${tag}:%`}) AS alerts,
        (SELECT count(*)::int FROM founder_solutions WHERE id=${listing}) AS listings`;
    console.log(
      `cleanup: ${left.requests} requests, ${left.alerts} alerts, ${left.listings} listings left`,
    );
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
