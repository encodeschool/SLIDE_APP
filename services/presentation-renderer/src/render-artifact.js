const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const JSZip = require("jszip");

const DOCX_MAIN_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";

function xmlEscape(value) {
  return String(value ?? "").replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]);
}

function paragraph(text, style = "") {
  const properties = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  const lines = String(text ?? "").split(/\r?\n/);
  const runs = lines.map((line, index) => `${index ? "<w:r><w:br/></w:r>" : ""}<w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r>`).join("");
  return `<w:p>${properties}${runs}</w:p>`;
}

function artifactParagraphs(document) {
  const content = [paragraph(document.title, "Title")];
  for (const section of document.sections ?? []) {
    if (section.heading) content.push(paragraph(section.heading, "Heading1"));
    if (section.body) content.push(paragraph(section.body));
  }
  if (document.type === "quiz") {
    content.push(paragraph("Questions", "Heading1"));
    for (const [index, question] of (document.questions ?? []).entries()) {
      content.push(paragraph(`${index + 1}. ${question.question}`));
      for (const [optionIndex, option] of question.options.entries()) {
        content.push(paragraph(`☐ ${String.fromCharCode(65 + optionIndex)}. ${option}`));
      }
      content.push(paragraph(`Answer key: ${String.fromCharCode(65 + question.answerIndex)}`));
      if (question.explanation) content.push(paragraph(question.explanation));
    }
  }
  if (document.type === "crossword" && document.crossword) {
    const active = crosswordCells(document.crossword);
    content.push(paragraph("Crossword grid", "Heading1"));
    for (let row = 0; row < document.crossword.rows; row++) {
      content.push(paragraph(Array.from({ length: document.crossword.columns }, (_, column) =>
        active.has(`${row}-${column}`) ? "□ " : "■ ").join("")));
    }
    content.push(paragraph("Crossword clues", "Heading1"));
    for (const entry of document.crossword.entries) {
      content.push(paragraph(`${entry.direction} (${entry.row + 1}, ${entry.column + 1}): ${entry.clue}`));
    }
    content.push(paragraph("Answer key", "Heading1"));
    for (const entry of document.crossword.entries) {
      content.push(paragraph(`${entry.clue}: ${entry.answer}`));
    }
  }
  return content.join("");
}

function crosswordCells(puzzle) {
  const cells = new Set();
  for (const entry of puzzle.entries ?? []) {
    [...String(entry.answer ?? "").toUpperCase()].forEach((_, offset) => {
      const row = entry.row + (entry.direction === "down" ? offset : 0);
      const column = entry.column + (entry.direction === "across" ? offset : 0);
      cells.add(`${row}-${column}`);
    });
  }
  return cells;
}

async function createDocx(document, outputPath) {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="${DOCX_MAIN_CONTENT_TYPE}"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);
  zip.file("word/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
</w:styles>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${artifactParagraphs(document)}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`);
  fs.writeFileSync(outputPath, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

function htmlEscape(value) {
  return String(value ?? "").replace(/[<>&"']/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function artifactHtml(document) {
  const sections = (document.sections ?? []).map((section) =>
    `${section.heading ? `<h2>${htmlEscape(section.heading)}</h2>` : ""}<p>${htmlEscape(section.body).replace(/\n/g, "<br>")}</p>`).join("");
  const questions = document.type === "quiz" ? `<h2>Questions</h2>${(document.questions ?? []).map((q, i) =>
    `<h3>${i + 1}. ${htmlEscape(q.question)}</h3><ul>${q.options.map((option) => `<li>□ ${htmlEscape(option)}</li>`).join("")}</ul>`).join("")}
    <h2>Answer key</h2><ol>${(document.questions ?? []).map((q) => `<li>${htmlEscape(q.options[q.answerIndex])}</li>`).join("")}</ol>` : "";
  const crosswordCellsSet = document.crossword ? crosswordCells(document.crossword) : new Set();
  const crosswordGrid = document.type === "crossword" && document.crossword
    ? `<h2>Crossword grid</h2><table style="border-collapse:collapse">${Array.from({ length: document.crossword.rows }, (_, row) =>
      `<tr>${Array.from({ length: document.crossword.columns }, (_, column) => crosswordCellsSet.has(`${row}-${column}`)
        ? '<td style="width:22px;height:22px;border:1px solid #222">&nbsp;</td>'
        : '<td style="width:22px;height:22px;background:#222"></td>').join("")}</tr>`).join("")}</table>` : "";
  const crossword = document.type === "crossword" ? `${crosswordGrid}<h2>Crossword clues</h2><ol>${(document.crossword?.entries ?? []).map((entry) =>
    `<li>${htmlEscape(entry.direction)} — ${htmlEscape(entry.clue)}</li>`).join("")}</ol>
    <h2>Answer key</h2><ol>${(document.crossword?.entries ?? []).map((entry) =>
    `<li>${htmlEscape(entry.clue)}: ${htmlEscape(entry.answer)}</li>`).join("")}</ol>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:20mm}body{font:12pt Arial,sans-serif;line-height:1.5;color:#222}
    h1{font-size:22pt}h2{font-size:16pt;margin-top:1.5em}h3{font-size:13pt}
    </style></head><body><h1>${htmlEscape(document.title)}</h1>${sections}${questions}${crossword}</body></html>`;
}

function htmlToPdf(htmlPath, outDir) {
  const profile = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "lo-artifact-profile-"));
  const pdfPath = path.join(outDir, `${path.basename(htmlPath, ".html")}.pdf`);
  return new Promise((resolve, reject) => {
    execFile("soffice", [`-env:UserInstallation=file://${profile}`, "--headless", "--convert-to", "pdf", "--outdir", outDir, htmlPath],
      { timeout: 120000 }, (error, stdout, stderr) => {
        fs.rmSync(profile, { recursive: true, force: true });
        if (error || !fs.existsSync(pdfPath)) return reject(new Error(`PDF conversion failed: ${stderr || stdout || error?.message}`));
        resolve(pdfPath);
      });
  });
}

async function renderArtifact(document, format, directory) {
  if (!document || document.schemaVersion !== 1 || typeof document.title !== "string"
    || !Array.isArray(document.sections) || !["essay", "independent-work", "coursework", "dissertation",
      "research-article", "quiz", "crossword", "thesis-abstract", "glossary", "argumentative-essay"].includes(document.type)) {
    const error = new Error("Invalid artifact document");
    error.statusCode = 400;
    throw error;
  }
  if (format === "docx") {
    const target = path.join(directory, "artifact.docx");
    await createDocx(document, target);
    return target;
  }
  const htmlPath = path.join(directory, "artifact.html");
  fs.writeFileSync(htmlPath, artifactHtml(document), "utf8");
  return htmlToPdf(htmlPath, directory);
}

module.exports = { renderArtifact, artifactHtml };
