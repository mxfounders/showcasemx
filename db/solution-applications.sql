-- Apply only to the intended Neon environment. Independent of the draft product schema.
CREATE TABLE IF NOT EXISTS solution_applications (
  id uuid PRIMARY KEY,
  name varchar(100) NOT NULL,
  website varchar(500) NOT NULL,
  email varchar(254) NOT NULL,
  kind varchar(20) NOT NULL CHECK (kind IN ('Software', 'Agencia', 'Servicio')),
  problem varchar(1500) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
