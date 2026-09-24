/**
 * ============================================================
 *  yt-innertube-api  v1.0.0
 *  Unofficial YouTube InnerTube API on Cloudflare Workers
 * ------------------------------------------------------------
 *  Routes:
 *    GET /health
 *    GET /search?q=<query>&limit=10
 *    GET /search_songs?q=<query>&limit=10
 *    GET /video?id=<videoId>
 *    GET /stream?id=<videoId>&ttl=<optional>
 *    GET /audio?id=<videoId>&itag=<optional>   -> best audio metadata (json)
 *    GET /proxy?id=<videoId>&itag=<opt>        -> streams audio bytes (Range OK)
 *    GET /redirect?id=<videoId>&itag=<optional> -> 302 to audio stream url
 *    OPTIONS /                                 -> CORS preflight
 * ============================================================
 */

const VERSION = "1.0.0";

/* -------------------- InnerTube clients -------------------- */

const CLIENTS = {
  ANDROID: {
    key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    clientName: "ANDROID",
    clientVersion: "20.01.35",
    headerName: "3",
    userAgent: "com.google.android.youtube/20.01.35 (Linux; U; Android 12) gzip",
    extra: { androidSdkVersion: 31, osName: "Android", osVersion: "12" },
  },
  IOS: {
    key: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    clientName: "IOS",
    clientVersion: "20.01.2",
    headerName: "5",
    userAgent: "com.google.ios.youtube/20.01.2 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X)",
    extra: { deviceModel: "iPhone16,2", osName: "iOS", osVersion: "18.2" },
  },
  ANDROID_VR: {
    key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    clientName: "ANDROID_VR",
    clientVersion: "1.54.38",
    headerName: "93",
    userAgent: "Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36",
    extra: { deviceModel: "Quest 2", osName: "Android", osVersion: "10" },
  },
  ANDROID_KIDS: {
    key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    clientName: "ANDROID_KIDS",
    clientVersion: "8.38.1",
    headerName: "27",
    userAgent: "com.google.android.apps.youtube.kids/8.38.1 (Linux; U; Android 12) gzip",
    extra: { androidSdkVersion: 31, osName: "Android", osVersion: "12" },
  },
  IOS_KIDS: {
    key: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    clientName: "IOS_KIDS",
    clientVersion: "8.38.1",
    headerName: "28",
    userAgent: "com.google.ios.youtubekids/8.38.1 (iPhone14,3; U; CPU iOS 18_2 like Mac OS X)",
    extra: { deviceModel: "iPhone14,3", osName: "iOS", osVersion: "18.2" },
  },
  TVHTML5: {
    key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    clientName: "TVHTML5",
    clientVersion: "7.20230405.08.01",
    headerName: "7",
    userAgent: "Mozilla/5.0 (SmartTV; Cobalt/Version)",
    extra: {},
  },
  WEB: {
    key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    clientName: "WEB",
    clientVersion: "2.20250224.01.00",
    headerName: "1",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    extra: {},
  },
};

// Order in which we try clients for /player.
const PLAYER_ORDER = [
  "ANDROID",
  "IOS",
  "ANDROID_VR",
  "ANDROID_KIDS",
  "IOS_KIDS",
  "TVHTML5",
  "WEB",
];

/* -------------------- Visitor Data Cache -------------------- */

const VISITOR_CACHE = {}; // clientName -> { data, timestamp }
const VISITOR_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function fetchVisitorData(c) {
  const cached = VISITOR_CACHE[c.clientName];
  if (cached && (Date.now() - cached.timestamp < VISITOR_TTL_MS)) {
    return cached.data;
  }
  try {
    const url =
      "https://www.youtube.com/youtubei/v1/visitor_id?key=" +
      c.key +
      "&prettyPrint=false";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": c.userAgent,
        Origin: "https://www.youtube.com",
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: c.clientName,
            clientVersion: c.clientVersion,
            hl: "en",
            gl: "US",
            ...c.extra,
          },
        },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const vd = data && data.responseContext && data.responseContext.visitorData;
    if (vd) {
      VISITOR_CACHE[c.clientName] = { data: vd, timestamp: Date.now() };
      return vd;
    }
  } catch (e) {
    /* ignore visitor fetch errors */
  }
  return null;
}

