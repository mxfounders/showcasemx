// Forwards the sandbox's webhook events to the local app, with the same events production
// subscribes to, and keeps STRIPE_WEBHOOK_SECRET in .env.local in step with the Stripe CLI.
//
//   npm run stripe:listen               forwards to http://localhost:3000/api/webhooks/stripe
//   npm run stripe:listen -- --port 3001
//
// Needs the Stripe CLI (`npm i -g @stripe/cli`) and a test key in STRIPE_SECRET_KEY. The key goes
// to the CLI through its environment, never on the command line, and the secret is never printed.
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { webhookEvents } = require('./verify-stripe.cjs');

const envFile = path.join(__dirname, '..', '.env.local');

function main(args) {
  require('dotenv').config({ path: envFile, quiet: true });
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!/^(sk|rk)_test_/.test(key))
    return fail('STRIPE_SECRET_KEY in .env.local must be a test key.');
  const port = args.includes('--port') ? args[args.indexOf('--port') + 1] : '3000';
  if (!/^\d{2,5}$/.test(port)) return fail('Usage: npm run stripe:listen -- --port <number>');
  const env = { ...process.env, STRIPE_API_KEY: key };

  let secret;
  try {
    secret = execFileSync('stripe', ['listen', '--print-secret'], { env, encoding: 'utf8' }).trim();
  } catch {
    return fail(
      'The Stripe CLI is missing or rejected the key. Install it with `npm i -g @stripe/cli`.',
    );
  }
  if (!secret.startsWith('whsec_')) return fail('The Stripe CLI did not return a signing secret.');
  if (process.env.STRIPE_WEBHOOK_SECRET !== secret) {
    const current = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
    const line = `STRIPE_WEBHOOK_SECRET=${secret}`;
    const next = /^STRIPE_WEBHOOK_SECRET=.*$/m.test(current)
      ? current.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m, line)
      : `${current.replace(/\n?$/, '\n')}${line}\n`;
    fs.writeFileSync(envFile, next);
    console.log('STRIPE_WEBHOOK_SECRET updated in .env.local: restart `npm run dev` so it loads.');
  }

  const listener = spawn(
    'stripe',
    [
      'listen',
      '--forward-to',
      `http://localhost:${port}/api/webhooks/stripe`,
      '--events',
      webhookEvents.join(','),
    ],
    { env, stdio: 'inherit' },
  );
  listener.on('exit', code => process.exit(code ?? 0));
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

main(process.argv.slice(2));
