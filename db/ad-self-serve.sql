-- Self-serve sponsored slots (SHCWS-70, 72, 75, 77, 150). Additive and re-runnable.
--
-- Apply with `npm run db:migrate -- db/ad-self-serve.sql`, after ad-campaigns.sql,
-- contact-requests.sql and listing-notices.sql (it reuses listing_notice()).
--
-- Everything measured here is first-party and aggregated, like ad_campaign_daily_metrics:
-- no cookies, no pixels, no visitor identifiers. The one exception is short-lived on
-- purpose: ad_contact_intents remembers, for at most seven days, that a signed-in buyer
-- reached a listing's contact form from a sponsored slot, so the contact request they send
-- can be counted for that booking. The row is deleted when the request is created or when
-- it expires; the advertiser only ever sees counts.
BEGIN;

-- SHCWS-75: the discount a promotion code took off the pre-tax subtotal, and the code.
-- total_amount (what Stripe charged) is already net of it, so refunds stay proportional.
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS discount_amount integer NOT NULL DEFAULT 0;
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS promotion_code varchar(60);
DO $$ BEGIN
  ALTER TABLE ad_campaigns ADD CONSTRAINT ad_campaigns_discount_amount_check
    CHECK (discount_amount >= 0 AND discount_amount <= subtotal_amount);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- SHCWS-70: what happened after the click, per booking and day. A visit is the listing
-- opened from the slot (`?from=sponsored&ad=<booking>`); a site click is a click from that
-- visit to the project's official site.
ALTER TABLE ad_campaign_daily_metrics ADD COLUMN IF NOT EXISTS visits integer NOT NULL DEFAULT 0;
ALTER TABLE ad_campaign_daily_metrics ADD COLUMN IF NOT EXISTS site_clicks integer NOT NULL DEFAULT 0;

-- A signed-in buyer opened the contact form of a listing from a sponsored slot.
CREATE TABLE IF NOT EXISTS ad_contact_intents (
 account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
 campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,
 PRIMARY KEY (account_id, solution_id)
);
CREATE INDEX IF NOT EXISTS ad_contact_intents_expiry ON ad_contact_intents(expires_at);

-- Contact requests that came from a sponsored slot: one row per request at most.
CREATE TABLE IF NOT EXISTS ad_contact_attributions (
 contact_request_id uuid PRIMARY KEY REFERENCES contact_requests(id) ON DELETE CASCADE,
 campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
 -- Calendar day in America/Mexico_City, like every other ad day.
 day date NOT NULL
);
CREATE INDEX IF NOT EXISTS ad_contact_attributions_campaign ON ad_contact_attributions(campaign_id,day);

-- Turns a pending intent into an attribution when the request is created. Attribution is
-- a measurement: whatever happens here must never stop a contact request, so any error is
-- swallowed and the request goes through unattributed.
CREATE OR REPLACE FUNCTION attribute_sponsored_contact() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE campaign uuid;
BEGIN
  BEGIN
    DELETE FROM ad_contact_intents
     WHERE account_id = NEW.buyer_id AND solution_id = NEW.solution_id
    RETURNING CASE WHEN expires_at > now() THEN campaign_id END INTO campaign;
    IF campaign IS NOT NULL THEN
      INSERT INTO ad_contact_attributions (contact_request_id, campaign_id, day)
      VALUES (NEW.id, campaign, (now() AT TIME ZONE 'America/Mexico_City')::date)
      ON CONFLICT (contact_request_id) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS contact_request_ad_attribution ON contact_requests;
CREATE TRIGGER contact_request_ad_attribution AFTER INSERT ON contact_requests
  FOR EACH ROW EXECUTE FUNCTION attribute_sponsored_contact();

-- SHCWS-72: how many people see each placement's page, for the reach estimate shown
-- before buying. Daily totals only.
CREATE TABLE IF NOT EXISTS ad_placement_daily_views (
 placement text NOT NULL REFERENCES ad_placements(id),
 -- Category slug for 'category'; empty for the home page.
 scope varchar(40) NOT NULL DEFAULT '',
 day date NOT NULL,
 views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
 PRIMARY KEY (placement,scope,day)
);

-- SHCWS-72: founders waiting for a closed placement to open.
CREATE TABLE IF NOT EXISTS ad_waitlist (
 account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 placement text NOT NULL REFERENCES ad_placements(id),
 -- The listing they wanted to promote, so the notice can link straight back to it.
 solution_id uuid REFERENCES founder_solutions(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 notified_at timestamptz,
 PRIMARY KEY (account_id,placement)
);

-- Opening a placement (scripts/ad-rates.cjs or ops) notifies everyone waiting for it, by
-- email too when their listing emails are on (listing_notice, db/listing-notices.sql).
CREATE OR REPLACE FUNCTION notify_ad_waitlist() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE label text;
BEGIN
  IF NEW.enabled AND NOT OLD.enabled THEN
    label := CASE NEW.id WHEN 'category' THEN 'Página de categoría' WHEN 'home' THEN 'Inicio'
      ELSE 'Newsletter' END;
    PERFORM listing_notice(w.account_id,
      -- 'ad:' like the other slot notices, so the email opens the promote page.
      'ad:waitlist:' || NEW.id || ':' || w.account_id || ':' || extract(epoch FROM now())::bigint,
      'Ya puedes reservar el espacio patrocinado «' || label || '»',
      CASE WHEN w.solution_id IS NULL THEN '/account/solutions'
        ELSE '/account/solutions/' || w.solution_id || '/promote' END)
    FROM ad_waitlist w WHERE w.placement = NEW.id AND w.notified_at IS NULL;
    UPDATE ad_waitlist SET notified_at = now() WHERE placement = NEW.id AND notified_at IS NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ad_placement_waitlist ON ad_placements;
CREATE TRIGGER ad_placement_waitlist AFTER UPDATE OF enabled ON ad_placements
  FOR EACH ROW EXECUTE FUNCTION notify_ad_waitlist();

COMMIT;
