-- This policy allows users to delete their own reports.
-- It checks if the user's ID matches the user_id on the report row.
CREATE POLICY "Users can delete their own reports"
ON public.reports
FOR DELETE
USING (auth.uid() = user_id);
