import type {
  CEFRLevel,
  CurriculumUnit,
  CustomRSSSource,
  DeutschFlow2AdminConfig,
  DictionaryLookupResult,
  GrammarLibraryEntry,
  ImportantSentenceEntry,
  LearnerProfileState,
  LearningActivityType,
  LearningContentInput,
  LearningEngineErrorReport,
  LearningLesson,
  LearningTelemetryStats,
  MovieSeriesTitle,
  NewsArticle,
  NewsCategory,
  NewsSourceMeta,
  PlacementQuestion,
  PodcastShowMeta,
  PodcastShowWithEpisodes,
  RadioCategory,
  RadioStation,
  SentenceAnalysisResult,
  SourceHealthStatus,
  StreamingPlatform,
  UserAchievement,
  UserMistake,
  VocabItem,
  VocabReviewRating,
  WeeklyReport,
  WritingEvaluationResult,
  XPTransaction,
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
  learningConfig?: DeutschFlow2AdminConfig;
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
  learningTelemetry?: LearningTelemetryStats;
  errorReports?: LearningEngineErrorReport[];
}> {
  const res = await fetch('/api/admin/overview', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const data = await parseJsonSafely<{
    config: PublicAppConfig;
    suggestions: SuggestionItem[];
    sourceHealth: SourceHealthStatus[];
    learningTelemetry?: LearningTelemetryStats;
    errorReports?: LearningEngineErrorReport[];
    error?: string;
  }>(res);
  if (!res.ok) throw new Error(data.error || 'Unauthorized');
  return data;
}

export async function resolveAdminLearningReport(
  token: string,
  reportId: string
): Promise<LearningEngineErrorReport> {
  const res = await fetch(`/api/admin/learning-reports/${encodeURIComponent(reportId)}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const data = await parseJsonSafely<{ report?: LearningEngineErrorReport; error?: string }>(res);
  if (!res.ok || !data.report) throw new Error(data.error || 'Failed to resolve report');
  return data.report;
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

// ---------------------------------------------------------------------------
// DeutschFlow 2.0 — Learner Profile & Intelligent Ecosystem Client
// ---------------------------------------------------------------------------

const PROFILE_ID_STORAGE_KEY = 'df_learner_profile_id_v1';

export function getOrCreateLearnerProfileId(): string {
  try {
    const existing = localStorage.getItem(PROFILE_ID_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
      return existing;
    }
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `df_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
        : `df_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(PROFILE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return 'df_session_fallback_profile';
  }
}

export function setLearnerProfileId(profileId: string): void {
  try {
    localStorage.setItem(PROFILE_ID_STORAGE_KEY, profileId);
  } catch {
    // Ignore storage errors
  }
}

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function learningHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-DeutschFlow-Profile': getOrCreateLearnerProfileId(),
  };
}

export interface ProfilePayloadResponse {
  profile: LearnerProfileState;
  weeklyReport: WeeklyReport;
  availableWeeks: string[];
  xpAwarded?: XPTransaction[];
  unlockedAchievements?: UserAchievement[];
}

export async function fetchLearnerProfile(weekKey?: string): Promise<ProfilePayloadResponse> {
  const qs = new URLSearchParams({ tz: getBrowserTimezone() });
  if (weekKey) qs.set('weekKey', weekKey);
  const res = await fetch(`/api/learning/profile?${qs.toString()}`, {
    headers: { Accept: 'application/json', 'X-DeutschFlow-Profile': getOrCreateLearnerProfileId() },
  });
  const data = await parseJsonSafely<ProfilePayloadResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load learner profile');
  return data;
}

export async function updateLearnerProfilePreferences(patch: {
  dailyGoalMinutes?: number;
  weeklyGoalMinutes?: number;
  cefrLevel?: CEFRLevel;
  vocabCollectionUpdate?: { vocabId: string; collections: string[]; note?: string };
  deleteVocabId?: string;
}): Promise<ProfilePayloadResponse> {
  const res = await fetch('/api/learning/profile', {
    method: 'PATCH',
    headers: learningHeaders(),
    body: JSON.stringify({ ...patch, timezone: getBrowserTimezone() }),
  });
  const data = await parseJsonSafely<ProfilePayloadResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to update preferences');
  return data;
}

export async function restoreProfileBySyncCode(syncCode: string): Promise<ProfilePayloadResponse> {
  const res = await fetch('/api/learning/sync-restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ syncCode: syncCode.trim() }),
  });
  const data = await parseJsonSafely<ProfilePayloadResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Sync code restore failed');
  setLearnerProfileId(data.profile.profileId);
  return data;
}

export async function postLearnerActivity(payload: {
  type: LearningActivityType;
  durationSeconds?: number;
  scorePct?: number;
  cefrLevel?: CEFRLevel;
  skill?: 'reading' | 'listening' | 'vocabulary' | 'grammar' | 'writing';
  sourceId?: string;
  sourceTitle?: string;
  articleCompleted?: boolean;
}): Promise<ProfilePayloadResponse> {
  const res = await fetch('/api/learning/activity', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify({ ...payload, timezone: getBrowserTimezone() }),
  });
  const data = await parseJsonSafely<ProfilePayloadResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to record activity');
  return data;
}

export async function postDailyVocabMissionComplete(payload: {
  savedWordsCount: number;
  quizPassed: boolean;
}): Promise<ProfilePayloadResponse> {
  const res = await fetch('/api/learning/missions/vocab-complete', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify({ ...payload, timezone: getBrowserTimezone() }),
  });
  const data = await parseJsonSafely<ProfilePayloadResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to update mission');
  return data;
}

export async function upsertLearnerVocabulary(
  items: Array<Partial<VocabItem> & { word: string }>
): Promise<ProfilePayloadResponse & { addedCount: number; mergedCount: number }> {
  const res = await fetch('/api/learning/vocabulary/upsert', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify({ items, timezone: getBrowserTimezone() }),
  });
  const data = await parseJsonSafely<
    ProfilePayloadResponse & { addedCount: number; mergedCount: number; error?: string }
  >(res);
  if (!res.ok) throw new Error(data.error || 'Failed to save vocabulary');
  return data;
}

export async function submitVocabSM2Review(
  vocabId: string,
  rating: VocabReviewRating
): Promise<ProfilePayloadResponse & { updatedItem: VocabItem | null }> {
  const res = await fetch('/api/learning/vocabulary/review', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify({ vocabId, rating, timezone: getBrowserTimezone() }),
  });
  const data = await parseJsonSafely<
    ProfilePayloadResponse & { updatedItem: VocabItem | null; error?: string }
  >(res);
  if (!res.ok) throw new Error(data.error || 'Failed to submit review');
  return data;
}

export async function postLearningMistakes(
  mistakes: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>
): Promise<ProfilePayloadResponse> {
  const res = await fetch('/api/learning/mistakes', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify({ mistakes, timezone: getBrowserTimezone() }),
  });
  const data = await parseJsonSafely<ProfilePayloadResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to record mistakes');
  return data;
}

export async function fetchCefrCurriculum(): Promise<{
  units: CurriculumUnit[];
  grammarLibrary: GrammarLibraryEntry[];
  importantSentences: ImportantSentenceEntry[];
  placementQuestions: PlacementQuestion[];
}> {
  const res = await fetch('/api/learning/curriculum', { headers: { Accept: 'application/json' } });
  const data = await parseJsonSafely<{
    units: CurriculumUnit[];
    grammarLibrary: GrammarLibraryEntry[];
    importantSentences: ImportantSentenceEntry[];
    placementQuestions: PlacementQuestion[];
    error?: string;
  }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load curriculum');
  return data;
}

export async function completeCefrTarget(payload: {
  kind: 'lesson' | 'unit';
  targetId: string;
  scorePct: number;
  cefrLevel: CEFRLevel;
  mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
}): Promise<ProfilePayloadResponse & { passed: boolean }> {
  const res = await fetch('/api/learning/curriculum/complete', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify({ ...payload, timezone: getBrowserTimezone() }),
  });
  const data = await parseJsonSafely<ProfilePayloadResponse & { passed: boolean; error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to record curriculum completion');
  return data;
}

export async function submitCefrPlacement(
  answers: Array<{ questionId: string; selectedIndex: number }>
): Promise<
  ProfilePayloadResponse & {
    result: { level: CEFRLevel; scorePct: number; correctCount: number; totalCount: number };
  }
> {
  const res = await fetch('/api/learning/placement/submit', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify({ answers, timezone: getBrowserTimezone() }),
  });
  const data = await parseJsonSafely<
    ProfilePayloadResponse & {
      result: { level: CEFRLevel; scorePct: number; correctCount: number; totalCount: number };
      error?: string;
    }
  >(res);
  if (!res.ok) throw new Error(data.error || 'Placement submission failed');
  return data;
}

export async function fetchWeeklyReport(weekKey?: string): Promise<{
  report: WeeklyReport;
  availableWeeks: string[];
}> {
  const qs = new URLSearchParams({ tz: getBrowserTimezone() });
  if (weekKey) qs.set('weekKey', weekKey);
  const res = await fetch(`/api/learning/weekly-report?${qs.toString()}`, {
    headers: { Accept: 'application/json', 'X-DeutschFlow-Profile': getOrCreateLearnerProfileId() },
  });
  const data = await parseJsonSafely<{
    report: WeeklyReport;
    availableWeeks: string[];
    error?: string;
  }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to fetch weekly report');
  return data;
}

export async function generateLearningEngineCourse(
  input: LearningContentInput
): Promise<LearningLesson> {
  const res = await fetch('/api/learning-engine/generate', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify(input),
  });
  const data = await parseJsonSafely<{ lesson?: LearningLesson; error?: string }>(res);
  if (!res.ok || !data.lesson) {
    throw new Error(data.error || 'تعذر توليد الدرس الذكي لهذا المحتوى.');
  }
  return data.lesson;
}

export async function analyzeSentenceViaEngine(sentenceDe: string): Promise<SentenceAnalysisResult> {
  const res = await fetch('/api/learning-engine/analyze-sentence', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify({ sentenceDe }),
  });
  const data = await parseJsonSafely<{ analysis?: SentenceAnalysisResult; error?: string }>(res);
  if (!res.ok || !data.analysis) {
    throw new Error(data.error || 'تعذر تحليل الجملة حالياً.');
  }
  return data.analysis;
}

export async function evaluateWritingViaEngine(payload: {
  promptDe: string;
  userText: string;
  targetWords: string[];
  cefrLevel: CEFRLevel;
}): Promise<WritingEvaluationResult> {
  const res = await fetch('/api/learning-engine/evaluate-writing', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafely<{ evaluation?: WritingEvaluationResult; error?: string }>(res);
  if (!res.ok || !data.evaluation) {
    throw new Error(data.error || 'تعذر تقييم الكتابة حالياً.');
  }
  return data.evaluation;
}

export async function completeLearningEngineLesson(payload: {
  lessonId: string;
  sourceTitle: string;
  cefrLevel?: CEFRLevel;
  quizScorePct: number;
  mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
}): Promise<ProfilePayloadResponse> {
  const res = await fetch('/api/learning-engine/complete', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify({ ...payload, timezone: getBrowserTimezone() }),
  });
  const data = await parseJsonSafely<ProfilePayloadResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to record lesson completion');
  return data;
}

export async function reportLearningEngineError(payload: {
  lessonId: string;
  sourceTitle: string;
  section: string;
  message: string;
}): Promise<LearningEngineErrorReport> {
  const res = await fetch('/api/learning-engine/report-error', {
    method: 'POST',
    headers: learningHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await parseJsonSafely<{ report?: LearningEngineErrorReport; error?: string }>(res);
  if (!res.ok || !data.report) throw new Error(data.error || 'Failed to report error');
  return data.report;
}