function clearVisitorData(clientName) {
  delete VISITOR_CACHE[clientName];
}

function buildContext(c, hl, gl, visitorData) {
  const client = {
    clientName: c.clientName,
    clientVersion: c.clientVersion,
    hl,
    gl,
    utcOffsetMinutes: 0,
  };
  if (visitorData) client.visitorData = visitorData;
  Object.assign(client, c.extra);
  const ctx = { client };
  if (c.thirdParty) ctx.thirdParty = c.thirdParty;
  return ctx;
}

function buildHeaders(c, visitorData) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": c.userAgent,
    "X-YouTube-Client-Name": c.headerName,
    "X-YouTube-Client-Version": c.clientVersion,
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://www.youtube.com",
    Referer: "https://www.youtube.com/",
  };
  if (visitorData) headers["X-Goog-Visitor-Id"] = visitorData;
  return headers;
}

async function innertube(endpoint, clientName, bodyExtra, hl, gl) {
  const c = CLIENTS[clientName];
  if (!c) throw new Error("Unknown InnerTube client: " + clientName);

  const visitorData = await fetchVisitorData(c);

  const url =
    "https://www.youtube.com/youtubei/v1/" +
    endpoint +
    "?key=" +
    c.key +
    "&prettyPrint=false";

  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(c, visitorData),
    body: JSON.stringify({
      context: buildContext(c, hl, gl, visitorData),
      ...bodyExtra,
    }),
  });

  if (!res.ok) {
    throw new Error("InnerTube " + endpoint + " (" + clientName + ") HTTP " + res.status);
  }
  return res.json();
}

/* -------------------- Player + fallback -------------------- */

async function playerWithFallback(videoId, hl, gl) {
  const errors = [];
  for (const name of PLAYER_ORDER) {
    try {
      const data = await innertube(
        "player",
        name,
        { videoId: videoId, contentCheckOk: true, racyCheckOk: true },
        hl,
        gl
      );
      const status = data && data.playabilityStatus && data.playabilityStatus.status;
      if (data && data.streamingData) {
        return { data: data, client: name };
      }
      clearVisitorData(name);
      errors.push(name + ": " + (status || "no-streamingData"));
    } catch (e) {
      clearVisitorData(name);
      errors.push(name + ": " + e.message);
    }
  }
  throw new Error("No client returned streams -> " + errors.join(" | "));
}

/* -------------------- Helpers -------------------- */

function extractMediaUrl(f) {
  if (f.url) return f.url;
  const raw = f.signatureCipher || f.cipher;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const u = params.get("url");
  const sig = params.get("sig") || params.get("signature");
  const sp = params.get("sp") || "signature";
  if (!u) return null;
  if (!sig) return u;
  try {
    const parsed = new URL(u);
    parsed.searchParams.set(sp, sig);
    return parsed.toString();
  } catch (e) {
    return u + "&" + sp + "=" + encodeURIComponent(sig);
  }
}

function normalizeFormat(f) {
  const mime = f.mimeType || "";
  return {
    itag: f.itag,
    mimeType: mime,
    isAudio: mime.indexOf("audio/") === 0,
    hasVideo: mime.indexOf("video/") === 0,
    bitrate: f.bitrate || f.averageBitrate || 0,
    averageBitrate: f.averageBitrate || 0,
    codecs: (mime.match(/codecs="([^"]+)"/) || [])[1] || null,
    quality: f.quality || null,
    audioQuality: f.audioQuality || null,
    audioSampleRate: f.audioSampleRate || null,
    channels: f.audioChannels || null,
    approxDurationMs: Number(f.approxDurationMs || 0),
    contentLength: f.contentLength || null,
    url: extractMediaUrl(f),
  };
}

function listFormats(data) {
  const sd = data.streamingData || {};
  const raw = (sd.formats || []).concat(sd.adaptiveFormats || []);
  return raw.map(normalizeFormat).filter(function (f) { return !!f.url; });
}

