-- Ops console: roles, TOTP, session isolation and audit trail. Additive.
BEGIN;

-- Roles, TOTP and provenance on the existing reviewer table. Nothing that
-- reads EXISTS(... solution_reviewers ...) today stops working.
ALTER TABLE solution_reviewers
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'reviewer'
      CHECK (level IN ('reviewer','admin')),
  ADD COLUMN IF NOT EXISTS totp_secret text,
  ADD COLUMN IF NOT EXISTS totp_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS totp_last_step bigint,
  ADD COLUMN IF NOT EXISTS backup_codes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS granted_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

-- Ops sessions live apart from the public product's auth_sessions.
CREATE TABLE IF NOT EXISTS ops_sessions (
  token_hash char(64) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip text,
  user_agent varchar(300)
);
CREATE INDEX IF NOT EXISTS ops_sessions_account ON ops_sessions(account_id);
CREATE INDEX IF NOT EXISTS ops_sessions_expiry ON ops_sessions(expires_at);

-- Two-step login: password verified, TOTP pending.
CREATE TABLE IF NOT EXISTS ops_login_challenges (
  token_hash char(64) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  password_hash_at_issue text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ops_login_challenges_account ON ops_login_challenges(account_id);

-- Immutable log of every ops action.
CREATE TABLE IF NOT EXISTS ops_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  actor_email varchar(254) NOT NULL,
  action text NOT NULL,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  reason varchar(1000) NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ops_audit_created ON ops_audit_log(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS ops_audit_subject ON ops_audit_log(subject_type, subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ops_audit_actor ON ops_audit_log(actor_id, created_at DESC);

-- Who decided each solution_events row.
ALTER TABLE solution_events
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL;

-- Account suspension.
ALTER TABLE auth_accounts
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason varchar(500),
  ADD COLUMN IF NOT EXISTS suspended_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS auth_accounts_suspended ON auth_accounts(suspended_at) WHERE suspended_at IS NOT NULL;

-- Public contact-form inbox triage.
ALTER TABLE contact_inquiries
  ADD COLUMN IF NOT EXISTS handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS handled_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL;

COMMIT;
