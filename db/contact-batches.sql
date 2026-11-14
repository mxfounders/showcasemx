-- Proposals to several projects at once (SHCWS-62, docs/contacts.md «Propuesta a varios
-- proyectos»). Apply after contact-requests.sql and buyer-library.sql. Additive and
-- re-runnable.
--
-- A batch is the buyer's own grouping of requests sent with one form from a list or the
-- comparator, so their answers can be read side by side. Each request is still an
-- ordinary contact_requests row (one per buyer and project, UNIQUE(buyer_id,solution_id)):
-- nothing here is visible to a recipient, who never learns that others were asked too.
--
-- Composite keys on buyer_id (the buyer library's pattern, §8) make it impossible to put
-- another account's request, or another account's list, into a buyer's batch.

CREATE TABLE IF NOT EXISTS contact_batches (
 id uuid PRIMARY KEY,
 buyer_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 -- The buyer's list it was sent from. Deleting the list keeps the batch.
 list_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (buyer_id, id),
 FOREIGN KEY (buyer_id, list_id) REFERENCES buyer_lists(owner_id, id) ON DELETE SET NULL (list_id)
);
CREATE INDEX IF NOT EXISTS contact_batches_buyer ON contact_batches(buyer_id, created_at DESC, id);

-- Lets a batch item reference a request together with its buyer.
CREATE UNIQUE INDEX IF NOT EXISTS contact_requests_buyer_request ON contact_requests(buyer_id, id);

CREATE TABLE IF NOT EXISTS contact_batch_items (
 batch_id uuid NOT NULL,
 buyer_id uuid NOT NULL,
 request_id uuid NOT NULL,
 -- true: this batch created the request; false: the buyer had already written to that
 -- project, so nothing new was sent and the earlier conversation is shown with the rest.
 created boolean NOT NULL,
 -- Order chosen by the buyer; at most three projects per batch.
 position smallint NOT NULL CHECK (position BETWEEN 0 AND 2),
 PRIMARY KEY (batch_id, request_id),
 UNIQUE (batch_id, position),
 FOREIGN KEY (buyer_id, batch_id) REFERENCES contact_batches(buyer_id, id) ON DELETE CASCADE,
 FOREIGN KEY (buyer_id, request_id) REFERENCES contact_requests(buyer_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS contact_batch_items_request ON contact_batch_items(buyer_id, request_id);

-- Rollback (removes only the grouping; every request and conversation stays):
-- DROP TABLE contact_batch_items; DROP TABLE contact_batches;
-- DROP INDEX contact_requests_buyer_request;
