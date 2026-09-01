-- Apply to the intended Neon environment; independent of other draft tables.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email varchar(254) PRIMARY KEY,
  consent_version varchar(40) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  CHECK (email = lower(email))
);
-- Do not send to unsubscribed_at IS NOT NULL. Mailing integration is pending.
