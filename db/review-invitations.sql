-- Invitations to review (SHCWS-132, SHCWS-135). Additive and re-runnable.
-- Requires db/solution-reviews.sql, db/listing-notices.sql, db/contact-requests.sql,
-- db/contact-outcomes.sql and db/contact-messages.sql.
--
-- Two ways a review can be asked for, kept apart because they are not equally neutral:
--
-- * The founder's link (SHCWS-132). The vendor chooses whom to send it to, so a review
--   that arrives through it is labelled «Invitada por el proyecto» and weighs half in the
--   catalogue order (reviewInvitedFactor, src/lib/reviews/model.ts). The mark is kept per
--   account and solution, not on the review row, so deleting and rewriting the review
--   never drops it.
-- * shwcs's own invitation after a real conversation (SHCWS-135). Nobody picks who gets
--   it, so it carries no discount; the review shows «Contactó vía shwcs» and weighs
--   between a company address and a proven purchase.

-- One shareable link per listing. Not a credential: it only says who sent the reviewer.
-- The founder can replace it; the old one stops working.
CREATE TABLE IF NOT EXISTS solution_review_invites (
  solution_id uuid PRIMARY KEY REFERENCES founder_solutions(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE CHECK (token ~ '^[a-f0-9]{32}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Accounts that wrote their review through the founder's link.
CREATE TABLE IF NOT EXISTS solution_review_invitees (
  solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (solution_id, account_id)
);

-- Sign-in links sent from an invitation page. Only the hash of the token is kept, it
-- lives 30 minutes and is consumed once. password_hash_at_issue ties it to the account
-- as it was when the link was asked for: a password change in between kills it, and an
-- account that appeared in between (someone else registering that address) is never
-- signed in by it.
CREATE TABLE IF NOT EXISTS auth_magic_links (
  token_hash text PRIMARY KEY,
  email varchar(254) NOT NULL,
  solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
  password_hash_at_issue text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_magic_links_expires ON auth_magic_links (expires_at);

-- The one definition of «contacted through shwcs»: the buyer's request to this listing
-- reached «en conversación» (a status change by the recipient; messages keep the status
-- they were written in, so only kind = 'status' counts) or was closed as won. It reads
-- no message and no detail of the request.
CREATE OR REPLACE FUNCTION review_contact_backed(author uuid, solution uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM contact_requests c
     WHERE c.buyer_id = author AND c.solution_id = solution
       AND (c.outcome = 'won' OR EXISTS (
         SELECT 1 FROM contact_events e
          WHERE e.request_id = c.id AND e.kind = 'status' AND e.status = 'conversation')))
$$;

CREATE OR REPLACE FUNCTION review_invited(author uuid, solution uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM solution_review_invitees i WHERE i.account_id = author AND i.solution_id = solution)
$$;

-- shwcs asks the buyer for a review 30 days after the conversation started (or after it
-- was closed as won), once per request. A window of 30 to 90 days keeps a first run from
-- writing to everyone who ever talked to a vendor. Only listings still published, buyers
-- who have not reviewed it yet and accounts not suspended. Category 'contact': it follows
-- the buyer's contact email preference and only reaches a verified address. Returns how
-- many notices it created. The title stays in Spanish like the other notices (§63).
CREATE OR REPLACE FUNCTION invite_contact_reviews() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE created integer;
BEGIN
  WITH due AS (
    SELECT c.id, c.buyer_id, c.solution_id, c.project_name,
      LEAST(
        (SELECT min(e.created_at) FROM contact_events e
          WHERE e.request_id = c.id AND e.kind = 'status' AND e.status = 'conversation'),
        CASE WHEN c.outcome = 'won' THEN c.outcome_at END) AS since
    FROM contact_requests c
    JOIN founder_solutions s ON s.id = c.solution_id
    JOIN auth_accounts a ON a.id = c.buyer_id
    WHERE s.published_data IS NOT NULL AND s.owner_id <> c.buyer_id AND a.suspended_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM solution_reviews r
                       WHERE r.solution_id = c.solution_id AND r.author_id = c.buyer_id)
  ), inserted AS (
    INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
    SELECT d.buyer_id, 'contact', 'review-request:' || d.id,
      left('¿Cómo te fue con ' || d.project_name || '? Deja tu reseña', 180),
      '/account/reviews/' || d.solution_id,
      CASE WHEN COALESCE(p.contact_email, true) AND a.email_verified_at IS NOT NULL
        THEN 'pending' ELSE 'disabled' END
    FROM due d
    JOIN auth_accounts a ON a.id = d.buyer_id
    LEFT JOIN notification_preferences p ON p.owner_id = d.buyer_id
    WHERE d.since IS NOT NULL
      AND d.since <= now() - interval '30 days' AND d.since > now() - interval '90 days'
    ON CONFLICT (source_key) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO created FROM inserted;
  RETURN created;
END $$;
