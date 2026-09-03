-- Solution ficha engagement. Existing solutions start at zero; no fabricated activity.
CREATE TABLE IF NOT EXISTS solution_likes (
 solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(solution_id,owner_id)
);
CREATE TABLE IF NOT EXISTS solution_comments (
 id uuid PRIMARY KEY, solution_id uuid NOT NULL REFERENCES founder_solutions(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 author_name varchar(60) NOT NULL, body varchar(500) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solution_comments_solution ON solution_comments(solution_id,created_at DESC,id);
CREATE INDEX IF NOT EXISTS solution_likes_owner ON solution_likes(owner_id,created_at DESC);
