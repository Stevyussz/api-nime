import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";

// Export userAgent untuk file lain
export const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export default async function getHTML(
  baseUrl: string,
  pathname: string,
  ref?: string,
  sanitize = false,
  headers: Record<string, string> = {}
): Promise<string> {
  // Normalise path: ensure trailing slash on /anime/ routes
  let cleanPath = pathname;
  if (cleanPath.includes("/anime/") && !cleanPath.endsWith("/")) {
    cleanPath += "/";
  }

  const targetUrl = new URL(cleanPath, baseUrl).toString();

  console.log(`[getHTML] Fetching: ${targetUrl}`);

  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": userAgent,
      "Referer": ref ?? baseUrl,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      ...headers,
    },
    // Node 18+ supports this natively
    // @ts-ignore — Node fetch signal for timeout
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw errorinCuy(response.status, `getHTML failed: ${response.status} ${response.statusText} — ${targetUrl}`);
  }

  return processResponse(response, sanitize);
}

async function processResponse(response: Response, sanitize: boolean): Promise<string> {
  const html = await response.text();
  if (!html.trim()) throw errorinCuy(404, "Empty HTML response");

  if (sanitize) {
    return sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "iframe"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        iframe: ["src", "width", "height"],
        img: ["src", "alt", "data-src"],
        "*": ["class", "id"],
      },
    });
  }
  return html;
}
