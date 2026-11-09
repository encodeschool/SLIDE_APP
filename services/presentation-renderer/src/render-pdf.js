// PPTX -> PDF via LibreOffice headless. Isolated profile dir avoids lock clashes between concurrent jobs.
const { execFile } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function renderPdf(pptxPath, outDir) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "lo-profile-"));
  return new Promise((resolve, reject) => {
    const pdfPath = path.join(outDir, path.basename(pptxPath, ".pptx") + ".pdf");
    execFile("soffice",
      [`-env:UserInstallation=file://${profile}`, "--headless", "--convert-to", "pdf", "--outdir", outDir, pptxPath],
      { timeout: 120000 },
      (err, stdout, stderr) => {
        fs.rmSync(profile, { recursive: true, force: true });
        if (err) return reject(new Error(`PDF conversion failed: ${stderr || err.message}`));
        if (!fs.existsSync(pdfPath)) {
          return reject(new Error(`PDF conversion did not create an output file: ${stderr || stdout || "no converter output"}`));
        }
        resolve(pdfPath);
      });
  });
}

module.exports = { renderPdf };
