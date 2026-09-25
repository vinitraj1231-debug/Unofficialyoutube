/**
 * ============================================================
 *  yt-innertube-api  v1.0.0
 *  Unofficial YouTube InnerTube API on Cloudflare Workers
 * ------------------------------------------------------------
 *  Routes:
 *    GET /health
 *    GET /search?q=<query>&limit=10&hl=en&gl=US
 *    GET /video?id=<videoId>&hl=en&gl=US
 *    GET /stream?id=<videoId>&itag=<optional>
 *    GET /audio?id=<videoId>&itag=<optional>
 *    GET /redirect?id=<videoId>&itag=<optional>
 *    GET /proxy?id=<videoId>&itag=<optional>
 *    OPTIONS /
 * ============================================================
 */

const VERSION = "1.0.0";

/* -------------------- InnerTube Clients -------------------- */

const CLIENTS = {
  ANDROID: {
    key: "AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w",
    clientName: "ANDROID",
    clientVersion: "20.01.35",
    xYouTubeClientName: "3",
    userAgent: "com.google.android.youtube/20.01.35 (Linux; U; Android 12) gzip",
    extra: { androidSdkVersion: 31, osName: "Android", osVersion: "12" },
  },
  IOS: {
    key: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    clientName: "IOS",
    clientVersion: "20.01.2",
    xYouTubeClientName: "5",
    userAgent: "com.google.ios.youtube/20.01.2 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X)",
    extra: { deviceModel: "iPhone16,2", osName: "iOS", osVersion: "18.2" },
  },
  TVHTML5_SIMPLY_EMBEDDED_PLAYER: {
    key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    clientVersion: "2.0",
    xYouTubeClientName: "85",
    userAgent: "Mozilla/5.0 (PlayStation; PlayStation 4 10.01) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0 Safari/605.1.15",
    extra: {},
  },
  WEB: {
    key: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    clientName: "WEB",
    clientVersion: "2.20250224.01.00",
    xYouTubeClientName: "1",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    extra: {},
  },
};

// Maximum 4 clients tried per request
const PLAYER_CLIENT_ORDER = [
  "ANDROID",
  "IOS",
  "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
  "WEB",
];

/* -------------------- Circuit Breaker Cache -------------------- */

// Short-lived in-memory cache for recent video failure statuses to avoid hammering upstream
const FAILURE_CACHE = new Map(); // videoId -> { status, reason, code, expiresAt }
const FAILURE_TTL_MS = 30 * 1000; // 30 seconds

function checkCircuitBreaker(videoId) {
  const cached = FAILURE_CACHE.get(videoId);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      return cached;
    }
    FAILURE_CACHE.delete(videoId);
  }
  return null;
}

function recordCircuitBreakerFailure(videoId, errorObj) {
  FAILURE_CACHE.set(videoId, {
    error: errorObj.error,
    code: errorObj.code,
    status: errorObj.status,
    detail: errorObj.detail || null,
    expiresAt: Date.now() + FAILURE_TTL_MS,
  });
}

/* -------------------- Visitor Data Cache -------------------- */

const VISITOR_CACHE = {}; // clientName -> { data, timestamp }
const VISITOR_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function fetchVisitorData(c) {
  const cached = VISITOR_CACHE[c.clientName];
  if (cached && Date.now() - cached.timestamp < VISITOR_TTL_MS) {
    return cached.data;
  }
  try {
    const url =
      "https://www.youtube.com/youtubei/v1/visitor_id?key=" +
      c.key +
      "&prettyPrint=false";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
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
      signal: controller.signal,
    });
    clearTimeout(timeout);
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
    hl: hl || "en",
    gl: gl || "US",
    utcOffsetMinutes: 0,
  };
  if (visitorData) client.visitorData = visitorData;
  Object.assign(client, c.extra);
  return { client };
}

function buildHeaders(c, visitorData) {
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": c.userAgent,
    "X-YouTube-Client-Name": c.xYouTubeClientName,
    "X-YouTube-Client-Version": c.clientVersion,
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://www.youtube.com",
    Referer: "https://www.youtube.com/",
  };
  if (visitorData) headers["X-Goog-Visitor-Id"] = visitorData;
  return headers;
}

