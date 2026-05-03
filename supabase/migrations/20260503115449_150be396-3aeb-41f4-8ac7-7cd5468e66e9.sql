
-- 1. Privilege escalation: prevent users from changing their own role via profiles update
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- 2. analytics_cache: keep reads open (it's a shared cache) but restrict writes to super admins
DROP POLICY IF EXISTS "Authenticated users can manage analytics cache" ON public.analytics_cache;

CREATE POLICY "Authenticated users can read analytics cache"
ON public.analytics_cache
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admins can write analytics cache"
ON public.analytics_cache
FOR INSERT
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update analytics cache"
ON public.analytics_cache
FOR UPDATE
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete analytics cache"
ON public.analytics_cache
FOR DELETE
USING (public.is_super_admin());

-- 3. Fix mutable search_path on SECURITY DEFINER functions
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;
