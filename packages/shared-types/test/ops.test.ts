import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { apply, History, OpError, type Deck, type Op, type TextElement } from "../src/index.ts";

const load = (): Deck =>
  JSON.parse(readFileSync(new URL("../../../services/presentation-renderer/samples/sample-deck.json", import.meta.url), "utf8"));

const box: TextElement = { id: "n1", type: "text", x: 10, y: 10, w: 200, h: 50, text: "New" };

test("every operation is reversed exactly by its inverse", () => {
  const ops: Op[] = [
    { kind: "addElement", slideId: "s1", element: box, index: 0 },
    { kind: "removeElement", slideId: "s2", elementId: "e4" },
    { kind: "updateElement", slideId: "s1", elementId: "e1", patch: { x: 99, text: "Changed" } },
    { kind: "setNotes", slideId: "s1", notes: "other" },
    { kind: "setBackground", slideId: "s1", color: "#ddeeff" },
    { kind: "setTheme", theme: { background: "#f5f0e8", text: "#292b36", fontBody: "Georgia" } },
    { kind: "moveSlide", slideId: "s1", toIndex: 1 },
    { kind: "removeSlide", slideId: "s2" },
    { kind: "addSlide", slide: { id: "s3", elements: [] }, index: 1 },
  ];
  for (const op of ops) {
    const before = load();
    const { deck: after, inverse } = apply(before, op);
    assert.notDeepEqual(after, before, op.kind);
    assert.deepEqual(apply(after, inverse).deck, before, `inverse of ${op.kind}`);
  }
});

test("apply never mutates its input", () => {
  const d = load();
  const snapshot = structuredClone(d);
  apply(d, { kind: "updateElement", slideId: "s1", elementId: "e1", patch: { x: 1 } });
  assert.deepEqual(d, snapshot);
});

test("theme and font-family edits persist in the canonical deck and undo cleanly", () => {
  const before = load();
  const { deck: themed, inverse } = apply(before, {
    kind: "setTheme",
    theme: { background: "#edf4f8", text: "#203749", fontBody: "Georgia" },
  });
  assert.deepEqual(themed.theme, { background: "#edf4f8", text: "#203749", fontBody: "Georgia" });
  assert.deepEqual(apply(themed, inverse).deck, before);

  const text = before.slides[0]!.elements.find((element) => element.type === "text");
  assert.ok(text && text.type === "text");
  const updated = apply(before, {
    kind: "updateElement",
    slideId: before.slides[0]!.id,
    elementId: text.id,
    patch: { style: { ...text.style, fontFamily: "Montserrat" } },
  }).deck;
  const changedText = updated.slides[0]!.elements.find((element) => element.id === text.id);
  assert.ok(changedText && changedText.type === "text");
  assert.equal(changedText.style?.fontFamily, "Montserrat");
});

test("invalid operations are rejected", () => {
  const d = load();
  assert.throws(() => apply(d, { kind: "removeElement", slideId: "nope", elementId: "x" }), OpError);
  assert.throws(() => apply(d, { kind: "addElement", slideId: "s1", element: { ...box, id: "e1" } }), OpError);
  assert.throws(() => apply(d, { kind: "updateElement", slideId: "s1", elementId: "e1", patch: { id: "z" } }), OpError);
  const single = { ...d, slides: [d.slides[0]!] };
  assert.throws(() => apply(single, { kind: "removeSlide", slideId: "s1" }), OpError);
});

test("history: undo, redo, and new edit clears redo", () => {
  const h = new History(load());
  const original = structuredClone(h.deck);
  h.do({ kind: "addElement", slideId: "s1", element: box });
  h.do({ kind: "setNotes", slideId: "s1", notes: "hi" });
  h.undo(); h.undo();
  assert.deepEqual(h.deck, original);
  assert.ok(h.canRedo);
  h.redo();
  assert.equal(h.deck.slides[0]!.elements.at(-1)!.id, "n1");
  h.do({ kind: "setNotes", slideId: "s1", notes: "branch" });
  assert.equal(h.canRedo, false);
});

test("history: a failed edit leaves state and stacks unchanged", () => {
  const h = new History(load());
  assert.throws(() => h.do({ kind: "removeSlide", slideId: "missing" }));
  assert.equal(h.canUndo, false);
});

test("history depth is capped", () => {
  const h = new History(load(), 3);
  for (let i = 0; i < 5; i++) h.do({ kind: "setNotes", slideId: "s1", notes: String(i) });
  let n = 0;
  while (h.canUndo) { h.undo(); n++; }
  assert.equal(n, 3);
});
