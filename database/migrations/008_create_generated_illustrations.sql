-- Generated illustrations metadata
CREATE TABLE IF NOT EXISTS generated_illustrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  section_key TEXT NOT NULL,
  style_preset TEXT NOT NULL,
  prompt TEXT NOT NULL,
  provider TEXT NOT NULL,
  asset_url TEXT NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'generated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS generated_illustrations_page_created_idx
  ON generated_illustrations (page, created_at DESC);

CREATE INDEX IF NOT EXISTS generated_illustrations_section_created_idx
  ON generated_illustrations (section_key, created_at DESC);
