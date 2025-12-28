import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";

// 👇 PASTE URL GOOGLE APPS SCRIPT KAMU DI SINI
// Contoh: "https://script.google.com/macros/s/AKfycbx.../exec"
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbzK2ef-1RTJhpydV3JB-NZ44AvTPCQVlwXwn6FWxfqxFcPMFiVRWRIu8QcXNaeP7OTf9Q/exec"; 

export default async function getHTML(
  baseUrl: string,
  pathname: string,
  ref?: string,
  sanitize = false
): Promise<string> {
  // 1. Target URL Asli
  const targetUrl = new URL(pathname, baseUrl).toString();

  // 2. Tembak lewat Google Proxy
  // Google akan fetch Otakudesu, lalu kirim HTML-nya ke kita
  const finalUrl = `${GOOGLE_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;

  console.log(`[GOOGLE] Fetching: ${finalUrl}`);

  try {
    // Kita fetch ke Google (Pasti 200 OK karena Google jarang down)
    const response = await fetch(finalUrl);
    
    // Ambil text HTML
    const html = await response.text();

    // Cek kalau Google gagal ambil (biasanya dia return pesan Error)
    if (html.startsWith("Error Fetching") || html.includes("403 Forbidden")) {
      console.error(`[GOOGLE FAIL] Target blocked even for Google.`);
      errorinCuy(403);
    }

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

    return html as string;
  } catch (err) {
    console.error("[FETCH ERROR]", err);
    throw err;
  }
}
