export interface IMainCard {
    title: string;
    poster: string;
    animeId: string;
    url: string;
}

export interface IAnimeSearchResponse {
    title: string;
    poster: string;
    animeId: string;
    url: string;
    episodes?: number;
}

export interface IHome {
    latest: IAnimeSearchResponse[];
}

export interface IAnimeDetails {
    title: string;
    poster: string;
    animeId: string;
    synopsis: string;
    status: string;
    type: string;
    year: string;
    episodes: IEpisode[];
}

export interface IEpisode {
    title: string;
    episodeId: string;
    url: string;
    episodeNumber: number;
}

export interface IEpisodeDetails {
    episodeId: string;
    animeId: string;
    hasPrev: boolean;
    hasNext: boolean;
    prevId?: string;
    nextId?: string;
    servers: IServer[];
}

export interface IServer {
    title: string;
    serverId: string; // This will be the encoded URL or direct URL if possible
}

export interface IServerDetails {
    url: string;
    headers?: Record<string, string>;
}
