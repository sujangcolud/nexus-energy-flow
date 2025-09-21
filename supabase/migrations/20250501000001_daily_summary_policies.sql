-- Ensure daily_summary has RLS enabled and create policies that allow authenticated users
-- and trigger functions to insert/update the table without violating RLS.

BEGIN;

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS public.daily_summary ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select daily summaries (read access)
CREATE POLICY IF NOT EXISTS "daily_summary_select_all" ON public.daily_summary
  FOR SELECT USING (true);

-- Allow authenticated users to insert daily summaries via triggers/functions
CREATE POLICY IF NOT EXISTS "daily_summary_insert_authenticated" ON public.daily_summary
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users (and secure functions executed by authenticated) to update daily summaries
CREATE POLICY IF NOT EXISTS "daily_summary_update_authenticated" ON public.daily_summary
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow deletion only to super_admins (if function exists), fallback allow authenticated for now
CREATE POLICY IF NOT EXISTS "daily_summary_delete_authenticated" ON public.daily_summary
  FOR DELETE USING (auth.uid() IS NOT NULL);

COMMIT;
