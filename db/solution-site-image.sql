-- Portada automática tomada del sitio del propio proyecto (og:image).
-- Se guarda la imagen ya normalizada, no un enlace remoto: así la portada no
-- depende de que el sitio permita hotlinking y, sobre todo, ningún visitante del
-- catálogo acaba pidiendo un archivo a un tercero. El aviso de privacidad se
-- compromete a no incrustar píxeles externos y una imagen remota lo sería.
CREATE TABLE IF NOT EXISTS solution_site_images (
  solution_id uuid PRIMARY KEY REFERENCES founder_solutions(id) ON DELETE CASCADE,
  source_url varchar(500) NOT NULL,
  image_url varchar(1000),
  content_base64 text,
  width integer,
  height integer,
  -- Motivo legible cuando no se pudo obtener; se le muestra al dueño para que
  -- sepa qué arreglar en su sitio en vez de ver un hueco silencioso.
  failure varchar(200),
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solution_site_images_fetched ON solution_site_images(fetched_at DESC);
