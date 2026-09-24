# yt-innertube-api (Unofficial YouTube InnerTube API)

Production-ready, cookie-less YouTube InnerTube API wrapper designed specifically for Cloudflare Workers Edge Runtime.

---

## 1. Project Overview

`yt-innertube-api` is a lightweight, edge-compatible wrapper built for Cloudflare Workers that interacts directly with YouTube's public InnerTube API endpoints (`/search`, `/player`). It allows clients to query video metadata, search results, and temporary audio/video stream details without relying on cookies, browser automation (Selenium/Playwright), login sessions, or proprietary binaries like FFmpeg.

---

## 2. Legal and Responsible-Use Notice

### Disclaimer & Terms Compliance

- **Unofficial API:** This project is an independent open-source wrapper and is **not** affiliated with, authorized, endorsed, or supported by YouTube, Google LLC, or Alphabet Inc.
- **Lawful & Personal Use:** This project is intended strictly for personal, educational, self-hosted, and lawful research purposes.
- **Terms of Service & Copyright:** Users are expected to comply with YouTube's Terms of Service and applicable local copyright laws in their jurisdiction.
- **No DRM or Restriction Bypass:** This API strictly **does not bypass** Digital Rights Management (DRM), age-restricted verification, private video permissions, region locks, or Premium-only content gates.

---

## 3. Features

- **Edge Native:** Built specifically for Cloudflare Workers standard fetch and stream APIs with zero Node.js dependencies.
- **Multi-Client Fallback:** Automatic fallback across 4 InnerTube client configurations (`ANDROID`, `IOS`, `TVHTML5_SIMPLY_EMBEDDED_PLAYER`, `WEB`).
- **No Cookies / No Login:** Purely anonymous, cookie-less public access.
- **Byte Proxy & HEAD Support:** `/proxy` streams media bytes on the fly with HTTP Range request support for media players.
- **SSRF Protection:** Strict domain validation ensuring `/proxy` only connects to trusted `*.googlevideo.com` upstream hosts.
- **Automatic Caching:** Edge caching via `caches.default` with custom TTLs and cache hit/miss indicators.
- **Circuit Breaker:** Short-lived in-memory caching for failed video IDs to prevent hammering upstream YouTube servers.
- **Standardized JSON Responses:** Consistent JSON response structure with comprehensive error codes.

---

## 4. Folder Structure

```text
yt-innertube-api/
├── src/
│   └── index.js         # Core Cloudflare Worker source code
├── wrangler.toml        # Cloudflare Wrangler project configuration
├── package.json         # Node.js project manifest & scripts
├── test_routes.js       # Route matching & response test suite
├── LICENSE              # MIT License & Usage Disclaimer
├── .gitignore           # Git ignore list
└── README.md            # Complete API documentation
```

---

## 5. Local Installation

Ensure you have **Node.js (v18+)** and **npm** installed.

```bash
# Clone the repository
git clone https://github.com/your-username/yt-innertube-api.git
cd yt-innertube-api

# Install dependencies
npm install
```

---

## 6. Wrangler Login

To authenticate with your Cloudflare account using Wrangler CLI:

```bash
npx wrangler login
```

This will open a browser window requesting authorization for Cloudflare Workers deployment.

---

## 7. Local Development

Start the local Cloudflare Worker development server:

```bash
npm run dev
# or: npx wrangler dev
```

The worker will start locally at `http://localhost:8787`.

To run the automated test suite locally:

```bash
npm test
```

---

## 8. Deployment

Deploy your worker to the Cloudflare Workers global network:

```bash
npm run deploy
# or: npx wrangler deploy
```

Upon successful deployment, Wrangler will print your public Worker URL (e.g., `https://yt-innertube-api.<subdomain>.workers.dev`).

To stream live logs from your deployed Worker:

```bash
npm run tail
# or: npx wrangler tail
```

---

## 9. All API Endpoints

| Method | Endpoint | Query Parameters | Description |
|--------|----------|------------------|-------------|
| `GET` | `/health` | None | Returns service health, version, available clients, and timestamp |
| `GET` | `/search` | `q` (required), `limit` (1–50), `hl`, `gl`, `pageToken` | Searches YouTube videos |
| `GET` | `/video` | `id` (required), `hl`, `gl` | Fetches video metadata and playability status |
| `GET` | `/stream` | `id` (required), `itag`, `hl`, `gl` | Lists playable stream formats with direct URLs |
| `GET` | `/audio` | `id` (required), `itag`, `hl`, `gl` | Returns best available audio format details |
| `GET` | `/redirect` | `id` (required), `itag` | HTTP 302 redirect to direct media URL |
| `GET` | `/proxy` | `id` (required), `itag` | Streams raw audio bytes (supports Range & HEAD) |
| `OPTIONS` | `/*` | None | Preflight CORS headers handler |

