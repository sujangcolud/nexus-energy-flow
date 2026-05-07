
-- 1) Restrict vat_entries SELECT to super_admin only (contains PII)
DROP POLICY IF EXISTS "Authenticated can view all VAT entries" ON public.vat_entries;
CREATE POLICY "Super admins can view VAT entries"
ON public.vat_entries
FOR SELECT
TO authenticated
USING (is_super_admin());

-- 2) Harden profiles UPDATE policy to forbid role changes outright
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

-- 3) Scope category/menu management policies to authenticated role
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'categories','charging_categories','withdrawal_categories',
    'expense_booking_categories','menu_items','savings_categories',
    'deposit_categories','expense_categories'
  ];
  pol_name text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- find existing manage policy and recreate scoped to authenticated
    FOR pol_name IN
      SELECT policyname FROM pg_policies
      WHERE schemaname='public' AND tablename=t
        AND policyname IN (
          'Super admins can manage categories',
          'Super admins can manage charging categories',
          'Super admins can manage withdrawal categories',
          'Super admins can manage expense booking categories',
          'Super admins can manage menu items',
          'Super admins can manage savings categories',
          'Super admins can manage deposit categories',
          'Super admins can manage expense categories'
        )
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol_name, t);
    END LOOP;
  END LOOP;
END $$;

CREATE POLICY "Super admins can manage categories" ON public.categories
  FOR ALL TO authenticated USING (has_role('super_admin'::text)) WITH CHECK (has_role('super_admin'::text));
CREATE POLICY "Super admins can manage charging categories" ON public.charging_categories
  FOR ALL TO authenticated USING (has_role('super_admin'::text)) WITH CHECK (has_role('super_admin'::text));
CREATE POLICY "Super admins can manage withdrawal categories" ON public.withdrawal_categories
  FOR ALL TO authenticated USING (has_role('super_admin'::text)) WITH CHECK (has_role('super_admin'::text));
CREATE POLICY "Super admins can manage expense booking categories" ON public.expense_booking_categories
  FOR ALL TO authenticated USING (has_role('super_admin'::text)) WITH CHECK (has_role('super_admin'::text));
CREATE POLICY "Super admins can manage menu items" ON public.menu_items
  FOR ALL TO authenticated USING (has_role('super_admin'::text)) WITH CHECK (has_role('super_admin'::text));
CREATE POLICY "Super admins can manage savings categories" ON public.savings_categories
  FOR ALL TO authenticated USING (has_role('super_admin'::text)) WITH CHECK (has_role('super_admin'::text));
CREATE POLICY "Super admins can manage deposit categories" ON public.deposit_categories
  FOR ALL TO authenticated USING (has_role('super_admin'::text)) WITH CHECK (has_role('super_admin'::text));
CREATE POLICY "Super admins can manage expense categories" ON public.expense_categories
  FOR ALL TO authenticated USING (has_role('super_admin'::text)) WITH CHECK (has_role('super_admin'::text));

-- 4) Realtime channel authorization: only authenticated users can subscribe/broadcast
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated can use realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
