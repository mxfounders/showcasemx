// Read-only check of the Stripe account behind the sponsored slots. Never prints keys or secrets.
//
//   npm run verify:stripe                 the key in STRIPE_SECRET_KEY (environment or .env.local)
//   npm run verify:stripe -- --prompt     asks for the key without echoing it: use it for the live key
//   npm run verify:stripe -- --origin https://shwcs.site
//
// It checks that the key is restricted, the account can charge, Stripe Tax is active with a Mexico
// registration and really adds IVA (invoice preview: free, nothing is created), the webhook endpoint
// listens to every event the app handles on the API version the SDK pins, and that the key can make
// each call the app makes and nothing riskier. Permission probes send requests Stripe rejects for
// missing parameters or unknown ids, so they never create or change anything.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const stripeModule = fs.readFileSync(path.join(root, 'src/lib/ads/stripe.ts'), 'utf8');
const apiVersion = stripeModule.match(/apiVersion: '([^']+)'/)[1];
const taxCode = stripeModule.match(/adTaxCode = '([^']+)'/)[1];

/** Events the webhook handles (src/app/api/webhooks/stripe/route.ts); a test keeps them in sync. */
const webhookEvents = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'charge.refunded',
  'refund.created',
  'refund.updated',
  'charge.dispute.created',
  'charge.dispute.closed',
];

/** Every call the app makes, as a request Stripe rejects without side effects when allowed. */
const neededPermissions = [
  ['Checkout Sessions: write (create)', 'POST', '/v1/checkout/sessions'],
  ['Checkout Sessions: read', 'GET', '/v1/checkout/sessions/cs_test_verifystripe'],
  [
    'Checkout Sessions: write (expire)',
    'POST',
    '/v1/checkout/sessions/cs_test_verifystripe/expire',
  ],
  ['Customers: write', 'POST', '/v1/customers/cus_verifystripe'],
  ['Refunds: write', 'POST', '/v1/refunds'],
  ['Invoices: read', 'GET', '/v1/invoices/in_verifystripe'],
  // Promotion codes are checked by the server before checkout (src/lib/ads/promo.ts).
  ['Promotion Codes: read', 'GET', '/v1/promotion_codes/promo_verifystripe'],
  ['Coupons: read', 'GET', '/v1/coupons/verifystripe'],
];

/** Things the app never does; a restricted key that can do them has more than it needs. */
const excessPermissions = [
  ['Payouts: write', 'POST', '/v1/payouts'],
  ['Webhook Endpoints: write', 'POST', '/v1/webhook_endpoints'],
  ['Balance: read', 'GET', '/v1/balance'],
];

const results = [];
const report = (status, message) => results.push([status, message]);

async function main(args) {
  require('dotenv').config({ path: path.join(root, '.env.local'), quiet: true });
  const prompted = args.includes('--prompt');
  const key = prompted ? await askHidden('Stripe key (hidden): ') : process.env.STRIPE_SECRET_KEY;
  const originArg = args[args.indexOf('--origin') + 1];
  const origin =
    (args.includes('--origin') ? originArg : process.env.AUTH_APP_ORIGIN) || 'https://shwcs.site';
  const keyMatch = /^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.exec(key || '');
  if (!keyMatch) {
    console.error('PENDING No Stripe key: set STRIPE_SECRET_KEY or run with --prompt.');
    process.exitCode = 1;
    return;
  }
  const [, kind, mode] = keyMatch;
  const live = mode === 'live';
  const stripe = (method, route, body) => request(key, method, route, body);

  report(
    kind === 'rk' ? 'OK' : live ? 'PENDING' : 'INFO',
    `${live ? 'Live' : 'Test'} ${kind === 'rk' ? 'restricted key' : 'secret key'}${
      kind === 'sk'
        ? ': production should use a restricted key (rk_live_) with only the permissions below'
        : ''
    }.`,
  );

  await checkAccount(stripe, live);
  await checkTax(stripe);
  await checkWebhook(stripe, live, origin);
  await checkPermissions(stripe, kind);

  if (!prompted) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
    if (secret)
      report(
        secret.startsWith('whsec_') ? 'OK' : 'PENDING',
        'STRIPE_WEBHOOK_SECRET is set locally.',
      );
    else
      report(
        live ? 'PENDING' : 'INFO',
        live
          ? 'STRIPE_WEBHOOK_SECRET is missing.'
          : 'STRIPE_WEBHOOK_SECRET is missing locally: run `npm run stripe:listen` to receive webhooks.',
      );
    if (process.env.STRIPE_AUTOMATIC_TAX === 'off')
      report(live ? 'PENDING' : 'INFO', 'STRIPE_AUTOMATIC_TAX=off: Checkout will not add tax.');
  }

  for (const [status, message] of results) console.log(`${status.padEnd(7)} ${message}`);
  if (results.some(([status]) => status === 'PENDING')) process.exitCode = 1;
}

async function checkAccount(stripe, live) {
  const { ok, body } = await stripe('GET', '/v1/account');
  if (!ok)
    return report(
      'INFO',
      'Account details are not visible to this key (expected for a restricted key).',
    );
  report(
    'INFO',
    `Account ${body.id} (${body.country}), shown as "${body.settings?.dashboard?.display_name ?? '—'}".`,
  );
  if (live) {
    report(body.charges_enabled ? 'OK' : 'PENDING', 'The account can accept live payments.');
    report(body.payouts_enabled ? 'OK' : 'PENDING', 'Payouts are enabled.');
  }
  const branding = body.settings?.branding ?? {};
  if (branding.icon || branding.logo)
    report('OK', 'Checkout and receipts carry the shwcs icon or logo.');
  else
    report(
      'INFO',
      'No icon or logo yet: Checkout and receipts show only the name (Dashboard → Settings → Branding).',
    );
  const descriptor = body.settings?.payments?.statement_descriptor;
  report(descriptor ? 'OK' : 'INFO', `Card statement descriptor: ${descriptor ?? 'not set'}.`);
}

