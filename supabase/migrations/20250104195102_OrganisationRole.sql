DO $$ BEGIN
    CREATE TYPE organisation_role AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

UPDATE user_organisation SET role = 'VIEWER' WHERE role = 'EDITOR';

ALTER TABLE user_organisation
ADD COLUMN role_enum organisation_role;

UPDATE user_organisation
SET role_enum = CASE
    WHEN role = 'ADMIN' THEN 'ADMIN'::organisation_role
    ELSE 'VIEWER'::organisation_role
END;

ALTER TABLE user_organisation
DROP COLUMN role;

ALTER TABLE user_organisation
RENAME COLUMN role_enum TO role;

ALTER TABLE user_organisation
ALTER COLUMN role SET NOT NULL;