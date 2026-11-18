const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PREVIEW_EXTENSIONS = new Set([
  "pdf", "pptx", "docx", "xlsx", "odt", "odp", "ods", "rtf",
  "txt", "md", "csv", "html", "htm", "png", "jpg", "jpeg",
  "webp", "svg", "gif", "bmp",
]);
const MAX_PDF_BYTES = 100 * 1024 * 1024;
const MAX_PDF_PAGES = 500;
const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;

function run(command, args, timeout = 45000) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) return reject(new Error(`${command} failed: ${stderr || error.message}`));
      resolve({ stdout, stderr });
    });
  });
}

function htmlToText(source) {
  return source
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|br|tr|section|article)\s*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+\n/g, "\n");
}

function escapeHtml(text) {
  return text.replace(/[<>&"']/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function textPreviewHtml(text) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:A4;margin:16mm}body{font:10pt monospace;color:#222}
    pre{white-space:pre-wrap;overflow-wrap:anywhere}
    </style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
}

async function toPdf(inputPath, extension, directory) {
  if (extension === "pdf") return inputPath;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lo-marketplace-profile-"));
  const pdfPath = path.join(directory, `${path.basename(inputPath, path.extname(inputPath))}.pdf`);
  try {
    await run("soffice", [
      `-env:UserInstallation=file://${profile}`,
      "--headless", "--nologo", "--nodefault", "--nolockcheck", "--norestore",
      "--convert-to", "pdf", "--outdir", directory, inputPath,
    ]);
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
  if (!fs.existsSync(pdfPath)) throw new Error("Document conversion did not create a PDF");
  return pdfPath;
}

async function renderMarketplacePreview(input, extension) {
  if (!PREVIEW_EXTENSIONS.has(extension)) {
    const error = new Error("Unsupported marketplace preview format");
    error.statusCode = 415;
    throw error;
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "slideforge-marketplace-preview-"));
  try {
    let inputPath = path.join(directory, `upload.${extension}`);
    if (["txt", "md", "csv", "html", "htm"].includes(extension)) {
      if (input.length > MAX_TEXT_PREVIEW_BYTES) {
        const error = new Error("Text file is too large to preview");
        error.statusCode = 413;
        throw error;
      }
      const source = input.toString("utf8");
      const text = ["html", "htm"].includes(extension) ? htmlToText(source) : source;
      inputPath = path.join(directory, "upload.html");
      fs.writeFileSync(inputPath, textPreviewHtml(text), "utf8");
    } else {
      fs.writeFileSync(inputPath, input);
    }

    const pdfPath = await toPdf(inputPath, extension, directory);
    const pdfStats = fs.statSync(pdfPath);
    if (pdfStats.size > MAX_PDF_BYTES) {
      const error = new Error("Converted file is too large to preview");
      error.statusCode = 413;
      throw error;
    }
    const { stdout } = await run("pdfinfo", [pdfPath]);
    const pageCount = Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
    if (!Number.isSafeInteger(pageCount) || pageCount < 1) {
      throw new Error("Converted file has no readable pages");
    }
    if (pageCount > MAX_PDF_PAGES) {
      const error = new Error("File has too many pages to preview");
      error.statusCode = 413;
      throw error;
    }

    const visiblePageCount = Math.min(pageCount, 2);
    const outputPrefix = path.join(directory, "preview");
    await run("pdftoppm", [
      "-f", "1", "-l", String(visiblePageCount), "-scale-to", "1200", "-png",
      pdfPath, outputPrefix,
    ]);
    const imagePaths = fs.readdirSync(directory)
      .filter((name) => /^preview-\d+\.png$/.test(name))
      .sort((left, right) => Number(left.match(/\d+/)[0]) - Number(right.match(/\d+/)[0]));
    if (imagePaths.length < visiblePageCount) throw new Error("Page preview image was not generated");
    const pages = Array.from({ length: visiblePageCount }, (_, index) => {
      const imagePath = path.join(directory, imagePaths[index]);
      return {
        pageNumber: index + 1,
        contentType: "image/png",
        data: fs.readFileSync(imagePath).toString("base64"),
      };
    });
    return { totalPages: pageCount, pages };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

module.exports = { PREVIEW_EXTENSIONS, renderMarketplacePreview };
