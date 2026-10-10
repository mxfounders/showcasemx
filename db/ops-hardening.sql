-- Ops hardening: step-up elevation, enrollment deadline and a tamper-evident,
-- append-only audit log. Additive; requires db/ops-console.sql first.
-- Apply BEFORE deploying the ops code that reads these columns.
BEGIN;

-- Step-up ("modo seguro"): a fresh TOTP code unlocks critical actions on this
-- one session for a few minutes. NULL = never elevated, which is every row today.
ALTER TABLE ops_sessions ADD COLUMN IF NOT EXISTS elevated_until timestamptz;

-- First-time enrollment is trust-on-first-use. Accounts added or reset from the
-- panel must enroll before this deadline; NULL keeps the old behaviour for rows
-- granted by scripts (add-reviewer.cjs / promote-ops-admin.cjs).
ALTER TABLE solution_reviewers ADD COLUMN IF NOT EXISTS enroll_by timestamptz;

-- Hash chain. chain_seq is assigned under an advisory lock inside the trigger,
-- so it follows commit order even when identity ids were handed out in a
-- different order by concurrent transactions.
ALTER TABLE ops_audit_log
  ADD COLUMN IF NOT EXISTS chain_seq bigint,
  ADD COLUMN IF NOT EXISTS prev_hash char(64),
  ADD COLUMN IF NOT EXISTS row_hash char(64);

-- Canonical row text. actor_id is deliberately excluded: it is the only column
-- an FK (ON DELETE SET NULL) may change after insert. created_at is hashed as
-- epoch microseconds so the result never depends on the session TimeZone.
CREATE OR REPLACE FUNCTION ops_audit_row_hash(
  p_id bigint, p_created_at timestamptz, p_actor_email text, p_action text,
  p_subject_type text, p_subject_id text, p_reason text, p_metadata jsonb,
  p_ip text, p_prev_hash text
) RETURNS char(64) LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(sha256(convert_to(jsonb_build_array(
    p_id,
    (extract(epoch FROM p_created_at) * 1000000)::bigint,
    p_actor_email, p_action, p_subject_type, p_subject_id, p_reason,
    p_metadata, p_ip, p_prev_hash
  )::text, 'UTF8')), 'hex')::char(64)
$$;

-- Backfill existing rows in id order (the only order they have) before the
-- immutability trigger exists.
DO $$
DECLARE
  r record;
  prev char(64) := repeat('0', 64);
  seq bigint := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM ops_audit_log WHERE row_hash IS NULL) THEN
    FOR r IN SELECT * FROM ops_audit_log ORDER BY id LOOP
      seq := seq + 1;
      UPDATE ops_audit_log SET
        chain_seq = seq,
        prev_hash = prev,
        row_hash = ops_audit_row_hash(r.id, r.created_at, r.actor_email, r.action,
          r.subject_type, r.subject_id, r.reason, r.metadata, r.ip, prev)
      WHERE id = r.id;
      SELECT row_hash INTO prev FROM ops_audit_log WHERE id = r.id;
    END LOOP;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ops_audit_chain_seq ON ops_audit_log(chain_seq);
CREATE INDEX IF NOT EXISTS ops_audit_action ON ops_audit_log(action, created_at DESC);

CREATE OR REPLACE FUNCTION ops_audit_chain() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  last_seq bigint;
  last_hash char(64);
BEGIN
  -- Serialises appends until commit. Trigger functions are VOLATILE, so the
  -- SELECT below sees rows committed by whoever held the lock before us.
  PERFORM pg_advisory_xact_lock(hashtext('ops_audit_log_chain'));
  SELECT chain_seq, row_hash INTO last_seq, last_hash
    FROM ops_audit_log ORDER BY chain_seq DESC NULLS LAST LIMIT 1;
  NEW.chain_seq := COALESCE(last_seq, 0) + 1;
  NEW.prev_hash := COALESCE(last_hash, repeat('0', 64));
  NEW.row_hash := ops_audit_row_hash(NEW.id, NEW.created_at, NEW.actor_email, NEW.action,
    NEW.subject_type, NEW.subject_id, NEW.reason, NEW.metadata, NEW.ip, NEW.prev_hash);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ops_audit_chain ON ops_audit_log;
CREATE TRIGGER ops_audit_chain BEFORE INSERT ON ops_audit_log
  FOR EACH ROW EXECUTE FUNCTION ops_audit_chain();

-- Append-only. The single permitted UPDATE is the FK nulling actor_id when an
-- account is deleted (integration tests and real account deletion rely on it).
CREATE OR REPLACE FUNCTION ops_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.actor_id IS NULL
     AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'ops_audit_log is append-only (% blocked)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS ops_audit_immutable ON ops_audit_log;
CREATE TRIGGER ops_audit_immutable BEFORE UPDATE OR DELETE ON ops_audit_log
  FOR EACH ROW EXECUTE FUNCTION ops_audit_immutable();

CREATE OR REPLACE FUNCTION ops_audit_no_truncate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ops_audit_log is append-only (TRUNCATE blocked)'
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS ops_audit_no_truncate ON ops_audit_log;
CREATE TRIGGER ops_audit_no_truncate BEFORE TRUNCATE ON ops_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION ops_audit_no_truncate();

COMMIT;
