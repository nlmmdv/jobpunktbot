-- Add administrator role support
-- Updates existing 'admin' users to use new 'administrator' role type

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('freelancer', 'employee', 'owner', 'admin', 'administrator'));

-- Migrate existing 'admin' users to 'administrator' role
UPDATE profiles
SET role = 'administrator'
WHERE role = 'admin';
