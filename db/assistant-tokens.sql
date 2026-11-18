-- Personal tokens for the founder's AI assistant (SHCWS-152, docs/assistant-mcp.md).
--
-- A founder creates one in Ajustes → Conexiones and pastes it into Claude, Cursor or any
-- MCP client; the assistant then calls /api/mcp with `Authorization: Bearer <token>` to
-- create and update that founder's own listings. Only the SHA-256 of the token is kept,
-- like a session. Additive: touches no existing table.
--
-- password_stamp: SHA-256 of the account's password hash when the token was created. A
-- token stops working the moment the password changes (change, reset or recovery), the
-- same rule that closes every session (CLAUDE.md §6): a stolen password that minted a
-- token loses it as soon as the owner chooses a new one.

CREATE TABLE IF NOT EXISTS assistant_tokens (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  -- The first four characters of the secret part, so the owner can tell tokens apart.
  token_hint text NOT NULL CHECK (token_hint ~ '^[A-Za-z0-9_-]{4}$'),
  -- What the token may touch. Only the owner's listings for now («mis fichas»).
  scope text NOT NULL DEFAULT 'solutions' CHECK (scope IN ('solutions')),
  -- Language of the tool descriptions and messages the assistant receives.
  locale text NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en')),
  password_stamp text NOT NULL CHECK (password_stamp ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  CHECK (expires_at > created_at AND expires_at <= created_at + interval '366 days')
);
CREATE INDEX IF NOT EXISTS assistant_tokens_account ON assistant_tokens (account_id, created_at DESC);

-- What each token did: one row per tool call, never the arguments or the listing's text.
-- Kept 180 days (the insert that adds a row removes that token's older ones).
CREATE TABLE IF NOT EXISTS assistant_token_events (
  id bigserial PRIMARY KEY,
  token_id uuid NOT NULL REFERENCES assistant_tokens(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  tool text NOT NULL CHECK (tool ~ '^[a-z_]{1,40}$'),
  -- The owner's own listing; the line stays (without it) if the draft is deleted later.
  solution_id uuid REFERENCES founder_solutions(id) ON DELETE SET NULL,
  outcome text NOT NULL CHECK (outcome IN ('ok', 'error')),
  code text CHECK (code IS NULL OR code ~ '^[A-Za-z]{1,40}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assistant_token_events_account ON assistant_token_events (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_token_events_token ON assistant_token_events (token_id, created_at DESC);
