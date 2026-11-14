-- SHCWS-154/156/153: two more kinds of in-account notice. «security» (password changed,
-- second factor, Google, a new device, a password found in breaches) is always on and
-- never depends on Preferencias de avisos; «account» is one-off account mail such as the
-- welcome after onboarding. Additive and re-runnable: it only widens the CHECK.
ALTER TABLE account_notifications DROP CONSTRAINT IF EXISTS account_notifications_category_check;
ALTER TABLE account_notifications ADD CONSTRAINT account_notifications_category_check
  CHECK (category IN ('contact', 'solution', 'security', 'account'));

-- SHCWS-154: devices an account has signed in from, by the same coarse label the sessions
-- page shows («Chrome en macOS»), never an IP. A sign-in from a label not seen in 90 days,
-- on an account that already had another one, sends a «new sign-in» notice.
CREATE TABLE IF NOT EXISTS auth_known_devices (
  account_id uuid NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
  device_label varchar(120) NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, device_label)
);
