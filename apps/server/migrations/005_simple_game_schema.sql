-- 운영에 필요한 값만 열로 꺼내고, 세부 경기/문제 데이터는 JSONB 스냅샷으로 보존한다.
-- 기존 테이블을 삭제하지 않는 확장형 마이그레이션이다.

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_end_reason_check;

ALTER TABLE matches
  ADD CONSTRAINT matches_end_reason_check
  CHECK (end_reason IN ('COMPLETED', 'TIMEOUT', 'FORFEIT', 'MISTAKE_LIMIT', 'CANCELLED'));

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'STANDARD'
    CHECK (mode IN ('STANDARD', 'SPRINT', 'SURVIVAL')),
  ADD COLUMN IF NOT EXISTS difficulty TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (difficulty IN ('EASY', 'NORMAL', 'HARD')),
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 180
    CHECK (duration_seconds > 0),
  ADD COLUMN IF NOT EXISTS total_puzzle_count INTEGER NOT NULL DEFAULT 0
    CHECK (total_puzzle_count >= 0),
  ADD COLUMN IF NOT EXISTS total_difference_count INTEGER NOT NULL DEFAULT 0
    CHECK (total_difference_count >= 0),
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS final_state JSONB;

ALTER TABLE match_players
  ADD COLUMN IF NOT EXISTS result TEXT
    CHECK (result IN ('WIN', 'LOSE', 'DRAW', 'CANCELLED')),
  ADD COLUMN IF NOT EXISTS completed_puzzle_count INTEGER NOT NULL DEFAULT 0
    CHECK (completed_puzzle_count >= 0),
  ADD COLUMN IF NOT EXISTS total_found_count INTEGER NOT NULL DEFAULT 0
    CHECK (total_found_count >= 0),
  ADD COLUMN IF NOT EXISTS score NUMERIC(12, 1) NOT NULL DEFAULT 0
    CHECK (score >= 0),
  ADD COLUMN IF NOT EXISTS time_bonus NUMERIC(12, 1) NOT NULL DEFAULT 0
    CHECK (time_bonus >= 0),
  ADD COLUMN IF NOT EXISTS best_streak INTEGER NOT NULL DEFAULT 0
    CHECK (best_streak >= 0),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS found_ids_by_puzzle JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 퍼즐 편집/교체 시 코드 테이블을 바꾸지 않고 새 버전을 추가할 수 있는 카탈로그다.
-- 경기에 사용된 정확한 버전과 정답은 matches.puzzle_manifest에 계속 스냅샷으로 남긴다.
CREATE TABLE IF NOT EXISTS puzzle_catalog (
  pair_id TEXT NOT NULL,
  asset_version TEXT NOT NULL,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (difficulty IN ('EASY', 'NORMAL', 'HARD')),
  original_asset_key TEXT NOT NULL,
  modified_asset_key TEXT NOT NULL,
  differences JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pair_id, asset_version),
  CHECK (jsonb_typeof(differences) = 'array' AND jsonb_array_length(differences) > 0)
);

CREATE INDEX IF NOT EXISTS matches_ended_at_idx ON matches (ended_at DESC);
CREATE INDEX IF NOT EXISTS matches_mode_difficulty_idx ON matches (mode, difficulty, ended_at DESC);
CREATE INDEX IF NOT EXISTS match_players_player_id_idx ON match_players (player_id, match_id);
CREATE INDEX IF NOT EXISTS reports_status_created_at_idx ON reports (status, created_at);
CREATE INDEX IF NOT EXISTS guest_sessions_updated_at_idx ON guest_sessions (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS puzzle_catalog_one_active_version_idx
  ON puzzle_catalog (pair_id) WHERE is_active;

-- Supabase API에서 서버 전용 테이블이 자동 노출되지 않도록 한다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON guest_sessions, matches, match_players, reports, active_matches, puzzle_catalog FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON guest_sessions, matches, match_players, reports, active_matches, puzzle_catalog FROM authenticated;
  END IF;
END
$$;
