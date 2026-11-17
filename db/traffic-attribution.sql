-- SHCWS-111/109/110: where visits come from, counted per day, and where each account
-- came from when it signed up. Additive and re-runnable; after launch-foundation.sql
-- (auth_google_states). Contract: docs/attribution.md.
--
-- traffic_daily: one counter row per day and dimension, no account, address or visitor
-- id. A browser tab counts each step of its visit once (sessionStorage, never sent as an
-- identifier). `site` is only the host of an external page that linked here (never a
-- path); campaign and source are normalized tags that never look like an email, a phone
-- or a URL (src/lib/attribution/classify.ts). Nothing is counted with DNT or GPC. Kept
-- 400 days (src/lib/maintenance.ts).
CREATE TABLE IF NOT EXISTS traffic_daily (
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Mexico_City')::date,
  -- visit: first page of a visit; browse: explored the catalog — a search, a category,
  -- industry or collection page, or a listing; listing: a listing page; apply: /aplicar
  -- (founder funnel). Each at most once per visit.
  step text NOT NULL CHECK (step IN ('visit', 'browse', 'listing', 'apply')),
  channel text NOT NULL CHECK (channel IN ('direct', 'organic', 'ai', 'social', 'newsletter',
    'email', 'badge', 'share', 'invitation', 'referral', 'paid', 'campaign')),
  source varchar(60) NOT NULL DEFAULT '',
  medium varchar(60) NOT NULL DEFAULT '',
  campaign varchar(60) NOT NULL DEFAULT '',
  site varchar(100) NOT NULL DEFAULT '',
  -- Kind of page the visit started on; only on 'visit' rows.
  landing text NOT NULL DEFAULT '' CHECK (landing IN ('', 'home', 'catalog', 'listing',
    'community', 'blog', 'apply', 'review', 'account', 'auth', 'info', 'other')),
  sessions integer NOT NULL DEFAULT 0 CHECK (sessions >= 0),
  PRIMARY KEY (day, step, channel, source, medium, campaign, site, landing)
);
CREATE INDEX IF NOT EXISTS traffic_daily_day ON traffic_daily (day DESC, step);

-- The first channel of the visit in which an account was created (its «origen de alta»),
-- written once at sign-up and never updated. intent: 'founder' when that visit went
-- through /aplicar or the sign-up leads to publishing, 'buyer' when it leads to saving,
-- contacting or reviewing, '' otherwise. Deleted with the account; included in its data
-- export. No row: DNT/GPC, an account created before this table, or no data sent.
CREATE TABLE IF NOT EXISTS account_signup_origins (
  account_id uuid PRIMARY KEY REFERENCES auth_accounts(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('direct', 'organic', 'ai', 'social', 'newsletter',
    'email', 'badge', 'share', 'invitation', 'referral', 'paid', 'campaign')),
  source varchar(60) NOT NULL DEFAULT '',
  medium varchar(60) NOT NULL DEFAULT '',
  campaign varchar(60) NOT NULL DEFAULT '',
  site varchar(100) NOT NULL DEFAULT '',
  landing text NOT NULL DEFAULT '' CHECK (landing IN ('', 'home', 'catalog', 'listing',
    'community', 'blog', 'apply', 'review', 'account', 'auth', 'info', 'other')),
  intent text NOT NULL DEFAULT '' CHECK (intent IN ('', 'founder', 'buyer')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_signup_origins_channel
  ON account_signup_origins (channel, created_at DESC);

-- Google sign-up carries the visit's origin through the ten-minute OAuth state, so an
-- account created in the callback gets it too (already validated when stored).
ALTER TABLE auth_google_states ADD COLUMN IF NOT EXISTS signup_origin jsonb;
