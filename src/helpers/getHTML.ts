import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";

// 👇 PASTE URL GOOGLE APPS SCRIPT KAMU DI SINI (JANGAN LUPA!)
const GOOGLE_PROXY_URL = "https://script.google.com/macros/s/AKfycbzK2ef-1RTJhpydV3JB-NZ44AvTPCQVlwXwn6FWxfqxFcPMFiVRWRIu8QcXNaeP7OTf9Q/exec"; 

// 👇 INI YANG TADI HILANG, KITA KEMBALIKAN SUPAYA TIDAK ERROR BUILD
export const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default async function getHTML(
  baseUrl: string,
  pathname: string,
  ref?: string,
  sanitize = false
): Promise<string> {
  // 1. Target URL Asli
  const targetUrl = new URL(pathname, baseUrl).toString();

  // 2. Tembak lewat Google Proxy
  const finalUrl = `${GOOGLE_PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;

  console.log(`[GOOGLE] Fetching: ${finalUrl}`);

  try {
    const response = await fetch(finalUrl);
    
    const html = await response.text();

    // Cek error dari Google Script
    if (html.startsWith("Error Fetching") || html.includes("403 Forbidden")) {
      console.error(`[GOOGLE FAIL] Blocked.`);
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
