import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";
// Kita ganti proxy pake AllOrigins (Lebih stabil buat text HTML)
const PROXY_BASE = "https://api.allorigins.win/raw?url=";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// Export userAgent biar gak error build di file lain
export const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
export default async function getHTML(baseUrl, pathname, ref, sanitize = false) {
    // 1. URL LOGIC: PAKSA TAMBAH GARIS MIRING (/)
    // Ini kuncinya bang. Kalau ini gak ada, lu kena redirect -> header ilang -> 403.
    let cleanPath = pathname;
    if (cleanPath.includes("/anime/") && !cleanPath.endsWith("/")) {
        cleanPath += "/";
    }
    // 2. Gabungin URL Target
    const targetUrl = new URL(cleanPath, baseUrl).toString();
    // 3. Bungkus pake AllOrigins Proxy
    const finalUrl = `${PROXY_BASE}${encodeURIComponent(targetUrl)}`;
    console.log(`[PROXY AllOrigins] Fetching: ${targetUrl}`);
    try {
        // Fetch ke Proxy
        const response = await fetch(finalUrl);
        if (!response.ok) {
            console.error(`[PROXY FAIL] ${response.status}`);
            // Kalau proxy gagal, coba tembak langsung (sebagai cadangan)
            const directResp = await fetch(targetUrl, {
                headers: { "User-Agent": userAgent }
            });
            if (!directResp.ok) {
                directResp.status > 399 ? errorinCuy(directResp.status) : errorinCuy(404);
            }
            return processResponse(directResp, sanitize);
        }
        return processResponse(response, sanitize);
    }
    catch (err) {
        console.error("[FETCH ERROR]", err);
        throw err;
    }
}
async function processResponse(response, sanitize) {
    const html = await response.text();
    if (!html.trim())
        errorinCuy(404, "Empty HTML");
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
