-- Apply after auth.sql and founder-solutions.sql. No automatic recipient grants.
CREATE TABLE IF NOT EXISTS contact_requests (
 id uuid PRIMARY KEY,
 buyer_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
 project_name varchar(100) NOT NULL,
 buyer_email varchar(254) NOT NULL,
 details jsonb NOT NULL,
 consent_version text NOT NULL CHECK (consent_version='contact-v1'),
 consent_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','conversation','closed','withdrawn')),
 version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (buyer_id<>recipient_id),
 UNIQUE(buyer_id,solution_id)
);
CREATE INDEX IF NOT EXISTS contact_requests_buyer ON contact_requests(buyer_id,updated_at DESC,id);
CREATE INDEX IF NOT EXISTS contact_requests_recipient ON contact_requests(recipient_id,updated_at DESC,id);
CREATE TABLE IF NOT EXISTS contact_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES contact_requests(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 status text NOT NULL CHECK (status IN ('new','conversation','closed','withdrawn')),
 message varchar(2000) NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contact_events_request ON contact_events(request_id,id);
-- Rollback (destroys only this feature's data): DROP TABLE contact_events; DROP TABLE contact_requests;
