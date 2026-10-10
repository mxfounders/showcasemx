// Applies one or more db/*.sql migrations to the configured database.
//
//   npm run db:migrate -- db/account-security.sql [db/another.sql ...]
//
// Each file runs in its own transaction, in the order given, and the run stops at the
// first failure. The connection string is read with the same precedence as the app
// (NEON_DATABASE_URL, DATABASE_URL, POSTGRES_URL) and is never printed.
//
// Migrations are not tracked in a ledger. Files are written to be re-runnable
// (IF NOT EXISTS, CREATE OR REPLACE), except the one-shot object-storage phases
// db/media-storage.sql and db/media-storage-drop.sql — the latter is destructive and
// says so in its header. Read a file before applying it.
const fs = require('node:fs');
const path = require('node:path');

/**
 * Splits a SQL script into statements on top-level semicolons.
 *
 * A naive `split(';')` breaks PL/pgSQL bodies, so this walks the source and only
 * splits outside single-quoted strings (with '' escapes) and $$-quoted blocks.
 * Line comments are dropped. Bare BEGIN/COMMIT are skipped because the runner
 * already wraps each file in a transaction.
 *
 * @param {string} source
 * @returns {string[]}
 */
function splitStatements(source) {
  const statements = [];
  let chunk = '';
  let inQuote = false;
  let inDollar = false;
  let inComment = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];

    if (inComment) {
      if (char === '\n') inComment = false;
      else continue;
    }
    if (!inQuote && !inDollar && char === '-' && next === '-') {
      inComment = true;
      i++;
      continue;
    }
    if (!inQuote && char === '$' && next === '$') {
      inDollar = !inDollar;
      chunk += '$$';
      i++;
      continue;
    }
    if (!inDollar && char === "'") {
      if (inQuote && next === "'") {
        chunk += "''";
        i++;
        continue;
      }
      inQuote = !inQuote;
    }
    if (char === ';' && !inQuote && !inDollar) {
      push(chunk);
      chunk = '';
    } else {
      chunk += char;
    }
  }
  push(chunk); // a final statement may omit its semicolon
  return statements;

  function push(raw) {
    const statement = raw.trim();
    if (statement && !/^(BEGIN|COMMIT)$/i.test(statement)) statements.push(statement);
  }
}

async function main(files) {
  if (files.length === 0) {
    console.error('Usage: npm run db:migrate -- db/<migration>.sql [db/<another>.sql ...]');
    process.exitCode = 1;
    return;
  }

  require('dotenv').config({ path: '.env.local', quiet: true });
  const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error('No database configured. Set NEON_DATABASE_URL, DATABASE_URL or POSTGRES_URL.');
    process.exitCode = 1;
    return;
  }

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(url);

  for (const file of files) {
    const name = path.relative(process.cwd(), path.resolve(file));
    try {
      const statements = splitStatements(fs.readFileSync(file, 'utf8'));
      await sql.transaction(statements.map(statement => sql.query(statement)));
      console.log(`Applied ${name} (${statements.length} statements, one transaction).`);
    } catch {
      // The driver error can echo the connection host; keep it out of the terminal.
      console.error(`Failed to apply ${name}. Nothing from this file was committed.`);
      process.exitCode = 1;
      return;
    }
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { splitStatements };
