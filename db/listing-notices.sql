-- SHCWS-18/20: notices about a founder's own listing. Additive and re-runnable.
--
-- Listing emails (review decisions, reviews, comments, reports, sponsored slots) are on
-- unless the founder turned them off, like contact alerts (db/contact-alerts-default.sql).
-- A stored false is an explicit choice and stays false. A verified address is required.
ALTER TABLE notification_preferences ALTER COLUMN solution_email SET DEFAULT true;

CREATE OR REPLACE FUNCTION listing_email_enabled(target uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT COALESCE(p.solution_email, true) AND a.email_verified_at IS NOT NULL
    FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id = a.id
   WHERE a.id = target
$$;

-- One notice per source key, so retries and repeated updates never duplicate it. Titles
-- carry user-written names: cut them to the column's 180 characters, or a long name would
-- make the triggering write (a Stripe webhook, a review decision) fail.
CREATE OR REPLACE FUNCTION listing_notice(target uuid, source text, title text, href text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF target IS NULL THEN RETURN; END IF;
  INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
  VALUES (target, 'solution', source,
    CASE WHEN char_length(title) > 180 THEN left(title, 179) || '…' ELSE title END, href,
    CASE WHEN COALESCE(listing_email_enabled(target), false) THEN 'pending' ELSE 'disabled' END)
  ON CONFLICT (source_key) DO NOTHING;
END $$;

-- Same as db/launch-foundation.sql, now through listing_notice (preference on by default).
CREATE OR REPLACE FUNCTION notify_solution_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid; subject text;
BEGIN
 IF NEW.status NOT IN('pending','published','changes_requested','rejected','withdrawn') THEN RETURN NEW; END IF;
 SELECT owner_id INTO target FROM founder_solutions WHERE id=NEW.solution_id;
 subject:=CASE NEW.status WHEN 'pending' THEN 'Postulación recibida' WHEN 'published' THEN 'Tu solución está publicada' WHEN 'changes_requested' THEN 'Tu ficha necesita cambios' WHEN 'withdrawn' THEN 'Publicación retirada' ELSE 'Decisión sobre tu postulación' END;
 PERFORM listing_notice(target, 'solution:'||NEW.id, subject, '/account/solutions/'||NEW.solution_id);
 RETURN NEW;
END $$;

-- Same as db/solution-reviews.sql, now with the preference on by default.
CREATE OR REPLACE FUNCTION notify_solution_review(review uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE target uuid; solution uuid;
BEGIN
  SELECT s.owner_id, s.id INTO target, solution
    FROM solution_reviews r
    JOIN founder_solutions s ON s.id = r.solution_id
    JOIN auth_accounts a ON a.id = r.author_id
   WHERE r.id = review AND r.status = 'published' AND a.email_verified_at IS NOT NULL
     AND r.author_id <> s.owner_id;
  IF target IS NULL THEN RETURN; END IF;
  PERFORM listing_notice(target, 'review:' || review, 'Nueva reseña de tu solución',
    '/account/solutions/' || solution);
END $$;

-- A comment on your own listing (the owner can't comment on it, §55).
CREATE OR REPLACE FUNCTION notify_solution_comment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  SELECT owner_id INTO target FROM founder_solutions WHERE id = NEW.solution_id;
  IF target IS NOT NULL AND target <> NEW.author_id THEN
    PERFORM listing_notice(target, 'comment:' || NEW.id, 'Nuevo comentario en tu ficha',
      '/account/solutions/' || NEW.solution_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS solution_comment_notification ON solution_comments;
CREATE TRIGGER solution_comment_notification AFTER INSERT ON solution_comments
  FOR EACH ROW EXECUTE FUNCTION notify_solution_comment();

-- A report against your listing. Who reported it is never part of the notice.
CREATE OR REPLACE FUNCTION notify_solution_report() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN
  SELECT owner_id INTO target FROM founder_solutions WHERE id = NEW.solution_id;
  IF target IS NOT NULL AND target IS DISTINCT FROM NEW.reporter_id THEN
    PERFORM listing_notice(target, 'report:' || NEW.id, 'Recibimos un reporte sobre tu ficha',
      '/account/solutions/' || NEW.solution_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS solution_report_notification ON solution_reports;
CREATE TRIGGER solution_report_notification AFTER INSERT ON solution_reports
  FOR EACH ROW EXECUTE FUNCTION notify_solution_report();

-- A sponsored slot's lifecycle, as the webhook and ops change it. «Starts tomorrow» and
-- «ended» are dates, not updates: the daily mail cron creates those (src/lib/ads/notices.ts).
CREATE OR REPLACE FUNCTION notify_ad_campaign() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE href text;
BEGIN
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  href := CASE WHEN NEW.solution_id IS NULL THEN '/account'
    ELSE '/account/solutions/' || NEW.solution_id || '/promote' END;
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    PERFORM listing_notice(NEW.owner_id, 'ad:' || NEW.id || ':paid',
      'Tu espacio patrocinado para ' || NEW.solution_name || ' está confirmado', href);
  END IF;
  -- ops withdraws a slot by pausing it with a removal reason (SHCWS-69): its own notice,
  -- once; the refund, if any, comes as another notice when Stripe confirms it.
  IF NEW.pause_reason IN ('platformRemoval', 'policyRemoval')
    AND OLD.pause_reason IS DISTINCT FROM NEW.pause_reason THEN
    PERFORM listing_notice(NEW.owner_id, 'ad:' || NEW.id || ':removed',
      'shwcs retiró tu espacio patrocinado para ' || NEW.solution_name, href);
  ELSIF NEW.paused_at IS NOT NULL AND OLD.paused_at IS NULL THEN
    PERFORM listing_notice(NEW.owner_id, 'ad:' || NEW.id || ':paused:' || extract(epoch FROM NEW.paused_at)::bigint,
      'Tu espacio patrocinado para ' || NEW.solution_name || ' está en pausa', href);
  END IF;
  IF NEW.dispute_status = 'open' AND OLD.dispute_status IS DISTINCT FROM 'open' THEN
    PERFORM listing_notice(NEW.owner_id, 'ad:' || NEW.id || ':dispute',
      'Tu espacio patrocinado para ' || NEW.solution_name || ' está en pausa por una disputa de pago', href);
  END IF;
  IF NEW.canceled_at IS NOT NULL AND OLD.canceled_at IS NULL THEN
    PERFORM listing_notice(NEW.owner_id, 'ad:' || NEW.id || ':canceled',
      'Se canceló tu espacio patrocinado para ' || NEW.solution_name, href);
  END IF;
  IF NEW.refunded_amount > OLD.refunded_amount THEN
    PERFORM listing_notice(NEW.owner_id, 'ad:' || NEW.id || ':refund:' || NEW.refunded_amount,
      'Se procesó un reembolso de tu espacio patrocinado para ' || NEW.solution_name, href);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ad_campaign_notification ON ad_campaigns;
CREATE TRIGGER ad_campaign_notification AFTER UPDATE ON ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION notify_ad_campaign();
