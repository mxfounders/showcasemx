// Shows and changes sponsored-slot rates and which placements are open for purchase.
//
//   npm run ads:rates                                  list placements and rates
//   npm run ads:rates -- set <placement> <usd|mxn> <amount>   daily rate before tax, e.g. 25.00
//   npm run ads:rates -- enable <placement>            open it (needs at least one rate)
//   npm run ads:rates -- disable <placement>           close it; paid bookings keep running
//
// Placements: category, home, newsletter. Uses the same database variables as the app and
// never prints the connection string. A rate change applies to new bookings only: each
// booking stores the daily rate it was sold at.
const placements = ['category', 'home', 'newsletter'];
const currencies = ['usd', 'mxn'];

async function main([command = 'list', ...args]) {
  require('dotenv').config({ path: '.env.local', quiet: true });
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url)
    return fail('No database configured. Set NEON_DATABASE_URL, DATABASE_URL or POSTGRES_URL.');
  const { neon } = require('@neondatabase/serverless');
  const sql = neon(url);

  if (command === 'set') {
    const [placement, currency, amount] = args;
    const minor = Math.round(Number(amount) * 100);
    if (!placements.includes(placement) || !currencies.includes(currency) || !(minor > 0)) {
      return fail('Usage: npm run ads:rates -- set <category|home|newsletter> <usd|mxn> <amount>');
    }
    await sql`INSERT INTO ad_rates (placement, currency, daily_amount) VALUES (${placement}, ${currency}, ${minor})
      ON CONFLICT (placement, currency) DO UPDATE SET daily_amount = EXCLUDED.daily_amount, updated_at = now()`;
  } else if (command === 'enable' || command === 'disable') {
    const [placement, flag] = args;
    // Selling a newsletter mention before issues go out would charge for nothing.
    if (command === 'enable' && placement === 'newsletter' && flag !== '--newsletter-is-sending') {
      return fail(
        'The newsletter does not send campaigns yet. Re-run with --newsletter-is-sending once it does.',
      );
    }
    if (!placements.includes(placement))
      return fail(`Usage: npm run ads:rates -- ${command} <placement>`);
    const [row] =
      await sql`UPDATE ad_placements SET enabled = ${command === 'enable'}, updated_at = now()
      WHERE id = ${placement} AND (${command === 'disable'} OR EXISTS (SELECT 1 FROM ad_rates WHERE placement = ${placement}))
      RETURNING id`;
    if (!row) return fail(`Set a rate for ${placement} before enabling it.`);
  } else if (command !== 'list') {
    return fail('Commands: list, set, enable, disable.');
  }

  const rows = await sql`SELECT p.id, p.slots, p.enabled, r.currency, r.daily_amount
    FROM ad_placements p LEFT JOIN ad_rates r ON r.placement = p.id ORDER BY p.id, r.currency`;
  for (const row of rows) {
    const rate = row.currency
      ? `${(row.daily_amount / 100).toFixed(2)} ${row.currency.toUpperCase()}/day`
      : 'no rate';
    console.log(
      `${row.id.padEnd(11)} ${row.enabled ? 'open  ' : 'closed'} ${row.slots} slot(s)  ${rate}`,
    );
  }
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

main(process.argv.slice(2)).catch(() =>
  fail('Could not reach the database; check its access without sharing secrets.'),
);
