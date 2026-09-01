ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS dashboard_mode text CHECK (dashboard_mode IN ('buyer','founder','both'));
ALTER TABLE founder_solutions ADD COLUMN IF NOT EXISTS published_at timestamptz;
CREATE TABLE IF NOT EXISTS solution_media (
 id uuid PRIMARY KEY,
 solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
 content_base64 text NOT NULL CHECK (length(content_base64)<=550000),
 width integer NOT NULL,
 height integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solution_media_solution ON solution_media(solution_id,created_at DESC);
-- Existing publication dates are unknown; do not invent them in a backfill.
