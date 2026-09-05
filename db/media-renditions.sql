-- Fase B del object storage: renditions responsivas de las capturas.
-- Aditiva. Solo aplica a solution_media (capturas del fundador); las portadas de
-- sitio ya vienen <=1200x900 y no se renditionan.
--
-- Aplicar con scripts/migrate-media-renditions.cjs (splitter de migrate-launch.cjs).
--
-- Una fila por (media_id, width) con width en (400, 800). El ancho completo (1600)
-- NO tiene fila aquí: lo sirve solution_media.storage_key directamente, así se
-- evita la sutileza de una clave compartida entre dos tablas.
CREATE TABLE IF NOT EXISTS solution_media_files (
  storage_key text PRIMARY KEY,
  media_id    uuid    NOT NULL REFERENCES solution_media(id) ON DELETE CASCADE,
  width       integer NOT NULL CHECK (width IN (400, 800)),
  bytes       integer NOT NULL CHECK (bytes <= 409600),
  checksum    text    NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (media_id, width)
);
CREATE INDEX IF NOT EXISTS solution_media_files_media ON solution_media_files(media_id);

-- Recolección de basura: misma cola storage_orphans, mismo mecanismo. Un borrado
-- de solution_media cascadea aquí y este AFTER DELETE encola cada rendition.
DROP TRIGGER IF EXISTS solution_media_files_orphan ON solution_media_files;
CREATE TRIGGER solution_media_files_orphan
  AFTER DELETE ON solution_media_files
  FOR EACH ROW EXECUTE FUNCTION storage_orphan_from_storage_key();
