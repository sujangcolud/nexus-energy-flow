
-- Helper: ensure has_role(app_role) exists for super_admin checks
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
  );
$$;

-- Generic loop: drop write policies and recreate as super_admin only, keep SELECT for all authenticated
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'orders','order_items','charging_sessions','expenses','expense_bookings',
    'deposits','cooperative_savings','withdrawals','inventory','inventory_transactions',
    'vat_entries','share_investments','share_expenses','static_expenses'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop all existing INSERT/UPDATE/DELETE policies on these tables
    FOR pol IN
      SELECT policyname, cmd
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND cmd IN ('INSERT','UPDATE','DELETE')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Recreate write policies restricted to super admin
    EXECUTE format($f$
      CREATE POLICY "Super admin can insert %1$s"
      ON public.%1$I FOR INSERT TO authenticated
      WITH CHECK (public.is_super_admin())
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Super admin can update %1$s"
      ON public.%1$I FOR UPDATE TO authenticated
      USING (public.is_super_admin())
      WITH CHECK (public.is_super_admin())
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Super admin can delete %1$s"
      ON public.%1$I FOR DELETE TO authenticated
      USING (public.is_super_admin())
    $f$, t);
  END LOOP;
END $$;
