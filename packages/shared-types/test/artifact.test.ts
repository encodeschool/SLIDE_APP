import assert from "node:assert/strict";
import test from "node:test";
import { validateArtifact, type ArtifactDocument } from "../src/artifact.ts";

const quiz: ArtifactDocument = {
  schemaVersion: 1,
  id: "quiz-1",
  type: "quiz",
  title: "Science quiz",
  language: "en",
  sections: [{ id: "intro", heading: "Instructions", body: "Choose an answer." }],
  questions: [{ id: "q1", question: "What is H2O?", options: ["Water", "Oxygen"], answerIndex: 0 }],
};

test("validates an interactive quiz and rejects an out-of-range answer", () => {
  assert.deepEqual(validateArtifact(quiz), []);
  const invalid = structuredClone(quiz);
  invalid.questions![0]!.answerIndex = 2;
  assert.ok(validateArtifact(invalid).some((error) => error.includes("question 1")));
});

test("validates crossword entries against the declared grid", () => {
  const crossword: ArtifactDocument = {
    schemaVersion: 1,
    id: "crossword-1",
    type: "crossword",
    title: "Nature",
    language: "en",
    sections: [{ id: "clues", heading: "Clues", body: "Fill the grid." }],
    crossword: { rows: 5, columns: 5, entries: [
      { id: "e1", clue: "Large body of water", answer: "OCEAN", row: 0, column: 0, direction: "across" },
    ] },
  };
  assert.deepEqual(validateArtifact(crossword), []);
  crossword.crossword!.entries[0]!.answer = "OCEANS";
  assert.ok(validateArtifact(crossword).some((error) => error.includes("entry 1")));
  crossword.crossword!.entries[0]!.answer = "OCEAN";
  crossword.crossword!.entries.push({
    id: "e2",
    clue: "Conflicting crossing",
    answer: "AXE",
    row: 0,
    column: 0,
    direction: "down",
  });
  assert.ok(validateArtifact(crossword).some((error) => error.includes("conflicts")));
});

test("requires type-specific structures for quiz and crossword", () => {
  assert.ok(validateArtifact({ ...quiz, questions: undefined }).length > 0);
  assert.ok(validateArtifact({ ...quiz, type: "crossword", questions: undefined }).length > 0);
});
