-- Fix charging_sessions table date column issue
-- Ensures the date column exists and is properly synchronized with session_date

-- First, ensure the charging_sessions table has the required structure
CREATE TABLE IF NOT EXISTS public.charging_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    start_percentage numeric,
    end_percentage numeric,
    per_percent_rate numeric,
    kcal numeric,
    per_unit_rate numeric,
    total_amount numeric NOT NULL,
    payment_mode text NOT NULL DEFAULT 'Cash',
    session_date date DEFAULT CURRENT_DATE,
    date date DEFAULT CURRENT_DATE,
    category text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'charging_sessions' AND column_name = 'date' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.charging_sessions ADD COLUMN date DATE;
        RAISE NOTICE 'Added date column to charging_sessions table';
    END IF;

    -- Add session_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'charging_sessions' AND column_name = 'session_date' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.charging_sessions ADD COLUMN session_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added session_date column to charging_sessions table';
    END IF;
END $$;

-- Sync existing data where date columns are missing
UPDATE public.charging_sessions 
SET date = COALESCE(session_date, created_at::date, CURRENT_DATE)
WHERE date IS NULL;

UPDATE public.charging_sessions 
SET session_date = COALESCE(date, created_at::date, CURRENT_DATE)
WHERE session_date IS NULL;

-- Create or replace the date synchronization function
CREATE OR REPLACE FUNCTION public.sync_charging_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure both date fields are populated and synchronized
    IF TG_OP = 'INSERT' THEN
        NEW.session_date = COALESCE(NEW.session_date, NEW.date, CURRENT_DATE);
        NEW.date = COALESCE(NEW.date, NEW.session_date, CURRENT_DATE);
        NEW.updated_at = now();
    ELSIF TG_OP = 'UPDATE' THEN
        -- Synchronize date fields when one is updated
        IF NEW.session_date IS DISTINCT FROM OLD.session_date THEN
            NEW.date = NEW.session_date;
        END IF;
        IF NEW.date IS DISTINCT FROM OLD.date THEN
            NEW.session_date = NEW.date;
        END IF;
        NEW.updated_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS sync_charging_date_trigger ON public.charging_sessions;
DROP TRIGGER IF EXISTS update_charging_sessions_updated_at ON public.charging_sessions;

-- Create the sync trigger
CREATE TRIGGER sync_charging_date_trigger
    BEFORE INSERT OR UPDATE ON public.charging_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_charging_date();

-- Ensure RLS is enabled
ALTER TABLE public.charging_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can manage own charging sessions" ON public.charging_sessions;
DROP POLICY IF EXISTS "Super admins can manage all charging sessions" ON public.charging_sessions;

-- Create RLS policies
CREATE POLICY "Users can manage own charging sessions" ON public.charging_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all charging sessions" ON public.charging_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charging_sessions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_charging_sessions_user_id ON public.charging_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_date ON public.charging_sessions(date);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_session_date ON public.charging_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_charging_sessions_created_at ON public.charging_sessions(created_at);

-- Add comments for documentation
COMMENT ON TABLE public.charging_sessions IS 'Charging sessions table with synchronized date fields';
COMMENT ON COLUMN public.charging_sessions.date IS 'Date field synchronized with session_date for compatibility';
COMMENT ON COLUMN public.charging_sessions.session_date IS 'Primary session date field';

-- Final notification
DO $$
BEGIN
    RAISE NOTICE 'Charging sessions table date column fix completed successfully!';
    RAISE NOTICE 'Both date and session_date columns are now available and synchronized.';
END $$;
