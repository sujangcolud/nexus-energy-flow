-- Fix for PGRST204 schema cache error
-- Run this in your Supabase SQL Editor

-- First, let's ensure the orders table has the correct structure
-- Drop and recreate the orders table to force schema cache refresh

-- Backup existing data first
CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders;

-- Drop the existing table
DROP TABLE IF EXISTS orders CASCADE;

-- Recreate orders table with proper structure
CREATE TABLE orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  rate DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_mode TEXT NOT NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  date DATE DEFAULT CURRENT_DATE, -- Compatibility field
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own orders" ON orders 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own orders" ON orders 
FOR ALL USING (auth.uid() = user_id);

-- Restore data if backup exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders_backup') THEN
    INSERT INTO orders (
      id, user_id, item_name, quantity, rate, total, 
      payment_mode, order_date, date, created_at
    )
    SELECT 
      id, user_id, item_name, quantity, rate, total,
      payment_mode, 
      COALESCE(order_date, date, CURRENT_DATE) as order_date,
      COALESCE(date, order_date, CURRENT_DATE) as date,
      created_at
    FROM orders_backup;
    
    DROP TABLE orders_backup;
  END IF;
END $$;

-- Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Test the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' 
ORDER BY ordinal_position;
