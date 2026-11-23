import type {
  CustomRSSSource,
  DictionaryLookupResult,
  MovieSeriesTitle,
  NewsArticle,
  NewsCategory,
  NewsSourceMeta,
  PodcastShowMeta,
  PodcastShowWithEpisodes,
  RadioCategory,
  RadioStation,
  SourceHealthStatus,
  StreamingPlatform,
  YouTubeCategory,
  YouTubeChannelMeta,
  YouTubeVideo,
} from '../types/media';

const CLIENT_DICT_CACHE = new Map<string, DictionaryLookupResult>();

async function parseJsonSafely<T>(res: Response): Promise<T> {
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  const text = await res.text();
  if (!ct.includes('application/json')) {
    throw new Error('استجاب الخادم بتنسيق غير متوقع. يرجى المحاولة مرة أخرى.');
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('تعذر قراءة بيانات الاستجابة من الخادم.');
  }
}

const SNAPSHOT_PREFIX = 'df_cache_snapshot_v1_';

function saveSnapshot<T>(key: string, data: T): void {
  try {
    localStorage.setItem(
      `${SNAPSHOT_PREFIX}${key}`,
      JSON.stringify({ savedAt: new Date().toISOString(), data })
    );
  } catch {
    // Ignore quota errors
  }
}

function readSnapshot<T>(key: string): { savedAt: string; data: T } | null {
  try {
    const raw = localStorage.getItem(`${SNAPSHOT_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as { savedAt: string; data: T };
  } catch {
    return null;
  }
}

export async function fetchRadioStations(params: {
  q?: string;
  category?: RadioCategory;
  state?: string;
  offset?: number;
  limit?: number;
  force?: boolean;
}): Promise<{
  total: number;
  poolTotal: number;
  stations: RadioStation[];
  states: string[];
  health?: SourceHealthStatus;
  fromOfflineCache?: boolean;
}> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category) qs.set('category', params.category);
  if (params.state) qs.set('state', params.state);
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.force) qs.set('force', '1');

  const cacheKey = `radio_${params.category || 'all'}_${params.offset || 0}`;
  try {
    const res = await fetch(`/api/radio/stations?${qs.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!params.q && !params.state) saveSnapshot(cacheKey, data);
    return data;
  } catch (err) {
    const snap = readSnapshot<{
      total: number;
      poolTotal: number;
      stations: RadioStation[];
      states: string[];
    }>(cacheKey);
    if (snap) {
      return { ...snap.data, fromOfflineCache: true };
    }
    throw err;
  }
}

export async function fetchNewsFeed(params?: {
  category?: NewsCategory;
  source?: string;
  q?: string;
  force?: boolean;
}): Promise<{
  total: number;
  articles: NewsArticle[];
  sources: NewsSourceMeta[];
  health: SourceHealthStatus[];
  lastUpdated: string;
  fromOfflineCache?: boolean;
}> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.source) qs.set('source', params.source);
  if (params?.q) qs.set('q', params.q);
  if (params?.force) qs.set('force', '1');

  try {
    const res = await fetch(`/api/news?${qs.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!params?.q && !params?.source && (!params?.category || params.category === 'all')) {
      saveSnapshot('news_all', data);
    }
    return data;
  } catch (err) {
    const snap = readSnapshot<{
      total: number;
      articles: NewsArticle[];
      sources: NewsSourceMeta[];
      health: SourceHealthStatus[];
      lastUpdated: string;
    }>('news_all');
    if (snap) {
      return { ...snap.data, fromOfflineCache: true };
    }
    throw err;
  }
}

export async function fetchCustomNewsFeeds(sources: CustomRSSSource[]): Promise<NewsArticle[]> {
  if (!sources.length) return [];
  try {
    const res = await fetch('/api/news/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sources: sources.filter((s) => s.enabled) }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { articles: NewsArticle[] };
    return json.articles || [];
  } catch {
    return [];
  }
}

export async function fetchYouTubeVideos(params?: {
  category?: YouTubeCategory;
  channelId?: string;
  q?: string;
  force?: boolean;
}): Promise<{
  total: number;
  videos: YouTubeVideo[];
  channels: YouTubeChannelMeta[];
  usingYouTubeApi: boolean;
  health: SourceHealthStatus[];
  lastUpdated: string;
  fromOfflineCache?: boolean;
}> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.channelId) qs.set('channelId', params.channelId);
  if (params?.q) qs.set('q', params.q);
  if (params?.force) qs.set('force', '1');

  try {
    const res = await fetch(`/api/youtube?${qs.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!params?.q && !params?.channelId && (!params?.category || params.category === 'all')) {
      saveSnapshot('youtube_all', data);
    }
    return data;
  } catch (err) {
    const snap = readSnapshot<{
      total: number;
      videos: YouTubeVideo[];
      channels: YouTubeChannelMeta[];
      usingYouTubeApi: boolean;
      health: SourceHealthStatus[];
      lastUpdated: string;
    }>('youtube_all');
    if (snap) {
      return { ...snap.data, fromOfflineCache: true };
    }
    throw err;
  }
}

