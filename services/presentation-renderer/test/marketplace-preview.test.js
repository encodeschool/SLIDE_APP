const test = require("node:test");
const assert = require("node:assert/strict");
const { createRendererServer } = require("../src/server");

test("marketplace preview endpoint only returns the first two pages of a longer text file", async (context) => {
  const server = createRendererServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const contents = Array.from({ length: 2400 }, (_, index) => `Lesson line ${index + 1}`).join("\n");
  const response = await fetch(`http://127.0.0.1:${server.address().port}/render/marketplace-preview/txt`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: Buffer.from(contents, "utf8"),
  });
  const preview = await response.json();

  assert.equal(response.status, 200);
  assert.ok(preview.totalPages > 2);
  assert.deepStrictEqual(preview.pages.map((page) => page.pageNumber), [1, 2]);
  assert.ok(preview.pages.every((page) => page.contentType === "image/png" && page.data.length > 100));
});

test("marketplace preview rasterizes a single-page SVG image", async (context) => {
  const server = createRendererServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#28765d"/></svg>`;
  const response = await fetch(`http://127.0.0.1:${server.address().port}/render/marketplace-preview/svg`, {
    method: "POST",
    headers: { "content-type": "application/octet-stream" },
    body: Buffer.from(svg),
  });
  const preview = await response.json();

  assert.equal(response.status, 200);
  assert.equal(preview.totalPages, 1);
  assert.deepStrictEqual(preview.pages.map((page) => page.pageNumber), [1]);
  assert.ok(preview.pages[0].data.length > 100);
});
