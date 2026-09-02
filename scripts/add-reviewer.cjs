#!/usr/bin/env node
// scripts/add-reviewer.cjs
// Usage: node scripts/add-reviewer.cjs <email>
// Adds an existing auth_account to solution_reviewers.
// Run from the shwcs root directory (not ops/).

'use strict';

const { neon } = require('@neondatabase/serverless');
const path = require('node:path');
const fs = require('node:fs');

// Load .env.local from the root directory
function loadEnv(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        const key = match[1];
        const val = match[2].replace(/^["']|["']$/g, ''); // strip quotes
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch { /* ignore */ }
}

loadEnv(path.join(__dirname, '..', '.env.local'));

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/add-reviewer.cjs <email>');
  process.exit(1);
}

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('ERROR: DATABASE_URL not found. Make sure .env.local is present in the root directory.');
  process.exit(1);
}

async function main() {
  const sql = neon(url);

  // Find the account
  const accounts = await sql`SELECT id, email FROM auth_accounts WHERE email = ${email} LIMIT 1`;
  if (!accounts.length) {
    console.error(`ERROR: No account found with email "${email}".`);
    console.error('Make sure this person has created an account on shwcs.site first.');
    process.exit(1);
  }

  const account = accounts[0];
  console.log(`Found account: ${account.email} (${account.id})`);

  // Check if already a reviewer
  const existing = await sql`SELECT account_id FROM solution_reviewers WHERE account_id = ${account.id} LIMIT 1`;
  if (existing.length) {
    console.log(`✓ ${email} is already a reviewer. Nothing changed.`);
    process.exit(0);
  }

  // Add to solution_reviewers
  await sql`INSERT INTO solution_reviewers (account_id) VALUES (${account.id}) ON CONFLICT DO NOTHING`;

  // Verify
  const verify = await sql`SELECT count(*)::int AS n FROM solution_reviewers`;
  console.log(`✓ ${email} added as reviewer.`);
  console.log(`  Total reviewers now: ${verify[0].n}`);
  console.log('');
  console.log('Next step: log in at ops.shwcs.site with this email and your shwcs password.');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