function chooseAudio(formats, preferItag) {
  const audio = formats.filter(function (f) { return f.isAudio; });
  const pool = audio.length ? audio : formats;

  if (preferItag) {
    const exact = pool.find(function (f) { return String(f.itag) === String(preferItag); });
    if (exact) return exact;
  }

  // Preferred itags for Telegram VC bots and FFmpeg:
  // 140 (m4a/aac 128k), 251 (opus 160k), 250 (opus 70k), 139 (m4a/aac 48k)
  const preferred = [140, 251, 250, 139];
  for (const tag of preferred) {
    const hit = pool.find(function (f) { return f.itag === tag; });
    if (hit) return hit;
  }

  return pool.slice().sort(function (a, b) { return (b.bitrate || 0) - (a.bitrate || 0); })[0] || null;
}

function parseDuration(text) {
  if (!text) return 0;
  const parts = String(text).split(":").map(Number);
  return parts.reduce(function (acc, n) { return acc * 60 + (n || 0); }, 0);
}

function videoMeta(data) {
  const vd = data.videoDetails || {};
  const mf = (data.microformat && data.microformat.playerMicroformatRenderer) || {};
  return {
    id: vd.videoId,
    title: vd.title || null,
    author: vd.author || null,
    channelId: vd.channelId || null,
    lengthSeconds: Number(vd.lengthSeconds || 0),
    viewCount: Number(vd.viewCount || 0),
    isLive: !!vd.isLiveContent,
    thumbnails: (vd.thumbnail && vd.thumbnail.thumbnails) || [],
    publishDate: mf.publishDate || null,
    category: mf.category || null,
  };
}

/* -------------------- Search parsing -------------------- */

function normalizeVideoRenderer(vr) {
  const thumb = (vr.thumbnail && (vr.thumbnail.thumbnails || [])) || [];
  const title =
    (vr.title && (vr.title.simpleText ||
      (vr.title.runs && vr.title.runs[0] && vr.title.runs[0].text))) || null;
  const channel =
    (vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text) ||
    (vr.longBylineText && vr.longBylineText.runs && vr.longBylineText.runs[0] && vr.longBylineText.runs[0].text) ||
    null;
  const lengthText = (vr.lengthText && vr.lengthText.simpleText) || null;
  return {
    id: vr.videoId,
    title: title,
    author: channel,
    duration: lengthText,
    lengthSeconds: parseDuration(lengthText),
    views: (vr.viewCountText && vr.viewCountText.simpleText) || null,
    published: (vr.publishedTimeText && vr.publishedTimeText.simpleText) || null,
    thumbnail: thumb.length ? thumb[thumb.length - 1].url : null,
  };
}

function normalizeLockup(lk) {
  const meta = (lk.metadata && lk.metadata.lockupMetadataViewModel) || {};
  const title = (meta.title && meta.title.content) || null;
  let author = null;
  let views = null;
  try {
    const rows =
      meta.metadata.contentMetadataViewModel.metadataRows || [];
    for (const row of rows) {
      const parts = row.metadataParts || [];
      for (const p of parts) {
        const t = p.text && p.text.content;
        if (!t) continue;
        if (!author) author = t;
        else if (!views) views = t;
      }
    }
  } catch (e) { /* ignore */ }
  let thumbnail = null;
  try {
    const srcs =
      lk.contentImage.thumbnailViewModel.image.sources || [];
    if (srcs.length) thumbnail = srcs[srcs.length - 1].url;
  } catch (e) { /* ignore */ }
  return {
    id: lk.contentId,
    title: title,
    author: author,
    duration: null,
    lengthSeconds: 0,
    views: views,
    published: null,
    thumbnail: thumbnail,
  };
}

