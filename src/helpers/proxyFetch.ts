/**
 * proxyFetch — Smart HTTP fetch dengan Cloudflare Workers proxy fallback
 *
 * - Di localhost (NODE_ENV=development): fetch langsung, no proxy
 * - Di Vercel / production: route lewat CF Worker jika CF_PROXY_URL di-set
 *
 * Setup:
 *   1. Deploy cf-worker-proxy.js ke Cloudflare Workers
 *   2. Set env var: CF_PROXY_URL=https://your-worker.workers.dev
 *   3. Semua scraper otomatis pakai proxy saat di Vercel
 */

const CF_PROXY_URL = process.env.CF_PROXY_URL?.replace(/\/$/, "");
const IS_VERCEL    = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const USE_PROXY    = Boolean(CF_PROXY_URL && IS_VERCEL);

export interface ProxyFetchOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * Fetch URL dengan proxy jika di Vercel & CF_PROXY_URL di-set.
 * Drop-in replacement untuk `fetch()` di scraper context.
 */
export async function proxyFetch(
  targetUrl: string,
  opts: ProxyFetchOptions = {}
): Promise<Response> {
  const { method = "GET", headers = {}, body, timeout = 15000 } = opts;
  const signal = AbortSignal.timeout(timeout);

  if (USE_PROXY) {
    // Route melalui Cloudflare Worker proxy
    const proxyUrl = buildProxyUrl(targetUrl, headers["Referer"]);

    console.log(`[proxyFetch] Via CF proxy → ${targetUrl}`);

    const proxyHeaders: Record<string, string> = {
      "Content-Type": headers["Content-Type"] || "text/html",
    };

    // Forward request-specific headers ke proxy
    const specialHeaders = ["x-requested-with", "x-xsrf-token", "cookie", "origin"];
    for (const h of specialHeaders) {
      const lower = h.toLowerCase();
      const val   = headers[h] || headers[lower];
      if (val) proxyHeaders[lower] = val;
    }

    return fetch(proxyUrl, {
      method,
      headers: proxyHeaders,
      ...(method !== "GET" && body !== undefined ? { body } : {}),
      signal,
    });
  }

  // Direct fetch (localhost / non-Vercel env)
  console.log(`[proxyFetch] Direct → ${targetUrl}`);
  return fetch(targetUrl, {
    method,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      ...headers,
    },
    ...(method !== "GET" && body !== undefined ? { body } : {}),
    signal,
  });
}

/**
 * Build proxied URL: https://worker.dev?url=<encoded>&ref=<referer>
 */
function buildProxyUrl(targetUrl: string, referer?: string): string {
  const params = new URLSearchParams({ url: targetUrl });
  if (referer) params.set("ref", referer);
  return `${CF_PROXY_URL}?${params.toString()}`;
}

/** Utility: apakah saat ini berjalan di Vercel? */
export const isVercel = IS_VERCEL;

/** Utility: apakah proxy aktif? */
export const isUsingProxy = USE_PROXY;

export { CF_PROXY_URL };
