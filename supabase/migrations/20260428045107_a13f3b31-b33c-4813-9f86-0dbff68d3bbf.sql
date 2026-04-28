-- Drop the legacy overload that conflicts with the canonical signature used by the app.
DROP FUNCTION IF EXISTS public.daily_closing(closing_date date, user_id_param uuid);

-- Ensure execute rights for the canonical overload.
GRANT EXECUTE ON FUNCTION public.daily_closing(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_reconcile(date) TO authenticated;