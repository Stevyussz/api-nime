import animesailConfig from "@configs/animesail.config.js";
import { parse, type HTMLElement } from "node-html-parser";
import { proxyFetch, isVercel } from "@helpers/proxyFetch.js";

const { baseUrl } = animesailConfig;

const MOBILE_UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const animesailScraper = {
  async scrapeDOM(pathname: string, ref?: string, sanitize: boolean = false): Promise<HTMLElement> {
    const url = new URL(pathname, baseUrl).toString();
    const referer = ref
      ? ref.startsWith("http") ? ref : new URL(ref, baseUrl).toString()
      : baseUrl;

    const headers: Record<string, string> = {
      "User-Agent": MOBILE_UA,
      "Referer": referer,
      "Cookie": "_as_ipin_ct=ID",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    };

    console.log(`[AnimeSail] Requesting ${url}`);

    // Di Vercel: route melalui CF Worker proxy (bypass datacenter IP block)
    if (isVercel) {
      const res = await proxyFetch(url, { headers });
      if (!res.ok) throw new Error(`AnimeSail: HTTP ${res.status} for ${url}`);
      const body = await res.text();
      return parse(body, { parseNoneClosedTags: true });
    }

    // Localhost: got-scraping dengan retry logic
    const { gotScraping } = await import("got-scraping");

    let lastError: Error = new Error("Scraping failed after 3 attempts");

    for (let i = 0; i < 3; i++) {
      try {
        const response = await gotScraping({
          url,
          headers,
          headerGeneratorOptions: {
            browsers: [{ name: "chrome", minVersion: 110 }],
            devices: ["mobile"],
            locales: ["en-US", "en"],
            operatingSystems: ["android"],
          },
          http2: false,
          throwHttpErrors: false,
          timeout: { request: 15000 },
          retry: { limit: 0 },
        });

        if (response.statusCode === 403 || response.statusCode === 503) {
          lastError = new Error(`AnimeSail blocked: ${response.statusCode}`);
          await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
          continue;
        }

        if (response.statusCode > 399) {
          throw new Error(`AnimeSail failed: ${response.statusCode}`);
        }

        return parse(response.body, { parseNoneClosedTags: true });
      } catch (error: any) {
        console.error(`[AnimeSail] Attempt ${i + 1} failed:`, error.message);
        lastError = error;
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }

    throw lastError;
  },

  async scrapeServer(url: string, ref: string): Promise<string> {
    if (isVercel) {
      const res = await proxyFetch(url, {
        headers: { "Referer": ref, "User-Agent": DESKTOP_UA },
      });
      return res.text();
    }

    const { gotScraping } = await import("got-scraping");
    const response = await gotScraping({
      url,
      headers: { "User-Agent": DESKTOP_UA, "Referer": ref },
      throwHttpErrors: false,
    });
    return response.body;
  },
};

export default animesailScraper;
