-- Account security for the product: recognisable sessions and optional two-step
-- verification. Additive only; existing sessions keep working and no account gains
-- or loses a permission here.

-- Sessions gain provenance so a person can recognise a device before revoking it.
-- Existing rows backfill to now(); that is the moment the column appeared, not a
-- real sign-in time, and the interface says "desconocido" for a null user agent.
-- Deliberately no IP column: the reviewed privacy policy commits to session
-- cookies only, and a device label is enough to recognise a session. Adding a
-- network address here would be a new category of personal data and needs its
-- own decision plus a policy line first.
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS user_agent varchar(300);

-- Optional TOTP. Null secret = disabled, which is every existing account.
-- The secret is stored encrypted (AES-256-GCM) exactly like the ops backoffice;
-- without AUTH_TOTP_KEY the application refuses to enable or verify it.
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS totp_secret text;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS totp_confirmed_at timestamptz;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS totp_last_step bigint;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS backup_codes text[];

-- Two-step login: password verified, second factor pending. Never a session.
CREATE TABLE IF NOT EXISTS auth_login_challenges (
  token_hash char(64) PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  password_hash_at_issue text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_login_challenges_account ON auth_login_challenges(account_id);
CREATE INDEX IF NOT EXISTS auth_login_challenges_expiry ON auth_login_challenges(expires_at);
