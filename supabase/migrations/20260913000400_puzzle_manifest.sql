ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS puzzle_manifest JSONB NOT NULL DEFAULT '[]'::jsonb;