async function innertube(endpoint, clientName, bodyExtra, hl, gl, retries = 2) {
  const c = CLIENTS[clientName];
  if (!c) throw new Error("Unknown InnerTube client: " + clientName);

  const visitorData = await fetchVisitorData(c);
  const url =
    "https://www.youtube.com/youtubei/v1/" +
    endpoint +
    "?key=" +
    c.key +
    "&prettyPrint=false";

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 200));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s per request timeout

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: buildHeaders(c, visitorData),
        body: JSON.stringify({
          context: buildContext(c, hl, gl, visitorData),
          ...bodyExtra,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        lastError = new Error("UPSTREAM_RATE_LIMITED: YouTube returned HTTP 429");
        continue; // retry
      }

      if (res.status >= 500) {
        lastError = new Error("UPSTREAM_ERROR: YouTube returned HTTP " + res.status);
        continue; // retry
      }

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      return await res.json();
    } catch (e) {
      clearTimeout(timeout);
      if (e.name === "AbortError") {
        lastError = new Error("UPSTREAM_TIMEOUT: Upstream request timed out");
      } else {
        lastError = e;
      }
      if (attempt === retries) throw lastError;
    }
  }
  throw lastError || new Error("Upstream request failed");
}

/* -------------------- Playability Status Mapping -------------------- */

function mapPlayabilityStatus(playability) {
  if (!playability) return null;
  const status = playability.status;
  const reason = playability.reason || playability.messages?.join(", ") || null;

  if (status === "OK") {
    return { ok: true, status: "OK", reason: null };
  }

  const reasonLower = (reason || "").toLowerCase();

  if (status === "LOGIN_REQUIRED") {
    if (reasonLower.includes("age") || reasonLower.includes("verify your age")) {
      return {
        ok: false,
        code: "AGE_RESTRICTED",
        status: 403,
        error: "This video is age-restricted and requires account verification.",
        reason: reason,
      };
    }
    return {
      ok: false,
      code: "LOGIN_REQUIRED",
      status: 403,
      error: "This video requires YouTube login session.",
      reason: reason,
    };
  }

  if (status === "UNPLAYABLE") {
    if (reasonLower.includes("country") || reasonLower.includes("region") || reasonLower.includes("available in your")) {
      return {
        ok: false,
        code: "REGION_RESTRICTED",
        status: 403,
        error: "This video is restricted in your region.",
        reason: reason,
      };
    }
    if (reasonLower.includes("private")) {
      return {
        ok: false,
        code: "VIDEO_PRIVATE",
        status: 403,
        error: "This video is private.",
        reason: reason,
      };
    }
    if (reasonLower.includes("payment") || reasonLower.includes("premium") || reasonLower.includes("purchase")) {
      return {
        ok: false,
        code: "VIDEO_UNAVAILABLE",
        status: 403,
        error: "This video requires payment or Premium subscription.",
        reason: reason,
      };
    }
    return {
      ok: false,
      code: "VIDEO_UNAVAILABLE",
      status: 403,
      error: reason || "This video is unplayable.",
      reason: reason,
    };
  }

  if (status === "ERROR") {
    return {
      ok: false,
      code: "VIDEO_NOT_FOUND",
      status: 404,
      error: reason || "Video not found or unavailable.",
      reason: reason,
    };
  }

  return {
    ok: false,
    code: "VIDEO_UNAVAILABLE",
    status: 403,
    error: reason || "Video is unavailable.",
    reason: reason,
  };
}

/* -------------------- Player Fallback Handler -------------------- */

