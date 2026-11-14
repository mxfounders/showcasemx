-- SHCWS-121: follow public lists and curators. Additive and re-runnable; after
-- db/community-notices.sql.
--
-- Following a list: a notice when it gets new published projects. Following a curator:
-- a notice when they publish a new public list. A curator is the signature on a list
-- (declared, not verified, §19), so a follow is the pair (account behind the list,
-- normalized signature): lists that account signs another way are not included, and
-- another account signing the same name is someone else. The account id never leaves
-- the server; the follower only ever names a list.
--
-- Notices go only to the follower, about public lists; the curator sees counts, never who.
-- One notice per follower and week whose count goes up («Esta semana en lo que sigues»),
-- category 'community'; by email only with community_email on, as a weekly summary sent
-- the Monday after (next_attempt_at), never one email per change.
CREATE TABLE IF NOT EXISTS community_list_follows (
  list_id uuid NOT NULL REFERENCES buyer_lists(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, follower_id)
);
CREATE INDEX IF NOT EXISTS community_list_follows_follower
  ON community_list_follows (follower_id, created_at DESC);

CREATE OR REPLACE FUNCTION curator_key(name text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(regexp_replace(btrim(COALESCE(name, '')), '\s+', ' ', 'g'))
$$;

CREATE TABLE IF NOT EXISTS community_curator_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curator_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  curator_key text NOT NULL CHECK (char_length(curator_key) BETWEEN 1 AND 60),
  -- The signature as it read when followed, for the follower's own page.
  curator_name varchar(60) NOT NULL,
  follower_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curator_id, curator_key, follower_id),
  CHECK (curator_id <> follower_id)
);
CREATE INDEX IF NOT EXISTS community_curator_follows_follower
  ON community_curator_follows (follower_id, created_at DESC);

