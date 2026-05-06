# Multi-Image Attachments for Financial Records

## Goal

Allow uploading **multiple supporting document images** (optional) on:
- Deposits
- Cooperative Savings
- Withdrawals
- Share Investments
- Expenses
- Expense Bookings

Uploads must work from each module's own add/edit dialog **and** from the Daily Closing Wizard's Reconcile editor.

## Approach

Single, polymorphic attachments system — one bucket, one table, one reusable React component reused across all six modules and the wizard.

## Database

1. **Storage bucket** `record-attachments` (private, authenticated read/write).
2. **Table** `record_attachments`:
   - `record_type` (text: `deposit | withdrawal | cooperative_saving | share_investment | expense | expense_booking`)
   - `record_id` (uuid)
   - `file_path` (text — bucket path)
   - `file_name`, `mime_type`, `size_bytes`
   - `uploaded_by` (uuid), `created_at`
   - Index on (record_type, record_id)
3. **RLS**:
   - SELECT: any authenticated user (matches existing financial-table read model in security memory).
   - INSERT/UPDATE/DELETE: super_admin only (matches existing write model on the parent tables).
4. **Storage policies**: same model — authenticated read, super_admin write. File paths namespaced as `{record_type}/{record_id}/{uuid}-{filename}`.

## Reusable component

`src/components/RecordAttachments.tsx`:
- Props: `recordType`, `recordId`, `disabled?`
- Lists existing attachments (thumbnail + filename + delete button).
- Lets user pick multiple images (`accept="image/*"`, `multiple`).
- Uploads to Storage, inserts rows into `record_attachments`.
- Click thumbnail → open signed URL in new tab.
- Image-only validation, 10MB per file cap, friendly toasts.

A lighter `RecordAttachmentsPicker` variant for **add** flows (where the record doesn't exist yet): collects File[] in local state, then on parent `onSaved(recordId)` performs the uploads.

## Integration points

For each of the 6 modules, in their existing **edit dialog**:
- Embed `<RecordAttachments recordType="..." recordId={editing.id} />` below the form fields.

For each module's **add/create flow** (single-entry dialogs only — bulk-add stays as-is for now):
- Embed `<RecordAttachmentsPicker />`; on successful insert use returned id to upload.

In **`DayEntriesEditor.tsx`** (Daily Closing Wizard → Reconcile):
- Below the inline edit form for each section (orders excluded per scope), render `<RecordAttachments recordType=... recordId=row.id />` when a row is in edit mode.

Modules touched:
- `src/components/tabs/DepositsTab.tsx`
- `src/components/tabs/WithdrawalsTab.tsx`
- `src/components/tabs/CooperativeSavingsTab.tsx`
- `src/components/tabs/ShareInvestmentsTab.tsx`
- `src/components/tabs/ExpensesTab.tsx`
- `src/components/tabs/ExpenseBookingsTab.tsx`
- `src/components/DayEntriesEditor.tsx`

## Out of scope (to keep this focused)

- Bulk-add dialogs (`MultiDepositEntry`, etc.) — attachments only via single-entry / edit, since the user emphasized "while editing".
- Orders / Charging Sessions / VAT — not in the requested list.
- PDF support — request says "pics/images". Easy to extend later by relaxing the accept filter.

## Technical notes

- Uses existing Supabase client; signed URLs (1 hour) for previewing private files.
- Deletes remove both the storage object and the DB row.
- Component is fully self-contained so future modules can adopt it with one line.

---

Shall I proceed with this plan?
