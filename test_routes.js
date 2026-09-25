import assert from "node:assert";
import worker from "./src/index.js";

async function runTests() {
  const env = {};
  const ctx = { waitUntil: () => {} };

  console.log("Running comprehensive InnerTube API route and behavior tests...\n");

  // Test 1: OPTIONS CORS Preflight
  console.log("1. Testing OPTIONS preflight...");
  let req = new Request("https://example.com/search", { method: "OPTIONS" });
  let res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 204, "OPTIONS should return HTTP 204");
  assert.strictEqual(res.headers.get("Access-Control-Allow-Origin"), "*", "CORS header allow-origin should be *");
  assert.ok(res.headers.get("Access-Control-Allow-Methods").includes("GET"), "CORS methods should include GET");

  // Test 2: GET /health
  console.log("2. Testing GET /health...");
  req = new Request("https://example.com/health");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /health should return HTTP 200");
  let body = await res.json();
  assert.strictEqual(body.ok, true, "health ok should be true");
  assert.strictEqual(body.service, "yt-innertube-api");
  assert.strictEqual(body.version, "1.0.0");
  assert.strictEqual(body.runtime, "cloudflare-workers");
  assert.deepStrictEqual(body.clients, ["ANDROID", "IOS", "TVHTML5_SIMPLY_EMBEDDED_PLAYER", "WEB"]);
  assert.ok(body.timestamp, "health response must include timestamp");

  // Test 3: GET /search without 'q' parameter (validation)
  console.log("3. Testing GET /search input validation (missing q)...");
  req = new Request("https://example.com/search");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 400, "GET /search without q should return HTTP 400");
  body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.code, "MISSING_PARAMETER");

  // Test 4: GET /search with valid query
  console.log("4. Testing GET /search?q=lofi&limit=5...");
  req = new Request("https://example.com/search?q=lofi&limit=5");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /search?q=lofi should return HTTP 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.query, "lofi");
  assert.ok(Array.isArray(body.results), "results should be an array");
  assert.ok(body.results.length <= 5, "results length should adhere to limit");
  if (body.results.length > 0) {
    const item = body.results[0];
    assert.ok(item.id, "search result item must have id");
    assert.ok("title" in item, "search result item must have title key");
    assert.ok("author" in item, "search result item must have author key");
  }

  // Test 5: GET /video with invalid video ID
  console.log("5. Testing GET /video with invalid video ID...");
  req = new Request("https://example.com/video?id=short_id");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 400, "GET /video with short ID should return HTTP 400");
  body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.code, "INVALID_VIDEO_ID");

  // Test 6: GET /video with valid YouTube ID
  console.log("6. Testing GET /video?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/video?id=dQw4w9WgXcQ");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /video should return HTTP 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.video.id, "dQw4w9WgXcQ");
  assert.ok(body.video.title, "video meta should contain title");
  assert.ok(body.playability, "video meta should contain playability status");

  // Test 6b: GET /video with full YouTube URLs
  console.log("6b. Testing GET /video with full YouTube URLs...");
  const sampleUrls = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ",
    "https://youtube.com/shorts/dQw4w9WgXcQ?feature=share",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
  ];
  for (const urlStr of sampleUrls) {
    req = new Request("https://example.com/video?id=" + encodeURIComponent(urlStr));
    res = await worker.fetch(req, env, ctx);
    assert.strictEqual(res.status, 200, `GET /video with URL ${urlStr} should return HTTP 200`);
    body = await res.json();
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.video.id, "dQw4w9WgXcQ");
  }

  // Test 7: GET /stream with valid YouTube ID
  console.log("7. Testing GET /stream?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/stream?id=dQw4w9WgXcQ");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /stream should return HTTP 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.ok(Array.isArray(body.formats) && body.formats.length > 0, "stream should return non-empty formats array");
  const fmt = body.formats[0];
  assert.ok(fmt.itag, "format must have itag");
  assert.ok(fmt.mimeType, "format must have mimeType");
  assert.ok(fmt.url && fmt.url.startsWith("https://"), "format url must be HTTPS");

  // Test 8: GET /audio with valid YouTube ID
  console.log("8. Testing GET /audio?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/audio?id=dQw4w9WgXcQ");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 200, "GET /audio should return HTTP 200");
  body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.ok(body.audio && body.audio.url, "audio response must contain audio format with url");
  assert.ok(body.expiresHint, "audio response must include expiresHint");

  // Test 9: GET /redirect with valid YouTube ID
  console.log("9. Testing GET /redirect?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/redirect?id=dQw4w9WgXcQ");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 302, "GET /redirect should return HTTP 302");
  const loc = res.headers.get("Location");
  assert.ok(loc && loc.startsWith("https://"), "redirect location must point to HTTPS direct media URL");

  // Test 10: GET /proxy with valid YouTube ID and Range header
  console.log("10. Testing GET /proxy?id=dQw4w9WgXcQ with Range header...");
  req = new Request("https://example.com/proxy?id=dQw4w9WgXcQ", {
    headers: { "Range": "bytes=0-1024" },
  });
  res = await worker.fetch(req, env, ctx);
  assert.ok(
    res.status === 200 || res.status === 206 || res.status === 403,
    "GET /proxy should return HTTP 200, 206 or handled 403"
  );
  assert.strictEqual(res.headers.get("Access-Control-Allow-Origin"), "*");
  assert.ok(
    res.headers.get("Access-Control-Expose-Headers")?.includes("Content-Range"),
    "CORS expose headers must include Content-Range"
  );
  if (res.status === 206) {
    assert.ok(res.headers.get("Content-Range"), "206 response must include Content-Range header");
    assert.ok(res.headers.get("Content-Type"), "206 response must include Content-Type header");
  }

  // Test 10b: GET /proxy without Range header (default range check)
  console.log("10b. Testing GET /proxy?id=dQw4w9WgXcQ without Range header...");
  req = new Request("https://example.com/proxy?id=dQw4w9WgXcQ");
  res = await worker.fetch(req, env, ctx);
  assert.ok(
    res.status === 200 || res.status === 206 || res.status === 403,
    "GET /proxy without Range should return HTTP 200, 206 or handled 403"
  );

  // Test 10c: HEAD /proxy?id=dQw4w9WgXcQ
  console.log("10c. Testing HEAD /proxy?id=dQw4w9WgXcQ...");
  req = new Request("https://example.com/proxy?id=dQw4w9WgXcQ", {
    method: "HEAD",
    headers: { "Range": "bytes=0-1024" },
  });
  res = await worker.fetch(req, env, ctx);
  assert.ok(
    res.status === 200 || res.status === 206 || res.status === 403,
    "HEAD /proxy should return HTTP 200, 206 or handled 403"
  );

  // Test 10d: GET /proxy with invalid ID
  console.log("10d. Testing GET /proxy with invalid ID...");
  req = new Request("https://example.com/proxy?id=invalid_id");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 400, "GET /proxy with invalid ID should return HTTP 400");
  body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.code, "INVALID_VIDEO_ID");

  // Test 11: GET /unknown_route
  console.log("11. Testing unknown route...");
  req = new Request("https://example.com/unknown_route");
  res = await worker.fetch(req, env, ctx);
  assert.strictEqual(res.status, 404, "GET /unknown_route should return HTTP 404");
  body = await res.json();
  assert.strictEqual(body.ok, false);
  assert.strictEqual(body.code, "INVALID_PARAMETER");

  console.log("\nAll tests passed successfully!");
}

runTests().catch((err) => {
  console.error("\nTest execution failed:", err);
  process.exit(1);
});
