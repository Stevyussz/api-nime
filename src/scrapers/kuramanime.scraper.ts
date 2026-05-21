import kuramanimeConfig from "@configs/kuramanime.config.js";
import getHTML, { userAgent } from "@helpers/getHTML.js";
import { parse, type HTMLElement } from "node-html-parser";

const { baseUrl } = kuramanimeConfig;

const kuramanimeScraper = {
  async scrapeDOM(pathname: string, ref?: string, sanitize: boolean = false, headers: Record<string, string> = {}): Promise<HTMLElement> {
    const html = await getHTML(baseUrl, pathname, ref, sanitize, headers);

    const document = parse(html, {
      parseNoneClosedTags: true,
    });

    return document;
  },

  async scrapeSecret(ref?: string): Promise<string> {
    const text = await getHTML(baseUrl, "/assets/Ks6sqSgloPTlHMl.txt", ref);

    return text;
  },

  async scrapeSessionCookie(pathname: string): Promise<{ cookie: string; xsrfToken: string }> {
    const targetUrl = new URL(pathname, baseUrl).toString();

    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
        },
        redirect: "manual",
      });

      const cookieHeader = response.headers.get("set-cookie");

      if (!cookieHeader) return { cookie: "", xsrfToken: "" };

      // Extract all cookies (name=value) and ignore attributes
      // Set-Cookie header is a string, possibly joined by comma.
      // We accept that "Expires=Day, Date..." might be split incorrectly by comma, 
      // but we look for "Key=Value" where Key is NOT a reserved attribute.

      // Split by comma (rough split)
      const rawParts = (cookieHeader || "").split(/,(?=\s*\w+=)/);
      // This regex split looks for comma followed by "Key=". 
      // It handles "Expires=Mon, 29..." because ", 29" is not ", Key=".

      const cookies: string[] = [];
      let xsrfToken = "";

      const reserved = /^(path|domain|expires|max-age|secure|httponly|samesite)$/i;

      for (const part of rawParts) {
        const firstSemi = (part.split(";")[0] ?? "").trim();
        const [key, val] = firstSemi.split("=");
        if (key && !reserved.test(key)) {
          cookies.push(firstSemi);
          if (key === "XSRF-TOKEN") {
            xsrfToken = decodeURIComponent(val ?? "");
          }
        }
      }

      const sessionCookie = cookies.join("; ");

      console.log("[Kuramanime] Captured Cookies:", sessionCookie);

      return { cookie: sessionCookie, xsrfToken };
    } catch (e: any) {
      console.warn("[Kuramanime] Failed to get session cookie:", e);
      return { cookie: "", xsrfToken: "" };
    }
  },
};

export default kuramanimeScraper;
