# yt-innertube-api

Unofficial YouTube InnerTube API for Cloudflare Workers.
Search, video metadata, audio stream URLs — with caching and client fallback.

## Endpoints

| Method | Path | Query | Notes |
|--------|------|-------|-------|
| GET | `/health` | - | status + version |
| GET | `/search` | `q`, `limit`, `hl`, `gl` | search videos (cached 5 min) |
| GET | `/video` | `id`, `hl`, `gl` | metadata only (cached 30 min) |
| GET | `/stream` | `id`, `itag`, `ttl` | all formats, returns URLs |
| GET | `/audio` | `id`, `itag` | best audio format for bots |
| GET | `/proxy` | `id`, `itag` | streams bytes, supports Range |
| GET | `/redirect` | `id`, `itag` | 302 to best audio URL |

## Deploy (wrangler)

```bash
npm install
npx wrangler login
npx wrangler deploy
# optional auth:
npx wrangler secret put API_SECRET
```

Deploy from dashboard: create a Worker, paste `src/index.js`, save & deploy.

## Telegram bot usage

```js
// 1) search
const r = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&limit=1`).then(r => r.json());
const id = r.results[0].id;

// 2) best audio url
const a = await fetch(`${BASE}/audio?id=${id}`).then(r => r.json());
const url = a.audio.url;      // feed to ffmpeg / player
// or stream through the worker (recommended if the direct URL 403s):
const proxy = `${BASE}/proxy?id=${id}`;
```

## Notes

- Stream URLs expire (~6h) and may be locked to the requesting IP. Re-fetch on 403.
- Use `/proxy?id=` when the bot's server IP differs from the Worker's, so the Worker fetches the bytes itself.
- Cloudflare Workers **free tier = 100,000 requests/day** (hard cap). For 100k/day plus proxy traffic, use Workers Paid ($5/month, 10M/day).
- Keep `API_SECRET` set so the endpoint is not abused by third parties.
