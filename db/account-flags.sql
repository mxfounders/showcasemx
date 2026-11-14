-- Cuentas marcadas como sospechosas desde ops (SHCWS-141). Additive and re-runnable.
-- Requires db/auth.sql and db/founder-solutions.sql (auth_accounts, founder_solutions).
--
-- An admin marks an account after looking at the signals in /panel/fraude (accounts
-- created together that interact with the same listing, disposable addresses, bursts,
-- one browser shared by several accounts, activity concentrated in brand-new accounts).
-- The mark neutralises the account in every ranking: its likes, saves, comments and
-- reviews stop moving the catalogue order (src/lib/solutions/public.ts), the weekly
-- award (src/lib/recognition/server.ts) and «Populares» in the community
-- (src/lib/library/community.ts). What the account did stays visible, exactly like the
-- activity of an unverified account (CLAUDE.md §55): the mark changes the order, never
-- the counters people see. The detectors and their thresholds live only in ops.
--
-- One active mark per account; clearing it keeps the row as history. Who marked and why
-- is also in ops_audit_log, written in the same statement as the change.
CREATE TABLE IF NOT EXISTS account_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  reason varchar(1000) NOT NULL CHECK (char_length(btrim(reason)) >= 10),
  -- Codes of the signals ops saw when marking (ops/src/lib/fraud.ts), as a snapshot.
  signals text[] NOT NULL DEFAULT '{}',
  -- The listing or list whose cluster led to the mark, if any. Context only.
  target_type text CHECK (target_type IN ('solution', 'list')),
  target_id uuid,
  flagged_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  flagged_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz,
  cleared_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  cleared_reason varchar(1000),
  CHECK ((target_type IS NULL) = (target_id IS NULL)),
  CHECK (cleared_at IS NULL OR char_length(btrim(coalesce(cleared_reason, ''))) >= 10)
);
CREATE UNIQUE INDEX IF NOT EXISTS account_flags_active ON account_flags (account_id)
  WHERE cleared_at IS NULL;
CREATE INDEX IF NOT EXISTS account_flags_history ON account_flags (flagged_at DESC);

-- The one definition the product's rankings call. Same shape as review_invited().
CREATE OR REPLACE FUNCTION account_flagged(account uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM account_flags f WHERE f.account_id = account AND f.cleared_at IS NULL)
$$;
