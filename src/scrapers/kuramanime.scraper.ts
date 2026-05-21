import kuramanimeConfig from "@configs/kuramanime.config.js";
import { parse, type HTMLElement } from "node-html-parser";

const { baseUrl } = kuramanimeConfig;

// User-Agent yang terlihat sah untuk Kuramanime
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Re-export untuk kompatibilitas file lain yang import userAgent dari sini
export const userAgent = UA;

const kuramanimeScraper = {
  /**
   * Fetch HTML page dan return parsed HTMLElement.
   * Menggunakan got-scraping langsung (bukan proxy) untuk reliabilitas.
   */
  async scrapeDOM(
    pathname: string,
    ref?: string,
    sanitize: boolean = false,
    headers: Record<string, string> = {}
  ): Promise<HTMLElement> {
    const { gotScraping } = await import("got-scraping");

    const url = new URL(pathname, baseUrl).toString();

    const response = await gotScraping({
      url,
      headers: {
        "Referer": ref ?? baseUrl,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
        ...headers,
      },
      headerGeneratorOptions: {
        browsers: [{ name: "chrome", minVersion: 120 }],
        devices: ["desktop"],
        locales: ["id-ID", "id", "en-US"],
        operatingSystems: ["windows"],
      },
      http2: true,
      https: { rejectUnauthorized: false }, // Kuramanime sering expired cert
      throwHttpErrors: true,
      timeout: { request: 15000 },
      retry: { limit: 2 },
    });

    return parse(response.body, { parseNoneClosedTags: true });
  },

  /**
   * Scrape secret key dari file .txt Kuramanime.
   * Digunakan untuk unlock episode/batch pages.
   */
  async scrapeSecret(ref?: string): Promise<string> {
    const { gotScraping } = await import("got-scraping");

    try {
      const url = new URL("/assets/Ks6sqSgloPTlHMl.txt", baseUrl).toString();
      const response = await gotScraping({
        url,
        headers: {
          "Referer": ref ?? baseUrl,
          "Accept": "text/plain,*/*;q=0.8",
        },
        headerGeneratorOptions: {
          browsers: [{ name: "chrome", minVersion: 120 }],
          devices: ["desktop"],
          locales: ["id-ID"],
          operatingSystems: ["windows"],
        },
        http2: true,
        https: { rejectUnauthorized: false },
        throwHttpErrors: true,
        timeout: { request: 8000 },
        retry: { limit: 1 },
      });

      const secret = response.body.trim();
      console.log("[Kuramanime] Secret fetched:", secret.slice(0, 20) + "...");
      return secret;
    } catch (e: any) {
      console.warn("[Kuramanime] Failed to fetch secret key:", e.message);
      return ""; // Graceful fallback
    }
  },

  /**
   * Ambil session cookie (XSRF-TOKEN + Laravel session) dari halaman episode.
   * Diperlukan agar request AJAX ke episode berhasil.
   */
  async scrapeSessionCookie(pathname: string): Promise<{ cookie: string; xsrfToken: string }> {
    const targetUrl = new URL(pathname, baseUrl).toString();

    try {
      const { gotScraping } = await import("got-scraping");

      // Fetch dengan redirect: manual agar bisa ambil Set-Cookie header
      const response = await gotScraping({
        url: targetUrl,
        method: "GET",
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        headerGeneratorOptions: {
          browsers: [{ name: "chrome", minVersion: 120 }],
          devices: ["desktop"],
          locales: ["id-ID"],
          operatingSystems: ["windows"],
        },
        http2: true,
        https: { rejectUnauthorized: false },
        throwHttpErrors: false,
        followRedirect: false, // manual redirect agar Set-Cookie tersedia
        timeout: { request: 10000 },
        retry: { limit: 0 },
      });

      // got-scraping returns headers as object; get set-cookie
      const rawSetCookie = response.headers["set-cookie"];
      if (!rawSetCookie) return { cookie: "", xsrfToken: "" };

      // Normalize: rawSetCookie bisa berupa string[] (got) atau string (node fetch)
      const cookieLines: string[] = Array.isArray(rawSetCookie)
        ? rawSetCookie
        : [rawSetCookie];

      const cookies: string[] = [];
      let xsrfToken = "";

      const reserved = /^(path|domain|expires|max-age|secure|httponly|samesite)$/i;

      for (const line of cookieLines) {
        // Setiap line adalah satu Set-Cookie header yang sudah dipisah
        const firstSemi = (line.split(";")[0] ?? "").trim();
        const eqIdx = firstSemi.indexOf("=");
        if (eqIdx === -1) continue;

        const key = firstSemi.slice(0, eqIdx).trim();
        const val = firstSemi.slice(eqIdx + 1).trim();

        if (key && !reserved.test(key)) {
          cookies.push(`${key}=${val}`);
          if (key === "XSRF-TOKEN") {
            xsrfToken = decodeURIComponent(val);
          }
        }
      }

      const sessionCookie = cookies.join("; ");
      console.log("[Kuramanime] Cookies captured:", sessionCookie.slice(0, 60) + "...");

      return { cookie: sessionCookie, xsrfToken };
    } catch (e: any) {
      console.warn("[Kuramanime] Failed to get session cookie:", e.message);
      return { cookie: "", xsrfToken: "" };
    }
  },
};

export default kuramanimeScraper;