---

## 10. curl Examples

### Health Check
```bash
curl -s "https://yt-innertube-api.your-subdomain.workers.dev/health"
```

### Search Videos
```bash
curl -s "https://yt-innertube-api.your-subdomain.workers.dev/search?q=lofi+hip+hop&limit=5"
```

### Get Video Metadata
```bash
curl -s "https://yt-innertube-api.your-subdomain.workers.dev/video?id=dQw4w9WgXcQ"
```

### Get Available Streams
```bash
curl -s "https://yt-innertube-api.your-subdomain.workers.dev/stream?id=dQw4w9WgXcQ"
```

### Get Best Audio Format
```bash
curl -s "https://yt-innertube-api.your-subdomain.workers.dev/audio?id=dQw4w9WgXcQ"
```

### Redirect to Direct Stream
```bash
curl -i "https://yt-innertube-api.your-subdomain.workers.dev/redirect?id=dQw4w9WgXcQ"
```

### Proxy Audio Stream (Byte Range Request)
```bash
curl -i -H "Range: bytes=0-1024" "https://yt-innertube-api.your-subdomain.workers.dev/proxy?id=dQw4w9WgXcQ"
```

---

## 11. Browser Testing Examples

Open any modern browser and visit:

- **Health status:** `https://your-worker-url.workers.dev/health`
- **Search Query:** `https://your-worker-url.workers.dev/search?q=coke+studio`
- **Video Info:** `https://your-worker-url.workers.dev/video?id=dQw4w9WgXcQ`
- **Audio Stream Info:** `https://your-worker-url.workers.dev/audio?id=dQw4w9WgXcQ`

---

## 12. Response Examples

### `/health` Response
```json
{
  "ok": true,
  "service": "yt-innertube-api",
  "version": "1.0.0",
  "runtime": "cloudflare-workers",
  "clients": [
    "ANDROID",
    "IOS",
    "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    "WEB"
  ],
  "timestamp": "2025-02-27T12:00:00.000Z"
}
```

### `/search` Response
```json
{
  "ok": true,
  "query": "lofi hip hop",
  "count": 1,
  "results": [
    {
      "id": "jfKfPfyJRdk",
      "title": "lofi hip hop radio 📚 - beats to relax/study to",
      "author": "Lofi Girl",
      "channelId": "UCSJ4gkVC6NrvII8umztf0OW",
      "duration": "LIVE",
      "lengthSeconds": 0,
      "views": "25k watching",
      "published": "Started streaming 2 days ago",
      "thumbnail": "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg"
    }
  ],
  "continuation": null,
  "cached": false
}
```

### `/audio` Response
```json
{
  "ok": true,
  "client": "ANDROID",
  "video": {
    "id": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    "author": "Rick Astley",
    "lengthSeconds": 213
  },
  "audio": {
    "itag": 251,
    "mimeType": "audio/webm; codecs=\"opus\"",
    "isAudio": true,
    "hasVideo": false,
    "bitrate": 131072,
    "averageBitrate": 131072,
    "codecs": "opus",
    "quality": "tiny",
    "audioQuality": "AUDIO_QUALITY_MEDIUM",
    "audioSampleRate": "48000",
    "channels": 2,
    "approxDurationMs": 213000,
    "contentLength": "3498120",
    "url": "https://rr1---sn-x217en7s.googlevideo.com/videoplayback?..."
  },
  "expiresHint": "Media URLs are temporary and should be refreshed when expired",
  "cached": false
}
```

### Error Response Example
```json
{
  "ok": false,
  "error": "Invalid YouTube video ID format",
  "code": "INVALID_VIDEO_ID",
  "detail": null,
  "version": "1.0.0"
}
```

---

