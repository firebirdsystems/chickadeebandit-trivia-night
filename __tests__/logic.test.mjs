import { describe, it, expect } from "vitest";
import {
  isHost, statusLabel, visibleRounds, roundQuestions, guessFor,
  answeredCount, scoreboard, gradingByGuess, looksCorrect, searchableFields,
} from "../src/logic.js";

const me = { id: "host-1", role: "adult" };
const other = { id: "player-1", role: "adult" };

describe("isHost — must mirror write_owner_only (no adult bypass)", () => {
  const round = { id: "r1", created_by: "host-1" };
  it("true only for the creator", () => {
    expect(isHost(round, me)).toBe(true);
    expect(isHost(round, other)).toBe(false);
    expect(isHost(round, { id: "adult-2", role: "adult" })).toBe(false);
    expect(isHost(round, null)).toBe(false);
  });
});

describe("visibleRounds", () => {
  const rounds = [
    { id: "draft-mine", status: "draft", created_by: "host-1", created_at: "3" },
    { id: "draft-other", status: "draft", created_by: "player-1", created_at: "2" },
    { id: "open", status: "open", created_by: "player-1", created_at: "1" },
  ];
  it("hides other members' drafts, newest first", () => {
    expect(visibleRounds(rounds, me).map((r) => r.id)).toEqual(["draft-mine", "open"]);
    expect(visibleRounds(rounds, other).map((r) => r.id)).toEqual(["draft-other", "open"]);
  });
});

describe("roundQuestions / guessFor / answeredCount", () => {
  const questions = [
    { id: "q2", round_id: "r1", sort_order: 1, created_at: "1" },
    { id: "q1", round_id: "r1", sort_order: 0, created_at: "1" },
    { id: "qx", round_id: "r2", sort_order: 0, created_at: "1" },
  ];
  const guesses = [
    { id: "g1", question_id: "q1", member_id: "player-1" },
    { id: "g2", question_id: "qx", member_id: "player-1" },
  ];
  it("orders by sort_order within the round", () => {
    expect(roundQuestions(questions, "r1").map((q) => q.id)).toEqual(["q1", "q2"]);
  });
  it("finds my guess and counts answered", () => {
    expect(guessFor(guesses, "q1", "player-1")?.id).toBe("g1");
    expect(guessFor(guesses, "q2", "player-1")).toBeUndefined();
    expect(answeredCount(guesses, questions, "r1", "player-1")).toBe(1);
  });
});

describe("scoreboard", () => {
  const guesses = [
    { id: "g1", member_id: "a" },
    { id: "g2", member_id: "b" },
    { id: "g3", member_id: "a" },
  ];
  const gradings = [
    { round_id: "r1", guess_id: "g1", correct: 1, points_awarded: 2 },
    { round_id: "r1", guess_id: "g2", correct: 1, points_awarded: 3 },
    { round_id: "r1", guess_id: "g3", correct: 0, points_awarded: 0 },
    { round_id: "r2", guess_id: "g1", correct: 1, points_awarded: 99 },
  ];
  it("totals per member for the round only, sorted by points", () => {
    const rows = scoreboard(gradings, guesses, "r1");
    expect(rows).toEqual([
      { member_id: "b", points: 3, correct: 1 },
      { member_id: "a", points: 2, correct: 1 },
    ]);
  });
  it("gradingByGuess indexes the round's gradings", () => {
    expect(gradingByGuess(gradings, "r1").get("g2")?.points_awarded).toBe(3);
    expect(gradingByGuess(gradings, "r1").has("g4")).toBe(false);
  });
});

describe("looksCorrect", () => {
  it("normalizes case, spacing, punctuation", () => {
    expect(looksCorrect("  jupiter ", "Jupiter")).toBe(true);
    expect(looksCorrect("nineteen-sixty nine", "nineteen sixty nine")).toBe(true);
    expect(looksCorrect("Saturn", "Jupiter")).toBe(false);
    expect(looksCorrect("", "Jupiter")).toBe(false);
  });
});

describe("statusLabel", () => {
  it("labels all statuses", () => {
    expect(statusLabel("draft")).toMatch(/Draft/);
    expect(statusLabel("open")).toMatch(/Open/);
    expect(statusLabel("closed")).toMatch(/Closed/);
  });
});

describe("searchableFields", () => {
  it("matches on the host name passed in alongside the round title", () => {
    const fields = searchableFields({ title: "Christmas quiz" }, "Sam");
    expect(fields).toContain("Christmas quiz");
    expect(fields).toContain("Sam");
  });
});