function collectVideos(node, out, seen) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) collectVideos(item, out, seen);
    return out;
  }
  const vr = node.videoRenderer || node.compactVideoRenderer || node.gridVideoRenderer;
  if (vr && vr.videoId && !seen.has(vr.videoId)) {
    seen.add(vr.videoId);
    out.push(normalizeVideoRenderer(vr));
  }
  if (node.lockupViewModel && node.lockupViewModel.contentId && !seen.has(node.lockupViewModel.contentId)) {
    const norm = normalizeLockup(node.lockupViewModel);
    if (norm.id) {
      seen.add(norm.id);
      out.push(norm);
    }
  }
  for (const k of Object.keys(node)) collectVideos(node[k], out, seen);
  return out;
}

function parseSearch(data, limit) {
  const out = [];
  collectVideos(data, out, new Set());
  return out.slice(0, limit);
}

/* -------------------- Response helpers -------------------- */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function json(data, status, extraHeaders) {
  const headers = Object.assign(
    { "Content-Type": "application/json; charset=utf-8" },
    CORS,
    extraHeaders || {}
  );
  return new Response(JSON.stringify(data, null, 2), { status: status || 200, headers: headers });
}

function err(message, status, detail) {
  return json({ ok: false, error: message, detail: detail || null, version: VERSION }, status || 400);
}

function authOk(request, env, url) {
  const secret = env && env.API_SECRET;
  if (!secret) return true;
  const q = url.searchParams.get("key");
  if (q && q === secret) return true;
  const h = request.headers.get("Authorization") || "";
  if (h === "Bearer " + secret) return true;
  const xk = request.headers.get("X-API-Key");
  return !!xk && xk === secret;
}

/* -------------------- Cache -------------------- */

async function withCache(request, ctx, ttl, producer) {
  const cache = typeof caches !== "undefined" && caches.default ? caches.default : null;
  let key = null;

  if (cache) {
    try {
      const cacheUrl = new URL(request.url);
      cacheUrl.searchParams.delete("key");
      key = new Request(cacheUrl.toString(), { method: "GET" });

      const hit = await cache.match(key);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set("X-Cache", "HIT");
        headers.set("Access-Control-Allow-Origin", "*");
        return new Response(hit.body, { status: hit.status, headers: headers });
      }
    } catch (e) { /* ignore cache errors */ }
  }

  const body = await producer();
  if (body && body.ok === false) {
    return json(body, body.status || 502);
  }

  const res = json(body, 200, { "Cache-Control": "public, max-age=" + ttl });

  if (cache && key && ctx && typeof ctx.waitUntil === "function") {
    try {
      ctx.waitUntil(cache.put(key, res.clone()));
    } catch (e) { /* ignore cache put errors */ }
  }

  res.headers.set("X-Cache", "MISS");
  return res;
}

/* -------------------- Route handlers -------------------- */

async function handleSearch(url, request, env, ctx) {
  const q = url.searchParams.get("q");
  if (!q) return err("Missing 'q' parameter", 400);
  const limit = Math.min(Number(url.searchParams.get("limit") || 10) || 10, 50);
  const hl = url.searchParams.get("hl") || env.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env.DEFAULT_GL || "US";

  return withCache(request, ctx, 300, async function () {
    try {
      const data = await innertube(
        "search",
        "WEB",
        {
          query: q,
          params: "EgIQAQ%3D%3D", // filter: videos only
          client: undefined,
        },
        hl,
        gl
      );
      const results = parseSearch(data, limit);
      return { ok: true, query: q, count: results.length, results: results };
    } catch (e) {
      return { ok: false, status: 502, error: "Search failed", detail: e.message };
    }
  });
}

