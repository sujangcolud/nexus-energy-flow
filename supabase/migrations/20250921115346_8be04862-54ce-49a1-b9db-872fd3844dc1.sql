-- Fix RLS Disabled in Public Security Issue
-- Enable RLS on tables that currently have it disabled

-- Enable RLS on expense_bookings table
ALTER TABLE expense_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expense_bookings
-- Users can manage their own expense bookings
CREATE POLICY "Users can manage own expense bookings" 
ON expense_bookings 
FOR ALL 
USING (auth.uid() = user_id);

-- Super admins can view all expense bookings
CREATE POLICY "Super admins can view all expense bookings" 
ON expense_bookings 
FOR SELECT 
USING (has_role('super_admin'::text));

-- Enable RLS on order_items table  
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for order_items
-- Users can manage order items for their own orders
CREATE POLICY "Users can manage own order items" 
ON order_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Super admins can view all order items
CREATE POLICY "Super admins can view all order items" 
ON order_items 
FOR SELECT 
USING (has_role('super_admin'::text));