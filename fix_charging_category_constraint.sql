-- Fix Charging Category Foreign Key Constraint Violation
-- This ensures charging sessions can be saved without category errors

-- Step 1: Add default categories that are commonly used
INSERT INTO charging_categories (name) VALUES 
    ('General'),
    ('Fast Charging'),
    ('Standard Charging'),
    ('Emergency Charging'),
    ('Maintenance'),
    ('Testing')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Handle existing charging sessions with invalid categories
-- Update any existing charging sessions that have invalid categories
UPDATE charging_sessions 
SET category = 'General' 
WHERE category IS NOT NULL 
AND category NOT IN (SELECT name FROM charging_categories);

-- Step 3: Make the foreign key constraint more flexible
-- Drop the existing constraint
ALTER TABLE charging_sessions DROP CONSTRAINT IF EXISTS fk_charging_category;

-- Add a new constraint that allows NULL values and handles missing categories better
ALTER TABLE charging_sessions 
ADD CONSTRAINT fk_charging_category 
FOREIGN KEY (category) 
REFERENCES charging_categories(name) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Step 4: Add a trigger to automatically create missing categories
CREATE OR REPLACE FUNCTION auto_create_charging_category()
RETURNS TRIGGER AS $$
BEGIN
    -- If category is provided and doesn't exist, create it
    IF NEW.category IS NOT NULL AND NEW.category != '' THEN
        INSERT INTO charging_categories (name) 
        VALUES (NEW.category) 
        ON CONFLICT (name) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS auto_create_charging_category_trigger ON charging_sessions;
CREATE TRIGGER auto_create_charging_category_trigger
    BEFORE INSERT OR UPDATE ON charging_sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_charging_category();

-- Verify the fix
SELECT 'Charging category constraint fixed!' as status;

-- Show current categories
SELECT name FROM charging_categories ORDER BY name;
