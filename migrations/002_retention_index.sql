-- Rounds now expire after a year, cascading their questions, guesses and
-- gradings. The runner scans parents by age and deletes by id, then deletes
-- children by round_id; this index covers the parent scan (the child FK indexes
-- from 001 already cover the cascade).
CREATE INDEX IF NOT EXISTS app_trivia_night__rounds_retention_idx
  ON app_trivia_night__rounds (created_at, id);
