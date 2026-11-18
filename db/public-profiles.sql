-- SHCWS-120 · Perfiles públicos de creadores y curadores: /c/<handle>.
--
-- Opt-in, apagado por defecto: una cuenta sin fila aquí, o con active = false, no tiene
-- página pública (el middleware responde 404). El perfil muestra solo lo que la persona
-- escribió en él (nombre o alias, bio, enlaces) y lo que ya publicó: sus fichas aprobadas
-- y sus listas públicas visibles, salvo las que ocultó aquí. Nunca correo, id de cuenta,
-- guardados, notas ni actividad privada (CLAUDE.md §19, §23).
--
-- El handle nombra la página. Cambiarlo deja el anterior en profile_handle_history, que
-- redirige con 301 al actual mientras la cuenta exista; nadie más puede tomarlo. Cuando
-- ops fuerza el cambio (suplantación, marca ajena), el anterior va a profile_handle_blocks:
-- no redirige y nadie puede volver a usarlo.
--
-- Seguir un perfil entra en el mismo aviso semanal que listas, curadores y fichas
-- («Esta semana en lo que sigues», db/community-follows.sql, db/solution-updates.sql):
-- proyectos que la persona publica por primera vez y listas suyas que se vuelven visibles.
-- Redefine follow_notice() de db/solution-updates.sql. Aditiva y re-aplicable; después de
-- db/solution-updates.sql y db/account-flags.sql.

CREATE TABLE IF NOT EXISTS public_profiles (
  account_id uuid PRIMARY KEY REFERENCES auth_accounts(id) ON DELETE CASCADE,
  handle text NOT NULL,
  display_name varchar(80) NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80),
  bio varchar(600) NOT NULL DEFAULT '',
  -- [{label, url}] con las mismas reglas que los enlaces de una ficha (§17), hasta 6.
  links jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(links) = 'array' AND jsonb_array_length(links) <= 6),
  -- Lo publicado que la persona prefiere no mostrar aquí. Lo nuevo aparece por defecto.
  hidden_solutions uuid[] NOT NULL DEFAULT '{}',
  hidden_lists uuid[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  -- Moderación de ops: oculto con un motivo que la persona ve en Ajustes.
  hidden_at timestamptz,
  hidden_reason varchar(500),
  hidden_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Minúsculas ASCII y dígitos en palabras separadas por guiones, de 3 a 30 caracteres. La
-- app comprueba lo mismo y además la lista de reservados (src/lib/profiles/handle.ts).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'public_profiles_handle_shape') THEN
    ALTER TABLE public_profiles ADD CONSTRAINT public_profiles_handle_shape CHECK (
      length(handle) BETWEEN 3 AND 30 AND handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    );
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS public_profiles_handle ON public_profiles (handle);
CREATE INDEX IF NOT EXISTS public_profiles_active
  ON public_profiles (activated_at DESC) WHERE active AND hidden_at IS NULL;

