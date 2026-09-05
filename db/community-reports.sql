-- Visitor-facing reports for public lists and their comments — mirrors
-- solution_reports (db/launch-foundation.sql) for the community layer that
-- §19/§23/§54 flagged as missing before promoting it more broadly. Kept as
-- its own table instead of extending solution_reports: additive-only, and
-- list/comment subjects don't share founder_solutions' shape.
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK(subject_type IN('list','comment')),
  list_id uuid NOT NULL REFERENCES buyer_lists(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES community_list_comments(id) ON DELETE SET NULL,
  reporter_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK(reason IN('spam','abuse','impersonation','other')),
  details varchar(2000) NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK(status IN('open','resolved','dismissed')),
  decision text,
  reviewer_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS community_reports_open_list ON community_reports(list_id,reporter_id) WHERE status='open' AND subject_type='list';
CREATE UNIQUE INDEX IF NOT EXISTS community_reports_open_comment ON community_reports(comment_id,reporter_id) WHERE status='open' AND subject_type='comment';
CREATE INDEX IF NOT EXISTS community_reports_status ON community_reports(status,created_at DESC);
