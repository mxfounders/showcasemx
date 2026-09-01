-- Public collection engagement. Existing collections start at zero; no fabricated activity.
CREATE TABLE IF NOT EXISTS community_list_likes (
 list_id uuid NOT NULL REFERENCES buyer_lists(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(list_id,owner_id)
);
CREATE TABLE IF NOT EXISTS community_saved_lists (
 list_id uuid NOT NULL REFERENCES buyer_lists(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(list_id,owner_id)
);
CREATE TABLE IF NOT EXISTS community_list_comments (
 id uuid PRIMARY KEY, list_id uuid NOT NULL REFERENCES buyer_lists(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 author_name varchar(60) NOT NULL, body varchar(500) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_comments_list ON community_list_comments(list_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS community_saved_owner ON community_saved_lists(owner_id,created_at DESC,list_id);
