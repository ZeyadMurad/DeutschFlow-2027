export type UILanguage = 'ar' | 'de' | 'en';

export type AppSectionId =
  | 'home'
  | 'radio'
  | 'news'
  | 'newspapers'
  | 'youtube'
  | 'documentaries'
  | 'podcasts'
  | 'movies'
  | 'learning'
  | 'reading'
  | 'culture'
  | 'science'
  | 'kids'
  | 'favorites'
  | 'library';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  homepage?: string;
  favicon?: string;
  country?: string;
  state?: string;
  tags: string[];
  codec?: string;
  bitrate?: number;
  votes?: number;
  category: RadioCategory;
  isNational?: boolean;
  isLiveVerified: boolean;
}

export type RadioCategory =
  | 'all'
  | 'news_politics'
  | 'culture'
  | 'music'
  | 'sports'
  | 'business'
  | 'educational'
  | 'regional'
  | 'national'
  | 'kids';

export type NewsCategory =
  | 'all'
  | 'politics'
  | 'business'
  | 'society'
  | 'science'
  | 'health'
  | 'tech'
  | 'culture'
  | 'sports'
  | 'international'
  | 'simplified';

export interface NewsSourceMeta {
  id: string;
  name: string;
  shortName: string;
  websiteUrl: string;
  rssUrl: string;
  category: NewsCategory;
  descriptionAr: string;
  descriptionDe: string;
  accessType: 'free_rss' | 'excerpt_only' | 'simplified';
  cefrLevel?: CEFRLevel;
  country?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  link: string;
  sourceId: string;
  sourceName: string;
  category: NewsCategory;
  publishedAt: string;
  imageUrl?: string;
  audioUrl?: string;
  isExcerpt: boolean;
  cefrLevel?: CEFRLevel;
}

export type YouTubeCategory =
  | 'all'
  | 'news'
  | 'documentary'
  | 'investigation'
  | 'learning'
  | 'talk_podcast'
  | 'culture_science'
  | 'kids';

export interface YouTubeChannelMeta {
  id: string;
  channelId: string;
  name: string;
  category: YouTubeCategory;
  channelUrl: string;
  descriptionAr: string;
  descriptionDe: string;
  cefrLevel?: CEFRLevel;
}

export interface YouTubeVideo {
  id: string;
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  category: YouTubeCategory;
  publishedAt: string;
  thumbnailUrl: string;
  watchUrl: string;
  embedUrl: string;
  cefrLevel?: CEFRLevel;
}

export type PodcastCategory =
  | 'all'
  | 'news_daily'
  | 'society_culture'
  | 'knowledge_science'
  | 'true_crime'
  | 'learning'
  | 'politics'
  | 'history';

export interface PodcastShowMeta {
  id: string;
  title: string;
  publisher: string;
  rssUrl: string;
  websiteUrl: string;
  category: PodcastCategory;
  descriptionDe: string;
  descriptionAr: string;
  coverUrl?: string;
  cefrLevel?: CEFRLevel;
}

export interface PodcastEpisode {
  id: string;
  showId: string;
  showTitle: string;
  title: string;
  description: string;
  publishedAt: string;
  duration?: string;
  audioUrl?: string;
  hasAudio: boolean;
  link: string;
  imageUrl?: string;
}

export interface PodcastShowWithEpisodes extends PodcastShowMeta {
  episodes: PodcastEpisode[];
  status: 'ok' | 'error' | 'cached';
  lastUpdated?: string;
  lastError?: string;
}

export type PlatformAccessType =
  | 'free'
  | 'free_restricted'
  | 'account_required'
  | 'subscription';

export type PlaybackMode = 'internal_embed' | 'external_only';

export interface StreamingPlatform {
  id: string;
  name: string;
  url: string;
  accessType: PlatformAccessType;
  playbackMode: PlaybackMode;
  regionNoteAr: string;
  regionNoteDe: string;
  descriptionAr: string;
  descriptionDe: string;
  highlights: string[];
}

export interface MovieSeriesTitle {
  id: string;
  title: string;
  type: 'series' | 'film' | 'documentary_series';
  genre: string;
  year: string;
  language: string;
  cefrHint?: CEFRLevel;
  descriptionAr: string;
  descriptionDe: string;
  platformId: string;
  platformName: string;
  watchUrl: string;
  accessType: PlatformAccessType;
  playbackMode: PlaybackMode;
}

export interface SourceHealthStatus {
  id: string;
  name: string;
  type: 'radio' | 'news' | 'youtube' | 'podcast';
  websiteUrl: string;
  feedUrl: string;
  category: string;
  status: 'ok' | 'cached' | 'error' | 'idle';
  lastUpdated?: string;
  lastError?: string;
  itemCount: number;
  enabled: boolean;
}

export interface VocabItem {
  id: string;
  word: string;
  translation: string;
  sentence: string;
  sourceTitle: string;
  sourceUrl?: string;
  note?: string;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  type: 'radio' | 'news' | 'video' | 'podcast' | 'movie';
  title: string;
  subtitle: string;
  url?: string;
  timestamp: string;
}

export interface CustomRSSSource {
  id: string;
  name: string;
  rssUrl: string;
  websiteUrl: string;
  category: NewsCategory;
  enabled: boolean;
}

export interface FavoriteBundle {
  radio: RadioStation[];
  articles: NewsArticle[];
  videos: YouTubeVideo[];
  channels: YouTubeChannelMeta[];
  podcasts: PodcastShowMeta[];
  episodes: PodcastEpisode[];
  movies: MovieSeriesTitle[];
  readLater: NewsArticle[];
  watchLater: YouTubeVideo[];
  listenLater: PodcastEpisode[];
}

export interface UserLearningData {
  favorites: FavoriteBundle;
  vocabulary: VocabItem[];
  history: HistoryItem[];
  exposureMinutes: number;
  podcastPositions: Record<string, number>;
  recentStations: RadioStation[];
  disabledSourceIds: string[];
  customSources: CustomRSSSource[];
}
