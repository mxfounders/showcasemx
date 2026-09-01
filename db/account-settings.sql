-- Additive MVP settings. Compressed private avatars; never store original uploads.
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS avatar_data text;
CREATE TABLE IF NOT EXISTS auth_password_resets (
 token_hash char(64) PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 password_hash_at_issue text NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_password_resets_account ON auth_password_resets(account_id);