export async function fetchPodcasts(params?: {
  category?: string;
  showId?: string;
  force?: boolean;
}): Promise<{
  shows: PodcastShowWithEpisodes[];
  catalog: PodcastShowMeta[];
  health: SourceHealthStatus[];
  lastUpdated: string;
  fromOfflineCache?: boolean;
}> {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.showId) qs.set('showId', params.showId);
  if (params?.force) qs.set('force', '1');

  try {
    const res = await fetch(`/api/podcasts?${qs.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!params?.showId && (!params?.category || params.category === 'all')) {
      saveSnapshot('podcasts_all', data);
    }
    return data;
  } catch (err) {
    const snap = readSnapshot<{
      shows: PodcastShowWithEpisodes[];
      catalog: PodcastShowMeta[];
      health: SourceHealthStatus[];
      lastUpdated: string;
    }>('podcasts_all');
    if (snap) {
      return { ...snap.data, fromOfflineCache: true };
    }
    throw err;
  }
}

export async function discoverPodcasts(q: string): Promise<
  Array<{
    id: string;
    title: string;
    publisher: string;
    rssUrl: string;
    websiteUrl: string;
    coverUrl?: string;
    genre: string;
  }>
> {
  const res = await fetch(`/api/podcasts/discover?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export async function loadPodcastEpisodes(show: PodcastShowMeta): Promise<PodcastShowWithEpisodes> {
  const res = await fetch('/api/podcasts/episodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ show }),
  });
  if (!res.ok) throw new Error('Could not load podcast feed');
  const data = (await res.json()) as { show: PodcastShowWithEpisodes };
  return data.show;
}

export async function fetchMoviesDirectory(): Promise<{
  platforms: StreamingPlatform[];
  titles: MovieSeriesTitle[];
}> {
  const res = await fetch('/api/movies');
  if (!res.ok) throw new Error('Failed to load movies directory');
  return res.json();
}

export async function fetchAllSourcesHealth(): Promise<{
  news: NewsSourceMeta[];
  youtube: YouTubeChannelMeta[];
  podcasts: PodcastShowMeta[];
  platforms: StreamingPlatform[];
  health: SourceHealthStatus[];
}> {
  const res = await fetch('/api/sources');
  if (!res.ok) throw new Error('Failed to load sources');
  return res.json();
}

export async function validateCustomRss(
  rssUrl: string,
  name?: string
): Promise<{ valid: boolean; name: string; rssUrl: string }> {
  const res = await fetch('/api/sources/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rssUrl, name }),
  });
  const data = await parseJsonSafely<{ valid: boolean; name: string; rssUrl: string; error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Validation failed');
  return data;
}

export async function translateGermanOnDemand(
  text: string,
  target: 'ar' | 'en' = 'ar',
  sentence = ''
): Promise<DictionaryLookupResult> {
  const clean = text.trim();
  const cacheKey = `${target}::${clean.toLowerCase()}::${sentence.slice(0, 60).toLowerCase()}`;
  const cached = CLIENT_DICT_CACHE.get(cacheKey);
  if (cached) return { ...cached, cached: true };

  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ text: clean, sentence, target }),
  });

  const data = await parseJsonSafely<DictionaryLookupResult & { error?: string }>(res);
  if (!res.ok) {
    throw new Error(data.error || 'تعذرت الترجمة الفورية حالياً.');
  }
  CLIENT_DICT_CACHE.set(cacheKey, data);
  return data;
}

