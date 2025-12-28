import * as T from "../../interfaces/animesail.interface.js";
import animesailConfig from "../../configs/animesail.config.js";
const { baseUrl } = animesailConfig;
const animesailExtraParser = {
    parseCard(el) {
        const title = el.querySelector(".tt > h2")?.text.trim() || "";
        const urlObj = el.querySelector("a")?.getAttribute("href") || "";
        // Clean URL
        const url = urlObj.startsWith("http") ? urlObj : baseUrl + urlObj;
        const posterObj = el.querySelector("div.limit img")?.getAttribute("src") || "";
        const poster = posterObj.startsWith("//") ? "https:" + posterObj : posterObj;
        // Extract ID from URL
        // URL format: https://.../anime/slug/ or https://.../slug-episode-123/
        let animeId = "";
        if (url.includes("/anime/")) {
            const parts = url.split("/anime/");
            if (parts.length > 1) {
                animeId = parts[1].replace(/\/$/, "");
            }
        }
        else {
            // Try to guess from episode link if necessary, but searching usually gives anime links (or not?)
            // Kotlin logic: getProperAnimeLink
            const slug = url.replace(baseUrl + "/", "").replace(/\/$/, "");
            animeId = slug;
        }
        // Ep number
        let episodes = 0;
        const epMatch = title.match(/Episode\s?(\d+)/i);
        if (epMatch && epMatch[1]) {
            episodes = parseInt(epMatch[1]);
        }
        return {
            title,
            poster,
            url,
            animeId,
            episodes
        };
    }
};
export default animesailExtraParser;
