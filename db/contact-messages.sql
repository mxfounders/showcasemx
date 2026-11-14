-- Two-way conversation in contact requests (SHCWS-168, decision in SHCWS-63). Additive:
-- every existing event keeps kind = 'status', which is what it was.
--
-- A request used to be one-shot: the buyer could only withdraw and the recipient wrote
-- one reply per status change. Now both participants write messages while it is new or
-- in conversation; a message is an event with kind = 'message' (its status is the
-- request's status at that moment). Status changes stay as kind = 'status'.
ALTER TABLE contact_events ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'status';
ALTER TABLE contact_events DROP CONSTRAINT IF EXISTS contact_events_kind_check;
ALTER TABLE contact_events
  ADD CONSTRAINT contact_events_kind_check CHECK (kind IN ('status', 'message'));
CREATE INDEX IF NOT EXISTS contact_events_request_latest ON contact_events (request_id, id DESC);

-- Same function as db/contact-alerts-default.sql (contact email on by default, only to
-- verified addresses), with subjects that say what happened: a message names who wrote,
-- instead of «Nueva solicitud de contacto» for a buyer's follow-up on a new request.
-- Titles are stored in Spanish, like the rest of the notifications (CLAUDE.md §63).
CREATE OR REPLACE FUNCTION notify_contact_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; destination text; subject text; enabled boolean;
BEGIN
 SELECT CASE WHEN NEW.actor_id=r.buyer_id THEN r.recipient_id ELSE r.buyer_id END,
 '/account/'||CASE WHEN NEW.actor_id=r.buyer_id THEN 'opportunities/' ELSE 'contacts/' END||r.id,
 CASE
  WHEN NEW.kind='message' AND NEW.actor_id=r.buyer_id THEN
   'Nuevo mensaje de '||COALESCE(NULLIF(btrim(r.details->>'company'),''),'un comprador')||' sobre '||r.project_name
  WHEN NEW.kind='message' THEN r.project_name||' te respondió'
  WHEN NEW.status='new' THEN 'Nueva solicitud de contacto'
  WHEN NEW.status='withdrawn' THEN 'Solicitud retirada'
  ELSE 'Tu solicitud tiene una actualización' END
 INTO target,destination,subject FROM contact_requests r WHERE r.id=NEW.request_id;
 SELECT COALESCE(p.contact_email,true) AND a.email_verified_at IS NOT NULL INTO enabled FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=target;
 INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state) VALUES(target,'contact','contact:'||NEW.id,subject,destination,CASE WHEN enabled THEN 'pending' ELSE 'disabled' END) ON CONFLICT(source_key) DO NOTHING;
 RETURN NEW;
END $$;