export async function runUnifiedSearch(q: string): Promise<{
  radio: RadioStation[];
  news: NewsArticle[];
  videos: YouTubeVideo[];
  podcasts: PodcastShowMeta[];
  episodes: any[];
  movies: MovieSeriesTitle[];
  platforms: StreamingPlatform[];
}> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export interface PublicAppConfig {
  heroTitleAr: string;
  heroTitleDe: string;
  heroTitleEn: string;
  heroSubtitleAr: string;
  heroSubtitleDe: string;
  heroSubtitleEn: string;
  landingHeadlineAr: string;
  landingHeadlineDe: string;
  landingHeadlineEn: string;
  announcementAr: string;
  announcementDe: string;
  announcementEn: string;
  hiddenModuleIds: string[];
  updatedAt: string;
}

export interface AdminSessionStatus {
  authenticated: boolean;
  isBootstrapped: boolean;
  envPasscodeActive: boolean;
  role?: 'admin';
  email?: string;
}

export interface SuggestionItem {
  id: string;
  title: string;
  category: string;
  message: string;
  senderEmail?: string;
  deliveredViaEmail: boolean;
  createdAt: string;
}

export async function fetchPublicAppConfig(): Promise<PublicAppConfig | null> {
  try {
    const res = await fetch('/api/app-config');
    if (!res.ok) return null;
    const data = await parseJsonSafely<{ config: PublicAppConfig }>(res);
    return data.config;
  } catch {
    return null;
  }
}

export async function submitDeveloperSuggestion(params: {
  title: string;
  category: string;
  message: string;
  senderEmail?: string;
}): Promise<{
  ok: boolean;
  id: string;
  deliveredViaEmail: boolean;
  mailtoUrl: string;
  createdAt: string;
}> {
  const res = await fetch('/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await parseJsonSafely<{
    ok: boolean;
    id: string;
    deliveredViaEmail: boolean;
    mailtoUrl: string;
    createdAt: string;
    error?: string;
  }>(res);
  if (!res.ok) {
    throw new Error(data.error || 'تعذر إرسال الاقتراح حالياً.');
  }
  return data;
}

export async function fetchAdminSession(token: string | null): Promise<AdminSessionStatus> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch('/api/admin/session', { headers });
  return parseJsonSafely<AdminSessionStatus>(res);
}

export async function bootstrapAdminOwner(
  email: string,
  password: string
): Promise<{ token: string; email: string; role: 'admin' }> {
  const res = await fetch('/api/admin/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonSafely<{ token?: string; email?: string; role?: 'admin'; error?: string }>(res);
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'Owner claim failed');
  }
  return { token: data.token, email: data.email || email, role: data.role || 'admin' };
}

export async function loginAdminOwner(
  email: string,
  password: string
): Promise<{ token: string; email: string; role: 'admin' }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonSafely<{ token?: string; email?: string; role?: 'admin'; error?: string }>(res);
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'Invalid credentials');
  }
  return { token: data.token, email: data.email || email, role: data.role || 'admin' };
}

export async function fetchAdminOverview(token: string): Promise<{
  config: PublicAppConfig;
  suggestions: SuggestionItem[];
  sourceHealth: SourceHealthStatus[];
}> {
  const res = await fetch('/api/admin/overview', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const data = await parseJsonSafely<{
    config: PublicAppConfig;
    suggestions: SuggestionItem[];
    sourceHealth: SourceHealthStatus[];
    error?: string;
  }>(res);
  if (!res.ok) throw new Error(data.error || 'Unauthorized');
  return data;
}

export async function updateAdminConfig(
  token: string,
  patch: Partial<PublicAppConfig>
): Promise<PublicAppConfig> {
  const res = await fetch('/api/admin/config', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(patch),
  });
  const data = await parseJsonSafely<{ config?: PublicAppConfig; error?: string }>(res);
  if (!res.ok || !data.config) throw new Error(data.error || 'Update failed');
  return data.config;
}

