# yt-innertube-api

Unofficial YouTube InnerTube API for Cloudflare Workers.
Search, video metadata, audio stream URLs — with caching and client fallback.

## Endpoints

| Method | Path | Query | Notes |
|--------|------|-------|-------|
| GET | `/health` | - | status + version |
| GET | `/search` | `q`, `limit`, `hl`, `gl` | search videos (cached 5 min) |
| GET | `/search_songs` | `q`, `limit`, `hl`, `gl` | Telegram VC music bot song search with complete metadata & direct helper URLs |
| GET | `/video` | `id`, `hl`, `gl` | metadata only (cached 30 min) |
| GET | `/stream` | `id`, `itag`, `ttl` | all formats, returns URLs |
| GET | `/audio` | `id`, `itag` | best audio format for bots |
| GET | `/proxy` | `id`, `itag` | streams bytes, supports Range |
| GET | `/redirect` | `id`, `itag` | 302 to best audio URL |

## How to Get Your Deployed Cloudflare Workers URL / Cloudflare URL Kaise Milega

1. **Via CLI (`wrangler`):**
   ```bash
   npm install
   npx wrangler login
   npx wrangler deploy
   ```
   After `npx wrangler deploy` completes, Terminal will print your worker URL:
   `https://yt-innertube-api.<your-subdomain>.workers.dev`

2. **Via Cloudflare Dashboard:**
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
   - Go to **Workers & Pages** in the side sidebar.
   - Click on your worker **yt-innertube-api**.
   - Under **Preview / Visit / Routes**, you will see your public URL (e.g., `https://yt-innertube-api.<subdomain>.workers.dev`).

---

## Telegram VC Music Bot Usage / Song Search API

Use `/search_songs?q=kamleyasong` to search songs for Telegram VC music bots:

### Example Request
`GET https://<your-worker-url>/search_songs?q=kamleyasong`

### Example Response
```json
{
  "ok": true,
  "service": "Telegram VC Music Search API",
  "query": "kamleyasong",
  "count": 10,
  "results": [
    {
      "id": "videoId123",
      "title": "Kamleya - Song Title",
      "artist": "Artist Name",
      "author": "Artist Name",
      "duration": "04:12",
      "duration_seconds": 252,
      "lengthSeconds": 252,
      "views": "10M views",
      "published": "2 months ago",
      "thumbnail": "https://i.ytimg.com/vi/videoId123/hqdefault.jpg",
      "link": "https://www.youtube.com/watch?v=videoId123",
      "url": "https://www.youtube.com/watch?v=videoId123",
      "audio_url": "https://<your-worker-url>/proxy?id=videoId123",
      "proxy_url": "https://<your-worker-url>/proxy?id=videoId123",
      "stream_url": "https://<your-worker-url>/proxy?id=videoId123",
      "redirect_url": "https://<your-worker-url>/redirect?id=videoId123",
      "audio_info_url": "https://<your-worker-url>/audio?id=videoId123",
      "stream_info_url": "https://<your-worker-url>/stream?id=videoId123"
    }
  ]
}
```

### Playing in Telegram Music Bots (PyTgCalls / Pyrogram / FFmpeg):

```python
# Python PyTgCalls Example
import aiohttp
from pytgcalls import PyTgCalls
from pytgcalls.types import AudioPiped

# 1) Search song
async with aiohttp.ClientSession() as session:
    async with session.get(f"{BASE_URL}/search_songs?q={song_name}") as resp:
        data = await resp.json()
        top_song = data["results"][0]

# 2) Pass audio_url or proxy_url directly to PyTgCalls AudioPiped
# (This streams playable audio bytes to FFmpeg and prevents 403 Forbidden / TimeoutError)
stream_url = top_song["audio_url"]  # or top_song["proxy_url"]
await call_py.play(chat_id, AudioPiped(stream_url))
```

## Notes

- Stream URLs expire (~6h) and may be locked to the requesting IP. Re-fetch on 403.
- Use `/proxy?id=` when the bot's server IP differs from the Worker's, so the Worker fetches the bytes itself.
- Cloudflare Workers **free tier = 100,000 requests/day** (hard cap). For 100k/day plus proxy traffic, use Workers Paid ($5/month, 10M/day).
- Keep `API_SECRET` set so the endpoint is not abused by third parties.
