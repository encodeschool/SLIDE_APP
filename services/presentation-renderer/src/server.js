const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { renderPdf } = require("./render-pdf");
const { renderPptx } = require("./render-pptx");
const { validateDeck } = require("./validate");

const MAX_REQUEST_BYTES = 5 * 1024 * 1024;
const CONTENT_TYPES = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_REQUEST_BYTES) {
      const error = new Error("Presentation document exceeds 5 MB");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function createRendererServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (request.method === "GET" && url.pathname === "/health") {
      return sendJson(response, 200, { status: "available" });
    }

    const format = url.pathname.match(/^\/render\/(pdf|pptx)$/)?.[1];
    if (request.method !== "POST" || !format) {
      return sendJson(response, 404, { error: "Not found" });
    }
    if (!request.headers["content-type"]?.startsWith("application/json")) {
      return sendJson(response, 415, { error: "Content-Type must be application/json" });
    }

    let directory;
    try {
      const deck = await readJson(request);
      const errors = validateDeck(deck);
      if (errors.length) return sendJson(response, 400, { errors });

      directory = fs.mkdtempSync(path.join(os.tmpdir(), "slideforge-render-"));
      const pptxPath = await renderPptx(deck, path.join(directory, "presentation.pptx"));
      const outputPath = format === "pdf" ? await renderPdf(pptxPath, directory) : pptxPath;
      const output = fs.readFileSync(outputPath);
      response.writeHead(200, {
        "content-type": CONTENT_TYPES[format],
        "content-length": output.length,
        "cache-control": "no-store",
      });
      response.end(output);
    } catch (error) {
      console.error("Presentation render request failed:", error);
      sendJson(response, error.statusCode ?? 500, {
        error: error.statusCode ? error.message : "Presentation rendering failed",
      });
    } finally {
      if (directory) fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 8090);
  createRendererServer().listen(port, "0.0.0.0", () => console.log(`Renderer listening on ${port}`));
}

module.exports = { createRendererServer };