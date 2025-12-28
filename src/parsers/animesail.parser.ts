import type { HTMLElement } from "node-html-parser";
import { parse } from "node-html-parser";
import * as T from "@interfaces/animesail.interface.js";
import animesailExtraParser from "@parsers/extra/animesail.extra.parser.js";
import animesailConfig from "@configs/animesail.config.js";
import generateSrcFromIframeTag from "@helpers/generateSrcFromIframeTag.js";

const { baseUrl } = animesailConfig;

const animesailParser = {
    parseHome(document: HTMLElement): T.IHome {
        const articles = document.querySelectorAll("article");
        const latest = articles.map((el) => animesailExtraParser.parseCard(el));
        return { latest };
    },

    parseSearch(document: HTMLElement): T.IAnimeSearchResponse[] {
        const articles = document.querySelectorAll("div.listupd article");
        return articles.map((el) => animesailExtraParser.parseCard(el));
    },

    parseAnimeDetails(document: HTMLElement): T.IAnimeDetails {
        const title = document.querySelector("h1.entry-title")?.text.replace("Subtitle Indonesia", "").trim() || "";
        const poster = document.querySelector("div.entry-content > img")?.getAttribute("src") || "";

        // Info table
        const type = document.querySelector("tbody th:contains(Tipe)")?.nextElementSibling?.text.trim() || "Unknown";
        const status = document.querySelector("tbody th:contains(Status)")?.nextElementSibling?.text.trim() || "Unknown";
        const year = document.querySelector("tbody th:contains(Dirilis)")?.nextElementSibling?.text.trim() || "";

        const synopsis = document.querySelector("div.entry-content > p")?.text.trim() || "";

        // Episodes
        const episodeList: T.IEpisode[] = [];
        const episodeElements = document.querySelectorAll("ul.daftar > li");

        episodeElements.forEach(el => {
            const a = el.querySelector("a");
            if (a) {
                const url = a.getAttribute("href") || "";
                const episodeTitle = a.text.trim();
                const epMatch = episodeTitle.match(/Episode\s?(\d+)/i);
                const episodeNumber = (epMatch && epMatch[1]) ? parseInt(epMatch[1]) : 0;

                // ID is the slug from URL
                const episodeId = url.replace(baseUrl + "/", "").replace(/\/$/, "");

                episodeList.push({
                    title: episodeTitle,
                    url,
                    episodeNumber,
                    episodeId
                });
            }
        });

        // The list is usually descending, reverse if needed. Kotlin logic reverses it.
        episodeList.reverse();

        // AnimeId
        // Assuming we are on the anime page, we can't easily get it unless passed. 
        // But scraping usually returns data. The ID isn't strictly in the DOM except as URL.
        const animeId = ""; // Controller passes this usually? Or we extract from canonical.

        return {
            title,
            poster,
            animeId,
            status,
            type,
            year,
            synopsis,
            episodes: episodeList
        };
    },

    parseEpisodeDetails(document: HTMLElement): T.IEpisodeDetails {
        // Extract AnimeID from Breadcrumb or Relation
        // Breadcrumb usually: Home > Anime Title > Episode Title
        // Selector: .bricrumbs span:nth-child(2) a href
        let animeId = "";
        const breadcrumbLink = document.querySelector(".bricrumbs span:nth-child(2) a");
        if (breadcrumbLink) {
            animeId = breadcrumbLink.getAttribute("href")?.replace(baseUrl + "/anime/", "").replace(/\/$/, "") || "";
        }

        // Fallback: Try "All Episodes" link if exists, usually "Lihat Semua"
        if (!animeId) {
            const allEps = document.querySelector(".year > a"); // Sometimes here
            if (allEps) {
                animeId = allEps.getAttribute("href")?.replace(baseUrl + "/anime/", "").replace(/\/$/, "") || "";
            }
        }

        // Navigation (Prev/Next)
        // Usually located in div.flir
        const prevBtn = document.querySelector(".flir > a:contains('Prev')") || document.querySelector(".flir > a:contains('Sebelumnya')");
        const nextBtn = document.querySelector(".flir > a:contains('Next')") || document.querySelector(".flir > a:contains('Selanjutnya')");

        const prevId = prevBtn?.getAttribute("href")?.replace(baseUrl + "/", "").replace(/\/$/, "") || undefined;
        const nextId = nextBtn?.getAttribute("href")?.replace(baseUrl + "/", "").replace(/\/$/, "") || undefined;

        const servers: T.IServer[] = [];
        const options = document.querySelectorAll(".mobius > .mirror > option");

        options.forEach(opt => {
            const title = opt.text.trim();
            const encodedData = opt.getAttribute("data-em");
            if (encodedData) {
                try {
                    const decodedHtml = Buffer.from(encodedData, 'base64').toString('utf-8');
                    const iframeSrc = parse(decodedHtml).querySelector("iframe")?.getAttribute("src");

                    if (iframeSrc) {
                        const serverId = Buffer.from(iframeSrc).toString('base64url');
                        servers.push({
                            title,
                            serverId
                        });
                    }
                } catch (e) {
                    // ignore
                }
            }
        });

        return {
            animeId,
            episodeId: "", // caller fills this
            hasPrev: !!prevId,
            hasNext: !!nextId,
            ...(prevId ? { prevId } : {}),
            ...(nextId ? { nextId } : {}),
            servers
        };
    },

    async parseServerDetails(serverId: string): Promise<T.IServerDetails> {
        // serverId is base64url encoded iframe src
        const iframeUrl = Buffer.from(serverId, 'base64url').toString('utf-8');

        // Now we need to fetch this iframeUrl and find the source.
        // But wait, the Kotlin logic handles different players differently.
        /*
          if iframe.startsWith("$mainUrl/utils/player/arch/") ...
             request(iframe).select("source").attr("src")
             
          iframe.startsWith("https://aghanim.xyz") ...
          
          For now, I will implement the generic "fetch iframe and look for source" logic 
          plus the specific Arch/Race logic which seems common.
        */

        // Dynamic import to avoid circular dep if needed, but redundant here.
        const { default: animesailScraper } = await import("@scrapers/animesail.scraper.js");

        if (iframeUrl.includes("/utils/player/arch/") || iframeUrl.includes("/utils/player/race/")) {
            // Request with referer
            // We need the original page url as referer? The Kotlin code uses `data` (which is the episode URL) as ref.
            // But here we might rely on the fact that scrapeServer uses general headers.

            // We'll try to fetch.
            const html = await animesailScraper.scrapeServer(iframeUrl, baseUrl);
            const doc = parse(html);
            const src = doc.querySelector("source")?.getAttribute("src");

            if (src) return { url: src };
        }

        // Fallback: simple source extraction
        const html = await animesailScraper.scrapeServer(iframeUrl, baseUrl);
        // Sometimes the source is in script or somewhere else, but let's try <source> or file:
        const doc = parse(html);
        const src = doc.querySelector("source")?.getAttribute("src");

        return { url: src || iframeUrl };
    }
};

export default animesailParser;