async function playerWithFallback(videoId, hl, gl) {
  // Check circuit breaker first
  const broken = checkCircuitBreaker(videoId);
  if (broken) {
    const e = new Error(broken.error);
    e.code = broken.code;
    e.status = broken.status;
    e.detail = broken.detail;
    throw e;
  }

  const errors = [];
  let bestFailure = null;

  for (const name of PLAYER_CLIENT_ORDER) {
    try {
      const data = await innertube(
        "player",
        name,
        { videoId: videoId, contentCheckOk: true, racyCheckOk: true },
        hl,
        gl
      );

      const playability = mapPlayabilityStatus(data?.playabilityStatus);
      if (playability && !playability.ok) {
        console.warn(`[Fallback Log] Client ${name} playability status for ${videoId}: ${playability.code} - ${playability.error}`);
        clearVisitorData(name);
        bestFailure = playability;
        errors.push(`${name}: ${playability.code}`);
        continue;
      }

      if (data && data.streamingData) {
        const formats = listFormats(data);
        if (formats.length > 0) {
          return { data: data, client: name, playability: playability };
        }
      }

      console.warn(`[Fallback Log] Client ${name} returned no valid streamingData for ${videoId}`);
      clearVisitorData(name);
      errors.push(`${name}: NO_STREAMING_DATA`);
    } catch (e) {
      console.warn(`[Fallback Log] Client ${name} failed for ${videoId}: ${e.message}`);
      clearVisitorData(name);
      errors.push(`${name}: ${e.message}`);
    }
  }

  if (bestFailure) {
    recordCircuitBreakerFailure(videoId, bestFailure);
    const err = new Error(bestFailure.error);
    err.code = bestFailure.code;
    err.status = bestFailure.status;
    err.detail = bestFailure.reason;
    throw err;
  }

  const failObj = {
    error: "No streaming data available for this video across InnerTube clients.",
    code: "NO_STREAMING_DATA",
    status: 404,
    detail: errors.join(" | "),
  };
  recordCircuitBreakerFailure(videoId, failObj);

  const err = new Error(failObj.error);
  err.code = failObj.code;
  err.status = failObj.status;
  err.detail = failObj.detail;
  throw err;
}

/* -------------------- Format Parsing & Helpers -------------------- */

function extractMediaUrl(f) {
  if (f.url) {
    try {
      const parsed = new URL(f.url);
      if (parsed.protocol === "https:") return parsed.toString();
    } catch (e) {
      return null;
    }
  }

  const raw = f.signatureCipher || f.cipher;
  if (!raw) return null;

  try {
    const params = new URLSearchParams(raw);
    const u = params.get("url");
    if (!u) return null;

    const parsedUrl = new URL(u);
    if (parsedUrl.protocol !== "https:") return null;

    const sig = params.get("sig") || params.get("signature");
    const sp = params.get("sp") || "signature";

    if (sig) {
      parsedUrl.searchParams.set(sp, sig);
    }
    return parsedUrl.toString();
  } catch (e) {
    return null;
  }
}

function normalizeFormat(f) {
  const mime = f.mimeType || "";
  const mediaUrl = extractMediaUrl(f);
  if (!mediaUrl) return null;

  return {
    itag: f.itag,
    mimeType: mime,
    isAudio: mime.indexOf("audio/") === 0,
    hasVideo: mime.indexOf("video/") === 0,
    bitrate: f.bitrate || f.averageBitrate || 0,
    averageBitrate: f.averageBitrate || 0,
    codecs: (mime.match(/codecs="([^"]+)"/) || [])[1] || null,
    quality: f.quality || null,
    qualityLabel: f.qualityLabel || null,
    audioQuality: f.audioQuality || null,
    audioSampleRate: f.audioSampleRate || null,
    channels: f.audioChannels || null,
    approxDurationMs: Number(f.approxDurationMs || 0),
    contentLength: f.contentLength || null,
    url: mediaUrl,
  };
}

function listFormats(data) {
  const sd = data.streamingData || {};
  const raw = (sd.formats || []).concat(sd.adaptiveFormats || []);
  return raw.map(normalizeFormat).filter((f) => f !== null && !!f.url);
}

function chooseAudio(formats, preferItag) {
  const audio = formats.filter((f) => f.isAudio);
  const pool = audio.length ? audio : formats;

  if (preferItag) {
    const exact = pool.find((f) => String(f.itag) === String(preferItag));
    if (exact) return exact;
  }

  // Selection priority specified in requirements:
  // 1. Requested itag
  // 2. 251 - Opus audio
  // 3. 140 - M4A/AAC audio
  // 4. 250 - Opus lower bitrate
  // 5. 139 - M4A lower bitrate
  // 6. Highest available audio bitrate
  const priorityItags = [251, 140, 250, 139];
  for (const tag of priorityItags) {
    const hit = pool.find((f) => f.itag === tag);
    if (hit) return hit;
  }

  return pool.slice().sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0] || null;
}

function parseDuration(text) {
  if (!text) return 0;
  const parts = String(text).split(":").map(Number);
  return parts.reduce((acc, n) => acc * 60 + (n || 0), 0);
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
    isLiveContent: !!vd.isLiveContent,
    thumbnails: (vd.thumbnail && vd.thumbnail.thumbnails) || [],
    publishDate: mf.publishDate || null,
    category: mf.category || null,
    keywords: vd.keywords || [],
  };
}

