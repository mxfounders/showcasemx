-- Migración a object storage (Vercel Blob). Aditiva. FASE 1 de 5.
--
-- Introduce las columnas de clave de blob y toda la maquinaria de recolección
-- de basura, SIN quitar content_base64: la fase 2 lee de storage_key con
-- fallback a content_base64 (lectura dual), la fase 3 backfillea, y solo la
-- fase 5 (db/media-storage-drop.sql) hace DROP COLUMN, en una migración aparte
-- y SIN deploy. La columna vieja nunca se elimina en el mismo paso que la nueva.
--
-- Aplicar con scripts/migrate-media-storage.cjs, que reutiliza el splitter de
-- sentencias de migrate-launch.cjs: respeta bloques $$ y comentarios de linea.
-- Las funciones de abajo usan $$ PLANO a proposito. No introducir $tag$ ni
-- bloques $$ anidados: el splitter solo togglea con $$ y partiria mal el resto.
--
-- Sin CREATE INDEX CONCURRENTLY: el script envuelve todo en una transaccion.
-- Bien a este volumen (produccion tiene una sola solucion, dev es pequenio).

-- 1. Claves de blob, tamanio y checksum. content_base64 se conserva y pasa a
--    nullable en solution_media (ya lo era en solution_site_images). El CHECK
--    tolera NULL durante la ventana de lectura dual; la fase 5 lo endurece.
ALTER TABLE solution_media       ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE solution_media       ADD COLUMN IF NOT EXISTS bytes integer;
ALTER TABLE solution_media       ADD COLUMN IF NOT EXISTS checksum text;
ALTER TABLE solution_media       DROP CONSTRAINT IF EXISTS solution_media_bytes_check;
ALTER TABLE solution_media       ADD  CONSTRAINT solution_media_bytes_check CHECK (bytes IS NULL OR bytes <= 409600);
ALTER TABLE solution_media       ALTER COLUMN content_base64 DROP NOT NULL;

ALTER TABLE solution_site_images ADD COLUMN IF NOT EXISTS storage_key text;
ALTER TABLE solution_site_images ADD COLUMN IF NOT EXISTS bytes integer;
ALTER TABLE solution_site_images ADD COLUMN IF NOT EXISTS checksum text;
ALTER TABLE solution_site_images DROP CONSTRAINT IF EXISTS solution_site_images_bytes_check;
ALTER TABLE solution_site_images ADD  CONSTRAINT solution_site_images_bytes_check CHECK (bytes IS NULL OR bytes <= 409600);

ALTER TABLE auth_accounts        ADD COLUMN IF NOT EXISTS avatar_key text;
ALTER TABLE auth_accounts        ADD COLUMN IF NOT EXISTS avatar_checksum text;

-- 2. Indices unicos parciales: hacen que el chequeo de vida del barredor sea un
--    lookup por indice y no un seq scan. Una clave de blob pertenece a lo sumo a
--    una fila viva; una clave reutilizada seria un bug nuestro y aqui falla ruidoso.
CREATE UNIQUE INDEX IF NOT EXISTS solution_media_storage_key       ON solution_media(storage_key)       WHERE storage_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS solution_site_images_storage_key ON solution_site_images(storage_key) WHERE storage_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS auth_accounts_avatar_key         ON auth_accounts(avatar_key)         WHERE avatar_key IS NOT NULL;

-- 3. Cola de huerfanos. UNICO mecanismo de GC. Los triggers de abajo la llenan,
--    incluido el caso ON DELETE CASCADE (borrar solucion o cuenta), donde la
--    aplicacion nunca llega a ver las claves. El barredor
--    (src/app/api/internal/monitor/route.ts) la vacia best-effort, detras de
--    STORAGE_SWEEP_ENABLED, y revalida contra las tablas vivas antes de borrar.
CREATE TABLE IF NOT EXISTS storage_orphans (
  key          text PRIMARY KEY,
  deleted_at   timestamptz NOT NULL DEFAULT now(),
  attempts     smallint    NOT NULL DEFAULT 0,
  locked_until timestamptz
);
CREATE INDEX IF NOT EXISTS storage_orphans_pending ON storage_orphans(deleted_at) WHERE attempts < 5;

