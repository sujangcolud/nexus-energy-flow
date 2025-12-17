-- Update sujan1nepal@gmail.com to super_admin in user_roles
UPDATE user_roles 
SET role = 'super_admin'::app_role 
WHERE user_id = '5e852131-374a-4805-8017-5336eaeb4cb6';

-- Also update profiles table
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = '5e852131-374a-4805-8017-5336eaeb4cb6';

-- If profile doesn't exist, insert it
INSERT INTO profiles (id, email, role)
VALUES ('5e852131-374a-4805-8017-5336eaeb4cb6', 'sujan1nepal@gmail.com', 'super_admin')
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';