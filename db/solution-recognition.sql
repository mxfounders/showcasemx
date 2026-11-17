-- «Verificado por shwcs» and recognitions (docs/recognition.md). Additive; every existing
-- solution starts unverified and without awards: nothing is backfilled or seeded.
--
-- Verification is decided by the team in ops, never requested with a document by the
-- founder. It is tied to the host that was checked: when the published website moves
-- to another host the check stops showing on its own (compared when reading), so a
-- verified badge can never travel to a domain nobody looked at.
CREATE TABLE IF NOT EXISTS solution_verifications (
  solution_id uuid PRIMARY KEY REFERENCES founder_solutions(id) ON DELETE CASCADE,
  -- Lowercase hostname without a leading "www.", see src/lib/recognition/model.ts.
  host text NOT NULL CHECK (host ~ '^[a-z0-9.-]{3,253}$'),
  -- What the reviewer confirmed, from a closed list (ops/src/lib/recognition.ts).
  checks text[] NOT NULL CHECK (cardinality(checks) BETWEEN 1 AND 8),
  -- Internal note for the team; never shown in public.
  note varchar(1000) NOT NULL CHECK (char_length(btrim(note)) >= 10),
  verified_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  verified_at timestamptz NOT NULL DEFAULT now()
);

-- Two kinds of recognition, rare, dated and revocable (docs/strategy.md):
--   weekly    computed every week from real activity of verified accounts; `scope` is
--             'all' or a category value and `rank` 1..3.
--   editorial chosen by the team for a month; `note` is the public reason.
-- A revoked award keeps its row (and its slot): nobody inherits a revoked place.
CREATE TABLE IF NOT EXISTS solution_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('weekly', 'editorial')),
  scope text NOT NULL CHECK (char_length(scope) BETWEEN 1 AND 40),
  rank smallint CHECK (rank BETWEEN 1 AND 3),
  period_start date NOT NULL,
  period_end date NOT NULL CHECK (period_end >= period_start),
  score numeric(12, 3),
  note varchar(280) CHECK (note IS NULL OR char_length(btrim(note)) >= 10),
  awarded_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_reason varchar(500),
  CHECK ((revoked_at IS NULL) = (revoked_reason IS NULL)),
  CHECK (
    (kind = 'weekly' AND rank IS NOT NULL AND note IS NULL)
    OR (kind = 'editorial' AND rank IS NULL AND scope = 'all' AND note IS NOT NULL)
  )
);
-- One place per slot and one place per solution in each weekly ranking.
CREATE UNIQUE INDEX IF NOT EXISTS solution_awards_weekly_slot
  ON solution_awards (scope, period_start, rank) WHERE kind = 'weekly';
CREATE UNIQUE INDEX IF NOT EXISTS solution_awards_weekly_once
  ON solution_awards (solution_id, scope, period_start) WHERE kind = 'weekly';
-- An editorial pick once per solution and month while it stands.
CREATE UNIQUE INDEX IF NOT EXISTS solution_awards_editorial_once
  ON solution_awards (solution_id, period_start) WHERE kind = 'editorial' AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS solution_awards_solution
  ON solution_awards (solution_id, period_start DESC) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS solution_awards_period
  ON solution_awards (kind, period_start DESC);

-- A week is computed once. Without this marker a later run could crown a different
-- project for the same week (for example after an account verifies its email and its
-- old likes start to count); the first result stands.
CREATE TABLE IF NOT EXISTS solution_award_runs (
  period_start date PRIMARY KEY,
  computed_at timestamptz NOT NULL DEFAULT now(),
  competitors integer NOT NULL DEFAULT 0,
  awarded integer NOT NULL DEFAULT 0
);