-- 4. Funciones de trigger. $$ PLANO, sin nada anidado.
--    ON CONFLICT DO NOTHING NO es opcional: sin el, una clave duplicada lanza
--    dentro del trigger y ABORTA el DELETE del fundador, convirtiendo un detalle
--    de recoleccion de basura en un 503 de cara al usuario.
CREATE OR REPLACE FUNCTION storage_orphan_from_storage_key() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.storage_key IS NOT NULL THEN
    INSERT INTO storage_orphans(key) VALUES (OLD.storage_key) ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION storage_orphan_from_avatar_key() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.avatar_key IS NOT NULL THEN
    INSERT INTO storage_orphans(key) VALUES (OLD.avatar_key) ON CONFLICT (key) DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;

-- 5. Triggers. DROP+CREATE en vez de CREATE OR REPLACE TRIGGER para compatibilidad.
DROP TRIGGER IF EXISTS solution_media_orphan ON solution_media;
CREATE TRIGGER solution_media_orphan
  AFTER DELETE ON solution_media
  FOR EACH ROW EXECUTE FUNCTION storage_orphan_from_storage_key();

DROP TRIGGER IF EXISTS solution_site_images_orphan ON solution_site_images;
CREATE TRIGGER solution_site_images_orphan
  AFTER DELETE ON solution_site_images
  FOR EACH ROW EXECUTE FUNCTION storage_orphan_from_storage_key();

-- El caso del reemplazo (re-lectura de og:image): DOBLEMENTE guardado.
-- AFTER UPDATE OF storage_key solo dispara si la columna aparece en el SET; la
-- rama de fallo de site-image/route.ts (INSERT ... ON CONFLICT DO UPDATE SET
-- source_url, failure, fetched_at) NUNCA lista storage_key, asi que este trigger
-- no dispara ahi y una portada que funciona nunca se huerfaniza por un fetch
-- fallido. El WHEN es el segundo cinturon. NO "mejorar" esa rama de fallo para
-- poner storage_key a NULL: la convertiria en un huerfaniza-y-borra.
DROP TRIGGER IF EXISTS solution_site_images_replaced ON solution_site_images;
CREATE TRIGGER solution_site_images_replaced
  AFTER UPDATE OF storage_key ON solution_site_images
  FOR EACH ROW
  WHEN (OLD.storage_key IS DISTINCT FROM NEW.storage_key AND OLD.storage_key IS NOT NULL)
  EXECUTE FUNCTION storage_orphan_from_storage_key();

DROP TRIGGER IF EXISTS auth_accounts_avatar_replaced ON auth_accounts;
CREATE TRIGGER auth_accounts_avatar_replaced
  AFTER UPDATE OF avatar_key ON auth_accounts
  FOR EACH ROW
  WHEN (OLD.avatar_key IS DISTINCT FROM NEW.avatar_key AND OLD.avatar_key IS NOT NULL)
  EXECUTE FUNCTION storage_orphan_from_avatar_key();

-- Borrar la cuenta: el trigger es la red del del() inline best-effort que hace
-- account/delete/route.ts. El chequeo de vida del barredor hace inofensivo el
-- doble borrado.
DROP TRIGGER IF EXISTS auth_accounts_avatar_deleted ON auth_accounts;
CREATE TRIGGER auth_accounts_avatar_deleted
  AFTER DELETE ON auth_accounts
  FOR EACH ROW EXECUTE FUNCTION storage_orphan_from_avatar_key();

-- 6. Vista: unico lugar del predicado has_site_image, hoy repetido en 6 consultas
--    (solutions/server.ts x2, solutions/public.ts -dentro de unstable_cache-,
--    library/server.ts, soluciones/[id]/page.tsx x2). La fase 2 edita la app UNA
--    vez para leer de aqui; la fase 5 recrea la vista sin content_base64 y hace
--    DROP COLUMN, sin tocar codigo.
--    Durante la lectura dual el predicado DEBE ser el OR de ambos: si alguien
--    deja solo storage_key, el unstable_cache de public.ts (300s, tag catalog)
--    sirve el catalogo con portadas faltantes hasta 5 min por cada fila sin
--    backfillear, y sin ningun error.
CREATE OR REPLACE VIEW solution_site_image_ready AS
  SELECT solution_id
  FROM solution_site_images
  WHERE storage_key IS NOT NULL OR content_base64 IS NOT NULL;
