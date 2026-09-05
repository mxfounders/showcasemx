-- Object-storage migration, PHASE 5 of 5. Migration-only, NO deploy.
--
-- Run ONLY after: phase 3 backfill complete, phase 4 --verify reports zero
-- pending rows (sha256 of every blob matches the base64 column), and a Neon
-- backup branch has been taken. This is the point of no return for the base64
-- columns — a Neon branch does not cover blob deletions, so keep the branch and
-- keep STORAGE_SWEEP_ENABLED off until this has been verified in place.
--
-- Apply with scripts/migrate-media-storage-drop.cjs.

-- Recreate the view WITHOUT content_base64 first: DROP COLUMN would fail on the
-- dependency. CREATE OR REPLACE VIEW is instant and transactional, and this file
-- is the only place the predicate changes — no application edit in phase 5.
CREATE OR REPLACE VIEW solution_site_image_ready AS
  SELECT solution_id FROM solution_site_images WHERE storage_key IS NOT NULL;

ALTER TABLE solution_site_images DROP COLUMN content_base64;
ALTER TABLE solution_media       DROP COLUMN content_base64;

-- The blob columns are now the source of truth for a screenshot. Safe after the
-- phase 4 gate: every surviving row has been backfilled and every new row since
-- phase 2 writes these.
ALTER TABLE solution_media ALTER COLUMN storage_key SET NOT NULL;
ALTER TABLE solution_media ALTER COLUMN bytes       SET NOT NULL;
ALTER TABLE solution_media ALTER COLUMN checksum    SET NOT NULL;

-- Left nullable on purpose: solution_site_images.storage_key (a failure row has
-- no image), auth_accounts.avatar_key (not every account has a photo).
-- auth_accounts.avatar_data stays as a harmless vestigial column; a later
-- cleanup can drop it and collapse the has_avatar predicates to avatar_key.
