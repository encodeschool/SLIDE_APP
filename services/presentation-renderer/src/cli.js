const fs = require("node:fs");
const path = require("node:path");
const { validateDeck, overflowWarnings } = require("./validate");
const { renderPptx } = require("./render-pptx");
const { renderPdf } = require("./render-pdf");

async function main() {
  const [input, outBase] = process.argv.slice(2);
  const deck = JSON.parse(fs.readFileSync(input, "utf8"));
  const errors = validateDeck(deck);
  if (errors.length) { console.error("Invalid deck:\n- " + errors.join("\n- ")); process.exit(2); }
  overflowWarnings(deck).forEach((w) => console.warn("WARN", w));
  fs.mkdirSync(path.dirname(outBase), { recursive: true });
  const pptx = await renderPptx(deck, outBase + ".pptx");
  const pdf = await renderPdf(pptx, path.dirname(outBase));
  console.log("OK", pptx, pdf);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
