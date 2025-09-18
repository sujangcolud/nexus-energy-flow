-- Fix RLS policies for daily_summary table since it's a global summary table, not user-specific
DROP POLICY IF EXISTS "Authenticated users can view daily summaries" ON public.daily_summary;

-- Create more permissive policy for global summary data
CREATE POLICY "All authenticated users can view daily summaries" ON public.daily_summary
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Also check if we need to update recent daily summaries
-- First, let's see the function that should populate daily_summary
-- If there are transactions but daily_summary shows zeros, we need to recalculate