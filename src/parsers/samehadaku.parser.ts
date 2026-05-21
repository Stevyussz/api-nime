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
    const parentElems = document.querySelectorAll(".venz");
    const ongoingAnimeElems = parentElems[0]?.querySelectorAll("ul li");
    const completedAnimeElems = parentElems[1]?.querySelectorAll("ul li");

    function getSource(index: number) {
      return AnimeSrc(parentElems[index]?.previousElementSibling || null);
    }

    const ongoingAnimeList: T.IOngoingAnimeCard[] =
      ongoingAnimeElems?.map((el) => samehadakuExtraParser.parseOngoingCard(el)) || [];

    const completedAnimeList: T.ICompletedAnimeCard[] =
      completedAnimeElems?.map((el) => samehadakuExtraParser.parseCompletedCard(el)) || [];

    return {
      ongoing: { samehadakuUrl: getSource(0), animeList: ongoingAnimeList },
      completed: { samehadakuUrl: getSource(1), animeList: completedAnimeList },
    };
  },

  parseSchedules(document: HTMLElement): T.IScheduleCollection[] {
    const scheduleElems = document.querySelectorAll(".kglist321");
    const list: T.IScheduleCollection[] = scheduleElems.map((el) => {
      const title = Text(el.querySelector("h2"));
      const animeElems = el.querySelectorAll("ul li a");
      const animeList: T.ITextAnimeCard[] = animeElems.map((a) => {
        const { id, title, samehadakuUrl } = samehadakuExtraParser.parseTextCard(a);
        return { title, animeId: id, samehadakuUrl };
      });
      return { title, animeList };
    });

    if (list.length === 0) throw errorinCuy(404);
    return list;
  },

  parseOngoingAnimes(document: HTMLElement): T.IOngoingAnimeCard[] {
    const animeElems = document.querySelectorAll(".venz ul li");
    const list = animeElems.map((el) => samehadakuExtraParser.parseOngoingCard(el));
    if (list.length === 0) throw errorinCuy(404);
    return list;
  },

  parseCompletedAnimes(document: HTMLElement): T.ICompletedAnimeCard[] {
    const animeElems = document.querySelectorAll(".venz ul li");
    const list = animeElems.map((el) => samehadakuExtraParser.parseCompletedCard(el));
    if (list.length === 0) throw errorinCuy(404);
    return list;
  },

  parseSearchedAnimes(document: HTMLElement): T.ISearchedAnimeCard[] {
    const animeElems = document.querySelectorAll("ul.chivsrc li");
    const list: T.ISearchedAnimeCard[] = animeElems.map((el) => {
      const genreElems =
        el.lastElementChild?.previousElementSibling?.previousElementSibling?.querySelectorAll("a") ?? [];
      const genreList = samehadakuExtraParser.parseTextGenreList(genreElems);
      return {
        title: Text(el.querySelector("h2")),
        animeId: Id(el.querySelector("a")),
        poster: Src(el.querySelector("img")),
        score: Text(el.lastElementChild!),
        status: Text(el.lastElementChild?.previousElementSibling!),
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
    const paragraphElems = document.querySelectorAll(".sinopc p");
    const synopsis = samehadakuExtraParser.parseSynopsis(paragraphElems);
    const headerTitleElems = document.querySelectorAll(".smokelister");

    let batch: T.ITextBatchCard | null = null;
    let episodeList: T.ITextEpisodeCard[] = [];

    for (const headerEl of headerTitleElems) {
      if (headerEl.text.toLowerCase().includes("batch")) {
        const batchEl = headerEl.nextElementSibling?.querySelector("a");
        if (batchEl) {
          batch = {
            title: Text(batchEl),
            batchId: Id(batchEl),
            samehadakuUrl: AnimeSrc(batchEl),
          };
          break;
        }
      }
    }

    for (const headerEl of headerTitleElems) {
      if (!headerEl.text.toLowerCase().includes("batch") && headerEl.text.toLowerCase().includes("episode")) {
        const episodeElems = headerEl.nextElementSibling?.querySelectorAll("li a");
        if (episodeElems) {
          episodeList = samehadakuExtraParser.parseTextEpisodeList(episodeElems);
          break;
        }
      }
    }

    const genreParEl = document.querySelector(".infozingle")?.lastElementChild;
    const genreElems = genreParEl?.querySelectorAll("a") || [];
    const genreList = samehadakuExtraParser.parseTextGenreList(genreElems);
    const getInfo = samehadakuExtraParser.parseInfo(document.querySelectorAll(".infozingle b"));

    return {
      title: getInfo(0),
      japanese: getInfo(1),
      score: getInfo(2),
      producers: getInfo(3),
      type: getInfo(4),
      status: getInfo(5),
      episodes: getInfo(6),
      duration: getInfo(7),
      aired: getInfo(8),
      studios: getInfo(9),
      poster: Src(document.querySelector(".fotoanime img")),
      synopsis,
      batch,
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
    const navigationElems = document.querySelectorAll(".flir a");
    let prevEpisode: T.ITextEpisodeCard | null = null;
    let nextEpisode: T.ITextEpisodeCard | null = null;

    navigationElems.forEach((el) => {
      const navTitle = el.text;
      const navObj: T.ITextEpisodeCard = {
        title: navTitle,
        episodeId: Id(el),
        samehadakuUrl: AnimeSrc(el),
      };
      if (navTitle.toLowerCase().includes("prev")) {
        prevEpisode = { ...navObj, title: "Prev" };
      } else if (navTitle.toLowerCase().includes("next")) {
        nextEpisode = { ...navObj, title: "Next" };
      }
    });

    const downloadElems = document.querySelectorAll(".download ul li");
    const download: IFormat = {
      title: "Download",
      qualityList: downloadElems.map((el) => {
        const title = Text(el.querySelector("strong"));
        const size = Text(el.querySelector("i"));
        const urlList: IUrl[] = el.querySelectorAll("a").map((urlEl) => ({
          title: Text(urlEl),
          url: Attr(urlEl, "href"),
        }));
        return { title, size, urlList };
      }),
    };

    const credentials = [
      ...new Set([...document.innerText.matchAll(/action:"([^"]+)"/g)].map((m) => m[1])),
    ];

    const nonceBody = new URLSearchParams({ action: credentials[1] || "" });
    const nonce = await samehadakuScraper.scrapeNonce(nonceBody.toString(), url);

    const serverElems = document.querySelectorAll(".mirrorstream > ul");
    const server: IFormat = {
      title: "Server",
      qualityList: serverElems.map((serverEl) => {
        const title = serverEl.querySelector("li")?.previousSibling?.text || "";
        const serverList: IServer[] = serverEl.querySelectorAll("li a[data-content]").map((el) => {
          const serverId = Attr(el, "data-content");
          const decoded = {
            ...JSON.parse(Buffer.from(serverId, "base64").toString()),
            nonce: nonce.data || "",
            action: credentials[0],
            referer: url,
          };
          return {
            title: Text(el),
            serverId: Buffer.from(JSON.stringify(decoded), "utf-8").toString("base64url"),
          };
        });
        return { title, serverList };
      }),
    };

    const title = Text(document.querySelector(".venutama h1.posttl"));
    const animeId = Id(document.querySelector(".alert-info")?.lastElementChild?.querySelector("a")!);
    const defaultStreamingUrl = Src(document.querySelector(".player-embed iframe"));

    return {
      title,
      animeId,
      poster: Src(document.querySelector(".fotoanime img")),
      defaultStreamingUrl,
      hasPrevEpisode: !!prevEpisode,
      prevEpisode,
      hasNextEpisode: !!nextEpisode,
      nextEpisode,
      server,
      download,
    };
  },

  async parseServerDetails(serverId: string): Promise<T.IServerDetails> {
    const serverIdObj = JSON.parse(Buffer.from(serverId, "base64").toString());
    const referer = serverIdObj?.referer;
    delete serverIdObj["referer"];
    const serverBody = new URLSearchParams(serverIdObj);
    const server = await samehadakuScraper.scrapeServer(serverBody.toString(), referer);
    const url = generateSrcFromIframeTag(Buffer.from(server.data || "", "base64").toString());
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