-- A list is announced to its curator's followers once: the first time it can be seen in
-- Comunidad (public with 3 available projects, SHCWS-116). Lists already visible today
-- count as announced, so this migration never presents an old list as new.
CREATE TABLE IF NOT EXISTS community_list_announcements (
  list_id uuid PRIMARY KEY REFERENCES buyer_lists(id) ON DELETE CASCADE,
  curator_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  curator_key text NOT NULL,
  announced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_list_announcements_curator
  ON community_list_announcements (curator_id, curator_key, announced_at DESC);

CREATE OR REPLACE FUNCTION community_list_visible(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT l.visibility = 'public' AND (
    SELECT count(DISTINCT s.id) FROM buyer_list_items i JOIN founder_solutions s
      ON (i.project_key = 'solution:' || s.id::text
          OR (s.catalog_key IS NOT NULL AND i.project_key = 'catalog:' || s.catalog_key))
     WHERE i.list_id = l.id AND i.owner_id = l.owner_id AND s.published_data IS NOT NULL) >= 3
  FROM buyer_lists l WHERE l.id = target
$$;

INSERT INTO community_list_announcements (list_id, curator_id, curator_key, announced_at)
SELECT l.id, l.owner_id, curator_key(l.curator_name), LEAST(l.created_at, now() - interval '8 days')
  FROM buyer_lists l
 WHERE l.visibility = 'public' AND community_list_visible(l.id)
ON CONFLICT (list_id) DO NOTHING;

-- Recounts the follower's week and upserts their single weekly notice.
CREATE OR REPLACE FUNCTION follow_notice(target uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  week date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  projects integer;
  lists integer;
  wanted boolean;
  title text;
BEGIN
  IF target IS NULL THEN RETURN; END IF;
  SELECT count(DISTINCT (l.id, s.id)) INTO projects
    FROM community_list_follows f
    JOIN buyer_lists l ON l.id = f.list_id AND l.visibility = 'public' AND l.owner_id <> target
    JOIN buyer_list_items i ON i.list_id = l.id AND i.owner_id = l.owner_id
     AND i.created_at >= week::timestamp AT TIME ZONE 'UTC' AND i.created_at >= f.created_at
    JOIN founder_solutions s
      ON (i.project_key = 'solution:' || s.id::text
          OR (s.catalog_key IS NOT NULL AND i.project_key = 'catalog:' || s.catalog_key))
     AND s.published_data IS NOT NULL
   WHERE f.follower_id = target AND community_list_visible(l.id);
  SELECT count(DISTINCT a.list_id) INTO lists
    FROM community_curator_follows c
    JOIN community_list_announcements a
      ON a.curator_id = c.curator_id AND a.curator_key = c.curator_key
     AND a.announced_at >= week::timestamp AT TIME ZONE 'UTC' AND a.announced_at >= c.created_at
    JOIN buyer_lists l ON l.id = a.list_id AND l.visibility = 'public'
   WHERE c.follower_id = target;
  IF projects = 0 AND lists = 0 THEN RETURN; END IF;
  title := CASE
    WHEN lists = 0 AND projects = 1 THEN 'Un proyecto nuevo en una lista que sigues'
    WHEN lists = 0 THEN projects || ' proyectos nuevos en listas que sigues'
    WHEN projects = 0 AND lists = 1 THEN 'Una lista nueva de un curador que sigues'
    WHEN projects = 0 THEN lists || ' listas nuevas de curadores que sigues'
    ELSE 'Esta semana en lo que sigues: ' || projects
      || CASE WHEN projects = 1 THEN ' proyecto nuevo' ELSE ' proyectos nuevos' END
      || ' y ' || lists || CASE WHEN lists = 1 THEN ' lista nueva' ELSE ' listas nuevas' END
  END;
  SELECT COALESCE(p.community_email, false) AND a.email_verified_at IS NOT NULL INTO wanted
    FROM auth_accounts a LEFT JOIN notification_preferences p ON p.owner_id = a.id
   WHERE a.id = target;
  INSERT INTO account_notifications (owner_id, category, source_key, title, href, email_state, next_attempt_at)
  VALUES (target, 'community', 'follow:' || target || ':' || week, title, '/account/community',
    CASE WHEN COALESCE(wanted, false) THEN 'pending' ELSE 'disabled' END,
    (week + 7)::timestamp AT TIME ZONE 'UTC')
  ON CONFLICT (source_key) DO UPDATE SET title = EXCLUDED.title, read_at = NULL, created_at = now(),
    -- Turning the email on during the week still gets that week's summary.
    email_state = CASE WHEN account_notifications.email_state = 'disabled'
      AND EXCLUDED.email_state = 'pending' THEN 'pending' ELSE account_notifications.email_state END;
END $$;

-- After a list changes: announce it to its curator's followers the first time it is
-- visible, otherwise (a new project) tell the list's followers.
CREATE OR REPLACE FUNCTION notify_follows(target_list uuid, new_project boolean)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE list record; follower uuid;
BEGIN
  SELECT id, owner_id, curator_name INTO list FROM buyer_lists WHERE id = target_list;
  IF list.id IS NULL OR NOT COALESCE(community_list_visible(list.id), false) THEN RETURN; END IF;
  INSERT INTO community_list_announcements (list_id, curator_id, curator_key)
  VALUES (list.id, list.owner_id, curator_key(list.curator_name))
  ON CONFLICT (list_id) DO NOTHING;
  IF FOUND THEN
    FOR follower IN SELECT c.follower_id FROM community_curator_follows c
      WHERE c.curator_id = list.owner_id AND c.curator_key = curator_key(list.curator_name)
    LOOP PERFORM follow_notice(follower); END LOOP;
  ELSIF new_project THEN
    FOR follower IN SELECT f.follower_id FROM community_list_follows f WHERE f.list_id = list.id
    LOOP PERFORM follow_notice(follower); END LOOP;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION notify_follows_item() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only a published project is news; a withdrawn or example one is not.
  IF EXISTS (SELECT 1 FROM founder_solutions s
     WHERE (NEW.project_key = 'solution:' || s.id::text
            OR (s.catalog_key IS NOT NULL AND NEW.project_key = 'catalog:' || s.catalog_key))
       AND s.published_data IS NOT NULL) THEN
    PERFORM notify_follows(NEW.list_id, true);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS follows_item_notification ON buyer_list_items;
CREATE TRIGGER follows_item_notification AFTER INSERT ON buyer_list_items
  FOR EACH ROW EXECUTE FUNCTION notify_follows_item();

CREATE OR REPLACE FUNCTION notify_follows_list() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM notify_follows(NEW.id, false);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS follows_list_notification ON buyer_lists;
CREATE TRIGGER follows_list_notification AFTER UPDATE OF visibility ON buyer_lists
  FOR EACH ROW WHEN (NEW.visibility = 'public' AND OLD.visibility IS DISTINCT FROM 'public')
  EXECUTE FUNCTION notify_follows_list();
