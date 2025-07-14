CREATE OR REPLACE FUNCTION public.create_user_with_role(
  email text,
  password text,
  first_name text,
  last_name text,
  role app_role
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Create the user
  new_user_id := (
    SELECT id FROM auth.users
    WHERE email = $1
  );

  IF new_user_id IS NULL THEN
    INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
    VALUES (email, crypt(password, gen_salt('bf')), json_build_object('first_name', first_name, 'last_name', last_name));
    new_user_id := (
      SELECT id FROM auth.users
      WHERE email = $1
    );
  END IF;

  -- Create the profile
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (new_user_id, first_name, last_name, email);

  -- Assign the role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, role);

  RETURN new_user_id;
END;
$$;
