const fs = require("node:fs");
const path = require("node:path");
const { neon } = require("@neondatabase/serverless");

function loadLocalEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const separator = line.indexOf("=");
    const key = line.slice(0, separator);
    if (!(key in process.env)) process.env[key] = line.slice(separator + 1);
  }
}

loadLocalEnv(path.join(process.cwd(), ".env.local"));

if (process.env.ALLOW_NEON_RESTORE_TEST !== "true") {
  throw new Error("Define ALLOW_NEON_RESTORE_TEST=true para ejecutar la prueba temporal.");
}

const adminUrl = process.env.DATABASE_URL;
const sourceDatabase = process.env.NEON_RESTORE_SOURCE || "shwcs_production";
if (!adminUrl || !/^[a-z][a-z0-9_]*$/i.test(sourceDatabase)) {
  throw new Error("Falta DATABASE_URL de propietario o el nombre de origen es inválido.");
}

const suffix = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const restoredDatabase = `shwcs_restore_test_${suffix}`;
const admin = neon(adminUrl);
const migrationFiles = [
  "auth.sql",
  "account-profile.sql",
  "account-settings.sql",
  "founder-solutions.sql",
  "buyer-library.sql",
  "contact-requests.sql",
  "catalog-ownership.sql",
  "solution-media-dashboard.sql",
  "solution-profile.sql",
  "newsletter-subscribers.sql",
  "newsletter-segments.sql",
  "public-collections.sql",
  "community-social.sql",
  "contact-inquiries.sql",
  "launch-foundation.sql",
];

function databaseUrl(name) {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

async function snapshot(name) {
  const sql = neon(databaseUrl(name));
  const tables = await sql.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const columns = await sql.query(`
    SELECT table_name, column_name, data_type, is_nullable, coalesce(column_default, '') AS column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `);
  const constraints = await sql.query(`
    SELECT conrelid::regclass::text AS table_name, conname, contype, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
    ORDER BY conrelid::regclass::text, conname
  `);
  const indexes = await sql.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);
  const rowCounts = {};
  for (const { table_name: table } of tables) {
    if (!/^[a-z][a-z0-9_]*$/i.test(table)) throw new Error(`Tabla inesperada: ${table}`);
    const [{ count }] = await sql.query(`SELECT count(*)::int AS count FROM "${table}"`);
    rowCounts[table] = count;
  }
  return { tables, columns, constraints, indexes, rowCounts };
}

function statements(source) {
  let quote = false;
  let dollar = false;
  let comment = false;
  let chunk = "";
  const output = [];
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (comment) {
      if (character === "\n") comment = false;
      else continue;
    }
    if (!quote && !dollar && character === "-" && next === "-") {
      comment = true;
      index += 1;
      continue;
    }
    if (!quote && character === "$" && next === "$") {
      dollar = !dollar;
      chunk += "$$";
      index += 1;
      continue;
    }
    if (!dollar && character === "'") {
      if (quote && next === "'") {
        chunk += "''";
        index += 1;
        continue;
      }
      quote = !quote;
    }
    if (character === ";" && !quote && !dollar) {
      const statement = chunk.trim();
      if (statement && !/^(BEGIN|COMMIT)$/i.test(statement)) output.push(statement);
      chunk = "";
    } else chunk += character;
  }
  if (chunk.trim()) output.push(chunk.trim());
  return output;
}

async function rebuildFromMigrations() {
  await admin.query(`CREATE DATABASE "${restoredDatabase}"`);
  const restored = neon(databaseUrl(restoredDatabase));
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(process.cwd(), "db", file), "utf8");
    await restored.transaction(statements(sql).map((statement) => restored.query(statement)));
  }
}

(async () => {
  let created = false;
  try {
    let method = "database-template";
    try {
      await admin.query(`CREATE DATABASE "${restoredDatabase}" TEMPLATE "${sourceDatabase}"`);
      created = true;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("being accessed by other users")) throw error;
      method = "migrations";
      try {
        await rebuildFromMigrations();
        created = true;
      } catch (restoreError) {
        created = true;
        throw restoreError;
      }
    }
    const [source, restored] = await Promise.all([snapshot(sourceDatabase), snapshot(restoredDatabase)]);
    const sourceJson = JSON.stringify(source);
    const restoredJson = JSON.stringify(restored);
    if (sourceJson !== restoredJson) throw new Error("La copia restaurada no coincide con producción.");
    console.log(JSON.stringify({
      status: "ok",
      method,
      source: sourceDatabase,
      restored: restoredDatabase,
      tables: source.tables.length,
      constraints: source.constraints.length,
      indexes: source.indexes.length,
      rows: Object.values(source.rowCounts).reduce((total, count) => total + count, 0),
    }));
  } finally {
    if (created) {
      await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [restoredDatabase]);
      await admin.query(`DROP DATABASE IF EXISTS "${restoredDatabase}"`);
    }
  }
})().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
