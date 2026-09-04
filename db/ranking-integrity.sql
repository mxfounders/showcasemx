BEGIN;
-- One row per (solution, day, visitor) caps a single view per visitor per
-- solution per day. visitor_hash is HMAC-SHA256(VIEW_HASH_SECRET, ip+day) —
-- never the IP itself, and rotated daily so the same visitor's rows on
-- different days cannot be correlated. See src/lib/solutions/view-visitor.ts.
CREATE TABLE IF NOT EXISTS solution_view_visitors (
 solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
 day date NOT NULL,
 visitor_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(solution_id,day,visitor_hash)
);
-- Rows only need to live long enough to dedupe today's traffic; the monitor
-- cron (src/app/api/internal/monitor/route.ts) deletes rows older than 3 days,
-- since Vercel Hobby has no room for a third, dedicated cron (see §42).
CREATE INDEX IF NOT EXISTS solution_view_visitors_day ON solution_view_visitors(day);
COMMIT;
