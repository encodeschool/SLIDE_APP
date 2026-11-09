// Minimal structural validation of the canonical model (schemaVersion 1).
// The Spring Boot backend remains the authority; this guards the renderer.
const ELEMENT_TYPES = new Set(["text", "shape", "image"]);

function validateDeck(deck) {
  const errors = [];
  if (deck.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!deck.size || !(deck.size.width > 0) || !(deck.size.height > 0)) errors.push("size.width/height required");
  if (!Array.isArray(deck.slides) || deck.slides.length === 0) errors.push("slides[] required");
  (deck.slides || []).forEach((s, i) => {
    if (!s.id) errors.push(`slide ${i}: id required`);
    (s.elements || []).forEach((e, j) => {
      const at = `slide ${i} element ${j}`;
      if (!ELEMENT_TYPES.has(e.type)) errors.push(`${at}: unsupported type '${e.type}'`);
      for (const k of ["x", "y", "w", "h"]) if (typeof e[k] !== "number") errors.push(`${at}: ${k} must be a number`);
      if (typeof e.x === "number" && (e.x < 0 || e.x + e.w > deck.size.width + 0.5)) errors.push(`${at}: outside slide horizontally`);
      if (typeof e.y === "number" && (e.y < 0 || e.y + e.h > deck.size.height + 0.5)) errors.push(`${at}: outside slide vertically`);
    });
  });
  return errors;
}

// Rough overflow heuristic: warns when text likely exceeds its box.
function overflowWarnings(deck) {
  const warnings = [];
  deck.slides.forEach((s, i) => (s.elements || []).forEach((e) => {
    if (e.type !== "text") return;
    const size = e.style?.fontSize ?? 18;
    const charsPerLine = Math.max(1, Math.floor(e.w / (size * 0.5)));
    const lines = e.text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / charsPerLine)), 0);
    if (lines * size * 1.3 > e.h) warnings.push(`slide ${i + 1}: text '${e.text.slice(0, 30)}…' may overflow its box`);
  }));
  return warnings;
}

module.exports = { validateDeck, overflowWarnings };
