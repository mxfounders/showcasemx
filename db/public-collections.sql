-- Additive: never publish existing lists or reuse private purpose/notes as public copy.
ALTER TABLE buyer_lists ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public'));
ALTER TABLE buyer_lists ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';
ALTER TABLE buyer_lists ADD COLUMN IF NOT EXISTS public_description varchar(400) NOT NULL DEFAULT '';
ALTER TABLE buyer_lists ADD COLUMN IF NOT EXISTS curator_name varchar(60) NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS buyer_lists_public ON buyer_lists(updated_at DESC,id) WHERE visibility='public';
