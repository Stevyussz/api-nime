import errorinCuy from "./errorinCuy.js";
import sanitizeHtml from "sanitize-html";

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
  const url = new URL(pathname, baseUrl);
  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Cache-Control": "max-age=0",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
  };

  if (ref) {
    headers.Referer = ref.startsWith("http") ? ref : new URL(ref, baseUrl).toString();
  }

  const response = await fetch(url, { headers, redirect: "manual" });

  if (!response.ok) {
    response.status > 399 ? errorinCuy(response.status) : errorinCuy(404);
  }

  const html = await response.text();

  if (!html.trim()) errorinCuy(404);

  if (sanitize) {
    return sanitizeHtml(html, {
      allowedTags: [
        "address",
        "article",
        "aside",
        "footer",
        "header",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "main",
        "nav",
        "section",
        "blockquote",
        "div",
        "dl",
        "figcaption",
        "figure",
        "hr",
        "li",
        "main",
        "ol",
        "p",
        "pre",
        "ul",
        "a",
        "abbr",
        "b",
        "br",
        "code",
        "data",
        "em",
        "i",
        "mark",
        "span",
        "strong",
        "sub",
        "sup",
        "time",
        "u",
        "img",
      ],
      allowedAttributes: {
        a: ["href", "name", "target"],
        img: ["src"],
        "*": ["class", "id"],
      },
    });
  }

  return html as string;
}
