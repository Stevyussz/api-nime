import otakudesuConfig from "@configs/otakudesu.config.js";
import { parse, type HTMLElement } from "node-html-parser";

const { baseUrl } = otakudesuConfig;

// Use Android UA like AnimeSail/Cloudstream to bypass WAF
const mobileUA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

const otakudesuScraper = {
  async scrapeDOM(pathname: string, ref?: string, sanitize: boolean = false): Promise<HTMLElement> {

    // Dynamic import got-scraping
    const { gotScraping } = await import("got-scraping");

    // Ensure trailing slash for /anime/ endpoints to avoid redirect loops/drops
    let cleanPath = pathname;
    if (cleanPath.includes("/anime/") && !cleanPath.endsWith("/")) {
      cleanPath += "/";
    }

    const url = new URL(cleanPath, baseUrl).toString();
    const headers = {
      "User-Agent": mobileUA,
      "Referer": ref ? (ref.startsWith("http") ? ref : new URL(ref, baseUrl).toString()) : baseUrl,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
    };

    console.log(`[Otakudesu] Scraping ${url}`);

    try {
      const response = await gotScraping({
        url,
        headers,
        headerGeneratorOptions: {
          browsers: [{ name: 'chrome', minVersion: 110 }],
          devices: ['mobile'],
          locales: ['en-US', 'en'],
          operatingSystems: ['android'],
        },
        http2: false, // safer for many pirate sites
        https: { rejectUnauthorized: false }, // Fix CERT_HAS_EXPIRED
        throwHttpErrors: true,
        timeout: { request: 15000 },
        retry: { limit: 2 }
      });

      // Use node-html-parser
      return parse(response.body, { parseNoneClosedTags: true });
    } catch (error: any) {
      console.error(`[Otakudesu] Error scraping ${url}: ${error.message}`);
      throw error;
    }
  },

  async scrapeNonce(body: string, referer: string): Promise<{ data?: string }> {
    const { gotScraping } = await import("got-scraping");

    // Convert body string to search params if needed, or keep as string
    try {
      const response = await gotScraping.post({
        url: new URL("/wp-admin/admin-ajax.php", baseUrl).toString(),
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": mobileUA,
          "Referer": referer,
          "Origin": baseUrl,
          "X-Requested-With": "XMLHttpRequest"
        },
        http2: false
      });
      return JSON.parse(response.body) as { data: string };
    } catch (e) {
      return {};
    }
  },

  async scrapeServer(body: string, referer: string): Promise<{ data?: string }> {
    const { gotScraping } = await import("got-scraping");

    try {
      const response = await gotScraping.post({
        url: new URL("/wp-admin/admin-ajax.php", baseUrl).toString(),
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": mobileUA,
          "Origin": baseUrl,
          "Referer": referer,
          "X-Requested-With": "XMLHttpRequest"
        },
        http2: false
      });
      return JSON.parse(response.body) as { data: string };
    } catch (e) {
      return {};
    }
  },
};

export default otakudesuScraper;
