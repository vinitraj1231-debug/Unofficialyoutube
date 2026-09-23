# yt-innertube-api (Cloudflare Worker API for Telegram Music Bots)

Unofficial YouTube InnerTube API deployed on Cloudflare Workers.
Fast search, video metadata, audio stream URLs, proxy streaming — with caching and client fallback.

---

## 🚀 Deployed API Base URL
```text
https://unofficialyoutube.vinitraj1231.workers.dev
```

---

## 📌 Endpoints Summary

| Method | Path | Query Parameters | Description |
|--------|------|------------------|-------------|
| GET | `/health` | - | Health check and API version info |
| GET | `/search` | `q`, `limit` | YouTube general search (cached 5 min) |
| GET | `/search_songs` | `q`, `limit` | Search formatted specifically for Telegram VC Music Bots |
| GET | `/video` | `id` | Get video metadata & format count (cached 30 min) |
| GET | `/stream` | `id`, `ttl` | Get all stream formats & direct URLs |
| GET | `/audio` | `id`, `itag` | Get best audio format URL + metadata (JSON response) |
| GET | `/proxy` | `id` | Stream raw media bytes through Cloudflare (Bypasses IP restrictions, supports Range headers) |
| GET | `/redirect` | `id` | HTTP 302 redirect directly to the best direct audio GoogleVideo stream URL |

---

## 🎵 Telegram VC Music Bot Guide / Telegram VC Music Bot Integration

Telegram Voice Chat (VC) music bots require fast searching and reliable audio stream links. This API gives you both: direct GoogleVideo audio links (`audio_url` / `redirect_url`) and proxied audio links (`proxy_url`).

### 1. Searching Songs (`/search_songs`)

Query endpoint:
```text
GET https://unofficialyoutube.vinitraj1231.workers.dev/search_songs?q=kamleya
```

**JSON Response Example:**
```json
{
  "ok": true,
  "service": "Telegram VC Music Search API",
  "query": "kamleya",
  "count": 10,
  "results": [
    {
      "id": "A40vL_D4Ufs",
      "title": "Kamleya - Song Title",
      "artist": "Arijit Singh, Shreya Ghoshal",
      "author": "Arijit Singh, Shreya Ghoshal",
      "duration": "04:12",
      "duration_seconds": 252,
      "lengthSeconds": 252,
      "views": "10M views",
      "published": "2 months ago",
      "thumbnail": "https://i.ytimg.com/vi/A40vL_D4Ufs/hqdefault.jpg",
      "link": "https://www.youtube.com/watch?v=A40vL_D4Ufs",
      "url": "https://www.youtube.com/watch?v=A40vL_D4Ufs",
      "audio_url": "https://unofficialyoutube.vinitraj1231.workers.dev/audio?id=A40vL_D4Ufs",
      "proxy_url": "https://unofficialyoutube.vinitraj1231.workers.dev/proxy?id=A40vL_D4Ufs",
      "stream_url": "https://unofficialyoutube.vinitraj1231.workers.dev/stream?id=A40vL_D4Ufs",
      "redirect_url": "https://unofficialyoutube.vinitraj1231.workers.dev/redirect?id=A40vL_D4Ufs"
    }
  ]
}
```

---

### 2. Audio URL Types & Best Practices for VC Bots

When streaming in Telegram VC (using `pytgcalls`, `FFmpeg`, `tgcalls`, etc.):

1. **`proxy_url` (Recommended for VPS/Servers):**
   - URL: `https://unofficialyoutube.vinitraj1231.workers.dev/proxy?id=VIDEO_ID`
   - **Why use it?** GoogleVideo stream links are bound to the IP that fetched them. If your Telegram bot server IP differs from Cloudflare's IP, direct Google links might give HTTP 403 Forbidden. Using `proxy_url` routes audio traffic through Cloudflare Workers and bypasses IP locks.

2. **`redirect_url` / `audio_url`:**
   - URL: `https://unofficialyoutube.vinitraj1231.workers.dev/redirect?id=VIDEO_ID`
   - **Why use it?** `/redirect` returns a 302 status directly pointing to the high-quality M4A/Opus GoogleVideo audio stream. Ideal if your server can stream GoogleVideo links directly.

