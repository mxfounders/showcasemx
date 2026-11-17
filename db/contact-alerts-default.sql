-- SHCWS-13: email alerts for contact requests are on unless the person turned them off.
-- Additive and re-runnable. Existing rows keep their value: a row only exists once
-- someone saved Preferencias de avisos (or verified their email, which writes true),
-- so a stored false is an explicit choice and stays false.
ALTER TABLE notification_preferences ALTER COLUMN contact_email SET DEFAULT true;

-- Same function as db/launch-foundation.sql, with a missing preference read as «on».
-- A verified address is still required to email anyone.
CREATE OR REPLACE FUNCTION notify_contact_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; destination text; subject text; enabled boolean;
BEGIN
 SELECT CASE WHEN NEW.actor_id=r.buyer_id THEN r.recipient_id ELSE r.buyer_id END,
 '/account/'||CASE WHEN NEW.actor_id=r.buyer_id THEN 'opportunities/' ELSE 'contacts/' END||r.id,
 CASE WHEN NEW.status='new' THEN 'Nueva solicitud de contacto' WHEN NEW.status='withdrawn' THEN 'Solicitud retirada' ELSE 'Tu solicitud tiene una actualización' END
 INTO target,destination,subject FROM contact_requests r WHERE r.id=NEW.request_id;
 SELECT COALESCE(p.contact_email,true) AND a.email_verified_at IS NOT NULL INTO enabled FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id=a.id WHERE a.id=target;
 INSERT INTO account_notifications(owner_id,category,source_key,title,href,email_state) VALUES(target,'contact','contact:'||NEW.id,subject,destination,CASE WHEN enabled THEN 'pending' ELSE 'disabled' END) ON CONFLICT(source_key) DO NOTHING;
 RETURN NEW;
END $$;
