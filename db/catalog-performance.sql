-- The catalogue score joins buyer_saved_projects by project_key alone, but the
-- table's only key is the composite (owner_id,project_key) — every save-count
-- lookup was a sequential scan. Same shape used by the community score in
-- src/lib/library/community.ts.
CREATE INDEX IF NOT EXISTS buyer_saved_projects_key ON buyer_saved_projects(project_key);
