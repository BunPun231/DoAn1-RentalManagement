ALTER TABLE users
	ADD COLUMN IF NOT EXISTS status VARCHAR(32);

UPDATE tenants
SET status = 'TRIAL'
WHERE status IS NULL OR status = '';

UPDATE users
SET status = 'ACTIVE'
WHERE status IS NULL OR status = '';

ALTER TABLE users
	ALTER COLUMN status SET DEFAULT 'ACTIVE';

ALTER TABLE users
	ALTER COLUMN status SET NOT NULL;
