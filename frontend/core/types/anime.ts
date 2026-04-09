// core/types/anime.ts — Single source of truth for all anime shapes

export interface AnimeBase {
  id: string;
  title: string;
  img: string | null;
  banner?: string | null;
  score?: number | null;
  color?: string | null;
}

export interface AnimeHome extends AnimeBase {
  synopsis?: string | null;
  nextAiringEpisode?: { episode: number; timeUntilAiring: number } | null;
  latestEpisode?: number | null;
}

export interface AnimeDetail extends AnimeBase {
  nativeTitle?: string | null;
  synopsis?: string | null;
  genres: string[];
  studios: string[];
  status?: string | null;
  totalEpisodes?: number | null;
  season?: string | null;
  seasonYear?: number | null;
  recommendations: { id: number | string; title: string; cover?: string }[];
  nextAiringEpisode?: any;
  episodes: EpisodeItem[];
  _syncing?: boolean;
}

export interface EpisodeItem {
  title: string;
  url: string;
  number: number;
  provider?: string;
  thumbnailUrl?: string | null;
}

export interface VideoSource {
  provider: string;
  quality: string;
  url: string;
  type: string; // 'hls' | 'mp4' | 'iframe'
  source?: string;
}

export interface WatchHistoryItem {
  animeSlug: string;
  animeTitle: string;
  animeCover?: string;
  episode: number;
  episodeTitle?: string;
  timestampSec: number;
  durationSec: number;
  completed: boolean;
  updatedAt?: string;
}
