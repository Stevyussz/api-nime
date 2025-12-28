import { Router } from "express";
import { serverCache } from "@middlewares/cache.js";
import animesailController from "@controllers/animesail.controller.js";

const animesailRouter = Router();

animesailRouter.get("/", animesailController.getRoot);
animesailRouter.get("/home", serverCache(5), animesailController.getHome);
animesailRouter.get("/movies", serverCache(10), animesailController.getMovies);
animesailRouter.get("/genres", serverCache(60 * 60), animesailController.getGenres);
animesailRouter.get("/genres/:genreId", serverCache(10), animesailController.getAnimeByGenre);
animesailRouter.get("/search", serverCache(10), animesailController.getSearch);
animesailRouter.get("/anime/:animeId", serverCache(10), animesailController.getAnimeDetails);
animesailRouter.get("/episode/:episodeId", serverCache(10), animesailController.getEpisodeDetails);
animesailRouter.get("/server/:serverId", serverCache(10), animesailController.getServerDetails);

export default animesailRouter;
