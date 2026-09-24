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
  if (body.results && body.results.length > 0) {
    const song = body.results[0];
    assert.ok(song.proxy_url.includes("/proxy?id="), "proxy_url should point to /proxy");
    assert.ok(song.audio_url.includes("/proxy?id="), "audio_url should point to /proxy stream");
    assert.ok(song.stream_url.includes("/proxy?id="), "stream_url should point to /proxy stream");
    assert.ok(song.redirect_url.includes("/redirect?id="), "redirect_url should point to /redirect");
    assert.ok(song.audio_info_url.includes("/audio?id="), "audio_info_url should point to /audio info");
  }

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

  // Test 7: GET /audio?id=dQw4w9WgXcQ
  console.log("Testing GET /audio?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/audio?id=dQw4w9WgXcQ");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /audio should return 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.ok(body.audio && body.audio.url, "GET /audio should return valid audio url");

  // Test 8: GET /audio?id=fJ9rUzIMcZQ (test previously failing LOGIN_REQUIRED video)
  console.log("Testing GET /audio?id=fJ9rUzIMcZQ...");
  req = new Request("https://example.com/audio?id=fJ9rUzIMcZQ");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /audio for fJ9rUzIMcZQ should return 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.ok(body.audio && body.audio.url, "GET /audio for fJ9rUzIMcZQ should return valid audio url");

  // Test 9: GET /video?id=dQw4w9WgXcQ
  console.log("Testing GET /video?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/video?id=dQw4w9WgXcQ");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /video should return 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.ok(body.video && body.video.id === "dQw4w9WgXcQ");

  // Test 10: GET /stream?id=dQw4w9WgXcQ
  console.log("Testing GET /stream?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/stream?id=dQw4w9WgXcQ");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /stream should return 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.ok(Array.isArray(body.formats) && body.formats.length > 0);

  // Test 11: GET /redirect?id=dQw4w9WgXcQ
  console.log("Testing GET /redirect?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/redirect?id=dQw4w9WgXcQ");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 302, "GET /redirect should return 302 redirect");
  assert.ok(res.headers.get("Location").includes("/proxy?id=dQw4w9WgXcQ"), "GET /redirect Location should redirect to /proxy");

  // Test 12: GET /proxy?id=dQw4w9WgXcQ with Range
  console.log("Testing GET /proxy?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/proxy?id=dQw4w9WgXcQ", {
    headers: { "Range": "bytes=0-100" }
  });
  res = await worker.fetch(req, env, ctx);
  assert.ok(res.status === 200 || res.status === 206 || res.status === 403, "GET /proxy should return HTTP response from upstream or handled error");

  // Test 13: Auth test with API_SECRET
  console.log("Testing Auth with API_SECRET...");
  const authEnv = { API_SECRET: "mysecret123" };
  req = new Request("https://example.com/health");
  res = await worker.fetch(req, authEnv, ctx);
  assert.strictEqual(res.status, 200, "/health should bypass auth");

  req = new Request("https://example.com/search?q=test");
  res = await worker.fetch(req, authEnv, ctx);
  assert.strictEqual(res.status, 401, "/search without auth key should return 401");

  req = new Request("https://example.com/search?q=test&key=mysecret123");
  res = await worker.fetch(req, authEnv, ctx);
  assert.strictEqual(res.status, 200, "/search with valid auth key should return 200");

  console.log("All route matching and InnerTube tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
