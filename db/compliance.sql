-- Public-registry checks and proof of purchase (docs/compliance.md). Additive; after
-- founder-solutions.sql and solution-reviews.sql. Works for any market: a country code
-- picks the adapter, and Mexico (SAT) is the first one.

-- The fiscal identity a vendor declares for a listing. Private: never part of
-- published_data and never sent to a visitor. Only the result of a registry lookup is
-- public, because an individual's RFC (persona física) is personal data.
CREATE TABLE IF NOT EXISTS solution_tax_identities (
  solution_id uuid PRIMARY KEY REFERENCES founder_solutions(id) ON DELETE CASCADE,
  country char(2) NOT NULL CHECK (country ~ '^[A-Z]{2}$'),
  tax_id varchar(40) NOT NULL CHECK (char_length(btrim(tax_id)) > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solution_tax_identities_lookup
  ON solution_tax_identities (country, tax_id);

-- Mirror of the SAT's article 69-B list, replaced as a whole on each import.
CREATE TABLE IF NOT EXISTS sat_69b_list (
  rfc varchar(13) PRIMARY KEY,
  situation text NOT NULL
    CHECK (situation IN ('presunto', 'definitivo', 'desvirtuado', 'sentencia_favorable'))
);

-- One row per external registry: what was last downloaded and when it was checked.
CREATE TABLE IF NOT EXISTS registry_imports (
  source text PRIMARY KEY CHECK (source IN ('sat_69b')),
  etag text,
  last_modified text,
  source_date date,
  entries integer,
  imported_at timestamptz,
  checked_at timestamptz,
  last_error text
);

-- Proof that a reviewer bought the solution. Only the outcome is kept: the receipt's
-- identifier is stored hashed, so one receipt can back one review and nothing more.
CREATE TABLE IF NOT EXISTS solution_review_proofs (
  review_id uuid PRIMARY KEY REFERENCES solution_reviews(id) ON DELETE CASCADE,
  method text NOT NULL CHECK (method IN ('cfdi')),
  receipt_hash char(64) NOT NULL UNIQUE,
  checked_at timestamptz NOT NULL DEFAULT now()
);
