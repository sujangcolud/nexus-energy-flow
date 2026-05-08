# Testing Strategy - Expenses & Inventory Integration

This document outlines the testing strategy for verifying the integration between the Expenses and Inventory modules.

## 1. Database Layer Testing (RPC)

### Test Case: Successful Inventory Purchase
- **Action**: Call `process_inventory_expense` with `p_is_inventory_purchase = true`.
- **Expected Results**:
  - A new record in `expenses` table.
  - `inventory.quantity` increased by `p_quantity`.
  - A new record in `inventory_transactions` with `transaction_type = 'stock_in'`.
  - RPC returns the new expense ID.

### Test Case: Normal Expense (No Inventory)
- **Action**: Call `process_inventory_expense` with `p_is_inventory_purchase = false`.
- **Expected Results**:
  - A new record in `expenses` table.
  - NO change in `inventory` table.
  - NO record in `inventory_transactions`.

### Test Case: Transaction Atomicity
- **Action**: Attempt to call RPC with valid expense data but an invalid `inventory_item_id`.
- **Expected Results**:
  - The entire operation should fail (Foreign Key violation).
  - NO record created in `expenses`.

## 2. Frontend Layer Testing

### Test Case: Toggle Logic
- **Action**: Toggle "Inventory Purchase" in the Expense Form.
- **Expected Results**: Additional fields (Inventory Item, Quantity, etc.) should appear/disappear.

### Test Case: Auto-Calculation
- **Action**: Fill in "Quantity" and "Cost per Unit".
- **Expected Results**: The "Amount" field should automatically update to `Quantity * Cost per Unit`.

### Test Case: Validation
- **Action**: Submit an inventory purchase without selecting an inventory item.
- **Expected Results**: A toast error message should appear.

## 3. Reporting Verification

### Test Case: History View
- **Action**: View the `inventory_purchase_history` view.
- **Expected Results**: It should show all expenses where `is_inventory_purchase` is true.

### Test Case: Supplier Analytics
- **Action**: View the `supplier_purchase_analytics` view.
- **Expected Results**: It should aggregate data by supplier correctly.
