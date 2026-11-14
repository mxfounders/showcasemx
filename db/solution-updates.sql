-- SHCWS-24: follow a listing and its dated updates. Additive and re-runnable; after
-- db/community-follows.sql, whose follow_notice() it extends.
--
-- A founder posts short, dated updates on a published listing (a new feature, a price
-- change, an integration, a case). They go out without a full editorial review; ops can
-- hide one afterwards with a reason the founder sees. Buyers who follow the listing hear
-- about them in the same weekly notice as the lists and curators they follow
-- («Esta semana en lo que sigues»), category 'community': in the account right away, by
-- email only as the Monday summary and only with community_email on. The founder sees how
-- many follow the listing, never who; nobody else sees the number.
CREATE TABLE IF NOT EXISTS solution_follows (
  solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (solution_id, follower_id)
);
CREATE INDEX IF NOT EXISTS solution_follows_follower
  ON solution_follows (follower_id, created_at DESC);

CREATE TABLE IF NOT EXISTS solution_updates (
  -- Chosen by the client, so a retried post is the same row (like comments, §46).
  id uuid PRIMARY KEY,
  solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('feature','pricing','integration','case','other')),
  body varchar(500) NOT NULL CHECK (char_length(btrim(body)) BETWEEN 10 AND 500),
  link varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Moderation after the fact, from ops: hidden, never edited.
  hidden_at timestamptz,
  hidden_reason varchar(500),
  hidden_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL
);
-- Deleting is soft: the update disappears for everyone but still counts against the
-- weekly cap, so deleting and posting again can't flood followers.
ALTER TABLE solution_updates ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS solution_updates_solution
  ON solution_updates (solution_id, created_at DESC);

-- follow_notice() from db/community-follows.sql, plus updates of followed listings.
CREATE OR REPLACE FUNCTION follow_notice(target uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  week date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  projects integer;
  lists integer;
  updates integer;
  wanted boolean;
  parts text[] := '{}';
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
  SELECT count(*) INTO updates
    FROM solution_follows f
    JOIN founder_solutions s ON s.id = f.solution_id AND s.published_data IS NOT NULL
     AND s.owner_id <> target
    JOIN solution_updates u ON u.solution_id = s.id AND u.hidden_at IS NULL AND u.deleted_at IS NULL
     AND u.created_at >= week::timestamp AT TIME ZONE 'UTC' AND u.created_at >= f.created_at
   WHERE f.follower_id = target;
  IF projects = 0 AND lists = 0 AND updates = 0 THEN RETURN; END IF;
  IF projects > 0 THEN parts := parts || (projects || CASE WHEN projects = 1
    THEN ' proyecto nuevo en listas' ELSE ' proyectos nuevos en listas' END); END IF;
  IF lists > 0 THEN parts := parts || (lists || CASE WHEN lists = 1
    THEN ' lista nueva de curadores' ELSE ' listas nuevas de curadores' END); END IF;
  IF updates > 0 THEN parts := parts || (updates || CASE WHEN updates = 1
    THEN ' novedad de proyectos' ELSE ' novedades de proyectos' END); END IF;
  title := CASE
    WHEN cardinality(parts) > 1 THEN 'Esta semana en lo que sigues: '
      || array_to_string(parts[1:cardinality(parts) - 1], ', ') || ' y ' || parts[cardinality(parts)]
    WHEN projects = 1 THEN 'Un proyecto nuevo en una lista que sigues'
    WHEN projects > 1 THEN projects || ' proyectos nuevos en listas que sigues'
    WHEN lists = 1 THEN 'Una lista nueva de un curador que sigues'
    WHEN lists > 1 THEN lists || ' listas nuevas de curadores que sigues'
    WHEN updates = 1 THEN 'Una novedad de un proyecto que sigues'
    ELSE updates || ' novedades de proyectos que sigues'
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

-- A new update reaches every follower of a published listing (never its own owner).
CREATE OR REPLACE FUNCTION notify_solution_update() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE follower uuid;
BEGIN
  FOR follower IN SELECT f.follower_id FROM solution_follows f
    JOIN founder_solutions s ON s.id = f.solution_id AND s.published_data IS NOT NULL
     AND s.owner_id <> f.follower_id
    WHERE f.solution_id = NEW.solution_id
  LOOP PERFORM follow_notice(follower); END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS solution_update_notification ON solution_updates;
CREATE TRIGGER solution_update_notification AFTER INSERT ON solution_updates
  FOR EACH ROW EXECUTE FUNCTION notify_solution_update();
