import * as T from "@interfaces/samehadaku.interface.js";
import type { HTMLElement } from "node-html-parser";
import mainParser from "@parsers/main/main.parser.js";
import samehadakuConfig from "@configs/samehadaku.config.js";

const { Text, Attr, Id, Src, AnimeSrc } = mainParser;
const { baseUrl } = samehadakuConfig;

const samehadakuExtraParser = {
  parseOngoingCard(el: HTMLElement): T.IOngoingAnimeCard {
    const title = Text(el.querySelector(".entry-title") ?? el.querySelector("h2.jdlflm") ?? el.querySelector(".title"));
    const poster = Src(el.querySelector("img.npws") ?? el.querySelector(".thumbz img") ?? el.querySelector("img"));
    
    // Find spans for episode and date
    const spans = el.querySelectorAll("span");
    const epSpan = spans.find(s => s.text.includes("Episode"));
    const dateSpan = spans.find(s => s.text.includes("Released on"));
    
    let episodes = "Unknown";
    if (epSpan) {
       const authorText = epSpan.querySelector("author")?.text.trim();
       if (authorText) episodes = authorText;
       else episodes = Text(epSpan, /Episode\s*(\S+)/) || "Unknown";
    }

    const otakudesuUrl = AnimeSrc(el.querySelector(".entry-title a") ?? el.querySelector(".thumb a") ?? el.querySelector("a"));
    const animeId = Id(el.querySelector(".entry-title a") ?? el.querySelector(".thumb a") ?? el.querySelector("a"));
    const latestReleaseDate = dateSpan ? dateSpan.text.replace(/.*Released on:\s*/i, "").trim() : "Unknown";
    const releaseDay = "Unknown"; // Not immediately visible in v2 list

    return {
      title,
      poster,
      episodes,
      animeId,
      latestReleaseDate,
      releaseDay,
      samehadakuUrl: otakudesuUrl,
    };
  },

  parseCompletedCard(el: HTMLElement): T.ICompletedAnimeCard {
    const ongoing = this.parseOngoingCard(el);
    return {
      title: ongoing.title,
      poster: ongoing.poster,
      episodes: ongoing.episodes,
      animeId: ongoing.animeId,
      score: "Unknown", // Score usually not present in the main list anymore
      lastReleaseDate: ongoing.latestReleaseDate,
      samehadakuUrl: ongoing.samehadakuUrl,
    };
  },

  parseTextCard(el: HTMLElement): T.IMainCard & { id: string } {
    const title = Text(el);
    const id = Id(el);
    const samehadakuUrl = AnimeSrc(el, baseUrl);

    return { title, id, samehadakuUrl };
  },

  parseInfo(elems: HTMLElement[]): (index: number) => string {
    return (index: number) => {
      return Text(elems[index]?.nextSibling as HTMLElement, /:\s*(.+)/);
    };
  },

  parseTextGenreList(elems: HTMLElement[]): T.ITextGenreCard[] {
    return elems.map((el) => {
      const { id, title, samehadakuUrl } = this.parseTextCard(el);
      return { title, genreId: id, samehadakuUrl };
    });
  },

  parseTextEpisodeList(elems: HTMLElement[]): T.ITextEpisodeCard[] {
    return elems.map((el) => {
      const { id, title, samehadakuUrl } = samehadakuExtraParser.parseTextCard(el);
      const match = title.match(/(?:Episode\s+)?(\d+(?:\.\d+)?)/i) || id.match(/-episode-(\d+(?:\.\d+)?)/i);
      return {
        title: match ? match[1] || "0" : title.replace(/.*Episode\s*/i, ""),
        episodeId: id,
        samehadakuUrl,
      };
    });
  },

  parseSynopsis(elems: HTMLElement[]): ISynopsis {
    return {
      paragraphList: elems
        .map((el) => el.text)
        .filter((p) => !!p),
    };
  },
};

export default samehadakuExtraParser;
