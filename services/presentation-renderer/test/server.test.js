const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRendererServer } = require("../src/server");

const deck = JSON.parse(fs.readFileSync(path.join(__dirname, "../samples/sample-deck.json"), "utf8"));
const artifact = {
  schemaVersion: 1,
  id: "essay-1",
  type: "essay",
  title: "Editable essay",
  language: "en",
  sections: [{ id: "s1", heading: "Introduction", body: "A first paragraph." }],
};

test("renderer health endpoint reports availability", async (context) => {
  const server = createRendererServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "available" });
});

test("renderer HTTP endpoint returns an editable PPTX", async (context) => {
  const server = createRendererServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/render/pptx`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(deck),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  assert.equal((await response.arrayBuffer()).byteLength > 0, true);
});

test("renderer rejects invalid decks before rendering", async (context) => {
  const server = createRendererServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/render/pptx`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schemaVersion: 2 }),
  });

  test("artifact renderer HTTP endpoint returns an editable Word document", async (context) => {
    const server = createRendererServer();
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    context.after(() => new Promise((resolve) => server.close(resolve)));

    const response = await fetch(`http://127.0.0.1:${server.address().port}/render/artifact/docx`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(artifact),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.ok((await response.arrayBuffer()).byteLength > 0);
  });
  assert.equal(response.status, 400);
  assert.ok((await response.json()).errors.length > 0);
});