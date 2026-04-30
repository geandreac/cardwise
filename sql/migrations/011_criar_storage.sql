-- ARQUIVO: 011_criar_storage.sql
-- DESCRIÇÃO: Bucket privado para PDFs de faturas
-- ROLLBACK: DELETE FROM storage.buckets WHERE id = 'invoices';

-- Cria o bucket privado
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,                          -- privado — nunca público
  10485760,                       -- 10MB máximo por arquivo
  ARRAY['application/pdf']        -- apenas PDFs
)
ON CONFLICT (id) DO NOTHING;

-- Policy: upload apenas na própria pasta
DROP POLICY IF EXISTS "invoices: upload own" ON storage.objects;
CREATE POLICY "invoices: upload own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'invoices' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: leitura apenas da própria pasta
DROP POLICY IF EXISTS "invoices: read own" ON storage.objects;
CREATE POLICY "invoices: read own" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'invoices' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: exclusão apenas da própria pasta
DROP POLICY IF EXISTS "invoices: delete own" ON storage.objects;
CREATE POLICY "invoices: delete own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'invoices' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

COMMENT ON TABLE storage.objects IS
  'Path convention: {auth_user_id}/{card_id}/{ano}-{mes}.pdf';