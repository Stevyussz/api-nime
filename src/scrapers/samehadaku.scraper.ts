import samehadakuConfig from "@configs/samehadaku.config.js";
import { parse, type HTMLElement } from "node-html-parser";

const { baseUrl } = samehadakuConfig;

const samehadakuScraper = {
  async scrapeDOM(pathname: string, ref?: string, sanitize: boolean = false): Promise<HTMLElement> {
    const { gotScraping } = await import("got-scraping");

    const url = new URL(pathname, baseUrl).toString();
    const headers = {
      "Referer": ref ? (ref.startsWith("http") ? ref : new URL(ref, baseUrl).toString()) : baseUrl,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    };

    console.log(`[Samehadaku] Scraping ${url}`);

    try {
      const response = await gotScraping({
        url,
        headers,
        headerGeneratorOptions: {
          browsers: [{ name: "chrome", minVersion: 120 }, { name: "firefox", minVersion: 120 }],
          devices: ["desktop"],
          locales: ["id-ID", "id", "en-US", "en"],
          operatingSystems: ["windows", "linux"],
        },
        http2: true,
        https: { rejectUnauthorized: false },
        throwHttpErrors: true,
        timeout: { request: 15000 },
        retry: { limit: 2 },
      });

      return parse(response.body, { parseNoneClosedTags: true });
    } catch (error: any) {
      console.error(`[Samehadaku] Error scraping ${url}: ${error.message}`);
      throw error;
    }
  },

  async scrapeNonce(body: string, referer: string): Promise<{ data?: string }> {
    const { gotScraping } = await import("got-scraping");

    try {
      const response = await gotScraping.post({
        url: new URL("/wp-admin/admin-ajax.php", baseUrl).toString(),
        body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Referer": referer,
          "Origin": baseUrl,
          "X-Requested-With": "XMLHttpRequest",
        },
        http2: true,
        https: { rejectUnauthorized: false },
        headerGeneratorOptions: {
          browsers: [{ name: "chrome", minVersion: 120 }],
          devices: ["desktop"],
          locales: ["id-ID", "en-US"],
          operatingSystems: ["windows"],
        },
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
          "X-Requested-With": "XMLHttpRequest",
        },
        http2: true,
        https: { rejectUnauthorized: false },
        headerGeneratorOptions: {
          browsers: [{ name: "chrome", minVersion: 120 }],
          devices: ["desktop"],
          locales: ["id-ID", "en-US"],
          operatingSystems: ["windows"],
        },
      });
      return JSON.parse(response.body) as { data: string };
    } catch (e) {
      return {};
    }
  },
};

export default samehadakuScraper;
