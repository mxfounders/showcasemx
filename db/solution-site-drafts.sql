-- Drafts a founder asked Claude to prepare from their own website
-- (src/lib/solutions/site-draft.ts, docs/site-draft.md).
--
-- One row per attempt. It is three things at once:
--   * the daily quota: attempts that reached the model (model IS NOT NULL) or are
--     still running count towards 5 per account and a global cap per 24 h;
--   * what the editor marks: `suggested` holds exactly the values written into the
--     draft and `sources` the page each one came from, so a field keeps its
--     "from your site" mark only while it still equals that value;
--   * a cost record: model and token counts, never the site's text or the prompt.
--
-- Additive and re-runnable. Deleting a solution or an account removes its rows.
CREATE TABLE IF NOT EXISTS solution_site_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  website text NOT NULL CHECK (length(website) <= 500),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'partial', 'failed')),
  failure text CHECK (failure IS NULL OR length(failure) <= 40),
  suggested jsonb NOT NULL DEFAULT '{}'::jsonb,
  sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text CHECK (model IS NULL OR length(model) <= 80),
  input_tokens integer CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens integer CHECK (output_tokens IS NULL OR output_tokens >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS solution_site_drafts_owner_recent
  ON solution_site_drafts (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS solution_site_drafts_solution_recent
  ON solution_site_drafts (solution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS solution_site_drafts_recent
  ON solution_site_drafts (created_at DESC);
