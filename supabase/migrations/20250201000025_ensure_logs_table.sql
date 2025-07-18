-- Ensure logs table exists with proper structure for activity logging

-- Create logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    action text NOT NULL,
    table_name text,
    record_id text,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Ensure RLS is enabled
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own logs" ON public.logs;
DROP POLICY IF EXISTS "Super admins can view all logs" ON public.logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.logs;

-- Create RLS policies
CREATE POLICY "Users can view own logs" ON public.logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all logs" ON public.logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "System can insert logs" ON public.logs
    FOR INSERT WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT ON public.logs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_action ON public.logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_table_name ON public.logs(table_name);

-- Create function to log user activities
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_action text,
    p_table_name text DEFAULT NULL,
    p_record_id text DEFAULT NULL,
    p_old_values jsonb DEFAULT NULL,
    p_new_values jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        p_action,
        p_table_name,
        p_record_id,
        p_old_values,
        p_new_values
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_user_activity TO authenticated;

-- Add some sample log entries for testing (only if table is empty)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.logs LIMIT 1) THEN
        INSERT INTO public.logs (user_id, action, table_name, record_id)
        SELECT 
            auth.uid(),
            'system_initialization',
            'logs',
            'initial'
        WHERE auth.uid() IS NOT NULL;
        
        RAISE NOTICE 'Sample log entry created for testing';
    ELSE
        RAISE NOTICE 'Logs table already contains data';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.logs IS 'Activity logs for user actions and system events';
COMMENT ON COLUMN public.logs.action IS 'Description of the action performed';
COMMENT ON COLUMN public.logs.table_name IS 'Table affected by the action';
COMMENT ON COLUMN public.logs.record_id IS 'ID of the record affected';
COMMENT ON COLUMN public.logs.old_values IS 'Previous values before update';
COMMENT ON COLUMN public.logs.new_values IS 'New values after update';

-- Final notification
DO $$
BEGIN
    RAISE NOTICE 'Logs table setup completed successfully!';
    RAISE NOTICE 'Activity logging is now available for the application.';
END $$;
