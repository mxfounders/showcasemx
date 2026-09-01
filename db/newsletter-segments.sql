-- Preserve existing subscribers as unsegmented (NULL); never guess their profile.
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS profile varchar(20) CHECK (profile IN ('founder', 'buyer', 'both', 'exploring')),
  ADD COLUMN IF NOT EXISTS role varchar(40) CHECK (role IN ('leadership', 'product_tech', 'sales_marketing', 'operations', 'finance_procurement', 'other'));
CREATE INDEX IF NOT EXISTS newsletter_subscribers_segments ON newsletter_subscribers(profile, role) WHERE unsubscribed_at IS NULL;
