/**
 * Pure business logic for the Trivia Night app.
 * No DOM, no fetch — importable in both browser and test environments.
 */

/**
 * Whether `me` may manage (edit/open/close/grade) a round.
 * Mirrors the hub policy exactly: rounds are write_owner_only, so ONLY the
 * host — adults get no bypass — may write. Do not widen this gate.
 */
export function isHost(round, me) {
  return !!me && !!round && round.created_by === me.id;
}

export const ROUND_STATUSES = ["draft", "open", "closed"];

export function statusLabel(status) {
  return { draft: "Draft", open: "Open — take your guesses", closed: "Closed — revealed" }[status] ?? status;
}

/** Rounds newest first; non-hosts shouldn't see other people's drafts in the UI. */
export function visibleRounds(rounds, me) {
  return [...rounds]
    .filter((r) => r.status !== "draft" || isHost(r, me))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

/** Questions of a round in play order. */
export function roundQuestions(questions, roundId) {
  return questions
    .filter((q) => q.round_id === roundId)
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || String(a.created_at).localeCompare(String(b.created_at)));
}

/** The caller-visible guess for (question, member); undefined when none. */
export function guessFor(guesses, questionId, memberId) {
  return guesses.find((g) => g.question_id === questionId && g.member_id === memberId);
}

/** Count of my answered questions in a round. */
export function answeredCount(guesses, questions, roundId, memberId) {
  const qids = new Set(roundQuestions(questions, roundId).map((q) => q.id));
  return guesses.filter((g) => g.member_id === memberId && qids.has(g.question_id)).length;
}

/**
 * Scoreboard rows [{ member_id, points, correct }] from gradings, sorted by
 * points desc. Gradings reference guesses; the guess supplies the member.
 */
export function scoreboard(gradings, guesses, roundId) {
  const guessById = new Map(guesses.map((g) => [g.id, g]));
  const totals = new Map();
  for (const gr of gradings) {
    if (gr.round_id !== roundId) continue;
    const guess = guessById.get(gr.guess_id);
    if (!guess) continue;
    const cur = totals.get(guess.member_id) ?? { member_id: guess.member_id, points: 0, correct: 0 };
    cur.points += Number(gr.points_awarded) || 0;
    cur.correct += Number(gr.correct) ? 1 : 0;
    totals.set(guess.member_id, cur);
  }
  return [...totals.values()].sort((a, b) => b.points - a.points || b.correct - a.correct);
}

/** Grading lookup: guess_id → grading row. */
export function gradingByGuess(gradings, roundId) {
  const map = new Map();
  for (const g of gradings) if (g.round_id === roundId) map.set(g.guess_id, g);
  return map;
}

/** Simple auto-suggestion for grading: exact-ish text match (trim/case/punct-insensitive). */
export function looksCorrect(guessText, correctAnswer) {
  const norm = (s) => String(s ?? "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const a = norm(guessText);
  const b = norm(correctAnswer);
  return !!a && !!b && a === b;
}

/**
 * Fields the in-app search matches against (see hub-sdk `searchMatch`).
 * A round only carries its title, so the host's name is passed in —
 * "the one Sam hosted" is how an old round gets found.
 */
export function searchableFields(round, hostName = "") {
  return [round.title, hostName];
}
