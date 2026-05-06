
ALTER TABLE public.record_attachments DROP CONSTRAINT IF EXISTS record_attachments_record_type_check;
ALTER TABLE public.record_attachments ADD CONSTRAINT record_attachments_record_type_check
  CHECK (record_type IN ('deposit','withdrawal','cooperative_saving','share_investment','share_expense','expense','expense_booking'));
