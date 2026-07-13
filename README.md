# Trivia Night

Host a family trivia round: write questions with hidden answers, everyone
submits sealed guesses, then close the round to reveal, grade, and crown a
winner.

- **Storage:** D1 (`rounds`, `questions`, `guesses`, `gradings`)
- **Enforcement highlights:**
  - `rounds` — `write_owner_only`: only the host can open/close/edit.
  - `questions` — host-only INSERT (`insert_only_by_parent_column_member`);
    `correct_answer` masked to the host via `column_read_acls` (the hub also
    rejects WHERE/ORDER BY probing of the masked column).
  - `guesses` — `sealed_until` the round closes; one per member per question;
    `frozen_when` closed.
  - `gradings` — host-only INSERT; scoreboard derives from these.
- **AI:** none.

## Develop

```bash
make install
make dev
make test
make build
```