async function handleSearchSongs(url, request, env, ctx) {
  const q = url.searchParams.get("q");
  if (!q) return err("Missing 'q' parameter", 400);
  const limit = Math.min(Number(url.searchParams.get("limit") || 10) || 10, 50);
  const hl = url.searchParams.get("hl") || env.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env.DEFAULT_GL || "US";
  const baseUrl = url.origin;

  return withCache(request, ctx, 300, async function () {
    try {
      const data = await innertube(
        "search",
        "WEB",
        {
          query: q,
          params: "EgIQAQ%3D%3D", // filter: videos only
          client: undefined,
        },
        hl,
        gl
      );
      const rawResults = parseSearch(data, limit);
      const results = rawResults.map(function (item) {
        const ytUrl = "https://www.youtube.com/watch?v=" + item.id;
        const proxyStreamUrl = baseUrl + "/proxy?id=" + item.id;
        return {
          id: item.id,
          title: item.title,
          artist: item.author,
          author: item.author,
          duration: item.duration,
          duration_seconds: item.lengthSeconds,
          lengthSeconds: item.lengthSeconds,
          views: item.views,
          published: item.published,
          thumbnail: item.thumbnail,
          link: ytUrl,
          url: ytUrl,
          audio_url: proxyStreamUrl,
          proxy_url: proxyStreamUrl,
          stream_url: proxyStreamUrl,
          redirect_url: baseUrl + "/redirect?id=" + item.id,
          audio_info_url: baseUrl + "/audio?id=" + item.id,
          stream_info_url: baseUrl + "/stream?id=" + item.id,
        };
      });

      return {
        ok: true,
        service: "Telegram VC Music Search API",
        query: q,
        count: results.length,
        results: results,
      };
    } catch (e) {
      return { ok: false, status: 502, error: "Song search failed", detail: e.message };
    }
  });
}

async function handleVideo(url, request, env, ctx) {
  const id = url.searchParams.get("id");
  if (!id) return err("Missing 'id' parameter", 400);
  const hl = url.searchParams.get("hl") || env.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env.DEFAULT_GL || "US";

  return withCache(request, ctx, 1800, async function () {
    try {
      const r = await playerWithFallback(id, hl, gl);
      const formats = listFormats(r.data);
      return {
        ok: true,
        client: r.client,
        video: videoMeta(r.data),
        playability: (r.data.playabilityStatus && r.data.playabilityStatus.status) || null,
        formatsCount: formats.length,
        keywords: (r.data.videoDetails && r.data.videoDetails.keywords) || [],
      };
    } catch (e) {
      return { ok: false, status: 502, error: "Failed to fetch video details", detail: e.message };
    }
  });
}

async function handleStream(url, request, env, ctx) {
  const id = url.searchParams.get("id");
  if (!id) return err("Missing 'id' parameter", 400);
  const hl = url.searchParams.get("hl") || env.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env.DEFAULT_GL || "US";
  const ttl = Math.max(60, Math.min(Number(url.searchParams.get("ttl") || 900) || 900, 3600));

  return withCache(request, ctx, ttl, async function () {
    try {
      const r = await playerWithFallback(id, hl, gl);
      const formats = listFormats(r.data);
      return {
        ok: true,
        client: r.client,
        video: videoMeta(r.data),
        formats: formats,
      };
    } catch (e) {
      return { ok: false, status: 502, error: "Failed to fetch stream details", detail: e.message };
    }
  });
}

async function handleAudio(url, request, env, ctx) {
  const id = url.searchParams.get("id");
  if (!id) return err("Missing 'id' parameter", 400);
  const itag = url.searchParams.get("itag");
  const hl = url.searchParams.get("hl") || env.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env.DEFAULT_GL || "US";

  return withCache(request, ctx, 900, async function () {
    try {
      const r = await playerWithFallback(id, hl, gl);
      const formats = listFormats(r.data);
      const best = chooseAudio(formats, itag);
      if (!best) return { ok: false, status: 404, error: "No playable audio format found" };
      return {
        ok: true,
        client: r.client,
        video: videoMeta(r.data),
        audio: best,
        expiresHint: "googlevideo urls are short-lived (~6h) and may be IP-bound; re-fetch when expired",
      };
    } catch (e) {
      return { ok: false, status: 502, error: "Failed to fetch audio stream", detail: e.message };
    }
  });
}

async function handleRedirect(url, request, env) {
  const id = url.searchParams.get("id");
  if (!id) return err("Missing 'id' parameter", 400);
  const itag = url.searchParams.get("itag");

  let proxyPath = "/proxy?id=" + encodeURIComponent(id);
  if (itag) proxyPath += "&itag=" + encodeURIComponent(itag);

  const proxyUrl = new URL(proxyPath, url.origin).toString();
  return new Response(null, {
    status: 302,
    headers: Object.assign({ Location: proxyUrl }, CORS),
  });
}

