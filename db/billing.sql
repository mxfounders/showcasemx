-- Billing: the buyer's fiscal data and the fiscal documents (CFDI) issued for sponsored
-- bookings. Stripe charges and computes tax; Cord (cordhq.app) issues the documents.
-- See docs/billing.md.
--
-- Apply with `npm run db:migrate -- db/billing.sql` (after ad-campaigns.sql).
BEGIN;

-- One fiscal profile per account. Deleted with the account: documents already issued
-- keep their own copy of the receptor data.
CREATE TABLE IF NOT EXISTS billing_profiles (
 account_id uuid PRIMARY KEY REFERENCES auth_accounts(id) ON DELETE CASCADE,
 country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
 legal_name varchar(254) NOT NULL CHECK (length(trim(legal_name)) > 0),
 tax_id varchar(30),
 -- Mexico only (SAT catalogues c_RegimenFiscal and c_UsoCFDI); required there.
 tax_regime varchar(3),
 postal_code varchar(10),
 cfdi_use varchar(4),
 invoice_email varchar(254),
 -- The matching client in Cord, created on the first invoice.
 cord_client_id text,
 cord_client_version integer,
 updated_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 0,
 CHECK (country_code <> 'MX' OR (tax_id IS NOT NULL AND tax_regime IS NOT NULL
   AND postal_code IS NOT NULL AND cfdi_use IS NOT NULL))
);

-- Invoices and credit notes, issued asynchronously. A row is created by the Stripe
-- webhook (one invoice per paid booking, one credit note per successful refund) and a
-- worker issues it in Cord with retries. Never deleted: it is a fiscal record.
CREATE TABLE IF NOT EXISTS billing_documents (
 id uuid PRIMARY KEY,
 campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK (kind IN ('invoice','credit_note')),
 -- The Stripe object it comes from (Checkout Session or Refund): one document each.
 source_id text NOT NULL UNIQUE,
 -- Total including tax, in the currency's minor unit.
 amount integer NOT NULL CHECK (amount > 0),
 currency text NOT NULL CHECK (currency IN ('usd','mxn')),
 -- Receptor data as it was when the document was queued.
 receptor jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','processing','issued','failed','skipped')),
 provider text NOT NULL DEFAULT 'cord',
 provider_document_id text,
 folio_fiscal text,
 document_number text,
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz,
 -- An error code from the provider, never a message (they can echo personal data).
 last_error varchar(80),
 created_at timestamptz NOT NULL DEFAULT now(),
 issued_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS billing_documents_queue ON billing_documents(next_attempt_at)
 WHERE status IN ('pending','processing');
CREATE INDEX IF NOT EXISTS billing_documents_campaign ON billing_documents(campaign_id, created_at);

COMMIT;
