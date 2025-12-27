import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";

// 👇 PASTE URL WORKER KAMU DI SINI
const PROXY_URL = "https://eter.massurya709.workers.dev"; 

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default async function getHTML(
  baseUrl: string,
  pathname: string,
  ref?: string,
  sanitize = false
): Promise<string> {
  // 1. Target URL Asli
  const targetUrl = new URL(pathname, baseUrl).toString();

  // 2. Bungkus pake Proxy Worker biar IP Vercel gak kelihatan
  const finalUrl = `${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;

  console.log(`[PROXY] Fetching: ${finalUrl}`);

  const headers: Record<string, string> = {
    "User-Agent": userAgent,
  };

  try {
    const response = await fetch(finalUrl, { headers });

    if (!response.ok) {
      console.error(`[FAIL] ${response.status} via Proxy`);
      response.status > 399 ? errorinCuy(response.status) : errorinCuy(404);
    }

    const html = await response.text();

    if (!html.trim()) errorinCuy(404);

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

    return html as string;
  } catch (err) {
    throw err;
  }
}