async function handleProxy(url, request, env) {
  const id = url.searchParams.get("id");
  const directUrl = url.searchParams.get("url");
  const itag = url.searchParams.get("itag");
  const hl = url.searchParams.get("hl") || env.DEFAULT_HL || "en";
  const gl = url.searchParams.get("gl") || env.DEFAULT_GL || "US";

  let mediaUrl = null;
  let clientName = "ANDROID";

  if (id) {
    try {
      const r = await playerWithFallback(id, hl, gl);
      const best = chooseAudio(listFormats(r.data), itag);
      if (!best) return err("No playable audio format found", 404);
      mediaUrl = best.url;
      clientName = r.client;
    } catch (e) {
      return err("Failed to retrieve audio stream", 502, e.message);
    }
  } else if (directUrl && env.ALLOW_OPEN_PROXY === "true") {
    mediaUrl = directUrl;
  } else {
    return err("Provide 'id' (or enable open proxy via ALLOW_OPEN_PROXY)", 400);
  }

  const clientUA = (CLIENTS[clientName] && CLIENTS[clientName].userAgent) || CLIENTS.ANDROID.userAgent;

  async function fetchUpstream(targetUrl) {
    const headers = {
      "User-Agent": clientUA,
      Accept: "*/*",
    };
    const range = request.headers.get("Range");
    if (range) headers["Range"] = range;
    const accept = request.headers.get("Accept");
    if (accept) headers["Accept"] = accept;

    return await fetch(targetUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: headers,
      redirect: "follow",
    });
  }

  let upstream = await fetchUpstream(mediaUrl);

  // If upstream returns 403, 410, or 404, retry once with fresh visitor/player data
  if (id && (upstream.status === 403 || upstream.status === 410 || upstream.status === 404)) {
    for (const name of PLAYER_ORDER) {
      clearVisitorData(name);
    }
    try {
      const r = await playerWithFallback(id, hl, gl);
      const best = chooseAudio(listFormats(r.data), itag);
      if (best && best.url && best.url !== mediaUrl) {
        mediaUrl = best.url;
        clientName = r.client;
        upstream = await fetchUpstream(mediaUrl);
      }
    } catch (e) {
      /* ignore retry error and return original response */
    }
  }

  const outHeaders = new Headers(CORS);
  for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "last-modified"]) {
    const v = upstream.headers.get(h);
    if (v) outHeaders.set(h, v);
  }
  if (!outHeaders.has("accept-ranges")) {
    outHeaders.set("accept-ranges", "bytes");
  }
  outHeaders.set("Cache-Control", "public, max-age=3600");

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}

/* -------------------- Entrypoint -------------------- */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const path = url.pathname.replace(/^\/+/, "/").replace(/\/+$/, "") || "/";

    if (path === "/health" || path === "/") {
      return json({
        ok: true,
        service: "yt-innertube-api",
        version: VERSION,
        clients: PLAYER_ORDER,
        routes: ["/health", "/search", "/search_songs", "/video", "/stream", "/audio", "/proxy", "/redirect"],
      });
    }

    if (!authOk(request, env, url)) {
      return err("Unauthorized: invalid or missing API key", 401);
    }

    try {
      switch (path) {
        case "/search":
          return await handleSearch(url, request, env, ctx);
        case "/search_songs":
          return await handleSearchSongs(url, request, env, ctx);
        case "/video":
          return await handleVideo(url, request, env, ctx);
        case "/stream":
          return await handleStream(url, request, env, ctx);
        case "/audio":
          return await handleAudio(url, request, env, ctx);
        case "/redirect":
          return await handleRedirect(url, request, env);
        case "/proxy":
          return await handleProxy(url, request, env);
        default:
          return err("Unknown route: " + path, 404);
      }
    } catch (e) {
      return err("Internal error", 500, String((e && e.message) || e));
    }
  },
};
