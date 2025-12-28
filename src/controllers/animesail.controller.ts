import type { Request, Response, NextFunction } from "express";
import animesailScraper from "@scrapers/animesail.scraper.js";
import animesailParser from "@parsers/animesail.parser.js";
import animesailConfig from "@configs/animesail.config.js";
import animesailSchema from "@schemas/animesail.schema.js";
import setPayload from "@helpers/setPayload.js";
import * as v from "valibot";

const { baseUrl } = animesailConfig;

const animesailController = {
    async getRoot(req: Request, res: Response, next: NextFunction) {
        const routes = [
            { method: "GET", path: "/animesail/home", description: "Episode Terbaru" },
            { method: "GET", path: "/animesail/search", description: "Cari Anime", queryParams: [{ key: "q", required: true }] },
            { method: "GET", path: "/animesail/anime/{animeId}", description: "Detail Anime" },
            { method: "GET", path: "/animesail/episode/{episodeId}", description: "Detail Episode & Server" },
        ];
        res.json(setPayload(res, { data: { routes } }));
    },

    async getHome(req: Request, res: Response, next: NextFunction) {
        try {
            const page = req.query.page || 1;
            const pathname = `/page/${page}/`;
            const document = await animesailScraper.scrapeDOM(pathname, baseUrl);
            const homeData = animesailParser.parseHome(document);
            const list = homeData.latest;
            res.json(setPayload(res, { data: { list } }));
        } catch (error) {
            next(error);
        }
    },

    async getMovies(req: Request, res: Response, next: NextFunction) {
        try {
            const pathname = "/movie-terbaru/page/1/";
            const document = await animesailScraper.scrapeDOM(pathname, baseUrl);
            // Reusing parseHome/parseSearch as the structure is a list of anime cards
            const list = animesailParser.parseSearch(document);
            res.json(setPayload(res, { data: { list } }));
        } catch (error) {
            next(error);
        }
    },

    async getGenres(req: Request, res: Response, next: NextFunction) {
        // Hardcoded list from Kotlin source to match extension capabilities
        const genres = [
            { title: "Action", id: "action" },
            { title: "Adult Cast", id: "adult-cast" },
            { title: "Adventure", id: "adventure" },
            { title: "Award Winning", id: "award-winning" },
            { title: "Comedy", id: "comedy" },
            { title: "Demons", id: "demons" },
            { title: "Donghua", id: "donghua" },
            { title: "Drama", id: "drama" },
            { title: "Ecchi", id: "ecchi" },
            { title: "Fantasy", id: "fantasy" },
            { title: "Game", id: "game" },
            { title: "Harem", id: "harem" },
            { title: "Historical", id: "historical" },
            { title: "Horror", id: "horror" },
            { title: "Isekai", id: "isekai" },
            { title: "Kids", id: "kids" },
            { title: "Magic", id: "magic" },
            { title: "Martial Arts", id: "martial-arts" },
            { title: "Mecha", id: "mecha" },
            { title: "Military", id: "military" },
            { title: "Music", id: "music" },
            { title: "Mystery", id: "mystery" },
            { title: "Mythology", id: "mythology" },
            { title: "Parody", id: "parody" },
            { title: "Psychological", id: "psychological" },
            { title: "Reincarnation", id: "reincarnation" },
            { title: "School", id: "school" },
            { title: "Sci-Fi", id: "sci-fi" },
            { title: "Seinen", id: "seinen" },
            { title: "Shoujo", id: "shoujo" },
            { title: "Shounen", id: "shounen" },
            { title: "Slice of Life", id: "slice-of-life" },
            { title: "Space", id: "space" },
            { title: "Sports", id: "sports" },
            { title: "Super Power", id: "super-power" },
            { title: "Supernatural", id: "supernatural" },
        ];
        res.json(setPayload(res, { data: { genres } }));
    },

    async getAnimeByGenre(req: Request, res: Response, next: NextFunction) {
        try {
            // Need to validate page if we support pagination, for now page 1
            const genreId = req.params.genreId;
            const pathname = `/genres/${genreId}/page/1/`;
            const document = await animesailScraper.scrapeDOM(pathname, baseUrl);
            const list = animesailParser.parseSearch(document);
            res.json(setPayload(res, { data: { list } }));
        } catch (error) {
            next(error);
        }
    },

    async getSearch(req: Request, res: Response, next: NextFunction) {
        try {
            const { q } = v.parse(animesailSchema.query.search, req.query);
            const pathname = `/?s=${q}`;
            const document = await animesailScraper.scrapeDOM(pathname, baseUrl);
            const list = animesailParser.parseSearch(document);

            if (list.length === 0) {
                // Debugging help: return title seen by scraper if possible, or we rely on logs
                // For now, let's trust the scraper log we just added.
            }

            res.json(setPayload(res, { data: { list } }));
        } catch (error) {
            next(error);
        }
    },

    async getAnimeDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const animeId = req.params.animeId || "";
            const pathname = `/anime/${animeId}/`;
            const document = await animesailScraper.scrapeDOM(pathname, baseUrl);
            const details = animesailParser.parseAnimeDetails(document);
            res.json(setPayload(res, { data: { details } }));
        } catch (error) {
            next(error);
        }
    },

    async getEpisodeDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const episodeId = req.params.episodeId || "";
            const pathname = `/${episodeId}/`;
            const document = await animesailScraper.scrapeDOM(pathname, baseUrl);
            const details = animesailParser.parseEpisodeDetails(document);
            res.json(setPayload(res, { data: { details } }));
        } catch (error) {
            next(error);
        }
    },

    async getServerDetails(req: Request, res: Response, next: NextFunction) {
        try {
            const serverId = req.params.serverId || "";
            const details = await animesailParser.parseServerDetails(serverId);
            res.json(setPayload(res, { data: { details } }));
        } catch (error) {
            next(error);
        }
    }
};

export default animesailController;
