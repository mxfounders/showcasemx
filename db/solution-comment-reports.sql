-- Visitor reports on comments of public listings (SHCWS-140). Mirrors
-- solution_review_reports (db/solution-reviews.sql) and community_reports
-- (db/community-reports.sql): signed-in visitors flag someone else's comment, one open
-- report per person and comment, and only ops decides. The listing's founder can report
-- a comment on their own listing but never delete or hide it (CLAUDE.md §46).
-- Additive and re-runnable. Requires db/solution-social.sql.

-- «Ocultar» keeps the comment as evidence and lets its author read why; it leaves the
-- public listing, its comment count and the catalogue score. Only ops sets these.
ALTER TABLE solution_comments ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE solution_comments ADD COLUMN IF NOT EXISTS hidden_reason varchar(500);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'solution_comments_hidden_reason') THEN
    ALTER TABLE solution_comments ADD CONSTRAINT solution_comments_hidden_reason
      CHECK ((hidden_at IS NULL) = (hidden_reason IS NULL));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS solution_comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- SET NULL, not CASCADE: a comment deleted by its author or by ops must not take the
  -- report and its decision with it (the lesson of community_reports, CLAUDE.md §56).
  comment_id uuid REFERENCES solution_comments(id) ON DELETE SET NULL,
  solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'abuse', 'impersonation', 'other')),
  details varchar(2000) NOT NULL CHECK (char_length(btrim(details)) >= 10),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  decision varchar(2000),
  reviewer_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- One open report per person and comment; a retry answers 409 instead of piling up.
CREATE UNIQUE INDEX IF NOT EXISTS solution_comment_reports_open
  ON solution_comment_reports (comment_id, reporter_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS solution_comment_reports_status
  ON solution_comment_reports (status, created_at DESC);
