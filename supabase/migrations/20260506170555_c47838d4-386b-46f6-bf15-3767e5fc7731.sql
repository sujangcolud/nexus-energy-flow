
-- Attachments table
CREATE TABLE public.record_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_type TEXT NOT NULL CHECK (record_type IN ('deposit','withdrawal','cooperative_saving','share_investment','expense','expense_booking')),
  record_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_record_attachments_lookup ON public.record_attachments(record_type, record_id);

ALTER TABLE public.record_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view attachments"
  ON public.record_attachments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can insert attachments"
  ON public.record_attachments FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin() AND uploaded_by = auth.uid());

CREATE POLICY "Super admin can update attachments"
  ON public.record_attachments FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admin can delete attachments"
  ON public.record_attachments FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('record-attachments', 'record-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated can read record attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'record-attachments');

CREATE POLICY "Super admin can upload record attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'record-attachments' AND is_super_admin());

CREATE POLICY "Super admin can update record attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'record-attachments' AND is_super_admin());

CREATE POLICY "Super admin can delete record attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'record-attachments' AND is_super_admin());
