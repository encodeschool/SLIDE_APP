const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { validateDeck } = require("../src/validate");
const { renderPptx } = require("../src/render-pptx");
const { renderPdf } = require("../src/render-pdf");

const deck = JSON.parse(fs.readFileSync(path.join(__dirname, "../samples/sample-deck.json"), "utf8"));

test("sample deck is valid", () => assert.deepStrictEqual(validateDeck(deck), []));

test("writes a non-empty PPTX file", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "render-pptx-test-"));
  const pptx = await renderPptx(deck, path.join(dir, "deck.pptx"));
  assert.ok(fs.statSync(pptx).size > 0);
});

test("renders italic and underlined text styles", async () => {
  const styledDeck = structuredClone(deck);
  styledDeck.slides[0].elements[0].style.italic = true;
  styledDeck.slides[0].elements[0].style.underline = true;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "render-style-test-"));
  const pptx = await renderPptx(styledDeck, path.join(dir, "styled.pptx"));
  const py = `
import sys, json
from pptx import Presentation
p = Presentation(sys.argv[1])
shape = next(s for s in p.slides[0].shapes if s.has_text_frame and s.text_frame.text)
run = shape.text_frame.paragraphs[0].runs[0]
print(json.dumps({"italic": run.italic, "underline": run.underline}))`;
  assert.deepStrictEqual(
    JSON.parse(execFileSync("python3", ["-c", py, pptx]).toString()),
    { italic: true, underline: true },
  );
});

test("rejects element outside slide", () => {
  const bad = structuredClone(deck);
  bad.slides[0].elements[0].x = 5000;
  assert.ok(validateDeck(bad).some((e) => e.includes("outside slide")));
});

test("PPTX has editable text boxes and PDF has one page per slide", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "render-test-"));
  const pptx = await renderPptx(deck, path.join(dir, "deck.pptx"));
  const pdf = await renderPdf(pptx, dir);

  // Inspect the PPTX with python-pptx: text must be real text frames, not pictures.
  const py = `
import sys, json
from pptx import Presentation
p = Presentation(sys.argv[1])
out = [{"text": [s.text_frame.text for s in sl.shapes if s.has_text_frame and s.text_frame.text],
        "pictures": sum(1 for s in sl.shapes if s.shape_type == 13),
        "notes": sl.notes_slide.notes_text_frame.text if sl.has_notes_slide else ""} for sl in p.slides]
print(json.dumps(out))`;
  const slides = JSON.parse(execFileSync("python3", ["-c", py, pptx]).toString());
  assert.strictEqual(slides.length, 2);
  assert.ok(slides[0].text.includes("Renewable Energy Overview"));
  assert.strictEqual(slides[0].pictures + slides[1].pictures, 0);
  assert.strictEqual(slides[0].notes, "Welcome the audience.");

  const pages = fs.readFileSync(pdf).toString("latin1").match(/\/Type\s*\/Page[^s]/g) || [];
  assert.strictEqual(pages.length, 2);
});
