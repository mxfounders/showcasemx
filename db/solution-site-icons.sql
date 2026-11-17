-- SHCWS-177: el logo que declara el sitio de cada ficha (favicon, apple-touch-icon o
-- SVG), leído en la misma petición que la portada (src/lib/solutions/site-icon.ts),
-- normalizado a WebP de 128 px y guardado en Vercel Blob como las demás imágenes
-- (db/media-storage.sql). Aditiva; requiere media-storage.sql (storage_orphans y
-- storage_orphan_from_storage_key()).
--
-- Una fila solo existe con un logo guardado: si la lectura falla se conserva el
-- anterior, salvo que el sitio de la ficha haya cambiado (la ruta borra la fila y el
-- trigger encola el blob).

CREATE TABLE IF NOT EXISTS solution_site_icons (
  solution_id uuid PRIMARY KEY REFERENCES founder_solutions(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  icon_url text NOT NULL,
  storage_key text NOT NULL,
  bytes integer NOT NULL CHECK (bytes > 0 AND bytes <= 65536),
  checksum text NOT NULL,
  size integer NOT NULL CHECK (size BETWEEN 16 AND 128),
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Una clave pertenece a una sola fila viva: la purga de vida del barredor la busca aquí.
CREATE UNIQUE INDEX IF NOT EXISTS solution_site_icons_storage_key
  ON solution_site_icons (storage_key);

-- Borrar la fila (también por cascada al borrar la ficha o la cuenta) encola el blob.
DROP TRIGGER IF EXISTS solution_site_icons_orphan ON solution_site_icons;
CREATE TRIGGER solution_site_icons_orphan
  AFTER DELETE ON solution_site_icons
  FOR EACH ROW EXECUTE FUNCTION storage_orphan_from_storage_key();

-- Releer el sitio guarda el logo con una clave nueva y encola la anterior.
DROP TRIGGER IF EXISTS solution_site_icons_replaced ON solution_site_icons;
CREATE TRIGGER solution_site_icons_replaced
  AFTER UPDATE OF storage_key ON solution_site_icons
  FOR EACH ROW
  WHEN (OLD.storage_key IS DISTINCT FROM NEW.storage_key)
  EXECUTE FUNCTION storage_orphan_from_storage_key();
