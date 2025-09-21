-- Ensure daily_summary has RLS enabled and create policies that allow authenticated users
-- and trigger functions to insert/update the table without violating RLS.

BEGIN;

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS public.daily_summary ENABLE ROW LEVEL SECURITY;

-- Create/replace policies (DROP + CREATE for compatibility with Postgres versions that don't support IF NOT EXISTS)

DROP POLICY IF EXISTS "daily_summary_select_all" ON public.daily_summary;
CREATE POLICY "daily_summary_select_all" ON public.daily_summary
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "daily_summary_insert_authenticated" ON public.daily_summary;
CREATE POLICY "daily_summary_insert_authenticated" ON public.daily_summary
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "daily_summary_update_authenticated" ON public.daily_summary;
CREATE POLICY "daily_summary_update_authenticated" ON public.daily_summary
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "daily_summary_delete_authenticated" ON public.daily_summary;
CREATE POLICY "daily_summary_delete_authenticated" ON public.daily_summary
  FOR DELETE USING (auth.uid() IS NOT NULL);

COMMIT;
