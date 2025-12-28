import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";

// Kita pakai layanan gratis corsproxy.io
const PROXY_BASE = "https://corsproxy.io/?";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Export UserAgent biar file lain gak error
export const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default async function getHTML(
  baseUrl: string,
  pathname: string,
  ref?: string,
  sanitize = false
): Promise<string> {
  
  // 1. FIX PENTING: Paksa tambah garis miring (/) di akhir URL anime
  // Biar server Otakudesu gak perlu redirect (Redirect sering bikin 403)
  let cleanPath = pathname;
  if (cleanPath.includes("/anime/") && !cleanPath.endsWith("/")) {
    cleanPath += "/";
  }

  // Gabungkan URL asli
  const targetUrl = new URL(cleanPath, baseUrl).toString();
  
  // 2. Bungkus pakai Proxy
  const finalUrl = `${PROXY_BASE}${encodeURIComponent(targetUrl)}`;

  console.log(`[PROXY IO] Fetching: ${targetUrl}`);

  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    "Referer": baseUrl + "/", // Pura-pura dari Home
    "Origin": baseUrl
  };

  try {
    // Fetch ke Proxy
    const response = await fetch(finalUrl, { headers });

    // Kalau Proxy IO gagal (jarang terjadi), kita coba Direct Fetch sebagai fallback
    if (!response.ok) {
        console.error(`[PROXY FAIL] ${response.status}. Trying Direct Fetch...`);
        // Fallback: Coba tembak langsung (siapa tau URL + slash tadi ampuh)
        const directResp = await fetch(targetUrl, { headers });
        if (!directResp.ok) {
             directResp.status > 399 ? errorinCuy(directResp.status) : errorinCuy(404);
        }
        return processResponse(directResp, sanitize);
    }

    return processResponse(response, sanitize);

  } catch (err) {
    console.error("[FETCH ERROR]", err);
    throw err;
  }
}

// Fungsi bantu biar kodingan rapi
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
