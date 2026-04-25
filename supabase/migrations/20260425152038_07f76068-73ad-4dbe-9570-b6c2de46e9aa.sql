-- Allow all authenticated users to view, edit, and delete data across all accounts
-- on transactional tables. user_id is preserved for audit/tracking purposes.

-- Helper: drop+recreate shared policies for a table
-- ORDERS
DROP POLICY IF EXISTS "Super users can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can manage own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Authenticated can view all orders" ON public.orders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all orders" ON public.orders FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all orders" ON public.orders FOR DELETE USING (auth.uid() IS NOT NULL);

-- ORDER ITEMS
DROP POLICY IF EXISTS "Super admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can manage own order items" ON public.order_items;
CREATE POLICY "Authenticated can view all order items" ON public.order_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert order items" ON public.order_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update order items" ON public.order_items FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete order items" ON public.order_items FOR DELETE USING (auth.uid() IS NOT NULL);

-- CHARGING SESSIONS
DROP POLICY IF EXISTS "Super users can view all charging sessions" ON public.charging_sessions;
DROP POLICY IF EXISTS "Users can delete their own charging sessions" ON public.charging_sessions;
DROP POLICY IF EXISTS "Users can manage own charging sessions" ON public.charging_sessions;
DROP POLICY IF EXISTS "Users can update their own charging sessions" ON public.charging_sessions;
CREATE POLICY "Authenticated can view all charging sessions" ON public.charging_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert charging sessions" ON public.charging_sessions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all charging sessions" ON public.charging_sessions FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all charging sessions" ON public.charging_sessions FOR DELETE USING (auth.uid() IS NOT NULL);

-- EXPENSES
DROP POLICY IF EXISTS "Super users can view all expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
CREATE POLICY "Authenticated can view all expenses" ON public.expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert expenses" ON public.expenses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all expenses" ON public.expenses FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all expenses" ON public.expenses FOR DELETE USING (auth.uid() IS NOT NULL);

-- DEPOSITS
DROP POLICY IF EXISTS "Super users can view all deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can delete their own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can manage own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can update their own deposits" ON public.deposits;
CREATE POLICY "Authenticated can view all deposits" ON public.deposits FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all deposits" ON public.deposits FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all deposits" ON public.deposits FOR DELETE USING (auth.uid() IS NOT NULL);

-- COOPERATIVE SAVINGS
DROP POLICY IF EXISTS "Super users can view all cooperative savings" ON public.cooperative_savings;
DROP POLICY IF EXISTS "Users can delete their own cooperative savings" ON public.cooperative_savings;
DROP POLICY IF EXISTS "Users can manage own cooperative savings" ON public.cooperative_savings;
DROP POLICY IF EXISTS "Users can update their own cooperative savings" ON public.cooperative_savings;
CREATE POLICY "Authenticated can view all cooperative savings" ON public.cooperative_savings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert cooperative savings" ON public.cooperative_savings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all cooperative savings" ON public.cooperative_savings FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all cooperative savings" ON public.cooperative_savings FOR DELETE USING (auth.uid() IS NOT NULL);

-- WITHDRAWALS
DROP POLICY IF EXISTS "Super users can view all withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can delete their own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can manage own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can update their own withdrawals" ON public.withdrawals;
CREATE POLICY "Authenticated can view all withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all withdrawals" ON public.withdrawals FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all withdrawals" ON public.withdrawals FOR DELETE USING (auth.uid() IS NOT NULL);

-- INVENTORY
DROP POLICY IF EXISTS "Users can delete their own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON public.inventory;
DROP POLICY IF EXISTS "inventory_user_policy" ON public.inventory;
CREATE POLICY "Authenticated can view all inventory" ON public.inventory FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert inventory" ON public.inventory FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all inventory" ON public.inventory FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all inventory" ON public.inventory FOR DELETE USING (auth.uid() IS NOT NULL);

-- INVENTORY TRANSACTIONS
DROP POLICY IF EXISTS "Users can delete their own inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Users can update their own inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "inventory_transactions_user_policy" ON public.inventory_transactions;
CREATE POLICY "Authenticated can view all inventory transactions" ON public.inventory_transactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert inventory transactions" ON public.inventory_transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all inventory transactions" ON public.inventory_transactions FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all inventory transactions" ON public.inventory_transactions FOR DELETE USING (auth.uid() IS NOT NULL);

-- VAT ENTRIES
DROP POLICY IF EXISTS "Super admins can view all VAT entries" ON public.vat_entries;
DROP POLICY IF EXISTS "Users can delete their own VAT entries" ON public.vat_entries;
DROP POLICY IF EXISTS "Users can manage own VAT entries" ON public.vat_entries;
DROP POLICY IF EXISTS "Users can update their own VAT entries" ON public.vat_entries;
CREATE POLICY "Authenticated can view all VAT entries" ON public.vat_entries FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert VAT entries" ON public.vat_entries FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all VAT entries" ON public.vat_entries FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all VAT entries" ON public.vat_entries FOR DELETE USING (auth.uid() IS NOT NULL);

-- SHARE INVESTMENTS
DROP POLICY IF EXISTS "Users can delete their own share investments" ON public.share_investments;
DROP POLICY IF EXISTS "Users can manage own share investments" ON public.share_investments;
DROP POLICY IF EXISTS "Users can update their own share investments" ON public.share_investments;
CREATE POLICY "Authenticated can view all share investments" ON public.share_investments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert share investments" ON public.share_investments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all share investments" ON public.share_investments FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all share investments" ON public.share_investments FOR DELETE USING (auth.uid() IS NOT NULL);

-- SHARE EXPENSES
DROP POLICY IF EXISTS "Users can delete their own share expenses" ON public.share_expenses;
DROP POLICY IF EXISTS "Users can manage own share expenses" ON public.share_expenses;
DROP POLICY IF EXISTS "Users can update their own share expenses" ON public.share_expenses;
CREATE POLICY "Authenticated can view all share expenses" ON public.share_expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert share expenses" ON public.share_expenses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all share expenses" ON public.share_expenses FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all share expenses" ON public.share_expenses FOR DELETE USING (auth.uid() IS NOT NULL);

-- EXPENSE BOOKINGS
DROP POLICY IF EXISTS "Super admins can view all expense bookings" ON public.expense_bookings;
DROP POLICY IF EXISTS "Users can delete their own expense bookings" ON public.expense_bookings;
DROP POLICY IF EXISTS "Users can manage own expense bookings" ON public.expense_bookings;
DROP POLICY IF EXISTS "Users can update their own expense bookings" ON public.expense_bookings;
CREATE POLICY "Authenticated can view all expense bookings" ON public.expense_bookings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert expense bookings" ON public.expense_bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all expense bookings" ON public.expense_bookings FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all expense bookings" ON public.expense_bookings FOR DELETE USING (auth.uid() IS NOT NULL);

-- STATIC EXPENSES
DROP POLICY IF EXISTS "Users can manage own static expenses" ON public.static_expenses;
CREATE POLICY "Authenticated can view all static expenses" ON public.static_expenses FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can insert static expenses" ON public.static_expenses FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update all static expenses" ON public.static_expenses FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can delete all static expenses" ON public.static_expenses FOR DELETE USING (auth.uid() IS NOT NULL);