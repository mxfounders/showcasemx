BEGIN;
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id uuid PRIMARY KEY,
  reason text NOT NULL CHECK(reason IN('find','submit','partnership','press','support','other')),
  name varchar(80) NOT NULL,
  email varchar(254) NOT NULL,
  organization varchar(120) NOT NULL,
  role varchar(100),
  website text,
  message varchar(2400) NOT NULL,
  urgency text NOT NULL CHECK(urgency IN('exploring','month','soon')),
  consent_version text NOT NULL DEFAULT 'contact-v1',
  email_state text NOT NULL DEFAULT 'pending' CHECK(email_state IN('pending','sent','failed','unavailable')),
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_inquiries_created ON contact_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS contact_inquiries_email ON contact_inquiries(lower(email),created_at DESC);
COMMIT;
