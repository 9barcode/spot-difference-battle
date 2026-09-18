-- puzzle_catalog의 difficulty는 경기 매칭 난이도(NORMAL)가 아니라 에셋 난이도(MEDIUM)를 사용한다.
UPDATE puzzle_catalog SET difficulty = 'MEDIUM' WHERE difficulty = 'NORMAL';

ALTER TABLE puzzle_catalog
  DROP CONSTRAINT IF EXISTS puzzle_catalog_difficulty_check;

ALTER TABLE puzzle_catalog
  ALTER COLUMN difficulty SET DEFAULT 'UNRATED',
  ADD CONSTRAINT puzzle_catalog_difficulty_check
    CHECK (difficulty IN ('UNRATED', 'EASY', 'MEDIUM', 'HARD'));

CREATE OR REPLACE FUNCTION set_puzzle_catalog_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS puzzle_catalog_set_updated_at ON puzzle_catalog;
CREATE TRIGGER puzzle_catalog_set_updated_at
BEFORE UPDATE ON puzzle_catalog
FOR EACH ROW EXECUTE FUNCTION set_puzzle_catalog_updated_at();

-- 한 호출 안에서 기존 버전을 내리고 새 버전을 활성화한다.
CREATE OR REPLACE FUNCTION activate_puzzle_version(
  requested_pair_id TEXT,
  requested_asset_version TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM puzzle_catalog
    WHERE pair_id = requested_pair_id AND asset_version = requested_asset_version
  ) THEN
    RAISE EXCEPTION 'Puzzle version not found: %/%', requested_pair_id, requested_asset_version;
  END IF;

  UPDATE puzzle_catalog
  SET is_active = (asset_version = requested_asset_version)
  WHERE pair_id = requested_pair_id;
END;
$$;

REVOKE ALL ON FUNCTION set_puzzle_catalog_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION activate_puzzle_version(TEXT, TEXT) FROM PUBLIC;
