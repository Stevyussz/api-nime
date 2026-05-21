import type { Request, Response, NextFunction } from "express";
import samehadakuScraper from "@scrapers/samehadaku.scraper.js";
import samehadakuParser from "@parsers/samehadaku.parser.js";
import samehadakuConfig from "@configs/samehadaku.config.js";
import samehadakuSchema from "@schemas/samehadaku.schema.js";
import setPayload from "@helpers/setPayload.js";
import * as v from "valibot";

const { baseUrl } = samehadakuConfig;

const samehadakuController = {
  async getRoot(req: Request, res: Response, next: NextFunction) {
    const routes: IRouteData[] = [
      {
        method: "GET",
        path: "/samehadaku/home",
        description: "Halaman utama",
        pathParams: [],
        queryParams: [],
      },
      {
        method: "GET",
        path: "/samehadaku/schedule",
        description: "Jadwal rilis",
        pathParams: [],
        queryParams: [],
      },
      {
        method: "GET",
        path: "/samehadaku/genre",
        description: "Daftar semua genre",
        pathParams: [],
        queryParams: [],
      },
      {
        method: "GET",
        path: "/samehadaku/ongoing",
        description: "Daftar anime sedang tayang",
        pathParams: [],
        queryParams: [{ key: "page", value: "string", defaultValue: "1", required: false }],
      },
      {
        method: "GET",
        path: "/samehadaku/completed",
        description: "Daftar anime selesai",
        pathParams: [],
        queryParams: [{ key: "page", value: "string", defaultValue: "1", required: false }],
      },
      {
        method: "GET",
        path: "/samehadaku/search",
        description: "Cari anime",
        pathParams: [],
        queryParams: [{ key: "q", value: "string", defaultValue: null, required: true }],
      },
      {
        method: "GET",
        path: "/samehadaku/genre/:genreId",
        description: "Anime berdasarkan genre",
        pathParams: [{ key: "genreId", value: "string", defaultValue: null, required: true }],
        queryParams: [{ key: "page", value: "string", defaultValue: "1", required: false }],
      },
      {
        method: "GET",
        path: "/samehadaku/batch/:batchId",
        description: "Batch anime",
        pathParams: [{ key: "batchId", value: "string", defaultValue: null, required: true }],
        queryParams: [],
      },
      {
        method: "GET",
        path: "/samehadaku/anime/:animeId",
        description: "Detail anime",
        pathParams: [{ key: "animeId", value: "string", defaultValue: null, required: true }],
        queryParams: [],
      },
      {
        method: "GET",
        path: "/samehadaku/episode/:episodeId",
        description: "Detail episode",
        pathParams: [{ key: "episodeId", value: "string", defaultValue: null, required: true }],
        queryParams: [],
      },
      {
        method: "GET | POST",
        path: "/samehadaku/server/:serverId",
        description: "Link video server",
        pathParams: [{ key: "serverId", value: "string", defaultValue: null, required: true }],
        queryParams: [],
      },
    ];

    res.json(setPayload(res, { message: "Status: OK 🚀", data: { routes } }));
  },

  async getHome(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await samehadakuScraper.scrapeDOM("/", "https://google.com/");
      const home = samehadakuParser.parseHome(document);
      res.json(setPayload(res, { data: home }));
    } catch (error) {
      next(error);
    }
  },

  async getSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await samehadakuScraper.scrapeDOM("/jadwal-rilis/", baseUrl);
      const scheduleList = samehadakuParser.parseSchedules(document);
      res.json(setPayload(res, { data: { scheduleList } }));
    } catch (error) {
      next(error);
    }
  },

  async getAllGenres(req: Request, res: Response, next: NextFunction) {
    try {
      const document = await samehadakuScraper.scrapeDOM("/genre-list/", baseUrl);
      const genreList = samehadakuParser.parseAllGenres(document);
      res.json(setPayload(res, { data: { genreList } }));
    } catch (error) {
      next(error);
    }
  },

  async getOngoingAnimes(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(v.parse(samehadakuSchema.query.animes, req.query)?.page) || 1;
      const pathname = page > 1 ? `/anime-terbaru/page/${page}/` : "/anime-terbaru/";
      const document = await samehadakuScraper.scrapeDOM(pathname, baseUrl);
      const animeList = samehadakuParser.parseOngoingAnimes(document);
      const pagination = samehadakuParser.parsePagination(document);
      res.json(setPayload(res, { data: { animeList }, pagination }));
    } catch (error) {
      next(error);
    }
  },

  async getCompletedAnimes(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(v.parse(samehadakuSchema.query.animes, req.query)?.page) || 1;
      const pathname = page > 1 ? `/anime-tamat/page/${page}/` : "/anime-tamat/";
      const document = await samehadakuScraper.scrapeDOM(pathname, baseUrl);
      const animeList = samehadakuParser.parseCompletedAnimes(document);
      const pagination = samehadakuParser.parsePagination(document);
      res.json(setPayload(res, { data: { animeList }, pagination }));
    } catch (error) {
      next(error);
    }
  },

  async getSearchedAnimes(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = v.parse(samehadakuSchema.query.searchedAnimes, req.query);
      const pathname = `/?s=${q}&post_type=anime`;
      const document = await samehadakuScraper.scrapeDOM(pathname, baseUrl);
      const animeList = samehadakuParser.parseSearchedAnimes(document);
      res.json(setPayload(res, { data: { animeList } }));
    } catch (error) {
      next(error);
    }
  },

  async getAnimesByGenre(req: Request, res: Response, next: NextFunction) {
    try {
      const genreId = req.params.genreId;
      const page = Number(v.parse(samehadakuSchema.query.animes, req.query)?.page) || 1;
      const pathname = page > 1 ? `/genre/${genreId}/page/${page}/` : `/genre/${genreId}/`;
      const document = await samehadakuScraper.scrapeDOM(pathname, baseUrl);
      const animeList = samehadakuParser.parseAnimesByGenre(document);
      const pagination = samehadakuParser.parsePagination(document);
      res.json(setPayload(res, { data: { animeList }, pagination }));
    } catch (error) {
      next(error);
    }
  },

  async getBatchDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId;
      const pathname = `/batch/${batchId}/`;
      const document = await samehadakuScraper.scrapeDOM(pathname, baseUrl);
      const details = samehadakuParser.parseBatchDetails(document);
      res.json(setPayload(res, { data: { details } }));
    } catch (error) {
      next(error);
    }
  },

  async getAnimeDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const animeId = req.params.animeId;
      const pathname = `/anime/${animeId}/`;
      const document = await samehadakuScraper.scrapeDOM(pathname, baseUrl);
      const details = samehadakuParser.parseAnimeDetails(document);
      res.json(setPayload(res, { data: { details } }));
    } catch (error) {
      next(error);
    }
  },

  async getEpisodeDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const episodeId = req.params.episodeId;
      const pathname = `/${episodeId}/`;
      const document = await samehadakuScraper.scrapeDOM(pathname, baseUrl);
      const details = await samehadakuParser.parseEpisodeDetails(
        document,
        new URL(pathname, baseUrl).toString()
      );
      res.json(setPayload(res, { data: { details } }));
    } catch (error) {
      next(error);
    }
  },

  async getServerDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = req.params.serverId || "";
      const details = await samehadakuParser.parseServerDetails(serverId);
      res.json(setPayload(res, { data: { details } }));
    } catch (error: any) {
      if (error.message?.includes("is not valid JSON")) {
        res.status(400).json(setPayload(res));
        return;
      }
      next(error);
    }
  },
};

export default samehadakuController;