## 13. Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| `400` | `MISSING_PARAMETER` | A required query parameter (such as `id` or `q`) was omitted. |
| `400` | `INVALID_PARAMETER` | Query parameter value is out of bounds or invalid (e.g. query > 200 chars). |
| `400` | `INVALID_VIDEO_ID` | Video ID does not match YouTube 11-character format `/^[a-zA-Z0-9_-]{11}$/`. |
| `404` | `VIDEO_NOT_FOUND` | Video ID does not exist or was deleted on YouTube. |
| `403` | `VIDEO_PRIVATE` | Video is marked private. |
| `403` | `VIDEO_UNAVAILABLE` | Video is unplayable, paid content, or Premium only. |
| `403` | `AGE_RESTRICTED` | Video requires age verification login. |
| `403` | `REGION_RESTRICTED` | Video is blocked in the requesting country/region. |
| `403` | `LOGIN_REQUIRED` | Video requires a logged-in YouTube account session. |
| `404` | `NO_STREAMING_DATA` | Upstream InnerTube returned no formats or streaming data. |
| `404` | `NO_AUDIO_FORMAT` | No playable audio format match found for the video/itag. |
| `504` | `UPSTREAM_TIMEOUT` | YouTube InnerTube endpoint failed to respond within 10 seconds. |
| `429` | `UPSTREAM_RATE_LIMITED` | YouTube rate-limited requests from the Worker IP. |
| `502` | `UPSTREAM_ERROR` | Upstream YouTube HTTP error (5xx) occurred. |
| `502` | `PROXY_ERROR` | Failed to proxy upstream audio bytes. |
| `500` | `INTERNAL_ERROR` | Unexpected error in Worker execution. |

---

## 14. Cache Behavior

The application utilizes Cloudflare's standard Edge cache (`caches.default`):

- `/search`: Cached for **300 seconds** (5 minutes).
- `/video`: Cached for **1800 seconds** (30 minutes).
- `/stream`: Cached for **300 seconds** (5 minutes).
- `/audio`: Cached for **300 seconds** (5 minutes).
- `/redirect`: **No Cache** (`Cache-Control: no-store`). Always resolves fresh URL.
- `/proxy`: Upstream media bytes are not aggressively cached (`Cache-Control: no-cache`).

### Cache Indicators

- Every JSON response contains a `"cached": true` or `"cached": false` property.
- Responses include header `X-Cache: HIT` or `X-Cache: MISS`.

---

## 15. Rate Limits

This API is exposed publicly without mandatory authentication keys.

- Cloudflare Workers includes global protection against basic DDoS attacks.
- If you wish to implement client rate limiting on your deployment, you can configure **Cloudflare Rate Limiting Rules** in the Cloudflare Dashboard under **Security > WAF > Rate Limiting Rules**.

---

## 16. Worker Free vs Paid Plan Explanation

- **Workers Free Plan:** Cloudflare allows up to **100,000 requests per day** across all worker scripts on a free account.
- **Workers Paid Plan ($5/month):** Includes 10 million requests per month with higher CPU time limits (up to 30s per request).
- **Proxy Traffic Warning:** `/proxy` requests consume extra bandwidth since media bytes pass directly through the Cloudflare Worker. High-volume media streaming will exceed free tier CPU/bandwidth caps quickly; a Workers Paid plan is strongly recommended for production proxy usage.

---

## 17. Stream URL Expiry Explanation

- Direct media URLs returned in `formats` or `/audio` point to `*.googlevideo.com` servers.
- These URLs are **temporary** (typically expiring in ~6 hours) and are frequently **IP-bound** to the IP address that made the original InnerTube call.
- **Important:** Do NOT permanently store direct `googlevideo.com` URLs in databases. Always resolve fresh URLs on demand or use `/proxy` / `/redirect`.

---

## 18. Troubleshooting

1. **403 Forbidden on `/proxy`:**
   - Upstream YouTube media URL has expired or IP signature mismatched. The Worker automatically attempts a fresh player fetch retry.
2. **`AGE_RESTRICTED` or `LOGIN_REQUIRED` errors:**
   - In accordance with hard requirements, cookie-less access cannot bypass age restrictions or login gates.
3. **`INVALID_VIDEO_ID` error:**
   - Ensure you pass exact 11-character YouTube video IDs (e.g. `dQw4w9WgXcQ`).

---

## 19. YouTube / InnerTube Changes Maintenance Guide

YouTube frequently updates InnerTube client versions, payload fields, and cipher signatures:

1. **Client Version Updates:**
   - If a client (e.g., `ANDROID` or `WEB`) stops returning `streamingData`, check client version strings in `src/index.js` (`CLIENTS` config object) and bump `clientVersion` to match latest client releases.
2. **Inspecting Upstream Failure Logs:**
   - Run `npx wrangler tail` to observe fallback warnings recorded when InnerTube clients fail.
3. **Updating Test Suite:**
   - Run `npm test` after adjusting client configurations to confirm all endpoints function properly.
