/**
 * Cloudflare Worker — HTTP Proxy for api-nime scraper
 *
 * Deploy:
 *   1. Login ke https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Paste seluruh isi file ini
 *   3. Deploy → catat URL worker (contoh: https://api-nime-proxy.namakamu.workers.dev)
 *   4. Tambahkan ke Vercel env: CF_PROXY_URL=https://api-nime-proxy.namakamu.workers.dev
 *
 * Free tier: 100.000 requests/hari — lebih dari cukup untuk scraper.
 */

// Domain yang diizinkan untuk diproxy (whitelist keamanan)
const ALLOWED_DOMAINS = [
  "otakudesu.blog",
  "otakudesu.cloud",
  "otakudesu.lol",
  "otakudesu.best",
  "kuramanime.tel",
  "kuramanime.run",
  "samehadaku.how",
  "samehadaku.tv",
  "animesail.mov",
  "animesail.com",
  // Tambahkan domain baru di sini jika site pindah domain
];

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Requested-With, X-XSRF-Token, Cookie, Referer, Origin",
    "Access-Control-Expose-Headers": "Set-Cookie, X-Proxied-By",
  };
}

function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", proxy: "cf-worker" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    // Get target URL from query param
    const targetParam = url.searchParams.get("url");
    if (!targetParam) {
      return jsonError("Missing ?url= parameter", 400);
    }

    let targetUrl;
    try {
      targetUrl = new URL(targetParam);
    } catch {
      return jsonError("Invalid target URL", 400);
    }

    // Security: Whitelist check
    const hostname = targetUrl.hostname;
    const isAllowed = ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith("." + d)
    );
    if (!isAllowed) {
      return jsonError(`Domain not allowed: ${hostname}`, 403);
    }

    // Build headers to forward
    const forwardHeaders = {
      ...DEFAULT_HEADERS,
      Referer: targetUrl.origin + "/",
      Origin: targetUrl.origin,
    };

    // Forward special headers from original request
    const specialHeaders = [
      "x-requested-with",
      "x-xsrf-token",
      "cookie",
      "content-type",
    ];
    for (const header of specialHeaders) {
      const val = request.headers.get(header);
      if (val) forwardHeaders[header] = val;
    }

    // Override Referer if provided in query
    const referer = url.searchParams.get("ref");
    if (referer) forwardHeaders["Referer"] = referer;

    try {
      const proxyResponse = await fetch(targetUrl.toString(), {
        method: request.method,
        headers: forwardHeaders,
        body: request.method !== "GET" && request.method !== "HEAD"
          ? request.body
          : undefined,
        redirect: "follow",
      });

      // Build response headers — forward important ones
      const responseHeaders = {
        "Content-Type":
          proxyResponse.headers.get("Content-Type") || "text/html; charset=utf-8",
        "X-Proxied-By": "eternime-cf-worker",
        "X-Origin-Status": String(proxyResponse.status),
        ...corsHeaders(),
      };

      // Forward Set-Cookie (needed for session-based scrapers like Kuramanime)
      const setCookie = proxyResponse.headers.get("Set-Cookie");
      if (setCookie) {
        responseHeaders["Set-Cookie"] = setCookie;
        responseHeaders["X-Set-Cookie"] = setCookie; // Backup header (CF strips Set-Cookie on Worker responses)
      }

      // If target returned an error, still proxy it back
      return new Response(proxyResponse.body, {
        status: proxyResponse.status,
        headers: responseHeaders,
      });
    } catch (err) {
      console.error("[CF Worker] Proxy error:", err.message);
      return jsonError(`Proxy fetch failed: ${err.message}`, 502);
    }
  },
};
