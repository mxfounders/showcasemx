-- LEGACY — do not apply to new databases.
-- Table behind the retired anonymous intake; POST /api/applications now answers 410
-- and points to /account/solutions/new. Kept only to document rows that may still
-- exist in older environments. Ownership must never be inferred from these emails.
CREATE TABLE IF NOT EXISTS solution_applications (
  id uuid PRIMARY KEY,
  name varchar(100) NOT NULL,
  website varchar(500) NOT NULL,
  email varchar(254) NOT NULL,
  kind varchar(20) NOT NULL CHECK (kind IN ('Software', 'Agencia', 'Servicio')),
  problem varchar(1500) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
