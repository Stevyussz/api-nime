import * as T from "@interfaces/samehadaku.interface.js";
import type { HTMLElement } from "node-html-parser";
import mainParser from "@parsers/main/main.parser.js";
import errorinCuy from "@helpers/errorinCuy.js";
import samehadakuExtraParser from "@parsers/extra/samehadaku.extra.parser.js";
import samehadakuConfig from "@configs/samehadaku.config.js";
import generateSrcFromIframeTag from "@helpers/generateSrcFromIframeTag.js";
import samehadakuScraper from "@scrapers/samehadaku.scraper.js";

const { baseUrl } = samehadakuConfig;
const { Text, Attr, Id, Num, Src, AnimeSrc } = mainParser;

const samehadakuParser = {
  parseHome(document: HTMLElement): T.IHome {
    // Ongoing is in .post-show ul li
    const ongoingAnimeElems = document.querySelectorAll(".post-show ul li");
    
    const ongoingAnimeList: T.IOngoingAnimeCard[] =
      ongoingAnimeElems.map((el) => samehadakuExtraParser.parseOngoingCard(el));

    return {
      ongoing: { samehadakuUrl: baseUrl, animeList: ongoingAnimeList },
      completed: { samehadakuUrl: baseUrl, animeList: [] }, // V2 removed completed from home
    };
  },

  parseSchedules(document: HTMLElement): T.IScheduleCollection[] {
    // Schedule is handled via AJAX in v2, so we return empty to let the frontend normalizer fallback
    return [];
  },

  parseOngoingAnimes(document: HTMLElement): T.IOngoingAnimeCard[] {
    const animeElems = document.querySelectorAll(".animepost");
    const list = animeElems.map((el) => {
       const title = Text(el.querySelector(".title h2") ?? el.querySelector(".title h4"));
       const poster = Src(el.querySelector("img"));
       const otakudesuUrl = AnimeSrc(el.querySelector("a"));
       const animeId = Id(el.querySelector("a"));
       const releaseDay = Text(el.querySelector(".type"));
       return {
         title, poster, episodes: "Unknown", animeId, latestReleaseDate: "Unknown", releaseDay, samehadakuUrl: otakudesuUrl
       };
    });
    if (list.length === 0) throw errorinCuy(404);
    return list;
  },

  parseCompletedAnimes(document: HTMLElement): T.ICompletedAnimeCard[] {
    const animeElems = document.querySelectorAll(".animepost");
    const list = animeElems.map((el) => {
       const title = Text(el.querySelector(".title h2") ?? el.querySelector(".title h4"));
       const poster = Src(el.querySelector("img"));
       const otakudesuUrl = AnimeSrc(el.querySelector("a"));
       const animeId = Id(el.querySelector("a"));
       const score = Text(el.querySelector(".score"));
       return {
         title, poster, episodes: "Unknown", animeId, score, lastReleaseDate: "Unknown", samehadakuUrl: otakudesuUrl
       };
    });
    if (list.length === 0) throw errorinCuy(404);
    return list;
  },

  parseSearchedAnimes(document: HTMLElement): T.ISearchedAnimeCard[] {
    const animeElems = document.querySelectorAll(".animepost");
    const list: T.ISearchedAnimeCard[] = animeElems.map((el) => {
      const genreElems = el.querySelectorAll(".genres .mta a");
      const genreList = samehadakuExtraParser.parseTextGenreList(genreElems);
      return {
        title: Text(el.querySelector(".title h2") ?? el.querySelector(".title h4")),
        animeId: Id(el.querySelector("a")),
        poster: Src(el.querySelector("img")),
        score: Text(el.querySelector(".score")),
        status: Text(el.querySelector(".data .type") ?? el.querySelector(".type")),
        samehadakuUrl: AnimeSrc(el.querySelector("a")),
        genreList,
      };
    });
    if (list.length === 0) throw errorinCuy(404);
    return list;
  },

  parseAllGenres(document: HTMLElement): T.ITextGenreCard[] {
    const genreElems = document.querySelectorAll("ul.genres li a");
    const genreList = samehadakuExtraParser.parseTextGenreList(genreElems);
    if (genreList.length === 0) throw errorinCuy(404);
    return genreList;
  },

  parseAnimesByGenre(document: HTMLElement): T.ISearchedAnimeCard[] {
    const animeElems = document.querySelectorAll(".page .col-anime");
    const list: T.ISearchedAnimeCard[] = animeElems.map((el) => {
      const genreElems = el.querySelectorAll(".col-anime-genre a");
      const genreList = samehadakuExtraParser.parseTextGenreList(genreElems);
      return {
        title: Text(el.querySelector(".col-anime-title")),
        animeId: Id(el.querySelector(".col-anime-title a")),
        poster: Src(el.querySelector(".col-anime-cover img")),
        score: Text(el.querySelector(".col-anime-rating")),
        status: Text(el.querySelector(".col-anime-date")),
        samehadakuUrl: AnimeSrc(el.querySelector(".col-anime-title a")),
        genreList,
      };
    });
    if (list.length === 0) throw errorinCuy(404);
    return list;
  },

  parseAnimeDetails(document: HTMLElement): T.IAnimeDetails {
    const title = Text(document.querySelector(".entry-title"));
    if (!title) throw errorinCuy(404);

    const infoElems = document.querySelectorAll(".spe span");
    const getInfo = (key: string) => {
        const found = infoElems.find(el => el.text.toLowerCase().includes(key.toLowerCase()));
        return found ? found.text.replace(/.*(?::|\b)/, "").trim() : "Unknown";
    };

    const status = getInfo("Status");
    const score = getInfo("Score");

    const studioElems = document.querySelectorAll(".spe span b").filter(b => b.text.includes("Studio"));
    const studioList = studioElems.length > 0 ? samehadakuExtraParser.parseTextGenreList(studioElems[0].parentNode?.querySelectorAll("a") || []) : [];

    const genreElems = document.querySelectorAll(".genre-info a");
    const genreList = samehadakuExtraParser.parseTextGenreList(genreElems);

    const synopsisElems = document.querySelectorAll(".desc .entry-content p");
    const synopsis = samehadakuExtraParser.parseSynopsis(synopsisElems);

    const batchElems = document.querySelectorAll(".listbatch a");
    const batchList = batchElems.map((el) => {
      const { id, title, samehadakuUrl } = samehadakuExtraParser.parseTextCard(el);
      return { title, batchId: id, samehadakuUrl };
    });

    const episodeLinks = document.querySelectorAll("a").filter(a => a.getAttribute("href")?.includes("-episode-") && !a.classNames.includes("play-new-episode"));
    const uniqueEpisodesMap = new Map();
    episodeLinks.forEach(a => {
        const href = a.getAttribute("href") || "";
        if (!uniqueEpisodesMap.has(href)) {
           uniqueEpisodesMap.set(href, a);
        }
    });
    
    const episodeList = samehadakuExtraParser.parseTextEpisodeList(Array.from(uniqueEpisodesMap.values())).reverse();

    return {
      title,
      japanese: getInfo("Japanese"),
      score,
      producers: getInfo("Producers"),
      type: getInfo("Type"),
      status,
      episodes: getInfo("Total Episode"),
      duration: getInfo("Duration"),
      aired: getInfo("Released"),
      studios: studioList.map(s => s.title).join(", ") || "Unknown",
      poster: Src(document.querySelector(".thumb img") ?? document.querySelector("img")),
      synopsis,
      batch: batchList.length > 0 ? { title: batchList[0].title, batchId: batchList[0].batchId, samehadakuUrl: batchList[0].samehadakuUrl } : null,
      genreList,
      episodeList,
    };
  },

  parseBatchDetails(document: HTMLElement): T.IBatchDetails {
    const downloadElems = document.querySelectorAll(".batchlink ul");
    const formatList: IFormat[] = downloadElems.map((downloadEl) => {
      const qualityElems = downloadEl.querySelectorAll("li");
      const qualityList: IQuality[] = qualityElems.map((qualityEl) => {
        const urlElems = qualityEl.querySelectorAll("a");
        const urlList: IUrl[] = urlElems.map((urlEl) => ({
          title: Text(urlEl),
          url: Attr(urlEl, "href"),
        }));
        return {
          title: Text(qualityEl.querySelector("strong")),
          size: Text(qualityEl.querySelector("i")),
          urlList,
        };
      });
      return {
        title: Text(downloadEl.previousElementSibling),
        qualityList,
      };
    });

    const genreElems = document.querySelectorAll(".infos a");
    const genreList = samehadakuExtraParser.parseTextGenreList(genreElems);
    const getInfo = samehadakuExtraParser.parseInfo(document.querySelectorAll(".infos b"));

    return {
      title: getInfo(0),
      animeId: Id(document.querySelector(".totalepisode a")),
      poster: Src(document.querySelector(".imganime img")),
      japanese: getInfo(1),
      type: getInfo(2),
      episodes: getInfo(3),
      score: getInfo(4),
      duration: getInfo(6),
      studios: getInfo(7),
      producers: getInfo(8),
      aired: getInfo(9),
      download: { formatList },
      genreList,
    };
  },

  async parseEpisodeDetails(document: HTMLElement, url: string): Promise<T.IEpisodeDetails> {
    const title = Text(document.querySelector(".entry-title"));
    if (!title) throw errorinCuy(404);

    const animeIdUrl = document.querySelector(".imo, .infox, .breadcrumb")?.querySelectorAll("a").find(a => a.getAttribute("href")?.includes("/anime/"))?.getAttribute("href") || "";
    const animeId = animeIdUrl.replace(/.*\/anime\//, "").replace(/\//g, "");

    const navigationElems = document.querySelectorAll(".nvs a, .nextprev a, .item-nav a");
    let prevEpisode: T.ITextEpisodeCard | null = null;
    let nextEpisode: T.ITextEpisodeCard | null = null;

    if (navigationElems.length >= 3) {
      const prevUrl = navigationElems[0]?.getAttribute("href");
      if (prevUrl && prevUrl !== "#") prevEpisode = { title: "Prev", episodeId: prevUrl.replace(/.*\//, "").replace(/\//g, ""), samehadakuUrl: prevUrl };
      
      const nextUrl = navigationElems[2]?.getAttribute("href");
      if (nextUrl && nextUrl !== "#") nextEpisode = { title: "Next", episodeId: nextUrl.replace(/.*\//, "").replace(/\//g, ""), samehadakuUrl: nextUrl };
    }

    const downloadElems = document.querySelectorAll(".download-eps, .mctnx, .soraddlx");
    const download: IFormat = {
      title: "Download",
      qualityList: downloadElems.map((el) => {
        const title = Text(el.querySelector("strong, .sorattlx"));
        const size = "Unknown";
        const urlList: IUrl[] = el.querySelectorAll("a").map((urlEl) => ({
          title: Text(urlEl),
          url: Attr(urlEl, "href"),
        }));
        return { title, size, urlList };
      }),
    };

    const serverElems = document.querySelectorAll(".east_player_option");
    const serverList: IServer[] = serverElems.map((el) => {
        const title = Text(el.querySelector("span"));
        const post = Attr(el, "data-post");
        const nume = Attr(el, "data-nume");
        const type = Attr(el, "data-type");
        const serverIdObj = { action: "player_ajax", post, nume, type };
        return {
           title,
           serverId: Buffer.from(JSON.stringify(serverIdObj)).toString("base64url"),
        };
    });

    const server: IFormat = {
      title: "Server",
      qualityList: [{ title: "Streaming", size: "Auto", urlList: serverList as any }],
    };

    return {
      title,
      animeId,
      poster: Src(document.querySelector(".fotoanime img") ?? document.querySelector("img")),
      defaultStreamingUrl: "",
      hasPrevEpisode: !!prevEpisode,
      prevEpisode,
      hasNextEpisode: !!nextEpisode,
      nextEpisode,
      server: server as any,
      download: download as any,
    };
  },

  async parseServerDetails(serverId: string): Promise<T.IServerDetails> {
    const serverIdObj = JSON.parse(Buffer.from(serverId, "base64").toString());
    const serverBody = new URLSearchParams(serverIdObj);
    const server = await samehadakuScraper.scrapeServer(serverBody.toString(), baseUrl);
    // The response is an iframe html. Extract its src.
    const url = generateSrcFromIframeTag(server.data || (server as any) || "");
    return { url };
  },

  parsePagination(document: HTMLElement): IPagination | undefined {
    const paginationEl = document.querySelector(".pagination .pagenavix");
    if (!paginationEl) return undefined;

    const pagination: IPagination = {
      currentPage: null,
      prevPage: null,
      hasPrevPage: false,
      nextPage: null,
      hasNextPage: false,
      totalPages: null,
    };

    function getPage(el: HTMLElement | null): number | null {
      const url = el?.getAttribute("href");
      const match = url?.match(/page\/(\d+)\//);
      if (match) return Number(match[1]) || null;
      return Number(el?.text) || null;
    }

    const currentPageEl = paginationEl.querySelector(".page-numbers.current");
    const prevPageEl = paginationEl.querySelector(".page-numbers.prev");
    const nextPageEl = paginationEl.querySelector(".page-numbers.next");
    const lastPageEl = paginationEl.lastElementChild;

    pagination.currentPage = Num(currentPageEl);
    pagination.prevPage = pagination.currentPage === 2 ? 1 : getPage(prevPageEl);
    pagination.nextPage = getPage(nextPageEl);
    pagination.hasPrevPage = !!pagination.prevPage;
    pagination.hasNextPage = !!pagination.nextPage;

    if (lastPageEl) {
      pagination.totalPages = lastPageEl === nextPageEl
        ? getPage(lastPageEl.previousElementSibling)
        : Num(lastPageEl);
    }

    return pagination;
  },
};

export default samehadakuParser;
