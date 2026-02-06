-- Create storage bucket for biblical reference materials
-- These are used for devotional content generation (bibles, commentaries, lexicons, etc.)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reference-library',
  'reference-library',
  false,
  104857600, -- 100MB per file max
  ARRAY['text/plain', 'text/html', 'text/xml', 'text/csv', 'text/markdown',
        'application/json', 'application/xml', 'application/zip',
        'application/pdf', 'application/octet-stream']
);

-- RLS: Only authenticated users with service role can upload/manage
CREATE POLICY "Service role can manage reference files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'reference-library')
  WITH CHECK (bucket_id = 'reference-library');

-- RLS: Authenticated users can read reference files
CREATE POLICY "Authenticated users can read reference files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reference-library' AND auth.role() = 'authenticated');
