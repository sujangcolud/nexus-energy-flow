-- Ensure role checks use only the dedicated user_roles table.
CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  user_role text;
  role_hierarchy integer;
  required_hierarchy integer;
BEGIN
  SELECT ur.role::text INTO user_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  ORDER BY CASE ur.role::text
    WHEN 'super_admin' THEN 4
    WHEN 'reports_viewer' THEN 3
    WHEN 'data_entry' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END DESC
  LIMIT 1;

  role_hierarchy := CASE user_role
    WHEN 'super_admin' THEN 4
    WHEN 'reports_viewer' THEN 3
    WHEN 'data_entry' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END;

  required_hierarchy := CASE required_role
    WHEN 'super_admin' THEN 4
    WHEN 'reports_viewer' THEN 3
    WHEN 'data_entry' THEN 2
    WHEN 'user' THEN 1
    ELSE 0
  END;

  RETURN role_hierarchy >= required_hierarchy;
END;
$function$;

-- Tighten daily_summary writes to super admins only while preserving shared read access.
DROP POLICY IF EXISTS "daily_summary_insert_authenticated" ON public.daily_summary;
DROP POLICY IF EXISTS "daily_summary_update_authenticated" ON public.daily_summary;
DROP POLICY IF EXISTS "daily_summary_delete_authenticated" ON public.daily_summary;

CREATE POLICY "Super admins can insert daily summaries"
ON public.daily_summary
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update daily summaries"
ON public.daily_summary
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete daily summaries"
ON public.daily_summary
FOR DELETE
TO authenticated
USING (public.is_super_admin());