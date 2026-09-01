CREATE TABLE IF NOT EXISTS founder_solutions (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','changes_requested','published','rejected')),
 step integer NOT NULL DEFAULT 0 CHECK (step BETWEEN 0 AND 3),
 version integer NOT NULL DEFAULT 0,
 published_data jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS founder_solutions_owner ON founder_solutions(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS founder_solutions_review ON founder_solutions(status,updated_at);
CREATE TABLE IF NOT EXISTS solution_reviewers (
 account_id uuid PRIMARY KEY REFERENCES auth_accounts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS solution_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
 status text NOT NULL,
 message text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
-- No reviewer is assigned automatically. Account profile/role never grants review rights.