async function checkTax(stripe) {
  const settings = await stripe('GET', '/v1/tax/settings');
  if (settings.ok) {
    const { status, head_office: head, defaults } = settings.body;
    report(
      status === 'active' ? 'OK' : 'PENDING',
      `Stripe Tax is ${status} (head office: ${head?.address?.country ?? 'none'}).`,
    );
    report(
      defaults?.tax_behavior === 'exclusive' ? 'OK' : 'INFO',
      `Default tax behavior is ${defaults?.tax_behavior ?? 'unset'} (Checkout sends "exclusive" on every line anyway).`,
    );
    const registrations = await stripe('GET', '/v1/tax/registrations?status=active&limit=100');
    const countries = registrations.ok ? registrations.body.data.map(r => r.country) : [];
    report(
      countries.includes('MX') ? 'OK' : 'PENDING',
      `Active tax registrations: ${countries.join(', ') || 'none'}.`,
    );
  } else {
    report(
      'INFO',
      'Tax settings are not visible to this key; the invoice preview below still shows whether IVA is added.',
    );
  }

  // An invoice preview runs the same tax engine Checkout uses, needs only invoice read and is free.
  const preview = await stripe('POST', '/v1/invoices/create_preview', {
    currency: 'mxn',
    'automatic_tax[enabled]': 'true',
    'customer_details[address][country]': 'MX',
    'customer_details[address][postal_code]': '06600',
    'invoice_items[0][amount]': '16900',
    'invoice_items[0][currency]': 'mxn',
    'invoice_items[0][tax_code]': taxCode,
    'invoice_items[0][tax_behavior]': 'exclusive',
    'invoice_items[0][description]': 'verify:stripe preview',
  });
  if (!preview.ok) return report('PENDING', `Tax preview failed: ${describeError(preview)}.`);
  const taxes = preview.body.total_taxes ?? [];
  const reasons = taxes.map(t => t.taxability_reason).join(', ') || 'none';
  const added = preview.body.total - preview.body.subtotal;
  report(
    added > 0 && reasons.includes('standard_rated') ? 'OK' : 'PENDING',
    `A 169.00 MXN slot for a buyer in Mexico gets ${(added / 100).toFixed(2)} MXN of tax (${reasons}).`,
  );
}

async function checkWebhook(stripe, live, origin) {
  const url = `${origin.replace(/\/$/, '')}/api/webhooks/stripe`;
  const list = await stripe('GET', '/v1/webhook_endpoints?limit=100');
  if (!list.ok)
    return report(
      'INFO',
      `Webhook endpoints are not visible to this key; check ${url} in the Dashboard.`,
    );
  const endpoint = list.body.data.find(item => item.url === url);
  if (!endpoint)
    return report(
      live ? 'PENDING' : 'INFO',
      `No webhook endpoint for ${url}${live ? '.' : ' (local testing uses `npm run stripe:listen`).'}`,
    );
  report(
    endpoint.status === 'enabled' ? 'OK' : 'PENDING',
    `Webhook ${endpoint.id} for ${url} is ${endpoint.status}.`,
  );
  const missing = endpoint.enabled_events.includes('*')
    ? []
    : webhookEvents.filter(event => !endpoint.enabled_events.includes(event));
  report(
    missing.length ? 'PENDING' : 'OK',
    missing.length
      ? `Webhook is missing events: ${missing.join(', ')}.`
      : 'Webhook listens to every event the app handles.',
  );
  report(
    endpoint.api_version === apiVersion ? 'OK' : 'PENDING',
    `Webhook API version is ${endpoint.api_version ?? 'the account default'} (the SDK pins ${apiVersion}).`,
  );
}

async function checkPermissions(stripe, kind) {
  for (const [label, method, route] of neededPermissions) {
    const response = await stripe(method, route);
    report(isPermissionError(response) ? 'PENDING' : 'OK', `Key can use ${label}.`);
  }
  if (kind !== 'rk') return;
  for (const [label, method, route] of excessPermissions) {
    const response = await stripe(method, route);
    if (!isPermissionError(response))
      report('PENDING', `Key also has ${label}, which the app never uses: remove it.`);
  }
}

function isPermissionError(response) {
  return (
    response.status === 403 || /required permissions/i.test(response.body?.error?.message ?? '')
  );
}

/** Error type and code only: Stripe messages can quote part of the key. */
function describeError(response) {
  const error = response.body?.error ?? {};
  if (isPermissionError(response)) return 'the key lacks permission';
  return [error.type, error.code].filter(Boolean).join(' / ') || `HTTP ${response.status}`;
}

async function request(key, method, route, body) {
  const response = await fetch(`https://api.stripe.com${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Stripe-Version': apiVersion,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: body ? new URLSearchParams(body) : method === 'POST' ? '' : undefined,
    signal: AbortSignal.timeout(10000),
  });
  return {
    ok: response.ok,
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

function askHidden(question) {
  if (!process.stdin.isTTY) {
    return new Promise(resolve => {
      let input = '';
      process.stdin.on('data', chunk => (input += chunk)).on('end', () => resolve(input.trim()));
    });
  }
  return new Promise(resolve => {
    const readline = require('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    process.stdout.write(question);
    rl._writeToOutput = () => {};
    rl.question('', answer => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

module.exports = { webhookEvents, apiVersion, taxCode };

if (require.main === module) {
  main(process.argv.slice(2)).catch(() => {
    console.error('PENDING Could not reach Stripe; check the network and try again.');
    process.exitCode = 1;
  });
}
