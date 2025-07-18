-- Add the category column to the charging_sessions table
ALTER TABLE charging_sessions
ADD COLUMN category TEXT;

-- Add a foreign key constraint to the charging_categories table
ALTER TABLE charging_sessions
ADD CONSTRAINT fk_charging_category
FOREIGN KEY (category)
REFERENCES charging_categories(name);
