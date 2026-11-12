const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const JSZip = require("jszip");
const { renderArtifact, artifactHtml } = require("../src/render-artifact");

const quiz = {
  schemaVersion: 1,
  id: "quiz-1",
  type: "quiz",
  title: "Science & nature",
  language: "en",
  sections: [{ id: "intro", heading: "Instructions", body: "Choose an answer." }],
  questions: [{ id: "q1", question: "What is H2O?", options: ["Water", "Oxygen"], answerIndex: 0 }],
};

test("writes an editable DOCX with escaped content and quiz answer key", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-docx-test-"));
  try {
    const output = await renderArtifact(quiz, "docx", directory);
    const zip = await JSZip.loadAsync(fs.readFileSync(output));
    const xml = await zip.file("word/document.xml").async("string");
    assert.match(xml, /Science &amp; nature/);
    assert.match(xml, /What is H2O\?/);
    assert.match(xml, /Answer key: A/);
    assert.ok(zip.file("[Content_Types].xml"));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("PDF source includes printable quiz options without marking the correct choice", () => {
  const html = artifactHtml(quiz);
  assert.match(html, /□ Water/);
  assert.match(html, /Answer key/);
  assert.doesNotMatch(html, /<li>□ Water ✓/);
});

test("printable crossword PDF contains an unfilled cell grid, clues and key", () => {
  const crossword = {
    ...quiz,
    type: "crossword",
    crossword: {
      rows: 3,
      columns: 3,
      entries: [{ id: "e1", clue: "Feline", answer: "CAT", row: 0, column: 0, direction: "across" }],
    },
    questions: undefined,
  };
  const html = artifactHtml(crossword);
  assert.match(html, /Crossword grid/);
  assert.match(html, /border:1px solid #222/);
  assert.match(html, /Feline/);
  assert.match(html, /CAT/);
});

test("renderer rejects non-artifact document shapes", async () => {
  await assert.rejects(() => renderArtifact({ title: "not canonical" }, "docx", os.tmpdir()), /Invalid artifact/);
});