-- Handles que una cuenta usó antes: redirigen (301) a su handle actual.
CREATE TABLE IF NOT EXISTS profile_handle_history (
  handle text PRIMARY KEY CHECK (length(handle) BETWEEN 3 AND 30),
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  retired_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_handle_history_account ON profile_handle_history (account_id);

-- Handles que ops retiró: sin redirección y sin reutilizar. Sin cuenta: siguen bloqueados
-- aunque la cuenta que los usaba se borre.
CREATE TABLE IF NOT EXISTS profile_handle_blocks (
  handle text PRIMARY KEY CHECK (length(handle) BETWEEN 3 AND 30),
  reason varchar(500) NOT NULL,
  blocked_by uuid REFERENCES auth_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Si el perfil se ve: activado por su dueño, no oculto por ops, cuenta no suspendida.
CREATE OR REPLACE FUNCTION profile_visible(target uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE((
    SELECT p.active AND p.hidden_at IS NULL AND a.suspended_at IS NULL
      FROM public_profiles p JOIN auth_accounts a ON a.id = p.account_id
     WHERE p.account_id = target), false)
$$;

-- Seguir un perfil. id propio: dejar de seguir desde la cuenta funciona aunque el perfil ya
-- no se vea, sin nombrar a la persona. Quien sigue nunca recibe el id de la cuenta seguida.
CREATE TABLE IF NOT EXISTS profile_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  profile_id uuid NOT NULL REFERENCES public_profiles(account_id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, follower_id),
  CHECK (profile_id <> follower_id)
);
CREATE INDEX IF NOT EXISTS profile_follows_follower ON profile_follows (follower_id, created_at DESC);

-- La primera publicación de cada ficha, para avisar a quien sigue a su dueño una sola vez
-- (published_at cambia con cada actualización aprobada). Las fichas ya publicadas hoy
-- cuentan como anunciadas, para no presentar nada viejo como nuevo.
CREATE TABLE IF NOT EXISTS profile_project_announcements (
  solution_id uuid PRIMARY KEY REFERENCES founder_solutions(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  announced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_project_announcements_account
  ON profile_project_announcements (account_id, announced_at DESC);

INSERT INTO profile_project_announcements (solution_id, account_id, announced_at)
SELECT s.id, s.owner_id, LEAST(COALESCE(s.published_at, s.created_at), now() - interval '8 days')
  FROM founder_solutions s
 WHERE s.published_data IS NOT NULL
ON CONFLICT (solution_id) DO NOTHING;

-- follow_notice() de db/solution-updates.sql, más lo de los perfiles que se siguen: listas
-- nuevas (contadas una vez aunque también se siga la firma) y proyectos publicados.
CREATE OR REPLACE FUNCTION follow_notice(target uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  week date := date_trunc('week', now() AT TIME ZONE 'UTC')::date;
  since timestamptz := week::timestamp AT TIME ZONE 'UTC';
  projects integer;
  lists integer;
  updates integer;
  published integer;
  wanted boolean;
  parts text[] := '{}';
  title text;
BEGIN
  IF target IS NULL THEN RETURN; END IF;
  SELECT count(DISTINCT (l.id, s.id)) INTO projects
    FROM community_list_follows f
    JOIN buyer_lists l ON l.id = f.list_id AND l.visibility = 'public' AND l.owner_id <> target
    JOIN buyer_list_items i ON i.list_id = l.id AND i.owner_id = l.owner_id
     AND i.created_at >= since AND i.created_at >= f.created_at
    JOIN founder_solutions s
      ON (i.project_key = 'solution:' || s.id::text
          OR (s.catalog_key IS NOT NULL AND i.project_key = 'catalog:' || s.catalog_key))
     AND s.published_data IS NOT NULL
   WHERE f.follower_id = target AND community_list_visible(l.id);
  SELECT count(DISTINCT list_id) INTO lists FROM (
    SELECT a.list_id
      FROM community_curator_follows c
      JOIN community_list_announcements a
        ON a.curator_id = c.curator_id AND a.curator_key = c.curator_key
       AND a.announced_at >= since AND a.announced_at >= c.created_at
      JOIN buyer_lists l ON l.id = a.list_id AND l.visibility = 'public'
     WHERE c.follower_id = target
    UNION
    SELECT a.list_id
      FROM profile_follows pf
      JOIN public_profiles p ON p.account_id = pf.profile_id
      JOIN community_list_announcements a
        ON a.curator_id = pf.profile_id AND a.announced_at >= since AND a.announced_at >= pf.created_at
      JOIN buyer_lists l ON l.id = a.list_id AND l.visibility = 'public'
       AND NOT (l.id = ANY (p.hidden_lists))
     WHERE pf.follower_id = target AND profile_visible(pf.profile_id)
  ) news;
  SELECT count(*) INTO updates
    FROM solution_follows f
    JOIN founder_solutions s ON s.id = f.solution_id AND s.published_data IS NOT NULL
     AND s.owner_id <> target
    JOIN solution_updates u ON u.solution_id = s.id AND u.hidden_at IS NULL AND u.deleted_at IS NULL
     AND u.created_at >= since AND u.created_at >= f.created_at
   WHERE f.follower_id = target;
  SELECT count(DISTINCT a.solution_id) INTO published
    FROM profile_follows pf
    JOIN public_profiles p ON p.account_id = pf.profile_id
    JOIN profile_project_announcements a
      ON a.account_id = pf.profile_id AND a.announced_at >= since AND a.announced_at >= pf.created_at
    JOIN founder_solutions s ON s.id = a.solution_id AND s.owner_id = pf.profile_id
     AND s.published_data IS NOT NULL AND NOT (s.id = ANY (p.hidden_solutions))
   WHERE pf.follower_id = target AND profile_visible(pf.profile_id);
  IF projects = 0 AND lists = 0 AND updates = 0 AND published = 0 THEN RETURN; END IF;
  IF projects > 0 THEN parts := parts || (projects || CASE WHEN projects = 1
    THEN ' proyecto nuevo en listas' ELSE ' proyectos nuevos en listas' END); END IF;
  IF lists > 0 THEN parts := parts || (lists || CASE WHEN lists = 1
    THEN ' lista nueva de curadores' ELSE ' listas nuevas de curadores' END); END IF;
  IF updates > 0 THEN parts := parts || (updates || CASE WHEN updates = 1
    THEN ' novedad de proyectos' ELSE ' novedades de proyectos' END); END IF;
  IF published > 0 THEN parts := parts || (published || CASE WHEN published = 1
    THEN ' proyecto publicado por perfiles' ELSE ' proyectos publicados por perfiles' END); END IF;
  title := CASE
    WHEN cardinality(parts) > 1 THEN 'Esta semana en lo que sigues: '
      || array_to_string(parts[1:cardinality(parts) - 1], ', ') || ' y ' || parts[cardinality(parts)]
    WHEN projects = 1 THEN 'Un proyecto nuevo en una lista que sigues'
    WHEN projects > 1 THEN projects || ' proyectos nuevos en listas que sigues'
    WHEN lists = 1 THEN 'Una lista nueva de un curador que sigues'
    WHEN lists > 1 THEN lists || ' listas nuevas de curadores que sigues'
    WHEN updates = 1 THEN 'Una novedad de un proyecto que sigues'
    WHEN updates > 1 THEN updates || ' novedades de proyectos que sigues'
    WHEN published = 1 THEN 'Un proyecto nuevo de un perfil que sigues'
    ELSE published || ' proyectos nuevos de perfiles que sigues'
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

-- La primera vez que una ficha se publica: queda anunciada y, si su dueño tiene perfil
-- visible que la muestra, avisa a quien lo sigue. Volver a publicarla no vuelve a avisar.
CREATE OR REPLACE FUNCTION announce_profile_project() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE follower uuid;
BEGIN
  INSERT INTO profile_project_announcements (solution_id, account_id)
  VALUES (NEW.id, NEW.owner_id) ON CONFLICT (solution_id) DO NOTHING;
  IF FOUND AND profile_visible(NEW.owner_id) THEN
    FOR follower IN SELECT f.follower_id FROM profile_follows f
      JOIN public_profiles p ON p.account_id = f.profile_id
     WHERE f.profile_id = NEW.owner_id AND NOT (NEW.id = ANY (p.hidden_solutions))
    LOOP PERFORM follow_notice(follower); END LOOP;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profile_project_announcement ON founder_solutions;
CREATE TRIGGER profile_project_announcement AFTER INSERT OR UPDATE OF published_data ON founder_solutions
  FOR EACH ROW WHEN (NEW.published_data IS NOT NULL) EXECUTE FUNCTION announce_profile_project();

-- Una lista de la persona se vuelve visible por primera vez (db/community-follows.sql la
-- anuncia a quien sigue su firma): también a quien sigue su perfil, si la muestra.
CREATE OR REPLACE FUNCTION announce_profile_list() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE follower uuid;
BEGIN
  IF profile_visible(NEW.curator_id) THEN
    FOR follower IN SELECT f.follower_id FROM profile_follows f
      JOIN public_profiles p ON p.account_id = f.profile_id
     WHERE f.profile_id = NEW.curator_id AND NOT (NEW.list_id = ANY (p.hidden_lists))
    LOOP PERFORM follow_notice(follower); END LOOP;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profile_list_announcement ON community_list_announcements;
CREATE TRIGGER profile_list_announcement AFTER INSERT ON community_list_announcements
  FOR EACH ROW EXECUTE FUNCTION announce_profile_list();
