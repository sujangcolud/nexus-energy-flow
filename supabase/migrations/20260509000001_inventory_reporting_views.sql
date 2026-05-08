-- Inventory Purchase History View
DROP VIEW IF EXISTS public.inventory_purchase_history;

CREATE OR REPLACE VIEW public.inventory_purchase_history AS
SELECT
    e.expense_date,
    e.item_name as expense_description,
    i.item_name as inventory_item_name,
    e.quantity,
    e.unit,
    e.cost_per_unit,
    e.amount as total_cost,
    e.supplier,
    e.invoice_number,
    e.payment_mode,
    e.id as expense_id,
    e.user_id
FROM
    public.expenses e
JOIN
    public.inventory i ON e.inventory_item_id = i.id
WHERE
    e.is_inventory_purchase = true;

GRANT SELECT ON public.inventory_purchase_history TO authenticated;
ALTER VIEW public.inventory_purchase_history SET (security_invoker = true);

-- Supplier Purchase Analytics View
DROP VIEW IF EXISTS public.supplier_purchase_analytics;

CREATE OR REPLACE VIEW public.supplier_purchase_analytics AS
SELECT
    supplier,
    COUNT(*) as total_purchases,
    SUM(amount) as total_spent,
    MIN(expense_date) as first_purchase,
    MAX(expense_date) as last_purchase,
    jsonb_agg(DISTINCT item_name) as items_purchased
FROM
    public.expenses
WHERE
    supplier IS NOT NULL
GROUP BY
    supplier;

GRANT SELECT ON public.supplier_purchase_analytics TO authenticated;
ALTER VIEW public.supplier_purchase_analytics SET (security_invoker = true);
