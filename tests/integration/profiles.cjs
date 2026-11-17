// Opt-in integration test for public profiles (SHCWS-120) against a running app and the
// database in .env.local (development only). A founder turns their profile on and it shows
// their published listings and public list; another account follows it and hears about a
// new listing; a profile that is off answers a real 404; old handles answer 301; the page
// and its RSC payload never carry an email or an account id. Every account is
// @example.invalid and everything is removed in `finally`. Takes about two minutes: the
// middleware reloads known handles at most every 15 s (new) or 60 s (renamed, off).
//
//   APP_ORIGIN=http://localhost:3104 RUN_PROFILES_INTEGRATION=1 node tests/integration/profiles.cjs
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  { createHash, randomBytes, randomUUID } = require('node:crypto');
if (process.env.RUN_PROFILES_INTEGRATION !== '1') {
  console.log('Set RUN_PROFILES_INTEGRATION=1 against a local running app.');
  process.exit(0);
}
const { neon } = require('@neondatabase/serverless'),
  env = require('dotenv').parse(fs.readFileSync('.env.local'));
const url = env.NEON_DATABASE_URL || env.DATABASE_URL || env.POSTGRES_URL;
if (!/\/neondb(\?|$)/.test(url)) throw Error('Only against the development database (neondb).');
const sql = neon(url),
  origin = process.env.APP_ORIGIN || 'http://localhost:3104',
  tag = randomUUID().slice(0, 8),
  hash = value => createHash('sha256').update(value).digest('hex');
const founder = randomUUID(),
  follower = randomUUID(),
  other = randomUUID(),
  accounts = [founder, follower, other],
  tokens = Object.fromEntries(accounts.map(id => [id, randomBytes(32).toString('hex')])),
  emails = {
    [founder]: `profile-founder-${tag}@example.invalid`,
    [follower]: `profile-follower-${tag}@example.invalid`,
    [other]: `profile-other-${tag}@example.invalid`,
  },
  solutions = [randomUUID(), randomUUID(), randomUUID()],
  later = randomUUID(),
  list = randomUUID(),
  handle = `qa-perfil-${tag}`,
  renamed = `qa-nuevo-${tag}`;

