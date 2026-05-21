import * as T from "@interfaces/samehadaku.interface.js";
import type { HTMLElement } from "node-html-parser";
import mainParser from "@parsers/main/main.parser.js";
import samehadakuConfig from "@configs/samehadaku.config.js";

const { Text, Attr, Id, Src, AnimeSrc } = mainParser;
const { baseUrl } = samehadakuConfig;

const samehadakuExtraParser = {
  parseOngoingCard(el: HTMLElement): T.IOngoingAnimeCard {
    const title = Text(el.querySelector("h2.jdlflm") ?? el.querySelector(".title"));
    const poster = Src(el.querySelector(".thumbz img") ?? el.querySelector("img"));
    const episodes = Text(el.querySelector(".epz"), /Episode (\S+)/);
    const otakudesuUrl = AnimeSrc(el.querySelector(".thumb a") ?? el.querySelector("a"));
    const animeId = Id(el.querySelector(".thumb a") ?? el.querySelector("a"));
    const latestReleaseDate = Text(el.querySelector(".newnime") ?? el.querySelector(".date"));
    const releaseDay = Text(el.querySelector(".epztipe") ?? el.querySelector(".type"));

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
    const title = Text(el.querySelector("h2.jdlflm") ?? el.querySelector(".title"));
    const poster = Src(el.querySelector(".thumbz img") ?? el.querySelector("img"));
    const episodes = Text(el.querySelector(".epz"), /(\S+) Episode/);
    const samehadakuUrl = AnimeSrc(el.querySelector(".thumb a") ?? el.querySelector("a"));
    const animeId = Id(el.querySelector(".thumb a") ?? el.querySelector("a"));
    const score = Text(el.querySelector(".epztipe") ?? el.querySelector(".score"));
    const lastReleaseDate = Text(el.querySelector(".newnime") ?? el.querySelector(".date"));

    return {
      title,
      poster,
      episodes,
      animeId,
      score,
      lastReleaseDate,
      samehadakuUrl,
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
      const match = title.match(/Episode\s+(\d+)/);
      return {
        title: match ? match[1] || "0" : title,
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
