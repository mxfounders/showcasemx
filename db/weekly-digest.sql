-- SHCWS-21: «Tu semana en shwcs», the founders' weekly email. Additive and re-runnable.
--
-- On by default (a founder with a published listing gets it unless they turn it off);
-- one send per account and week; aggregate counts only for sends and clicks, never who
-- clicked. No opens: that needs a tracking pixel, which the privacy policy rules out.
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS weekly_email boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS weekly_digest_sends (
  owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  week date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, week)
);

CREATE TABLE IF NOT EXISTS weekly_digest_stats (
  week date PRIMARY KEY,
  sent integer NOT NULL DEFAULT 0 CHECK (sent >= 0),
  clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0)
);