---

### 3. Python Code Examples for Telegram Music Bot (Pyrogram + PyTgCalls)

#### A. Basic Search & Get Stream URL (Python `aiohttp` / `requests`)

```python
import aiohttp

API_BASE = "https://unofficialyoutube.vinitraj1231.workers.dev"

async def search_and_get_stream(song_name: str):
    async with aiohttp.ClientSession() as session:
        # 1. Search song
        async with session.get(f"{API_BASE}/search_songs", params={"q": song_name}) as resp:
            data = await resp.json()
            if not data.get("ok") or not data.get("results"):
                return None

            first_result = data["results"][0]

            # Metadata
            title = first_result["title"]
            duration = first_result["duration"]
            thumbnail = first_result["thumbnail"]

            # Audio Stream Link for PyTgCalls / FFmpeg
            stream_url = first_result["proxy_url"]  # Or first_result["redirect_url"]

            return {
                "title": title,
                "duration": duration,
                "thumbnail": thumbnail,
                "stream_url": stream_url
            }
```

#### B. Playing Audio in PyTgCalls (Telegram Voice Chat)

```python
from pytgcalls import PyTgCalls
from pytgcalls.types import AudioQuality
from pytgcalls.types.input_stream import AudioPiped

# Initialize PyTgCalls client
call_py = PyTgCalls(app)

@app.on_message(filters.command("play"))
async def play_command(client, message):
    query = " ".join(message.command[1:])
    if not query:
        await message.reply_text("Please provide a song name! Example: `/play kamleya`")
        return

    msg = await message.reply_text("🔎 Searching...")

    song_info = await search_and_get_stream(query)
    if not song_info:
        await msg.edit_text("❌ Song not found!")
        return

    chat_id = message.chat.id
    stream_url = song_info["stream_url"]
    title = song_info["title"]

    # Play audio stream directly into Telegram VC
    await call_py.join_group_call(
        chat_id,
        AudioPiped(
            stream_url,
            audio_parameters=AudioQuality.HIGH
        )
    )

    await msg.edit_text(f"🎶 **Playing:** `{title}`\n⏱ **Duration:** `{song_info['duration']}`")
```

#### C. Direct FFmpeg Command Example
If you are passing the stream URL to `ffmpeg` directly:
```bash
ffmpeg -re -i "https://unofficialyoutube.vinitraj1231.workers.dev/proxy?id=VIDEO_ID" -f s16le -ac 2 -ar 48000 output.pcm
```

---

## 🔒 Authentication (Optional)

If you set an `API_SECRET` environment variable in Cloudflare Workers settings, pass the secret key in requests using one of these methods:

1. Query Parameter: `?key=YOUR_API_SECRET`
2. HTTP Header: `Authorization: Bearer YOUR_API_SECRET`
3. Custom Header: `X-API-Key: YOUR_API_SECRET`

Example:
```text
https://unofficialyoutube.vinitraj1231.workers.dev/search_songs?q=kamleya&key=YOUR_API_SECRET
```

---

## ⚡ Deployment & Hosting Instructions

If you want to deploy your own instance using Wrangler:

```bash
# 1. Clone repository & install dependencies
npm install

# 2. Login to Cloudflare
npx wrangler login

# 3. Deploy to your Cloudflare account
npx wrangler deploy
```

---

## 💡 Notes & Troubleshooting

- **403 Forbidden / Expired Stream:** GoogleVideo URLs expire (~6 hours). If a stream stops working, re-query `/search_songs` or `/proxy?id=...` to fetch fresh stream links.
- **Proxy usage:** Use `/proxy?id=...` if direct stream links return HTTP 403 on your bot host server (e.g. Heroku, DigitalOcean, AWS, VPS).
- **Free Tier Limits:** Cloudflare Workers free tier allows 100,000 requests/day, which is plenty for personal & medium-sized Telegram music bots.
