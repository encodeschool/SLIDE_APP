// Canonical JSON -> editable PPTX. Coordinates are px on deck.size (e.g. 1280x720); 96 px = 1 inch.
const PptxGenJS = require("pptxgenjs");
const PX = 96;
const inch = (v) => v / PX;
const hex = (c) => (c || "000000").replace("#", "");

async function renderPptx(deck, outPath) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "DECK", width: inch(deck.size.width), height: inch(deck.size.height) });
  pptx.layout = "DECK";
  pptx.title = deck.title;

  for (const s of deck.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: hex(s.background?.color || deck.theme?.background || "FFFFFF") };
    if (s.notes) slide.addNotes(s.notes);
    for (const e of s.elements) {
      const pos = { x: inch(e.x), y: inch(e.y), w: inch(e.w), h: inch(e.h) };
      if (e.type === "text") {
        const st = e.style || {};
        slide.addText(e.text, {
          ...pos,
          fontFace: st.fontFamily || deck.theme?.fontBody || "Arial",
          fontSize: (st.fontSize || 18) * 0.75, // px -> pt
          bold: st.fontWeight >= 600,
          italic: st.italic || false,
          underline: st.underline || false,
          color: hex(st.color || deck.theme?.text),
          align: st.align || "left",
          valign: "top",
          margin: 0,
          fit: "none",
        });
      } else if (e.type === "shape") {
        slide.addShape(e.shape === "ellipse" ? pptx.ShapeType.ellipse : pptx.ShapeType.rect, {
          ...pos,
          fill: { color: hex(e.fill) },
          line: e.stroke ? { color: hex(e.stroke), width: 1 } : { type: "none" },
        });
      } else if (e.type === "image") {
        slide.addImage({ ...pos, data: e.dataUri, altText: e.alt || "" });
      }
    }
  }
  await pptx.writeFile({ fileName: outPath });
  return outPath;
}

module.exports = { renderPptx };
