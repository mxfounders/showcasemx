-- Newsletter sending (SHCWS-124) and the weekly «Nuevo esta semana» draft (SHCWS-125).
-- Additive. After newsletter-subscribers.sql and newsletter-segments.sql; reads auth_accounts.
-- Contract and decisions: docs/newsletter.md.
--
-- * Double opt-in: only rows with confirmed_at receive campaigns. Rows that existed before this
--   migration keep confirmed_at NULL on purpose: they get no campaign until they click a
--   reconfirmation email that an ops admin triggers. Nothing here guesses consent.
-- * A confirmation token is random; only its SHA-256 is stored, it lasts 7 days and is consumed
--   once. The profile, role and language asked for in the form live on the token, so a public
--   form never overwrites an existing subscriber before its owner confirms.
-- * Campaigns are written in ops, tested (tested_version must equal version) and queued there;
--   the product's worker sends them. One delivery row per recipient makes retries idempotent.
-- * Clicks are counted per campaign and link, never per person. No open pixel.
-- * Resend webhook events are deduplicated by their svix-id.

ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirm_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS locale varchar(2) CHECK (locale IN ('es', 'en')),
  ADD COLUMN IF NOT EXISTS unsubscribe_reason varchar(20)
    CHECK (unsubscribe_reason IN ('link', 'one_click', 'bounce', 'complaint', 'request'));

-- The audience of any campaign: confirmed and not unsubscribed.
CREATE INDEX IF NOT EXISTS newsletter_subscribers_audience ON newsletter_subscribers(profile, role)
  WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL;

-- One segment predicate for the product's worker and for ops' counts. An empty list means
-- everyone; a subscriber without a profile (older rows) only matches when profiles is empty.
CREATE OR REPLACE FUNCTION newsletter_in_segment(p_profile text, p_role text, p_segment jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    (jsonb_array_length(COALESCE(p_segment->'profiles', '[]'::jsonb)) = 0
      OR (p_profile IS NOT NULL AND p_segment->'profiles' ? p_profile))
    AND (jsonb_array_length(COALESCE(p_segment->'roles', '[]'::jsonb)) = 0
      OR (p_role IS NOT NULL AND p_segment->'roles' ? p_role)),
    false)
$$;

CREATE TABLE IF NOT EXISTS newsletter_confirmations (
  token_hash char(64) PRIMARY KEY,
  email varchar(254) NOT NULL REFERENCES newsletter_subscribers(email) ON DELETE CASCADE,
  purpose varchar(12) NOT NULL DEFAULT 'subscribe' CHECK (purpose IN ('subscribe', 'reconfirm')),
  profile varchar(20) CHECK (profile IN ('founder', 'buyer', 'both', 'exploring')),
  role varchar(40) CHECK (role IN ('leadership', 'product_tech', 'sales_marketing', 'operations', 'finance_procurement', 'other')),
  locale varchar(2) NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en')),
  consent_version varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS newsletter_confirmations_email ON newsletter_confirmations(email);
CREATE INDEX IF NOT EXISTS newsletter_confirmations_expiry ON newsletter_confirmations(expires_at);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind varchar(20) NOT NULL DEFAULT 'manual' CHECK (kind IN ('manual', 'new_this_week')),
  -- The Monday (Mexico City) of a «Nuevo esta semana» draft; one draft per week.
  week date,
  status varchar(12) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'sending', 'sent', 'cancelled')),
  -- {"es": {subject, preheader, heading, body}, "en": {...} | null, "listings": [...]}
  content jsonb NOT NULL,
  -- {"profiles": [...], "roles": [...]}; empty lists mean everyone confirmed.
  segment jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  -- A campaign is sent only when its last test send was of this exact version.
  tested_version integer,
  tested_at timestamptz,
  tested_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  queued_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  queued_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  cancelled_at timestamptz,
  -- Aggregates only. Clicks live in newsletter_link_clicks.
  recipients integer NOT NULL DEFAULT 0 CHECK (recipients >= 0),
  sent integer NOT NULL DEFAULT 0 CHECK (sent >= 0),
  failed integer NOT NULL DEFAULT 0 CHECK (failed >= 0),
  delivered integer NOT NULL DEFAULT 0 CHECK (delivered >= 0),
  bounced integer NOT NULL DEFAULT 0 CHECK (bounced >= 0),
  complained integer NOT NULL DEFAULT 0 CHECK (complained >= 0),
  unsubscribed integer NOT NULL DEFAULT 0 CHECK (unsubscribed >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'new_this_week') = (week IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_campaigns_week ON newsletter_campaigns(week)
  WHERE kind = 'new_this_week';
CREATE INDEX IF NOT EXISTS newsletter_campaigns_active ON newsletter_campaigns(status)
  WHERE status IN ('queued', 'sending');

-- Who a campaign went to, so a retry never sends twice. `batch` groups recipients the same way
-- on every attempt: a retried batch carries the same Resend Idempotency-Key. Kept 12 months.
CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  campaign_id uuid NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  email varchar(254) NOT NULL REFERENCES newsletter_subscribers(email) ON DELETE CASCADE,
  locale varchar(2) NOT NULL CHECK (locale IN ('es', 'en')),
  batch integer NOT NULL CHECK (batch >= 0),
  state varchar(10) NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'sending', 'sent', 'skipped', 'failed')),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  first_attempt_at timestamptz,
  locked_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  resend_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  PRIMARY KEY (campaign_id, email)
);
CREATE INDEX IF NOT EXISTS newsletter_deliveries_queue ON newsletter_deliveries(campaign_id, batch)
  WHERE state IN ('pending', 'sending');
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_deliveries_resend ON newsletter_deliveries(resend_id)
  WHERE resend_id IS NOT NULL;

-- Clicks per campaign and link position: a total, never who clicked.
CREATE TABLE IF NOT EXISTS newsletter_link_clicks (
  campaign_id uuid NOT NULL REFERENCES newsletter_campaigns(id) ON DELETE CASCADE,
  link smallint NOT NULL CHECK (link >= 0),
  url text NOT NULL,
  clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  PRIMARY KEY (campaign_id, link)
);

-- Resend retries a webhook with the same svix-id: processing it twice must not count twice.
-- Only the id and type are kept, never the message or the address; purged after 30 days.
CREATE TABLE IF NOT EXISTS resend_webhook_events (
  id varchar(100) PRIMARY KEY,
  type varchar(40) NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resend_webhook_events_received ON resend_webhook_events(received_at);
