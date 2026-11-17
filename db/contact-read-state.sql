-- SHCWS-14: unread opportunities for the recipient. Apply after contact-requests.sql.
-- Additive and re-runnable.
--
-- An opportunity is unread while the buyer has an event (the request itself, or a
-- withdrawal) newer than recipient_read_at. Opening the opportunity or answering it
-- moves recipient_read_at forward; it never changes status, version or updated_at, so
-- reading does not reorder the inbox or invalidate an open reply form.
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS recipient_read_at timestamptz;

-- Existing conversations: whoever already answered has read the request up to their
-- latest answer. Requests nobody answered stay unread. Only empty rows are touched.
UPDATE contact_requests r SET recipient_read_at=answered.at
FROM (
  SELECT e.request_id,max(e.created_at) AS at
  FROM contact_events e JOIN contact_requests c ON c.id=e.request_id
  WHERE e.actor_id=c.recipient_id
  GROUP BY e.request_id
) answered
WHERE answered.request_id=r.id AND r.recipient_read_at IS NULL;
