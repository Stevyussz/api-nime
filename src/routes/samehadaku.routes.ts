import { Router } from "express";
import { serverCache } from "@middlewares/cache.js";
import samehadakuController from "@controllers/samehadaku.controller.js";

const samehadakuRouter = Router();

samehadakuRouter.get("/", samehadakuController.getRoot);
samehadakuRouter.get("/home", serverCache(10), samehadakuController.getHome);
samehadakuRouter.get("/schedule", serverCache(10), samehadakuController.getSchedule);
samehadakuRouter.get("/genre", serverCache(60), samehadakuController.getAllGenres);
samehadakuRouter.get("/ongoing", serverCache(10), samehadakuController.getOngoingAnimes);
samehadakuRouter.get("/completed", serverCache(10), samehadakuController.getCompletedAnimes);
samehadakuRouter.get("/search", serverCache(10), samehadakuController.getSearchedAnimes);
samehadakuRouter.get("/genre/:genreId", serverCache(10), samehadakuController.getAnimesByGenre);
samehadakuRouter.get("/batch/:batchId", serverCache(10), samehadakuController.getBatchDetails);
samehadakuRouter.get("/anime/:animeId", serverCache(10), samehadakuController.getAnimeDetails);
samehadakuRouter.get("/episode/:episodeId", serverCache(10), samehadakuController.getEpisodeDetails);
samehadakuRouter.get("/server/:serverId", serverCache(10), samehadakuController.getServerDetails);
samehadakuRouter.post("/server/:serverId", serverCache(10), samehadakuController.getServerDetails);

export default samehadakuRouter;
