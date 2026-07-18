-- Add admin users
UPDATE profiles
SET role = 'admin'
WHERE telegram_id IN (406489240, 968402264);

-- If users don't exist, create with admin role
INSERT INTO profiles (telegram_id, role, first_name, status)
VALUES
  (406489240, 'admin', 'Admin', 'active'),
  (968402264, 'admin', 'Admin', 'active')
ON CONFLICT (telegram_id) DO UPDATE
SET role = 'admin';
