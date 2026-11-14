-- SHCWS-22: what came of a closed opportunity. Apply after contact-requests.sql.
-- Additive and re-runnable.
--
-- Private to the recipient (the founder): the buyer never reads these columns, no
-- contact_event is written for them (events are visible to the buyer and trigger
-- alerts), and ops only reads aggregates. A request can only carry an outcome while
-- it is closed; reopening clears it in the same statement as the status change.
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS outcome text;
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS outcome_value text;
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS outcome_at timestamptz;

DO $$ BEGIN
  ALTER TABLE contact_requests ADD CONSTRAINT contact_requests_outcome_check
    CHECK (outcome IN ('won','lost','not_fit'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Approximate deal value, in US dollars, only for a won opportunity.
DO $$ BEGIN
  ALTER TABLE contact_requests ADD CONSTRAINT contact_requests_outcome_value_check
    CHECK (outcome_value IS NULL OR (
      outcome_value IN ('under_1k','1k_5k','5k_25k','25k_100k','over_100k')
      AND outcome IS NOT DISTINCT FROM 'won'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE contact_requests ADD CONSTRAINT contact_requests_outcome_closed_check
    CHECK (outcome IS NULL OR status='closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS contact_requests_outcome
  ON contact_requests(recipient_id,outcome) WHERE outcome IS NOT NULL;
