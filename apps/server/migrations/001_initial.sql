CREATE TABLE IF NOT EXISTS guest_sessions (
  player_id UUID PRIMARY KEY,
  guest_token UUID NOT NULL UNIQUE,
  nickname VARCHAR(16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY,
  image_id TEXT NOT NULL,
  winner_player_id UUID,
  end_reason TEXT NOT NULL CHECK (end_reason IN ('COMPLETED', 'TIMEOUT', 'FORFEIT', 'CANCELLED')),
  state_version INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  nickname VARCHAR(16) NOT NULL,
  found_count SMALLINT NOT NULL CHECK (found_count BETWEEN 0 AND 3),
  wrong_answer_count INTEGER NOT NULL CHECK (wrong_answer_count >= 0),
  hints_used SMALLINT NOT NULL CHECK (hints_used BETWEEN 0 AND 1),
  connection_status TEXT NOT NULL,
  PRIMARY KEY (match_id, player_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  reporter_player_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('UNFAIR', 'INAPPROPRIATE', 'SYSTEM_ERROR', 'OTHER')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'DISMISSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, reporter_player_id)
);
