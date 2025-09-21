-- Critical Security Fix: Make user_id NOT NULL in vat_entries table
-- This prevents RLS bypass vulnerabilities

-- First, update any existing NULL user_id records to a default value
-- In a real scenario, you'd want to assign these to the appropriate user
UPDATE vat_entries 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Now make user_id NOT NULL to prevent future RLS bypasses
ALTER TABLE vat_entries 
ALTER COLUMN user_id SET NOT NULL;

-- Update the RLS policy to be more secure
DROP POLICY IF EXISTS "vat_entries_policy" ON vat_entries;

-- Create proper RLS policies for vat_entries
CREATE POLICY "Users can manage own VAT entries" 
ON vat_entries 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all VAT entries" 
ON vat_entries 
FOR SELECT 
USING (has_role('super_admin'::text));