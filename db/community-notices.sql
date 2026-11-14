-- SHCWS-117: community notices. Additive and re-runnable; after db/listing-notices.sql.
--
-- To the curator: likes, saves and comments on their public list, grouped per list and
-- day (one notice whose count goes up, not one per like). Counts only: never who liked or
-- saved. In the account by default; by email only if they turn it on (off by default).
-- To the founder: «your project is on the public list X», once per list and project, as
-- a listing notice (category 'solution', so it follows the listing email preference).
ALTER TABLE account_notifications DROP CONSTRAINT IF EXISTS account_notifications_category_check;
ALTER TABLE account_notifications ADD CONSTRAINT account_notifications_category_check
  CHECK (category IN ('contact', 'solution', 'security', 'account', 'community'));

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS community_email boolean NOT NULL DEFAULT false;

-- A grouped notice: the same source key all day; each new event rewrites the count and
-- brings the notice back to the top as unread. An email already sent is not sent again.
CREATE OR REPLACE FUNCTION community_notice(target uuid, source text, title text, href text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE wanted boolean;
BEGIN
  IF target IS NULL THEN RETURN; END IF;
  SELECT COALESCE(p.community_email, false) AND a.email_verified_at IS NOT NULL INTO wanted
    FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id = a.id
   WHERE a.id = target;
  title := CASE WHEN char_length(title) > 180 THEN left(title, 179) || '…' ELSE title END;
  INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state)
  VALUES (target, 'community', source, title, href,
    CASE WHEN COALESCE(wanted, false) THEN 'pending' ELSE 'disabled' END)
  ON CONFLICT (source_key) DO UPDATE
    SET title = EXCLUDED.title, read_at = NULL, created_at = now();
END $$;

CREATE OR REPLACE FUNCTION notify_community_activity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE list record; actor uuid; n integer; kind text; title text;
BEGIN
  SELECT id, owner_id, name, visibility INTO list FROM buyer_lists WHERE id = NEW.list_id;
  -- Separate branches: PL/pgSQL resolves NEW.<column> even in a CASE branch not taken.
  IF TG_TABLE_NAME = 'community_list_comments' THEN actor := NEW.author_id;
  ELSE actor := NEW.owner_id; END IF;
  IF list.id IS NULL OR list.visibility <> 'public' OR actor = list.owner_id THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'community_list_likes' THEN
    kind := 'likes';
    SELECT count(*) INTO n FROM community_list_likes
     WHERE list_id = list.id AND created_at >= current_date;
    title := CASE WHEN n = 1 THEN 'A una persona le gustó tu lista «' || list.name || '»'
      ELSE 'A ' || n || ' personas les gustó tu lista «' || list.name || '»' END;
  ELSIF TG_TABLE_NAME = 'community_saved_lists' THEN
    kind := 'saves';
    SELECT count(*) INTO n FROM community_saved_lists
     WHERE list_id = list.id AND created_at >= current_date;
    title := CASE WHEN n = 1 THEN 'Una persona guardó tu lista «' || list.name || '»'
      ELSE n || ' personas guardaron tu lista «' || list.name || '»' END;
  ELSE
    kind := 'comments';
    SELECT count(*) INTO n FROM community_list_comments
     WHERE list_id = list.id AND author_id <> list.owner_id AND created_at >= current_date;
    title := CASE WHEN n = 1 THEN 'Un comentario nuevo en tu lista «' || list.name || '»'
      ELSE n || ' comentarios nuevos en tu lista «' || list.name || '»' END;
  END IF;
  PERFORM community_notice(list.owner_id,
    'community:' || kind || ':' || list.id || ':' || current_date, title, '/account/lists/' || list.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS community_like_notification ON community_list_likes;
CREATE TRIGGER community_like_notification AFTER INSERT ON community_list_likes
  FOR EACH ROW EXECUTE FUNCTION notify_community_activity();
DROP TRIGGER IF EXISTS community_save_notification ON community_saved_lists;
CREATE TRIGGER community_save_notification AFTER INSERT ON community_saved_lists
  FOR EACH ROW EXECUTE FUNCTION notify_community_activity();
DROP TRIGGER IF EXISTS community_comment_notification ON community_list_comments;
CREATE TRIGGER community_comment_notification AFTER INSERT ON community_list_comments
  FOR EACH ROW EXECUTE FUNCTION notify_community_activity();

-- Founders of the published projects on a public list that can be seen: the gallery hides
-- a public list with fewer than 3 available projects (minPublicListProjects, SHCWS-116),
-- so a notice before that would link to nothing. The curator's own projects are skipped.
CREATE OR REPLACE FUNCTION notify_listed_projects(target_list uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE list record; project record;
BEGIN
  SELECT id, owner_id, name, visibility INTO list FROM buyer_lists WHERE id = target_list;
  IF list.id IS NULL OR list.visibility <> 'public' THEN RETURN; END IF;
  IF (SELECT count(DISTINCT s.id) FROM buyer_list_items i JOIN founder_solutions s
        ON (i.project_key = 'solution:' || s.id::text
            OR (s.catalog_key IS NOT NULL AND i.project_key = 'catalog:' || s.catalog_key))
       WHERE i.list_id = list.id AND i.owner_id = list.owner_id
         AND s.published_data IS NOT NULL) < 3 THEN RETURN; END IF;
  FOR project IN
    SELECT DISTINCT s.id, s.owner_id, s.published_data->>'name' AS name
      FROM buyer_list_items i JOIN founder_solutions s
        ON (i.project_key = 'solution:' || s.id::text
            OR (s.catalog_key IS NOT NULL AND i.project_key = 'catalog:' || s.catalog_key))
     WHERE i.list_id = list.id AND i.owner_id = list.owner_id
       AND s.published_data IS NOT NULL AND s.owner_id <> list.owner_id
  LOOP
    PERFORM listing_notice(project.owner_id, 'listed:' || list.id || ':' || project.id,
      '«' || project.name || '» aparece en la lista pública «' || list.name || '»',
      '/comunidad/' || list.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION notify_listed_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM notify_listed_projects(NEW.list_id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS listed_item_notification ON buyer_list_items;
CREATE TRIGGER listed_item_notification AFTER INSERT ON buyer_list_items
  FOR EACH ROW EXECUTE FUNCTION notify_listed_item();

CREATE OR REPLACE FUNCTION notify_listed_list() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM notify_listed_projects(NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS listed_list_notification ON buyer_lists;
CREATE TRIGGER listed_list_notification AFTER UPDATE OF visibility ON buyer_lists
  FOR EACH ROW WHEN (NEW.visibility = 'public' AND OLD.visibility IS DISTINCT FROM 'public')
  EXECUTE FUNCTION notify_listed_list();