/* -------------------- Search Parsing -------------------- */

function normalizeVideoRenderer(vr) {
  const thumb = (vr.thumbnail && (vr.thumbnail.thumbnails || [])) || [];
  const title =
    (vr.title &&
      (vr.title.simpleText ||
        (vr.title.runs && vr.title.runs[0] && vr.title.runs[0].text))) ||
    null;
  const channel =
    (vr.ownerText && vr.ownerText.runs && vr.ownerText.runs[0] && vr.ownerText.runs[0].text) ||
    (vr.longBylineText &&
      vr.longBylineText.runs &&
      vr.longBylineText.runs[0] &&
      vr.longBylineText.runs[0].text) ||
    (vr.shortBylineText &&
      vr.shortBylineText.runs &&
      vr.shortBylineText.runs[0] &&
      vr.shortBylineText.runs[0].text) ||
    null;
  const channelId =
    (vr.ownerText &&
      vr.ownerText.runs &&
      vr.ownerText.runs[0] &&
      vr.ownerText.runs[0].navigationEndpoint?.browseEndpoint?.browseId) ||
    null;
  const lengthText = (vr.lengthText && vr.lengthText.simpleText) || null;
  return {
    id: vr.videoId,
    title: title,
    author: channel,
    channelId: channelId,
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
    const rows = meta.metadata?.contentMetadataViewModel?.metadataRows || [];
    for (const row of rows) {
      const parts = row.metadataParts || [];
      for (const p of parts) {
        const t = p.text && p.text.content;
        if (!t) continue;
        if (!author) author = t;
        else if (!views) views = t;
      }
    }
  } catch (e) {
    /* ignore */
  }
  let thumbnail = null;
  try {
    const srcs = lk.contentImage?.thumbnailViewModel?.image?.sources || [];
    if (srcs.length) thumbnail = srcs[srcs.length - 1].url;
  } catch (e) {
    /* ignore */
  }
  return {
    id: lk.contentId,
    title: title,
    author: author,
    channelId: null,
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
  if (
    node.lockupViewModel &&
    node.lockupViewModel.contentId &&
    !seen.has(node.lockupViewModel.contentId)
  ) {
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

/* -------------------- Response Helpers -------------------- */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

function json(data, status = 200, extraHeaders = {}) {
  const headers = Object.assign(
    { "Content-Type": "application/json; charset=utf-8" },
    CORS_HEADERS,
    extraHeaders
  );
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function err(message, code = "INTERNAL_ERROR", status = 500, detail = null) {
  return json(
    {
      ok: false,
      error: message,
      code: code,
      detail: detail,
      version: VERSION,
    },
    status
  );
}

/* -------------------- Input Validation Helpers -------------------- */

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const PARAM_PATTERN = /^[a-zA-Z0-9_-]{2,10}$/;

function extractVideoId(input) {
  if (!input) return null;
  const str = String(input).trim();
  if (VIDEO_ID_REGEX.test(str)) return str;

  try {
    const urlStr = str.startsWith("http://") || str.startsWith("https://") ? str : "https://" + str;
    const url = new URL(urlStr);

    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtube-nocookie.com")) {
      if (url.pathname === "/watch") {
        const v = url.searchParams.get("v");
        if (v && VIDEO_ID_REGEX.test(v)) return v;
      }
      const match = url.pathname.match(/^\/(?:embed|v|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      if (match && match[1]) return match[1];
    }
    if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
      const id = url.pathname.replace(/^\/+/, "").split("/")[0];
      if (id && VIDEO_ID_REGEX.test(id)) return id;
    }
  } catch (e) {
    /* ignore invalid URL parsing */
  }

  return null;
}

function validateVideoId(raw) {
  if (!raw) {
    return { ok: false, error: err("Missing 'id' parameter", "MISSING_PARAMETER", 400) };
  }
  const extracted = extractVideoId(raw);
  if (!extracted) {
    return { ok: false, error: err("Invalid YouTube video ID format", "INVALID_VIDEO_ID", 400) };
  }
  return { ok: true, id: extracted };
}

function validateLanguageCode(val, fallback) {
  if (!val) return fallback;
  if (PARAM_PATTERN.test(val)) return val;
  return fallback;
}

/* -------------------- Caching Wrapper -------------------- */

async function withCache(request, ctx, ttl, producer) {
  const cache = typeof caches !== "undefined" && caches.default ? caches.default : null;
  let key = null;

  if (cache) {
    try {
      const cacheUrl = new URL(request.url);
      key = new Request(cacheUrl.toString(), { method: "GET" });

      const hit = await cache.match(key);
      if (hit) {
        const bodyText = await hit.text();
        try {
          const parsed = JSON.parse(bodyText);
          parsed.cached = true;
          return json(parsed, hit.status, { "X-Cache": "HIT" });
        } catch (e) {
          const headers = new Headers(hit.headers);
          headers.set("X-Cache", "HIT");
          return new Response(bodyText, { status: hit.status, headers });
        }
      }
    } catch (e) {
      /* ignore cache read errors */
    }
  }

  const result = await producer();

  if (result && result.ok === false) {
    return err(result.error, result.code, result.status || 502, result.detail);
  }

  const responseData = Object.assign({}, result, { cached: false });
  const res = json(responseData, 200, {
    "Cache-Control": "public, max-age=" + ttl,
    "X-Cache": "MISS",
  });

  if (cache && key && ctx && typeof ctx.waitUntil === "function") {
    try {
      ctx.waitUntil(cache.put(key, res.clone()));
    } catch (e) {
      /* ignore cache put errors */
    }
  }

  return res;
}

/* -------------------- Route Handlers -------------------- */

async function handleSearch(url, request, env, ctx) {
  const q = url.searchParams.get("q");
  if (!q) return err("Missing 'q' parameter", "MISSING_PARAMETER", 400);

  const trimmedQuery = q.trim();
  if (!trimmedQuery) return err("Missing 'q' parameter", "MISSING_PARAMETER", 400);
  if (trimmedQuery.length > 200) {
    return err("Query parameter 'q' exceeds maximum length of 200 characters", "INVALID_PARAMETER", 400);
  }

  const rawLimit = Number(url.searchParams.get("limit") || 10);
  const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 10 : rawLimit, 50));
  const hl = validateLanguageCode(url.searchParams.get("hl"), env.DEFAULT_HL || "en");
  const gl = validateLanguageCode(url.searchParams.get("gl"), env.DEFAULT_GL || "US");
  const pageToken = url.searchParams.get("pageToken") || null;

  return withCache(request, ctx, 300, async function () {
    try {
      const bodyExtra = {
        query: trimmedQuery,
        params: "EgIQAQ%3D%3D", // filter: videos only
      };
      if (pageToken) bodyExtra.continuation = pageToken;

      const data = await innertube("search", "WEB", bodyExtra, hl, gl);
      const results = parseSearch(data, limit);
      return {
        ok: true,
        query: trimmedQuery,
        count: results.length,
        results: results,
        continuation: null,
      };
    } catch (e) {
      const code = e.code || "UPSTREAM_ERROR";
      const status = e.status || 502;
      return { ok: false, status, code, error: "Search failed", detail: e.message };
    }
  });
}

async function handleVideo(url, request, env, ctx) {
  const idVal = validateVideoId(url.searchParams.get("id"));
  if (!idVal.ok) return idVal.error;
  const id = idVal.id;

  const hl = validateLanguageCode(url.searchParams.get("hl"), env.DEFAULT_HL || "en");
  const gl = validateLanguageCode(url.searchParams.get("gl"), env.DEFAULT_GL || "US");

  return withCache(request, ctx, 1800, async function () {
    try {
      const r = await playerWithFallback(id, hl, gl);
      return {
        ok: true,
        client: r.client,
        video: videoMeta(r.data),
        playability: {
          status: r.playability?.status || "OK",
          reason: r.playability?.reason || null,
        },
      };
    } catch (e) {
      return {
        ok: false,
        status: e.status || 502,
        code: e.code || "UPSTREAM_ERROR",
        error: e.message || "Failed to fetch video details",
        detail: e.detail || null,
      };
    }
  });
}

async function handleStream(url, request, env, ctx) {
  const idVal = validateVideoId(url.searchParams.get("id"));
  if (!idVal.ok) return idVal.error;
  const id = idVal.id;

  const itag = url.searchParams.get("itag") || null;
  const hl = validateLanguageCode(url.searchParams.get("hl"), env.DEFAULT_HL || "en");
  const gl = validateLanguageCode(url.searchParams.get("gl"), env.DEFAULT_GL || "US");

  return withCache(request, ctx, 300, async function () {
    try {
      const r = await playerWithFallback(id, hl, gl);
      let formats = listFormats(r.data);
      if (itag) {
        formats = formats.filter((f) => String(f.itag) === String(itag));
      }
      if (formats.length === 0) {
        return {
          ok: false,
          status: 404,
          code: "NO_STREAMING_DATA",
          error: "No playable media formats found for the requested criteria",
        };
      }
      return {
        ok: true,
        client: r.client,
        video: videoMeta(r.data),
        formats: formats,
      };
    } catch (e) {
      return {
        ok: false,
        status: e.status || 502,
        code: e.code || "UPSTREAM_ERROR",
        error: e.message || "Failed to fetch stream details",
        detail: e.detail || null,
      };
    }
  });
}

async function resolveAudioStream(id, itag, hl, gl) {
  const r = await playerWithFallback(id, hl, gl);
  const formats = listFormats(r.data);
  const best = chooseAudio(formats, itag);
  if (!best || !best.url) {
    const errObj = new Error("No playable audio format found for this video");
    errObj.code = "NO_AUDIO_FORMAT";
    errObj.status = 404;
    throw errObj;
  }
  return {
    audio: best,
    client: r.client,
    data: r.data,
  };
}

async function handleAudio(url, request, env, ctx) {
  const idVal = validateVideoId(url.searchParams.get("id"));
  if (!idVal.ok) return idVal.error;
  const id = idVal.id;

  const itag = url.searchParams.get("itag");
  const hl = validateLanguageCode(url.searchParams.get("hl"), env.DEFAULT_HL || "en");
  const gl = validateLanguageCode(url.searchParams.get("gl"), env.DEFAULT_GL || "US");

  return withCache(request, ctx, 300, async function () {
    try {
      const res = await resolveAudioStream(id, itag, hl, gl);
      const meta = videoMeta(res.data);
      return {
        ok: true,
        client: res.client,
        video: {
          id: meta.id,
          title: meta.title,
          author: meta.author,
          lengthSeconds: meta.lengthSeconds,
        },
        audio: res.audio,
        expiresHint: "Media URLs are temporary and should be refreshed when expired",
      };
    } catch (e) {
      return {
        ok: false,
        status: e.status || 502,
        code: e.code || "UPSTREAM_ERROR",
        error: e.message || "Failed to fetch audio stream",
        detail: e.detail || null,
      };
    }
  });
}

async function handleRedirect(url, request, env) {
  const idVal = validateVideoId(url.searchParams.get("id"));
  if (!idVal.ok) return idVal.error;
  const id = idVal.id;

  const itag = url.searchParams.get("itag");
  const hl = validateLanguageCode(url.searchParams.get("hl"), env.DEFAULT_HL || "en");
  const gl = validateLanguageCode(url.searchParams.get("gl"), env.DEFAULT_GL || "US");

  try {
    const res = await resolveAudioStream(id, itag, hl, gl);
    return new Response(null, {
      status: 302,
      headers: Object.assign({ Location: res.audio.url }, CORS_HEADERS, {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      }),
    });
  } catch (e) {
    return err(
      e.message || "Failed to resolve redirect target",
      e.code || "UPSTREAM_ERROR",
      e.status || 502,
      e.detail || null
    );
  }
}

async function handleProxy(url, request, env) {
  const idVal = validateVideoId(url.searchParams.get("id"));
  if (!idVal.ok) return idVal.error;
  const id = idVal.id;

  const itag = url.searchParams.get("itag");
  const hl = validateLanguageCode(url.searchParams.get("hl"), env.DEFAULT_HL || "en");
  const gl = validateLanguageCode(url.searchParams.get("gl"), env.DEFAULT_GL || "US");

  // Helper to obtain a fresh audio stream resolution
  async function getFreshAudioStream() {
    return await resolveAudioStream(id, itag, hl, gl);
  }

  let streamInfo;
  try {
    streamInfo = await getFreshAudioStream();
  } catch (e) {
    return err(
      e.message || "Failed to retrieve audio stream for proxy",
      e.code || "UPSTREAM_ERROR",
      e.status || 502,
      e.detail || null
    );
  }

  let mediaUrl = streamInfo.audio.url;
  let clientName = streamInfo.client;

  // SSRF Protection: Ensure target media URL is a valid googlevideo HTTPS URL
  function isValidMediaUrl(targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      return parsed.protocol === "https:" && parsed.hostname.endsWith(".googlevideo.com");
    } catch (e) {
      return false;
    }
  }

  if (!isValidMediaUrl(mediaUrl)) {
    return err("Access denied: Invalid media target host", "PROXY_ERROR", 403);
  }

  let rangeHeader = request.headers.get("Range") || request.headers.get("range");
  if (!rangeHeader) {
    // If client does not send Range header, default to initial 1MB range
    // to avoid full unbounded stream requests
    rangeHeader = "bytes=0-1048575";
  }

  async function fetchUpstream(targetUrl, currentClientName) {
    const clientUA =
      (CLIENTS[currentClientName] && CLIENTS[currentClientName].userAgent) ||
      CLIENTS.ANDROID.userAgent;

    const upstreamHeaders = {
      "User-Agent": clientUA,
      "Accept": request.headers.get("Accept") || "*/*",
      "Range": rangeHeader,
      "Accept-Encoding": "identity",
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(targetUrl, {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers: upstreamHeaders,
        redirect: "follow",
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  }

  try {
    let upstreamRes = await fetchUpstream(mediaUrl, clientName);

    // If upstream returns 403, retry ONCE with a freshly resolved media URL
    if (upstreamRes.status === 403) {
      for (const name of PLAYER_CLIENT_ORDER) {
        clearVisitorData(name);
      }
      try {
        const retryStreamInfo = await getFreshAudioStream();
        if (retryStreamInfo && retryStreamInfo.audio && isValidMediaUrl(retryStreamInfo.audio.url)) {
          mediaUrl = retryStreamInfo.audio.url;
          clientName = retryStreamInfo.client;
          upstreamRes = await fetchUpstream(mediaUrl, clientName);
        }
      } catch (retryErr) {
        /* If re-resolution fails, handle below based on upstream status */
      }

      if (upstreamRes.status === 403) {
        return err("Upstream media access forbidden", "PROXY_ERROR", 403);
      }
    }

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      if (upstreamRes.status === 404) {
        return err("Upstream media stream not found", "PROXY_ERROR", 404);
      }
      return err("Upstream returned HTTP " + upstreamRes.status, "PROXY_ERROR", 502);
    }

    const outHeaders = new Headers(CORS_HEADERS);
    const headersToForward = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
      "last-modified",
      "etag",
    ];

    for (const h of headersToForward) {
      const v = upstreamRes.headers.get(h);
      if (v) outHeaders.set(h, v);
    }

    if (!outHeaders.has("accept-ranges")) {
      outHeaders.set("accept-ranges", "bytes");
    }

    if (!outHeaders.has("cache-control")) {
      outHeaders.set("cache-control", "no-cache, no-store, must-revalidate");
    }

    return new Response(request.method === "HEAD" ? null : upstreamRes.body, {
      status: upstreamRes.status,
      headers: outHeaders,
    });
  } catch (e) {
    if (e.name === "AbortError") {
      return err("Upstream stream response timed out", "UPSTREAM_TIMEOUT", 504);
    }
    return err("Proxy network failure: " + e.message, "PROXY_ERROR", 502);
  }
}

/* -------------------- Entrypoint -------------------- */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // OPTIONS handler for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return err("Method not allowed", "INVALID_PARAMETER", 405);
    }

    const path = url.pathname.replace(/^\/+/, "/").replace(/\/+$/, "") || "/";

    // /health endpoint - no external calls required
    if (path === "/health" || path === "/") {
      return json({
        ok: true,
        service: "yt-innertube-api",
        version: VERSION,
        runtime: "cloudflare-workers",
        clients: PLAYER_CLIENT_ORDER,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      switch (path) {
        case "/search":
          return await handleSearch(url, request, env, ctx);
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
          return err("Route not found: " + path, "INVALID_PARAMETER", 404);
      }
    } catch (e) {
      return err("Unexpected internal error", "INTERNAL_ERROR", 500, String(e.message || e));
    }
  },
};
