ALTER TABLE match_players
  DROP CONSTRAINT IF EXISTS match_players_found_count_check;

ALTER TABLE match_players
  ADD CONSTRAINT match_players_found_count_check CHECK (found_count >= 0);