import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";
import { gotScraping } from "got-scraping";

// Disable SSL verification for scraper targets (expired certs common on pirate sites)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export default async function getHTML(
  baseUrl: string,
  pathname: string,
  ref?: string,
  sanitize = false
): Promise<string> {
  const url = new URL(pathname, baseUrl).toString();

  const headers: Record<string, string> = {
    // Referer is important for some sites validation
    ...(ref ? { Referer: ref.startsWith("http") ? ref : new URL(ref, baseUrl).toString() } : {})
  };

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
      throwHttpErrors: false, // We handle errors manually
      timeout: { request: 10000 } // 10s timeout
    });

    if (response.statusCode > 399) {
      errorinCuy(response.statusCode);
    }

    const html = response.body;

    if (!html.trim()) errorinCuy(404);

    if (sanitize) {
      return sanitizeHtml(html, {
        allowedTags: [
          "address", "article", "aside", "footer", "header", "h1", "h2", "h3", "h4", "h5", "h6",
          "main", "nav", "section", "blockquote", "div", "dl", "figcaption", "figure", "hr",
          "li", "main", "ol", "p", "pre", "ul", "a", "abbr", "b", "br", "code", "data", "em",
          "i", "mark", "span", "strong", "sub", "sup", "time", "u", "img",
        ],
        allowedAttributes: {
          a: ["href", "name", "target"],
          img: ["src"],
          "*": ["class", "id"],
        },
      });
    }

    return html;
  } catch (error) {
    console.error("Scraping Error:", error);
    // @ts-ignore
    errorinCuy(error.response?.statusCode || 500);
    return "";
  }
}
