ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "owner_upload_logo" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "owner_update_logo" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "public_read_logo" ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');
