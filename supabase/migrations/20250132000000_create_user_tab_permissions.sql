-- Create user_tab_permissions table for managing individual user tab access
CREATE TABLE IF NOT EXISTS user_tab_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tab_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one permission per user per tab
    UNIQUE(user_id, tab_id)
);

-- Enable Row Level Security
ALTER TABLE user_tab_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own permissions" ON user_tab_permissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all permissions" ON user_tab_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Create function to initialize default permissions for a user
CREATE OR REPLACE FUNCTION initialize_user_permissions(target_user_id UUID, user_role TEXT)
RETURNS VOID AS $$
DECLARE
    tab_config RECORD;
BEGIN
    -- Define default tab access for each role
    FOR tab_config IN
        SELECT * FROM (VALUES
            ('orders', ARRAY['data_entry', 'super_admin']),
            ('charging', ARRAY['data_entry', 'super_admin']),
            ('expenses', ARRAY['data_entry', 'super_admin']),
            ('deposits', ARRAY['data_entry', 'super_admin']),
            ('withdrawals', ARRAY['data_entry', 'super_admin']),
            ('cooperative', ARRAY['data_entry', 'super_admin']),
            ('share_investments', ARRAY['data_entry', 'super_admin']),
            ('analytics', ARRAY['user', 'data_entry', 'reports_viewer', 'super_admin']),
            ('reports', ARRAY['reports_viewer', 'super_admin']),
            ('reports-view', ARRAY['user', 'reports_viewer', 'super_admin']),
            ('insights', ARRAY['user', 'reports_viewer', 'super_admin']),
            ('data-input', ARRAY['reports_viewer', 'super_admin']),
            ('super_admin_dashboard', ARRAY['super_admin']),
            ('menu', ARRAY['super_admin']),
            ('user_management', ARRAY['super_admin']),
            ('admin_panel', ARRAY['super_admin'])
        ) AS t(tab_id, allowed_roles)
    LOOP
        INSERT INTO user_tab_permissions (user_id, tab_id, enabled)
        VALUES (
            target_user_id,
            tab_config.tab_id,
            user_role = ANY(tab_config.allowed_roles)
        )
        ON CONFLICT (user_id, tab_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has access to a tab
CREATE OR REPLACE FUNCTION user_has_tab_access(target_user_id UUID, tab_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    permission_exists BOOLEAN;
    permission_enabled BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_tab_permissions 
        WHERE user_id = target_user_id AND tab_id = tab_id
    ) INTO permission_exists;
    
    IF NOT permission_exists THEN
        -- If no explicit permission exists, return true (default allow)
        RETURN TRUE;
    END IF;
    
    SELECT enabled FROM user_tab_permissions 
    WHERE user_id = target_user_id AND tab_id = tab_id
    INTO permission_enabled;
    
    RETURN COALESCE(permission_enabled, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function for admin panel
CREATE OR REPLACE FUNCTION create_user_permissions_table()
RETURNS VOID AS $$
BEGIN
    -- This function exists to help create the table if needed
    -- The table creation is already handled above
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tab_permissions_user_id ON user_tab_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tab_permissions_tab_id ON user_tab_permissions(tab_id);
CREATE INDEX IF NOT EXISTS idx_user_tab_permissions_enabled ON user_tab_permissions(enabled);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_tab_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_tab_permissions_updated_at
    BEFORE UPDATE ON user_tab_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_tab_permissions_updated_at();

-- Initialize permissions for existing users
DO $$
DECLARE
    user_record RECORD;
    user_role_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- Get user role
        SELECT role INTO user_role_record FROM user_roles 
        WHERE user_id = user_record.id 
        ORDER BY created_at DESC 
        LIMIT 1;
        
        IF FOUND THEN
            PERFORM initialize_user_permissions(user_record.id, user_role_record.role);
        ELSE
            -- Default to 'user' role if no role found
            PERFORM initialize_user_permissions(user_record.id, 'user');
        END IF;
    END LOOP;
END $$;
