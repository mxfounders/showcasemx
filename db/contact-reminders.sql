-- Reminders and escalation for contact requests nobody answered (SHCWS-61). Additive
-- and re-runnable; after db/contact-messages.sql and db/contact-outcomes.sql.
--
-- The daily mail run (src/lib/contacts/reminders.ts) reminds the recipient 48 hours and
-- 5 days after a request with no reply, and at 7 days marks it «sin respuesta»: the
-- buyer gets a notice with similar listings (or the way to ask shwcs for help) and the
-- request counts against the project's response signal even if the buyer withdraws it.
-- The notices are ordinary account_notifications rows (category 'contact', source_key
-- contact-reminder:<id>:48h|5d and contact-unanswered:<id>), so no new table.
--
-- «Sin respuesta» is not a status. The request stays «nueva», the recipient can still
-- answer and the buyer can still withdraw it; unanswered_at only records when the pass
-- marked it. The label shows while the recipient has written nothing; a late reply
-- removes it and the date stays as a record (ops reads it as «answered late»).
ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS unanswered_at timestamptz;

-- What the pass reads: open requests not yet marked, oldest first.
CREATE INDEX IF NOT EXISTS contact_requests_awaiting ON contact_requests (created_at)
  WHERE status = 'new' AND unanswered_at IS NULL;
-- What ops lists as ignored.
CREATE INDEX IF NOT EXISTS contact_requests_unanswered ON contact_requests (unanswered_at)
  WHERE unanswered_at IS NOT NULL;
