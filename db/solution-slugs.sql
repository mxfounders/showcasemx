-- SHCWS-101 · URLs con nombre para las fichas: /soluciones/cord en vez de /soluciones/<uuid>.
--
-- founder_solutions.slug nombra la página pública de una ficha. Se asigna al aprobarla por
-- primera vez en ops (derivado del nombre, ops/src/lib/slug.ts) y un admin puede cambiarlo
-- desde ops. Cada slug anterior queda en solution_slug_history y redirige con 301 al actual
-- (src/lib/solutions/slug-routing.ts). El UUID sigue siendo la identidad de la ficha:
-- guardados (solution:<uuid>, catalog:cord), contactos, APIs e imágenes no cambian.
--
-- Aditiva y re-aplicable. Rellena el slug de las fichas ya publicadas: Cord y Flouvia
-- toman su catalog_key (cord, flouvia); las demás, su nombre publicado, con sufijo -2, -3…
-- si ya está ocupado. Las fichas sin publicar reciben el suyo al aprobarse.
-- Aplicar antes de desplegar: el catálogo y la ficha pública leen la columna.

ALTER TABLE founder_solutions ADD COLUMN IF NOT EXISTS slug text;

-- Minúsculas ASCII y dígitos en palabras separadas por guiones, hasta 60 caracteres. Nunca
-- con forma de UUID (se confundiría con la URL antigua) ni como la imagen para compartir
-- que Next sirve bajo cada página (/…/opengraph-image). La app comprueba lo mismo
-- (isSolutionSlug en src/lib/solutions/slug.ts).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'founder_solutions_slug_shape') THEN
    ALTER TABLE founder_solutions ADD CONSTRAINT founder_solutions_slug_shape CHECK (
      length(slug) BETWEEN 1 AND 60
      AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      AND slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND slug !~ '^(opengraph|twitter)-image(-|$)'
    );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS founder_solutions_slug ON founder_solutions (slug);

-- Slugs que una ficha usó antes. Un slug está en un solo sitio a la vez: es el actual de una
-- ficha o el anterior de una, nunca ambos. Al borrar la ficha se libera.
CREATE TABLE IF NOT EXISTS solution_slug_history (
  slug text PRIMARY KEY,
  solution_id uuid NOT NULL REFERENCES founder_solutions (id) ON DELETE CASCADE,
  retired_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solution_slug_history_solution ON solution_slug_history (solution_id);

-- Al cambiar el slug, el anterior pasa al historial y el nuevo sale de él (una ficha que
-- vuelve a un nombre que ya usó lo recupera).
CREATE OR REPLACE FUNCTION remember_solution_slug() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.slug IS DISTINCT FROM NEW.slug THEN
    IF OLD.slug IS NOT NULL THEN
      INSERT INTO solution_slug_history (slug, solution_id) VALUES (OLD.slug, NEW.id)
      ON CONFLICT (slug) DO UPDATE SET solution_id = EXCLUDED.solution_id, retired_at = now();
    END IF;
    IF NEW.slug IS NOT NULL THEN
      DELETE FROM solution_slug_history WHERE slug = NEW.slug;
    END IF;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS founder_solutions_slug_history ON founder_solutions;
CREATE TRIGGER founder_solutions_slug_history AFTER UPDATE OF slug ON founder_solutions
  FOR EACH ROW EXECUTE FUNCTION remember_solution_slug();

-- Cord y Flouvia conservan el nombre que el catálogo ya usa, publicadas o no.
UPDATE founder_solutions s SET slug = s.catalog_key
WHERE s.slug IS NULL AND s.catalog_key IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM founder_solutions o WHERE o.slug = s.catalog_key)
  AND NOT EXISTS (SELECT 1 FROM solution_slug_history h WHERE h.slug = s.catalog_key);

-- Las demás fichas publicadas, de la más antigua a la más nueva: la primera en publicarse
-- conserva el nombre limpio. Misma regla que solutionSlugBase(): sin acentos, minúsculas,
-- todo lo demás a guiones, 60 caracteres; «solucion» si no queda nada.
DO $$
DECLARE
  listing record;
  base text;
  candidate text;
  n integer;
BEGIN
  FOR listing IN
    SELECT id, published_data->>'name' AS name FROM founder_solutions
    WHERE slug IS NULL AND published_data IS NOT NULL
    ORDER BY published_at NULLS LAST, created_at, id
  LOOP
    base := replace(replace(replace(replace(replace(coalesce(listing.name, ''),
      'ß', 'ss'), 'Æ', 'ae'), 'æ', 'ae'), 'Œ', 'oe'), 'œ', 'oe');
    base := lower(translate(base,
      'áàâäãåāăąéèêëēėęěíìîïīįóòôöõōőúùûüūůűųñńňçćčýÿšśşžźżřďťĺľÁÀÂÄÃÅĀĂĄÉÈÊËĒĖĘĚÍÌÎÏĪĮÓÒÔÖÕŌŐÚÙÛÜŪŮŰŲÑŃŇÇĆČÝŸŠŚŞŽŹŻŘĎŤĹĽøØłŁđĐ',
      'aaaaaaaaaeeeeeeeeiiiiiiooooooouuuuuuuunnncccyyssszzzrdtllaaaaaaaaaeeeeeeeeiiiiiiooooooouuuuuuuunnncccyyssszzzrdtlloolldd'));
    base := trim(both '-' from regexp_replace(base, '[^a-z0-9]+', '-', 'g'));
    base := rtrim(left(base, 60), '-');
    IF base = '' THEN
      base := 'solucion';
    ELSIF base ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR base ~ '^(opengraph|twitter)-image(-|$)' THEN
      base := rtrim(left('solucion-' || base, 60), '-');
    END IF;
    n := 1;
    LOOP
      candidate := CASE WHEN n = 1 THEN base
        ELSE rtrim(left(base, 60 - length('-' || n)), '-') || '-' || n END;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM founder_solutions WHERE slug = candidate)
        AND NOT EXISTS (SELECT 1 FROM solution_slug_history WHERE slug = candidate);
      n := n + 1;
    END LOOP;
    UPDATE founder_solutions SET slug = candidate WHERE id = listing.id;
  END LOOP;
END $$;
