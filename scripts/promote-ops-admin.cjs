#!/usr/bin/env node
// scripts/promote-ops-admin.cjs
// Usage: node scripts/promote-ops-admin.cjs <email>
// Grants (or upgrades) an existing auth_account to ops admin level.
// Run from the shwcs root directory (not ops/).

'use strict';

const { neon } = require('@neondatabase/serverless');
const path = require('node:path');
const fs = require('node:fs');

function loadEnv(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const key = match[1];
        const val = match[2].replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch { /* ignore */ }
}

loadEnv(path.join(__dirname, '..', '.env.local'));

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/promote-ops-admin.cjs <email>');
  process.exit(1);
}

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('ERROR: DATABASE_URL not found. Make sure .env.local is present in the root directory.');
  process.exit(1);
}

async function main() {
  const sql = neon(url);

  const accounts = await sql`SELECT id, email FROM auth_accounts WHERE email = ${email} LIMIT 1`;
  if (!accounts.length) {
    console.error(`ERROR: No account found with email "${email}".`);
    console.error('Make sure this person has created an account on shwcs.site first.');
    process.exit(1);
  }

  const account = accounts[0];

  await sql`
    INSERT INTO solution_reviewers (account_id, level)
    VALUES (${account.id}, 'admin')
    ON CONFLICT (account_id) DO UPDATE SET level = 'admin'
  `;

  console.log(`✓ ${email} is now an ops admin.`);
  console.log('Next step: they must enroll a TOTP authenticator at /login/enroll before their');
  console.log('first sign-in to the ops console — password alone will not grant access.');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
