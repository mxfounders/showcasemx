ALTER TABLE auth_accounts
 ADD COLUMN IF NOT EXISTS name varchar(100),
 ADD COLUMN IF NOT EXISTS organization varchar(120),
 ADD COLUMN IF NOT EXISTS profile varchar(20) CHECK (profile IN ('founder','buyer','both','exploring')),
 ADD COLUMN IF NOT EXISTS role varchar(40) CHECK (role IN ('leadership','product_tech','sales_marketing','operations','finance_procurement','other'));
