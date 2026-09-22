import assert from "node:assert";
import worker from "./src/index.js";


async function runTests() {
  const env = {};
  const ctx = { waitUntil: () => {} };

  console.log("Running route matching tests...");

  // Test 1: GET /search_songs with query
  let req = new Request("https://example.com/search_songs?q=test");
  let res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /search_songs should return 200");
  let body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.service, "Telegram VC Music Search API");

  // Test 2: GET /search_songs/ with trailing slash
  req = new Request("https://example.com/search_songs/?q=test");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /search_songs/ with trailing slash should return 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);

  // Test 3: GET //search_songs with multiple leading slashes
  req = new Request("https://example.com//search_songs?q=test");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET //search_songs should return 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);

  // Test 4: GET /health
  req = new Request("https://example.com/health");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /health should return 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);

  // Test 5: GET /search without q
  req = new Request("https://example.com/search");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 400, "GET /search without q should return 400");

  // Test 6: GET /unknown_route
  req = new Request("https://example.com/unknown_route");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 404, "GET /unknown_route should return 404");
  body = await res.json();
  assert.strictEqual(body.error, "Unknown route: /unknown_route");

  console.log("All route matching tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