const call = (who, path, body, headers = {}) =>
  fetch(`${origin}${path}`, {
    method: body ? 'POST' : 'GET',
    redirect: 'manual',
    headers: {
      origin,
      'content-type': 'application/json',
      ...(who ? { cookie: `showcasemx-session=${tokens[who]}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
/** Polls a GET until its status is `status` (the middleware's handle cache is lazy). */
async function until(path, status, seconds = 80) {
  let response;
  for (let i = 0; i < seconds; i++) {
    response = await call(null, path);
    if (response.status === status) return response;
    await response.arrayBuffer();
    await wait(1000);
  }
  throw Error(`${path} stayed ${response.status}, expected ${status}`);
}
const listing = name => ({
  name,
  kind: 'Software',
  category: 'Ventas',
  categories: ['Ventas'],
  problem: 'Prueba de perfiles públicos.',
  audience: 'QA',
  website: 'https://profiles-qa.example.com/',
  contactEmail: emails[founder],
});
const assertNoPrivate = (text, where) => {
  for (const secret of [...accounts, ...Object.values(emails)])
    assert.ok(!text.includes(secret), `${where} leaks ${secret}`);
};

(async () => {
  try {
    await sql`INSERT INTO auth_accounts(id,email,password_hash,name,email_verified_at) VALUES
      (${founder}, ${emails[founder]}, 'x', 'QA Fundadora Privada', now()),
      (${follower}, ${emails[follower]}, 'x', 'QA Seguidor', now()),
      (${other}, ${emails[other]}, 'x', 'QA Otra', now())`;
    for (const id of accounts)
      await sql`INSERT INTO auth_sessions(token_hash,account_id,expires_at) VALUES (${hash(tokens[id])},${id},now()+interval '1 hour')`;
    for (const [index, id] of solutions.entries())
      await sql`INSERT INTO founder_solutions(id,owner_id,data,published_data,status,published_at)
        VALUES (${id},${founder},${JSON.stringify(listing(`QA Perfil ${index + 1} ${tag}`))}::jsonb,
          ${JSON.stringify(listing(`QA Perfil ${index + 1} ${tag}`))}::jsonb,'published',now())`;
    await sql`INSERT INTO buyer_lists(id,owner_id,name,curator_name,categories) VALUES (${list},${founder},${`QA Lista ${tag}`},'QA Firma','{Ventas}')`;
    for (const id of solutions) {
      await sql`INSERT INTO buyer_saved_projects(owner_id,project_key) VALUES (${founder},${`solution:${id}`}) ON CONFLICT DO NOTHING`;
      await sql`INSERT INTO buyer_list_items(owner_id,list_id,project_key) VALUES (${founder},${list},${`solution:${id}`})`;
    }
    await sql`UPDATE buyer_lists SET visibility='public' WHERE id=${list}`;
    // The profile's listings come from the cached catalog, which ops refreshes when it
    // publishes; fixtures written in SQL need the same refresh.
    const refresh = () =>
      fetch(`${origin}/api/internal/catalog-revalidate`, {
        method: 'POST',
        headers: { authorization: `Bearer ${env.CATALOG_REVALIDATE_SECRET}` },
      });
    assert.equal((await refresh()).status, 200);

    // Off by default: no profile, no page.
    assert.equal((await call(null, `/es/c/${handle}`)).status, 404);

    // Handle checks: reserved, then taken by someone else.
    let check = await (
      await call(founder, '/api/account/public-profile', {
        action: 'check-handle',
        handle: 'Equipo SHWCS',
      })
    ).json();
    assert.equal(check.problem, 'reserved');
    const otherSave = await call(other, '/api/account/public-profile', {
      action: 'save',
      handle: `qa-otra-${tag}`,
      displayName: 'QA Otra',
      bio: '',
      links: [],
      active: false,
      version: 0,
    });
    assert.equal(otherSave.status, 200);
    check = await (
      await call(founder, '/api/account/public-profile', {
        action: 'check-handle',
        handle: `qa-otra-${tag}`,
      })
    ).json();
    assert.equal(check.available, false);
    const taken = await call(founder, '/api/account/public-profile', {
      action: 'save',
      handle: `qa-otra-${tag}`,
      displayName: 'QA',
      bio: '',
      links: [],
      active: false,
      version: 0,
    });
    assert.equal(taken.status, 409);
    assert.equal((await taken.json()).problem, 'taken');

    // Saved but off: still 404.
    let saved = await call(founder, '/api/account/public-profile', {
      action: 'save',
      handle,
      displayName: 'Ana QA',
      bio: 'Construyo herramientas de ventas.',
      links: [{ label: 'GitHub', url: 'https://github.com/qa-profiles' }],
      active: false,
      version: 0,
    });
    assert.equal(saved.status, 200);
    let version = (await saved.json()).version;
    assert.equal((await call(null, `/es/c/${handle}`)).status, 404);
    // javascript: links are refused like on a listing.
    const badLink = await call(founder, '/api/account/public-profile', {
      action: 'save',
      handle,
      displayName: 'Ana QA',
      bio: '',
      links: [{ label: 'X', url: 'javascript:alert(1)' }],
      active: true,
      version,
    });
    assert.equal(badLink.status, 400);
    assert.equal((await badLink.json()).field, 'links');

    // On: the page shows the name, bio, links, the three listings and the public list.
    saved = await call(founder, '/api/account/public-profile', {
      action: 'save',
      handle,
      displayName: 'Ana QA',
      bio: 'Construyo herramientas de ventas.',
      links: [{ label: 'GitHub', url: 'https://github.com/qa-profiles' }],
      active: true,
      version,
    });
    assert.equal(saved.status, 200);
    version = (await saved.json()).version;
    // A stale form (old version) gets a conflict instead of overwriting.
    const stale = await call(founder, '/api/account/public-profile', {
      action: 'save',
      handle,
      displayName: 'Viejo',
      bio: '',
      links: [],
      active: true,
      version: version - 1,
    });
    assert.equal(stale.status, 409);
    let page = await until(`/es/c/${handle}`, 200);
    let html = await page.text();
    for (const text of [
      'Ana QA',
      'Construyo herramientas de ventas.',
      'https://github.com/qa-profiles',
      `QA Perfil 1 ${tag}`,
      `QA Perfil 3 ${tag}`,
      `QA Lista ${tag}`,
      '"@type":"ProfilePage"',
    ])
      assert.ok(html.includes(text), `profile page shows ${text}`);
    assert.ok(!html.includes('noindex'), 'a profile with content is indexable');
    assertNoPrivate(html, 'profile HTML');
    assert.ok(!html.includes('QA Fundadora Privada'), 'the private account name stays private');
    const rsc = await call(follower, `/es/c/${handle}`, null, { RSC: '1' });
    const payload = await rsc.text();
    assert.ok(payload.includes('Ana QA'));
    assertNoPrivate(payload, 'profile RSC');
    // Other letter case → 301 to the lowercase handle.
    const upper = await call(null, `/es/c/${handle.toUpperCase()}`);
    assert.equal(upper.status, 301);
    assert.ok(upper.headers.get('location').endsWith(`/es/c/${handle}`));

    // Hiding one listing takes it off the profile, nowhere else.
    saved = await call(founder, '/api/account/public-profile', {
      action: 'save',
      handle,
      displayName: 'Ana QA',
      bio: 'Construyo herramientas de ventas.',
      links: [{ label: 'GitHub', url: 'https://github.com/qa-profiles' }],
      hiddenSolutions: [solutions[2]],
      active: true,
      version,
    });
    assert.equal(saved.status, 200, 'hiding a listing saves');
    version = (await saved.json()).version;
    assert.deepEqual(
      (
        await sql`SELECT hidden_solutions::text[] AS ids FROM public_profiles WHERE account_id=${founder}`
      )[0].ids,
      [solutions[2]],
    );
    html = await (await call(null, `/es/c/${handle}`)).text();
    // The public list still holds it (and shows its cover); the projects section does not.
    const projects = html.slice(
      html.indexOf('id="profile-projects"'),
      html.indexOf('id="profile-lists"'),
    );
    if (projects.includes(`QA Perfil 3 ${tag}`) || !projects.includes(`QA Perfil 1 ${tag}`))
      console.error('projects section:', projects.length, projects.slice(0, 3000));
    assert.ok(
      !projects.includes(`QA Perfil 3 ${tag}`),
      'hidden listing is off the projects section',
    );
    assert.ok(projects.includes(`QA Perfil 1 ${tag}`), 'shown listing stays');

    // The list signature and the listing link to the profile; the hidden listing does not.
    const listPage = await (await call(null, `/es/comunidad/${list}`)).text();
    assert.ok(listPage.includes(`/es/c/${handle}`), 'list signature links to the profile');
    const shown = await (await call(null, `/es/soluciones/${solutions[0]}`, null)).status;
    assert.ok([200, 301, 308].includes(shown));
    const listingHtml = await (await fetch(`${origin}/es/soluciones/${solutions[0]}`)).text();
    assert.ok(listingHtml.includes(`/es/c/${handle}`), 'listing links to its publisher');
    const hiddenHtml = await (await fetch(`${origin}/es/soluciones/${solutions[2]}`)).text();
    assert.ok(!hiddenHtml.includes(`/es/c/${handle}`), 'a hidden listing does not link back');

    // The directory lists it.
    assert.ok((await (await call(null, '/es/fundadores')).text()).includes(`/es/c/${handle}`));

    // Another account follows it; the owner cannot follow their own.
    let followed = await call(follower, '/api/follows', { action: 'profile', handle });
    assert.equal(followed.status, 200);
    assert.equal((await followed.json()).active, true);
    assert.equal((await call(founder, '/api/follows', { action: 'profile', handle })).status, 409);
    const followerPage = await (await call(follower, `/es/c/${handle}`)).text();
    assert.ok(followerPage.includes('aria-pressed="true"'), 'the follower sees «Siguiendo»');
    // The list page now follows the person through the profile.
    assert.ok(
      (await (await call(follower, `/es/comunidad/${list}`)).text()).includes('Sigues a Ana QA'),
    );

    // A listing published for the first time reaches the follower in the weekly notice.
    await sql`INSERT INTO founder_solutions(id,owner_id,data,status) VALUES (${later},${founder},${JSON.stringify(listing(`QA Perfil nuevo ${tag}`))}::jsonb,'pending')`;
    await sql`UPDATE founder_solutions SET published_data=data, status='published', published_at=now() WHERE id=${later}`;
    assert.equal((await refresh()).status, 200);
    const [notice] = await sql`SELECT title, href, email_state FROM account_notifications
      WHERE owner_id=${follower} AND source_key LIKE 'follow:%'`;
    assert.equal(notice.title, 'Un proyecto nuevo de un perfil que sigues');
    assert.equal(notice.href, '/account/community');
    assert.equal(notice.email_state, 'disabled');
    // Publishing it again is not news twice.
    await sql`UPDATE founder_solutions SET published_data=published_data || '{}'::jsonb WHERE id=${later}`;
    assert.equal(
      (
        await sql`SELECT count(*)::int AS n FROM profile_project_announcements WHERE solution_id=${later}`
      )[0].n,
      1,
    );
    // The follower's account page lists the profile; the founder sees a count, never who.
    assert.ok(
      (await (await call(follower, '/es/account/community')).text()).includes(`/es/c/${handle}`),
    );
    const own = await (await call(founder, '/es/account/community')).text();
    assert.ok(own.includes('1 persona sigue tu perfil público'));
    assert.ok(!own.includes('QA Seguidor'));

    // Exports: the founder's profile and its follower count; the follower's follow by handle.
    const founderExport = await (await call(founder, '/api/account/export')).json();
    assert.equal(founderExport.publicProfile.handle, handle);
    assert.equal(founderExport.publicProfile.followers, 1);
    const followerExport = await (await call(follower, '/api/account/export')).json();
    assert.deepEqual(
      followerExport.following.profiles.map(row => row.handle),
      [handle],
    );
    assertNoPrivate(JSON.stringify(followerExport.following), 'follower export');

    // A new handle: the old one answers 301 once the middleware reloads (≤ 60 s).
    saved = await call(founder, '/api/account/public-profile', {
      action: 'save',
      handle: renamed,
      displayName: 'Ana QA',
      bio: '',
      links: [],
      active: true,
      version,
    });
    assert.equal(saved.status, 200);
    version = (await saved.json()).version;
    await until(`/es/c/${renamed}`, 200);
    const moved = await until(`/es/c/${handle}`, 301);
    assert.ok(moved.headers.get('location').endsWith(`/es/c/${renamed}`));
    // Nobody else can take the old handle.
    const squat = await call(other, '/api/account/public-profile', {
      action: 'save',
      handle,
      displayName: 'QA Otra',
      bio: '',
      links: [],
      active: false,
      version: 1,
    });
    assert.equal(squat.status, 409);

    // Off again: a real 404 once the middleware reloads.
    saved = await call(founder, '/api/account/public-profile', {
      action: 'save',
      handle: renamed,
      displayName: 'Ana QA',
      bio: '',
      links: [],
      active: false,
      version,
    });
    assert.equal(saved.status, 200);
    await until(`/es/c/${renamed}`, 404);
    assert.equal((await call(null, `/es/c/${handle}`)).status, 404);
    // The follow stays, without naming the profile.
    const people = await (await call(follower, '/es/account/community')).text();
    assert.ok(people.includes('Perfil no disponible'));

    // Deleting the profile removes its previous handles and who followed it.
    assert.equal(
      (await call(founder, '/api/account/public-profile', { action: 'delete' })).status,
      200,
    );
    assert.equal(
      (
        await sql`SELECT count(*)::int AS n FROM profile_handle_history WHERE account_id=${founder}`
      )[0].n,
      0,
    );
    assert.equal(
      (await sql`SELECT count(*)::int AS n FROM profile_follows WHERE follower_id=${follower}`)[0]
        .n,
      0,
    );
    console.log('Public profiles integration: all checks passed.');
  } finally {
    await sql`DELETE FROM founder_solutions WHERE owner_id = ANY(${accounts}::uuid[])`;
    await sql`DELETE FROM auth_accounts WHERE id = ANY(${accounts}::uuid[])`;
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
