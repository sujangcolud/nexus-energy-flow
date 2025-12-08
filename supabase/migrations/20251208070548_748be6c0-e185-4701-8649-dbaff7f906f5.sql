-- Add UPDATE and DELETE policies for all transaction tables

-- Orders table
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders" 
ON public.orders FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
CREATE POLICY "Users can delete their own orders" 
ON public.orders FOR DELETE 
USING (auth.uid() = user_id);

-- Expenses table
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
CREATE POLICY "Users can update their own expenses" 
ON public.expenses FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
CREATE POLICY "Users can delete their own expenses" 
ON public.expenses FOR DELETE 
USING (auth.uid() = user_id);

-- Deposits table
DROP POLICY IF EXISTS "Users can update their own deposits" ON public.deposits;
CREATE POLICY "Users can update their own deposits" 
ON public.deposits FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own deposits" ON public.deposits;
CREATE POLICY "Users can delete their own deposits" 
ON public.deposits FOR DELETE 
USING (auth.uid() = user_id);

-- Withdrawals table
DROP POLICY IF EXISTS "Users can update their own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can update their own withdrawals" 
ON public.withdrawals FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can delete their own withdrawals" 
ON public.withdrawals FOR DELETE 
USING (auth.uid() = user_id);

-- Charging sessions table
DROP POLICY IF EXISTS "Users can update their own charging sessions" ON public.charging_sessions;
CREATE POLICY "Users can update their own charging sessions" 
ON public.charging_sessions FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own charging sessions" ON public.charging_sessions;
CREATE POLICY "Users can delete their own charging sessions" 
ON public.charging_sessions FOR DELETE 
USING (auth.uid() = user_id);

-- Cooperative savings table
DROP POLICY IF EXISTS "Users can update their own cooperative savings" ON public.cooperative_savings;
CREATE POLICY "Users can update their own cooperative savings" 
ON public.cooperative_savings FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cooperative savings" ON public.cooperative_savings;
CREATE POLICY "Users can delete their own cooperative savings" 
ON public.cooperative_savings FOR DELETE 
USING (auth.uid() = user_id);

-- Share investments table
DROP POLICY IF EXISTS "Users can update their own share investments" ON public.share_investments;
CREATE POLICY "Users can update their own share investments" 
ON public.share_investments FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own share investments" ON public.share_investments;
CREATE POLICY "Users can delete their own share investments" 
ON public.share_investments FOR DELETE 
USING (auth.uid() = user_id);

-- VAT entries table
DROP POLICY IF EXISTS "Users can update their own VAT entries" ON public.vat_entries;
CREATE POLICY "Users can update their own VAT entries" 
ON public.vat_entries FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own VAT entries" ON public.vat_entries;
CREATE POLICY "Users can delete their own VAT entries" 
ON public.vat_entries FOR DELETE 
USING (auth.uid() = user_id);

-- Inventory table
DROP POLICY IF EXISTS "Users can update their own inventory" ON public.inventory;
CREATE POLICY "Users can update their own inventory" 
ON public.inventory FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own inventory" ON public.inventory;
CREATE POLICY "Users can delete their own inventory" 
ON public.inventory FOR DELETE 
USING (auth.uid() = user_id);

-- Inventory transactions table
DROP POLICY IF EXISTS "Users can update their own inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Users can update their own inventory transactions" 
ON public.inventory_transactions FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own inventory transactions" ON public.inventory_transactions;
CREATE POLICY "Users can delete their own inventory transactions" 
ON public.inventory_transactions FOR DELETE 
USING (auth.uid() = user_id);

-- Expense bookings table
DROP POLICY IF EXISTS "Users can update their own expense bookings" ON public.expense_bookings;
CREATE POLICY "Users can update their own expense bookings" 
ON public.expense_bookings FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own expense bookings" ON public.expense_bookings;
CREATE POLICY "Users can delete their own expense bookings" 
ON public.expense_bookings FOR DELETE 
USING (auth.uid() = user_id);

-- Opening balances table
DROP POLICY IF EXISTS "Users can update their own opening balances" ON public.opening_balances;
CREATE POLICY "Users can update their own opening balances" 
ON public.opening_balances FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own opening balances" ON public.opening_balances;
CREATE POLICY "Users can delete their own opening balances" 
ON public.opening_balances FOR DELETE 
USING (auth.uid() = user_id);

-- Balances table
DROP POLICY IF EXISTS "Users can update their own balances" ON public.balances;
CREATE POLICY "Users can update their own balances" 
ON public.balances FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own balances" ON public.balances;
CREATE POLICY "Users can delete their own balances" 
ON public.balances FOR DELETE 
USING (auth.uid() = user_id);

-- Reports table
DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
CREATE POLICY "Users can update their own reports" 
ON public.reports FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reports" ON public.reports;
CREATE POLICY "Users can delete their own reports" 
ON public.reports FOR DELETE 
USING (auth.uid() = user_id);

-- Edit logs table
DROP POLICY IF EXISTS "Users can update their own edit logs" ON public.edit_logs;
CREATE POLICY "Users can update their own edit logs" 
ON public.edit_logs FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own edit logs" ON public.edit_logs;
CREATE POLICY "Users can delete their own edit logs" 
ON public.edit_logs FOR DELETE 
USING (auth.uid() = user_id);

-- Logs table
DROP POLICY IF EXISTS "Users can update their own logs" ON public.logs;
CREATE POLICY "Users can update their own logs" 
ON public.logs FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own logs" ON public.logs;
CREATE POLICY "Users can delete their own logs" 
ON public.logs FOR DELETE 
USING (auth.uid() = user_id);