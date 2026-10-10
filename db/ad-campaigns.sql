-- Sponsored placements ("Patrocinado"): a fixed window of days bought up front with Stripe.
--
-- Payment never touches the organic catalog. These tables are read only by the
-- sponsored-slot renderers; publicProducts() and solutionScore() never join them.
-- Only editorially published listings can be promoted, and a campaign stops serving
-- the moment its listing loses published_data.
--
-- Apply with `npm run db:migrate -- db/ad-campaigns.sql` (after founder-solutions.sql).
BEGIN;

-- Where a sponsored slot can appear and how many run at once per scope and day.
-- Every placement starts disabled: it opens only once it has a rate (scripts/ad-rates.cjs).
CREATE TABLE IF NOT EXISTS ad_placements (
 id text PRIMARY KEY CHECK (id IN ('category','home','newsletter')),
 slots smallint NOT NULL CHECK (slots BETWEEN 1 AND 2),
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ad_placements(id,slots) VALUES ('category',2),('home',1),('newsletter',1)
ON CONFLICT (id) DO NOTHING;

-- Price per day, in the currency's minor unit (cents / centavos), before tax.
CREATE TABLE IF NOT EXISTS ad_rates (
 placement text NOT NULL REFERENCES ad_placements(id),
 currency text NOT NULL CHECK (currency IN ('usd','mxn')),
 daily_amount integer NOT NULL CHECK (daily_amount > 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (placement,currency)
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
 id uuid PRIMARY KEY,
 -- SET NULL, not CASCADE: a payment record must outlive a deleted listing or account
 -- (tax and accounting retention). The snapshot columns keep it legible afterwards.
 solution_id uuid REFERENCES founder_solutions(id) ON DELETE SET NULL,
 owner_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
 solution_name varchar(120) NOT NULL,
 billing_email varchar(254) NOT NULL,
 placement text NOT NULL REFERENCES ad_placements(id),
 -- Category slug for 'category'; empty for placements without a scope.
 scope varchar(40) NOT NULL DEFAULT '',
 -- Calendar days in the platform time zone (America/Mexico_City); ends_on is exclusive.
 starts_on date NOT NULL,
 ends_on date NOT NULL,
 currency text NOT NULL CHECK (currency IN ('usd','mxn')),
 daily_amount integer NOT NULL CHECK (daily_amount > 0),
 subtotal_amount integer NOT NULL CHECK (subtotal_amount > 0),
 -- Known once Stripe settles the Checkout Session (tax is calculated there).
 tax_amount integer,
 total_amount integer,
 -- What a refund was asked for (set before calling Stripe, so a retry reissues the
 -- same idempotent refund) and what Stripe reports as actually refunded.
 refund_requested_amount integer NOT NULL DEFAULT 0 CHECK (refund_requested_amount >= 0),
 refunded_amount integer NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
 -- The payment lifecycle only. Cancellation, pauses and disputes have their own columns
 -- because a cancelled booking still serves the paid days that were not refunded.
 status text NOT NULL DEFAULT 'checkout'
  CHECK (status IN ('checkout','processing','paid','expired','failed')),
 -- Inventory is held while the buyer is in Checkout; an abandoned hold frees itself.
 hold_expires_at timestamptz NOT NULL,
 stripe_checkout_session_id text UNIQUE,
 stripe_payment_intent_id text UNIQUE,
 invoice_url text,
 -- The advertising terms the buyer accepted, and that they buy as a business.
 terms_version varchar(40) NOT NULL,
 terms_accepted_at timestamptz NOT NULL,
 -- Exclusive end of the days that still serve after a cancellation or removal.
 served_until date,
 canceled_at timestamptz,
 -- shwcs stopped serving it (policy, withdrawn listing, dispute). Never deleted.
 paused_at timestamptz,
 pause_reason varchar(500),
 dispute_status text CHECK (dispute_status IN ('open','won','lost')),
 created_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 0,
 CHECK (ends_on > starts_on),
 CHECK (served_until IS NULL OR (served_until >= starts_on AND served_until <= ends_on)),
 CHECK ((placement = 'category') = (scope <> ''))
);
CREATE INDEX IF NOT EXISTS ad_campaigns_inventory ON ad_campaigns(placement,scope,starts_on,ends_on)
 WHERE status IN ('checkout','processing','paid');
CREATE INDEX IF NOT EXISTS ad_campaigns_owner ON ad_campaigns(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ad_campaigns_solution ON ad_campaigns(solution_id,starts_on);

-- One Stripe Customer per account, so receipts and saved billing details accumulate in
-- one place. The mapping goes with the account; Stripe keeps its own billing records.
CREATE TABLE IF NOT EXISTS stripe_customers (
 account_id uuid PRIMARY KEY REFERENCES auth_accounts(id) ON DELETE CASCADE,
 customer_id text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);

-- First-party, aggregated delivery counts. No visitor identifiers, no third-party pixels.
CREATE TABLE IF NOT EXISTS ad_campaign_daily_metrics (
 campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
 day date NOT NULL,
 impressions integer NOT NULL DEFAULT 0,
 clicks integer NOT NULL DEFAULT 0,
 PRIMARY KEY (campaign_id,day)
);

-- Stripe delivers webhooks at least once: an event id is processed once.
CREATE TABLE IF NOT EXISTS stripe_events (
 id text PRIMARY KEY,
 type text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 processed_at timestamptz
);

COMMIT;
