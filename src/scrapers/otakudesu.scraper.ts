import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";

// ⚠️ PASTE URL WORKER CLOUDFLARE KAMU DI SINI (JANGAN SAMPAI SALAH)
// Contoh: "https://eter.massurya709.workers.dev"
const PROXY_URL = "https://URL-WORKER-YANG-KAMU-BUAT-TADI.workers.dev"; 

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default async function getHTML(
  baseUrl: string,
  pathname: string,
  ref?: string,
  sanitize = false
): Promise<string> {
  // 1. Gabungkan URL Asli Otakudesu
  const targetUrl = new URL(pathname, baseUrl).toString();

  // 2. Bungkus dengan Proxy Cloudflare Worker
  // Hasilnya jadi: https://worker.dev?url=https://otakudesu.cloud/...
  const finalUrl = `${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;

  console.log(`[PROXY] Fetching via Worker: ${finalUrl}`);

  // Headers kita kosongkan sebagian biar Worker yang handle
  const headers: Record<string, string> = {
    "User-Agent": userAgent, // Sekedar identitas
  };

  const response = await fetch(finalUrl, { headers });

  if (!response.ok) {
    console.error(`[FAIL] Status: ${response.status} via Proxy`);
    // Tetap error handling standar
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
}
