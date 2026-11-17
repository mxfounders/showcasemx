-- Passkeys (WebAuthn) for product accounts (SHCWS-158). Additive only: no account changes,
-- the password stays as the way in and every existing session keeps working.
--
-- A passkey is a key pair made on the person's device. Only its public key lives here; the
-- private key, and whatever unlocks it (fingerprint, face, device PIN), never leaves the
-- device. `rp_id` is the host the passkey belongs to: shwcs.site in production (from
-- AUTH_APP_ORIGIN), `localhost` in development. Sign-in only accepts a passkey of the host
-- it is asked on.
CREATE TABLE IF NOT EXISTS auth_passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  rp_id text NOT NULL CHECK (char_length(rp_id) BETWEEN 1 AND 253),
  -- base64url, as the browser reports it. WebAuthn caps the raw id at 1023 bytes.
  credential_id text NOT NULL UNIQUE CHECK (credential_id ~ '^[A-Za-z0-9_-]{16,1366}$'),
  public_key text NOT NULL,
  -- The authenticator's signature counter. Synced passkeys always report 0; a hardware key
  -- counts up, and a value that goes backwards means a cloned key (the sign-in refuses it).
  counter bigint NOT NULL DEFAULT 0 CHECK (counter >= 0),
  transports text[] NOT NULL DEFAULT '{}',
  device_type text NOT NULL CHECK (device_type IN ('singleDevice', 'multiDevice')),
  backed_up boolean NOT NULL DEFAULT false,
  aaguid text,
  name varchar(60) NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX IF NOT EXISTS auth_passkeys_account ON auth_passkeys(account_id, rp_id);

-- One row per ceremony, keyed by the SHA-256 of the WebAuthn challenge: the challenge
-- itself only exists in the browser's options and in the signed response. A sign-in or a
-- registration deletes its row before checking the signature, so each challenge is tried
-- once. Registration challenges are tied to the account and to the session that asked
-- (with the password, and the second factor when it is on, checked first).
CREATE TABLE IF NOT EXISTS auth_passkey_challenges (
  challenge_hash char(64) PRIMARY KEY,
  purpose text NOT NULL CHECK (purpose IN ('register', 'sign_in')),
  rp_id text NOT NULL,
  account_id uuid REFERENCES auth_accounts(id) ON DELETE CASCADE,
  session_hash char(64),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_passkey_challenges_bound
    CHECK (purpose = 'sign_in' OR (account_id IS NOT NULL AND session_hash IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS auth_passkey_challenges_expiry ON auth_passkey_challenges(expires_at);
CREATE INDEX IF NOT EXISTS auth_passkey_challenges_account
  ON auth_passkey_challenges(account_id) WHERE account_id IS NOT NULL;

-- Sessions remember the passkey that opened them, so removing a passkey also closes what was
-- opened with it (except the session doing the removal). No foreign key on purpose: the
-- passkey and its sessions go in the same statement, and a stale id is harmless.
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS passkey_id uuid;
CREATE INDEX IF NOT EXISTS auth_sessions_passkey ON auth_sessions(passkey_id) WHERE passkey_id IS NOT NULL;
