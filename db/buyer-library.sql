-- Private references, not copies of product data. Editorial versions stay authoritative.
CREATE TABLE IF NOT EXISTS buyer_saved_projects (
 owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 project_key varchar(80) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,project_key)
);
CREATE TABLE IF NOT EXISTS buyer_lists (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 name varchar(100) NOT NULL,
 purpose varchar(400) NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(owner_id,id)
);
CREATE TABLE IF NOT EXISTS buyer_list_items (
 owner_id uuid NOT NULL,
 list_id uuid NOT NULL,
 project_key varchar(80) NOT NULL,
 note varchar(2000) NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,list_id,project_key),
 FOREIGN KEY(owner_id,list_id) REFERENCES buyer_lists(owner_id,id) ON DELETE CASCADE,
 FOREIGN KEY(owner_id,project_key) REFERENCES buyer_saved_projects(owner_id,project_key) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS buyer_lists_owner ON buyer_lists(owner_id,updated_at DESC);
