import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { splitStatements } from '../scripts/migrate.cjs';

test('splits on top-level semicolons and drops line comments', () => {
  const sql = `-- header; with a semicolon
CREATE TABLE a (id int); -- trailing note
INSERT INTO a VALUES (1);`;
  assert.deepEqual(splitStatements(sql), ['CREATE TABLE a (id int)', 'INSERT INTO a VALUES (1)']);
});

test('keeps semicolons inside quoted strings, including escaped quotes', () => {
  assert.deepEqual(splitStatements(`INSERT INTO a VALUES ('x; y', 'it''s; fine');`), [
    `INSERT INTO a VALUES ('x; y', 'it''s; fine')`,
  ]);
});

test('keeps PL/pgSQL bodies intact inside $$ blocks', () => {
  const sql = `CREATE FUNCTION f() RETURNS trigger AS $$
BEGIN
  -- not a comment to strip: we are inside the body
  INSERT INTO log VALUES ('it''s');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
SELECT 1;`;
  const statements = splitStatements(sql);
  assert.equal(statements.length, 2);
  assert.match(statements[0], /RETURN NEW;\nEND;\n\$\$ LANGUAGE plpgsql$/);
  assert.match(statements[0], /-- not a comment/);
  assert.equal(statements[1], 'SELECT 1');
});

test('skips bare BEGIN/COMMIT because each file already runs in one transaction', () => {
  assert.deepEqual(splitStatements('BEGIN; SELECT 1; COMMIT;'), ['SELECT 1']);
});

test('keeps a final statement that omits its semicolon', () => {
  assert.deepEqual(splitStatements('SELECT 1; SELECT 2'), ['SELECT 1', 'SELECT 2']);
});

test('every migration in db/ splits into at least one statement with balanced quoting', () => {
  for (const file of readdirSync('db').filter(name => name.endsWith('.sql'))) {
    const statements = splitStatements(readFileSync(`db/${file}`, 'utf8'));
    assert.ok(statements.length > 0, file);
    for (const statement of statements) {
      assert.equal(statement.split('$$').length % 2, 1, `${file}: unbalanced $$`);
    }
  }
});
