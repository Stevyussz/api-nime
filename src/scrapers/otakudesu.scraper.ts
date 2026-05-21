import otakudesuConfig from "@configs/otakudesu.config.js";
import { parse, type HTMLElement } from "node-html-parser";
import { proxyFetch } from "@helpers/proxyFetch.js";

const { baseUrl } = otakudesuConfig;

const otakudesuScraper = {
  async scrapeDOM(pathname: string, ref?: string, sanitize: boolean = false): Promise<HTMLElement> {
    // Dynamic import got-scraping — dipakai di localhost (lebih fingerprint-proof)
    // Di Vercel, proxyFetch akan route ke CF Worker otomatis
    const { gotScraping } = await import("got-scraping");

    const url = new URL(pathname, baseUrl).toString();
    const referer = ref
      ? ref.startsWith("http") ? ref : new URL(ref, baseUrl).toString()
      : baseUrl;

    console.log(`[Otakudesu] Scraping ${url}`);

    const { isVercel } = await import("@helpers/proxyFetch.js");

    if (isVercel) {
      // Di Vercel: gunakan proxyFetch → CF Worker → otakudesu.blog
      const res = await proxyFetch(url, {
        headers: {
          "Referer": referer,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        },
      });

      if (!res.ok) {
        throw new Error(`Otakudesu returned ${res.status} for ${url}`);
      }

      const body = await res.text();
      return parse(body, { parseNoneClosedTags: true });
    }

    // Di localhost: pakai got-scraping langsung (lebih canggih fingerprinting)
    try {
      const response = await gotScraping({
        url,
        headers: {
          "Referer": referer,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        },
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
      console.error(`[Otakudesu] Error scraping ${url}: ${error.message}`);
      throw error;
    }
  },

  async scrapeNonce(body: string, referer: string): Promise<{ data?: string }> {
    const url = new URL("/wp-admin/admin-ajax.php", baseUrl).toString();

    const res = await proxyFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referer":  referer,
        "Origin":   baseUrl,
        "x-requested-with": "XMLHttpRequest",
      },
      body,
    });

    try {
      return await res.json() as { data: string };
    } catch {
      return {};
    }
  },

  async scrapeServer(body: string, referer: string): Promise<{ data?: string }> {
    const url = new URL("/wp-admin/admin-ajax.php", baseUrl).toString();

    const res = await proxyFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin":  baseUrl,
        "Referer": referer,
        "x-requested-with": "XMLHttpRequest",
      },
      body,
    });

    try {
      return await res.json() as { data: string };
    } catch {
      return {};
    }
  },
};

export default otakudesuScraper;
