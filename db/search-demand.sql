-- SHCWS-107: what people search for, aggregated per day. Additive and re-runnable.
--
-- No account, no address, no visitor id: one row per day, normalized query and surface,
-- with how many searches, how many found nothing and how many ended in a click on a
-- listing. Queries that look like an email, a phone number or an id are never stored
-- (src/lib/search/demand.ts). Kept 400 days (src/lib/maintenance.ts).
CREATE TABLE IF NOT EXISTS search_demand (
  day date NOT NULL DEFAULT current_date,
  query varchar(80) NOT NULL CHECK (char_length(query) >= 2),
  surface text NOT NULL CHECK (surface IN ('search', 'home', 'category')),
  searches integer NOT NULL DEFAULT 0 CHECK (searches >= 0),
  empty integer NOT NULL DEFAULT 0 CHECK (empty >= 0),
  clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  PRIMARY KEY (day, query, surface)
);
CREATE INDEX IF NOT EXISTS search_demand_day ON search_demand (day DESC);
