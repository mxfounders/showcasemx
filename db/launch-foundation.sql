-- Additive launch features. Apply after auth, account-settings, solutions, media and contacts migrations.
BEGIN;
ALTER TABLE auth_accounts ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;
CREATE TABLE IF NOT EXISTS auth_email_verifications (
 token_hash text PRIMARY KEY,account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 email text NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_email_verifications_account ON auth_email_verifications(account_id);
CREATE TABLE IF NOT EXISTS notification_preferences (
 owner_id uuid PRIMARY KEY REFERENCES auth_accounts(id) ON DELETE CASCADE,
 contact_email boolean NOT NULL DEFAULT false,solution_email boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS account_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 category text NOT NULL CHECK(category IN('contact','solution')),source_key text UNIQUE NOT NULL,
 title varchar(180) NOT NULL,href text NOT NULL,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 email_state text NOT NULL DEFAULT 'disabled' CHECK(email_state IN('disabled','pending','sending','sent','failed','skipped')),
 attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),locked_at timestamptz,provider_id text
);
CREATE INDEX IF NOT EXISTS account_notifications_owner ON account_notifications(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS account_notifications_outbox ON account_notifications(email_state,next_attempt_at);
CREATE OR REPLACE FUNCTION notify_contact_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; destination text; subject text; enabled boolean;
BEGIN
 SELECT CASE WHEN NEW.actor_id=r.buyer_id THEN r.recipient_id ELSE r.buyer_id END,
 '/account/'||CASE WHEN NEW.actor_id=r.buyer_id THEN 'opportunities/' ELSE 'contacts/' END||r.id,
 CASE WHEN NEW.status='new' THEN 'Nueva solicitud de contacto' WHEN NEW.status='withdrawn' THEN 'Solicitud retirada' ELSE 'Tu solicitud tiene una actualización' END
 INTO target,destination,subject FROM contact_requests r WHERE r.id=NEW.request_id;
 SELECT p.contact_email AND a.email_verified_at IS NOT NULL INTO enabled FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=target;
 INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state) VALUES(target,'contact','contact:'||NEW.id,subject,destination,CASE WHEN enabled THEN 'pending' ELSE 'disabled' END) ON CONFLICT(source_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS contact_event_notification ON contact_events;
CREATE TRIGGER contact_event_notification AFTER INSERT ON contact_events FOR EACH ROW EXECUTE FUNCTION notify_contact_event();
CREATE OR REPLACE FUNCTION notify_solution_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; enabled boolean; subject text;
BEGIN
 IF NEW.status NOT IN('pending','published','changes_requested','rejected','withdrawn') THEN RETURN NEW; END IF;
 SELECT owner_id INTO target FROM founder_solutions WHERE id=NEW.solution_id;
 subject:=CASE NEW.status WHEN 'pending' THEN 'Postulación recibida' WHEN 'published' THEN 'Tu solución está publicada' WHEN 'changes_requested' THEN 'Tu ficha necesita cambios' WHEN 'withdrawn' THEN 'Publicación retirada' ELSE 'Decisión sobre tu postulación' END;
 SELECT p.solution_email AND a.email_verified_at IS NOT NULL INTO enabled FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=target;
 INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state) VALUES(target,'solution','solution:'||NEW.id,subject,'/account/solutions/'||NEW.solution_id,CASE WHEN enabled THEN 'pending' ELSE 'disabled' END) ON CONFLICT(source_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS solution_event_notification ON solution_events;
CREATE TRIGGER solution_event_notification AFTER INSERT ON solution_events FOR EACH ROW EXECUTE FUNCTION notify_solution_event();
CREATE TABLE IF NOT EXISTS solution_domain_proofs (
 solution_id uuid PRIMARY KEY REFERENCES founder_solutions(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 domain text NOT NULL,token text NOT NULL,expires_at timestamptz NOT NULL,verified_at timestamptz
);
CREATE TABLE IF NOT EXISTS solution_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
 reporter_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
 reason text NOT NULL CHECK(reason IN('misleading','broken','ownership','abuse')),details varchar(2000) NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN('open','resolved','dismissed')),
 decision text,reviewer_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
 version integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),resolved_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS solution_reports_open ON solution_reports(solution_id,reporter_id) WHERE status='open';
CREATE TABLE IF NOT EXISTS solution_daily_metrics (
 solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,day date NOT NULL DEFAULT current_date,
 views integer NOT NULL DEFAULT 0,clicks integer NOT NULL DEFAULT 0,PRIMARY KEY(solution_id,day)
);
CREATE TABLE IF NOT EXISTS auth_google_identities (
 subject text PRIMARY KEY,account_id uuid UNIQUE NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 email text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_google_states (
 state_hash text PRIMARY KEY,cookie_hash text NOT NULL,nonce text NOT NULL,verifier text NOT NULL,
 account_id uuid REFERENCES auth_accounts(id) ON DELETE CASCADE,session_hash text,password_hash_at_issue text,
 return_to text NOT NULL DEFAULT '/account',expires_at timestamptz NOT NULL
);
COMMIT;
