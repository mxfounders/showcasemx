-- SHCWS-47: saved-search alerts («Avísame cuando haya algo nuevo para esto»).
-- Additive and re-runnable; after db/community-notices.sql.
--
-- An alert stores where it was made (scope + topic), the words and the filters. The app
-- matches published listings with the same scorer and filter rules as the catalog
-- (src/lib/alerts) and hands the new matches to record_search_alert_matches(), which keeps
-- one notice collecting them and sends at most one email per alert every 7 days.
ALTER TABLE account_notifications DROP CONSTRAINT IF EXISTS account_notifications_category_check;
ALTER TABLE account_notifications ADD CONSTRAINT account_notifications_category_check
  CHECK (category IN ('contact', 'solution', 'security', 'account', 'community', 'alert'));

-- Alerts are something the buyer asked for, so their email is on unless turned off.
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS alert_email boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS search_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('search', 'explorar', 'industria', 'colecciones')),
  topic text CHECK (topic IS NULL OR char_length(topic) BETWEEN 1 AND 60),
  query text NOT NULL DEFAULT '' CHECK (char_length(query) <= 200),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filters) = 'object'),
  -- Same search, same alert: scope, topic, normalized words and sorted filters.
  signature text NOT NULL CHECK (char_length(signature) <= 4000),
  -- Spanish, for the notice title (stored notices are Spanish, CLAUDE.md §63).
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_matched_at timestamptz,
  -- The notice still collecting matches, and when the latest notice's email was due.
  open_notice text,
  last_slot_at timestamptz,
  UNIQUE (owner_id, signature)
);
CREATE INDEX IF NOT EXISTS search_alerts_owner ON search_alerts (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS search_alerts_topic ON search_alerts (scope, topic);

-- Every listing an alert has seen, so each one is announced once. `baseline` rows are the
-- matches that already existed when the alert was created: the buyer saw them, so they
-- are never announced as new. `notice_key` is the notice (and email) that announced it.
CREATE TABLE IF NOT EXISTS search_alert_matches (
  alert_id uuid NOT NULL REFERENCES search_alerts(id) ON DELETE CASCADE,
  solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
  baseline boolean NOT NULL DEFAULT false,
  notice_key text,
  matched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (alert_id, solution_id)
);
CREATE INDEX IF NOT EXISTS search_alert_matches_notice ON search_alert_matches (notice_key)
  WHERE notice_key IS NOT NULL;

-- Records new matches for one alert and returns how many were new. Never the alert
-- owner's own listings, never an unpublished one. The open notice (not yet emailed, or
-- in-app only and less than 7 days old) collects them and its count goes up; otherwise a
-- new notice starts whose email is due 7 days after the previous one at the earliest.
CREATE OR REPLACE FUNCTION record_search_alert_matches(target uuid, solutions uuid[])
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  alert search_alerts%ROWTYPE;
  open_notice record;
  joinable boolean := false;
  slot timestamptz;
  key text;
  added integer;
  n integer;
  wanted boolean;
  title text;
BEGIN
  SELECT * INTO alert FROM search_alerts WHERE id = target FOR UPDATE;
  IF alert.id IS NULL THEN RETURN 0; END IF;
  IF alert.open_notice IS NOT NULL THEN
    SELECT email_state, attempts, next_attempt_at INTO open_notice
      FROM account_notifications WHERE source_key = alert.open_notice;
    joinable := open_notice.email_state IS NOT NULL AND (
      (open_notice.email_state = 'pending' AND open_notice.attempts = 0)
      OR (open_notice.email_state IN ('disabled', 'skipped')
          AND open_notice.next_attempt_at > now() - interval '7 days'));
  END IF;
  IF joinable THEN
    key := alert.open_notice;
    slot := open_notice.next_attempt_at;
  ELSE
    slot := GREATEST(now(), COALESCE(alert.last_slot_at + interval '7 days', now()));
    key := 'alert:' || alert.id || ':' || floor(extract(epoch FROM slot))::bigint;
  END IF;
  INSERT INTO search_alert_matches (alert_id, solution_id, notice_key)
  SELECT alert.id, s.id, key FROM founder_solutions s
   WHERE s.id = ANY(solutions) AND s.published_data IS NOT NULL AND s.owner_id <> alert.owner_id
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS added = ROW_COUNT;
  IF added = 0 THEN RETURN 0; END IF;
  SELECT count(*) INTO n FROM search_alert_matches WHERE notice_key = key;
  title := CASE WHEN n = 1 THEN 'Un proyecto nuevo para tu alerta «' || alert.label || '»'
    ELSE n || ' proyectos nuevos para tu alerta «' || alert.label || '»' END;
  title := CASE WHEN char_length(title) > 180 THEN left(title, 179) || '…' ELSE title END;
  SELECT COALESCE(p.alert_email, true) AND a.email_verified_at IS NOT NULL INTO wanted
    FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id = a.id
   WHERE a.id = alert.owner_id;
  INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state, next_attempt_at)
  VALUES (alert.owner_id, 'alert', key, title, '/account/alerts',
    CASE WHEN COALESCE(wanted, false) THEN 'pending' ELSE 'disabled' END, slot)
  ON CONFLICT (source_key) DO UPDATE SET title = EXCLUDED.title, read_at = NULL, created_at = now();
  UPDATE search_alerts
     SET open_notice = key, last_matched_at = now(),
         last_slot_at = CASE WHEN joinable THEN last_slot_at ELSE slot END
   WHERE id = alert.id;
  RETURN added;
END $$;
