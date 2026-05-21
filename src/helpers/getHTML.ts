import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";

// Kita ganti proxy pake AllOrigins (Lebih stabil buat text HTML)
const PROXY_BASE = "https://api.allorigins.win/raw?url=";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Export userAgent biar gak error build di file lain
export const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default async function getHTML(
  baseUrl: string,
  pathname: string,
  ref?: string,
  sanitize = false,
  headers: Record<string, string> = {}
): Promise<string> {

  let cleanPath = pathname;
  if (cleanPath.includes("/anime/") && !cleanPath.endsWith("/")) {
    cleanPath += "/";
  }

  const targetUrl = new URL(cleanPath, baseUrl).toString();

  // 1. TRY DIRECT FETCH FIRST (Local IP usually cleaner)
  try {
    console.log(`[DIRECT] Fetching: ${targetUrl}`);
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": userAgent,
        "Referer": baseUrl,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        ...headers,
      }
    });

    if (!response.ok) {
      throw new Error(`Direct Fetch Failed: ${response.status}`);
    }

    return processResponse(response, sanitize);

  } catch (directError) {
    console.warn(`[DIRECT FAIL] ${directError}. Switch to Proxy...`);

    // 2. FALLBACK TO PROXY
    const finalUrl = `${PROXY_BASE}${encodeURIComponent(targetUrl)}`;
    try {
      const response = await fetch(finalUrl);
      if (!response.ok) {
        console.error(`[PROXY FAIL] ${response.status}`);
        response.status > 399 ? errorinCuy(response.status) : errorinCuy(404);
      }
      return processResponse(response, sanitize);
    } catch (proxyError) {
      console.error("[ALL FETCH FAILED]", proxyError);
      throw proxyError;
    }
  }
}

async function processResponse(response: Response, sanitize: boolean) {
  const html = await response.text();
  if (!html.trim()) errorinCuy(404, "Empty HTML");

  if (sanitize) {
    return sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "iframe"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        iframe: ["src", "width", "height"],
        img: ["src", "alt"],
        "*": ["class", "id"],
      },
    });
  }
  return html;
}
