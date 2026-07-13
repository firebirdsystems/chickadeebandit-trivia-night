-- Trivia Night — host-run rounds with hidden answers and sealed guesses.
--
-- The security model (manifest.json), per table:
--
-- `rounds`: owner_or_visibility with write_owner_only — every member sees
-- every round, but ONLY the host (created_by) may edit or close their round.
-- Closing is the reveal trigger, so it must not be forgeable by players.
--
-- `questions`: inherit_visibility from rounds, with
-- insert_only_by_parent_column_member = rounds.created_by — only the round's
-- host may add questions (enforced by the hub even for raw SQL), and
-- column_read_acls masks `correct_answer` to the owner (the host): players
-- see the prompt but the hub returns NULL for the answer, and rejects any
-- WHERE/ORDER BY probing of it. After grading, the host copies the answer
-- into `revealed_answer` (a normal column) so everyone can see it.
--
-- `guesses`: sealed_until — a player sees only their own guess until the
-- round's status is 'closed', then all guesses release at once. One guess per
-- member per question (max_per_member) and no edits after close (frozen_when).
--
-- `gradings`: inherit_visibility with host-only INSERT (same parent-column
-- gate as questions). One row per graded guess; scores derive from these.
--
-- All enum-ish columns used by policies are hub built-ins (`status`) or
-- integers, so no db_plaintext_columns are needed. Prompts, answers, and
-- guesses stay encrypted at rest.
CREATE TABLE IF NOT EXISTS app_trivia_night__rounds (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,                    -- "Friday Night Trivia #3"
  status     TEXT NOT NULL DEFAULT 'draft',    -- draft|open|closed
  visibility TEXT NOT NULL DEFAULT 'everyone',
  created_by TEXT NOT NULL,                    -- the host
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_trivia_night__questions (
  id              TEXT PRIMARY KEY,
  round_id        TEXT NOT NULL,
  prompt          TEXT NOT NULL,
  correct_answer  TEXT NOT NULL DEFAULT '',    -- masked to the host via column_read_acls
  revealed_answer TEXT NOT NULL DEFAULT '',    -- host copies the answer here at reveal
  points          INTEGER NOT NULL DEFAULT 1 CHECK (points > 0),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_by      TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  FOREIGN KEY (round_id) REFERENCES app_trivia_night__rounds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_trivia_night__guesses (
  id          TEXT PRIMARY KEY,
  round_id    TEXT NOT NULL,
  question_id TEXT NOT NULL,
  member_id   TEXT NOT NULL,
  guess_text  TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (round_id) REFERENCES app_trivia_night__rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES app_trivia_night__questions(id) ON DELETE CASCADE,
  UNIQUE (question_id, member_id)
);

CREATE TABLE IF NOT EXISTS app_trivia_night__gradings (
  id             TEXT PRIMARY KEY,
  round_id       TEXT NOT NULL,
  guess_id       TEXT NOT NULL,
  correct        INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
  graded_by      TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  FOREIGN KEY (round_id) REFERENCES app_trivia_night__rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (guess_id) REFERENCES app_trivia_night__guesses(id) ON DELETE CASCADE,
  UNIQUE (guess_id)
);

CREATE INDEX IF NOT EXISTS app_trivia_night__questions_round_idx
  ON app_trivia_night__questions (round_id, sort_order);

CREATE INDEX IF NOT EXISTS app_trivia_night__guesses_round_idx
  ON app_trivia_night__guesses (round_id, question_id);

CREATE INDEX IF NOT EXISTS app_trivia_night__gradings_round_idx
  ON app_trivia_night__gradings (round_id);
