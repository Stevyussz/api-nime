import animesailConfig from "../configs/animesail.config.js";
import getHTML, { userAgent } from "../helpers/getHTML.js";
import { parse } from "node-html-parser";
const { baseUrl } = animesailConfig;
const animesailScraper = {
    async scrapeDOM(pathname, ref, sanitize = false) {
        // AnimeSail requires this cookie validation
        // We cannot easily inject cookies into getHTML wrapper without modifying it.
        // I will use `gotScraping` directly here to ensure correctness.
        const { gotScraping } = await import("got-scraping");
        const url = new URL(pathname, baseUrl).toString();
        const headers = {
            "User-Agent": userAgent,
            "Referer": ref ? (ref.startsWith("http") ? ref : new URL(ref, baseUrl).toString()) : baseUrl,
            "Cookie": "_as_ipin_ct=ID",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
        };
        let lastError;
        // Retry logic: 3 attempts
        for (let i = 0; i < 3; i++) {
            try {
                const response = await gotScraping({
                    url,
                    headers,
                    headerGeneratorOptions: {
                        browsers: [{ name: 'chrome', minVersion: 110 }],
                        devices: ['desktop'],
                        locales: ['en-US', 'en'],
                        operatingSystems: ['windows'],
                    },
                    http2: true, // Enable HTTP/2 for better mimicry
                    throwHttpErrors: false,
                    timeout: { request: 15000 }, // Increased to 15s
                    retry: { limit: 0 } // We manage retries manually
                });
                if (response.statusCode === 403 || response.statusCode === 503) {
                    // WAF block or overload, wait and retry
                    lastError = new Error(`Scraping blocked/failed with status ${response.statusCode}`);
                    await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Linear backoff
                    continue;
                }
                if (response.statusCode > 399) {
                    throw new Error(`Scraping failed with status ${response.statusCode}`);
                }
                const html = response.body;
                // Use node-html-parser
                const dom = parse(html, { parseNoneClosedTags: true });
                const title = dom.querySelector("title")?.text || "No Title";
                console.log(`[AnimeSail] Scraped ${url}: Title="${title}", Length=${html.length}`);
                return dom;
            }
            catch (error) {
                console.error(`AnimeSail Scraping Attempt ${i + 1} Failed:`, error.message);
                lastError = error;
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }
        throw lastError || new Error("Scraping failed after 3 attempts");
    },
    // Fetch raw HTML for iframes/servers
    async scrapeServer(url, ref) {
        const { gotScraping } = await import("got-scraping");
        const response = await gotScraping({
            url,
            headers: {
                "User-Agent": userAgent,
                "Referer": ref
            },
            throwHttpErrors: false
        });
        return response.body;
    }
};
export default animesailScraper;
