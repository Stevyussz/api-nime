import otakudesuConfig from "@configs/otakudesu.config.js";
import { parse, type HTMLElement } from "node-html-parser";

const { baseUrl } = otakudesuConfig;

// Use got-scraping defaults or custom options
// const mobileUA = "Mozilla/5.0 ..."; // Removed legacy UA

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
      "Referer": ref ? (ref.startsWith("http") ? ref : new URL(ref, baseUrl).toString()) : baseUrl,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Sec-Fetch-Site": "same-origin" // Since we provide the matching Referer
    };

    console.log(`[Otakudesu] Scraping ${url}`);

    try {
      const response = await gotScraping({
        url,
        headers,
        headerGeneratorOptions: {
          browsers: [{ name: 'chrome', minVersion: 120 }, { name: 'firefox', minVersion: 120 }],
          devices: ['desktop'],
          locales: ['en-US', 'en'],
          operatingSystems: ['windows', 'linux'],
        },
        http2: true, // Enable HTTP/2 for better masquerading
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
          "Referer": referer,
          "Origin": baseUrl,
          "X-Requested-With": "XMLHttpRequest"
        },
        http2: true,
        headerGeneratorOptions: {
          browsers: [{ name: 'chrome', minVersion: 120 }, { name: 'firefox', minVersion: 120 }],
          devices: ['desktop'],
          locales: ['en-US', 'en'],
          operatingSystems: ['windows', 'linux'],
        }
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
          "Origin": baseUrl,
          "Referer": referer,
          "X-Requested-With": "XMLHttpRequest"
        },
        http2: true,
        headerGeneratorOptions: {
          browsers: [{ name: 'chrome', minVersion: 120 }, { name: 'firefox', minVersion: 120 }],
          devices: ['desktop'],
          locales: ['en-US', 'en'],
          operatingSystems: ['windows', 'linux'],
        }
      });
      return JSON.parse(response.body) as { data: string };
    } catch (e) {
      return {};
    }
  },
};

export default otakudesuScraper;
