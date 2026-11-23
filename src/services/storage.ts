import type {
  CustomRSSSource,
  HistoryItem,
  MovieSeriesTitle,
  NewsArticle,
  PodcastEpisode,
  PodcastShowMeta,
  RadioStation,
  UserLearningData,
  VocabItem,
  YouTubeChannelMeta,
  YouTubeVideo,
} from '../types/media';

const STORAGE_KEY = 'deutschflow_ultimate_user_data_v1';
const DB_NAME = 'DeutschFlowUltimateDB';
const DB_STORE = 'userdata';
const DB_KEY = 'main';

export const DEFAULT_USER_DATA: UserLearningData = {
  favorites: {
    radio: [],
    articles: [],
    videos: [],
    channels: [],
    podcasts: [],
    episodes: [],
    movies: [],
    readLater: [],
    watchLater: [],
    listenLater: [],
  },
  vocabulary: [],
  history: [],
  exposureMinutes: 0,
  podcastPositions: {},
  recentStations: [],
  disabledSourceIds: [],
  customSources: [],
};

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function loadUserDataSync(): UserLearningData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_USER_DATA);
    const parsed = JSON.parse(raw) as Partial<UserLearningData>;
    return {
      ...DEFAULT_USER_DATA,
      ...parsed,
      favorites: {
        ...DEFAULT_USER_DATA.favorites,
        ...(parsed.favorites || {}),
      },
    };
  } catch {
    return structuredClone(DEFAULT_USER_DATA);
  }
}

export async function loadUserDataFromIDB(): Promise<UserLearningData | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.get(DB_KEY);
      req.onsuccess = () => {
        if (req.result) {
          resolve({
            ...DEFAULT_USER_DATA,
            ...req.result,
            favorites: {
              ...DEFAULT_USER_DATA.favorites,
              ...(req.result.favorites || {}),
            },
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function persistUserData(data: UserLearningData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota warnings gracefully
  }
  void openDb().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(data, DB_KEY);
    } catch {
      // Fallback already saved in localStorage
    }
  });
}

export function exportUserDataJson(data: UserLearningData): string {
  return JSON.stringify(
    {
      app: 'DeutschFlow Ultimate',
      exportedAt: new Date().toISOString(),
      version: 1,
      data,
    },
    null,
    2
  );
}

export function parseImportedUserData(rawJson: string): UserLearningData {
  const parsed = JSON.parse(rawJson) as { data?: Partial<UserLearningData> } & Partial<UserLearningData>;
  const payload = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid DeutschFlow backup JSON format');
  }
  return {
    ...DEFAULT_USER_DATA,
    ...payload,
    favorites: {
      ...DEFAULT_USER_DATA.favorites,
      ...(payload.favorites || {}),
    },
    vocabulary: Array.isArray(payload.vocabulary) ? payload.vocabulary : [],
    history: Array.isArray(payload.history) ? payload.history : [],
    recentStations: Array.isArray(payload.recentStations) ? payload.recentStations : [],
    disabledSourceIds: Array.isArray(payload.disabledSourceIds) ? payload.disabledSourceIds : [],
    customSources: Array.isArray(payload.customSources) ? payload.customSources : [],
    exposureMinutes: typeof payload.exposureMinutes === 'number' ? payload.exposureMinutes : 0,
    podcastPositions: payload.podcastPositions && typeof payload.podcastPositions === 'object' ? payload.podcastPositions : {},
  };
}

export type FavoriteToggleItem =
  | { kind: 'radio'; item: RadioStation }
  | { kind: 'articles'; item: NewsArticle }
  | { kind: 'videos'; item: YouTubeVideo }
  | { kind: 'channels'; item: YouTubeChannelMeta }
  | { kind: 'podcasts'; item: PodcastShowMeta }
  | { kind: 'episodes'; item: PodcastEpisode }
  | { kind: 'movies'; item: MovieSeriesTitle }
  | { kind: 'readLater'; item: NewsArticle }
  | { kind: 'watchLater'; item: YouTubeVideo }
  | { kind: 'listenLater'; item: PodcastEpisode };

export function createVocabEntry(params: {
  word: string;
  translation: string;
  sentence: string;
  sourceTitle: string;
  sourceUrl?: string;
  note?: string;
}): VocabItem {
  return {
    id: `voc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    word: params.word.trim(),
    translation: params.translation.trim(),
    sentence: params.sentence.trim(),
    sourceTitle: params.sourceTitle,
    sourceUrl: params.sourceUrl,
    note: params.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
}

export function createHistoryEntry(params: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
  return {
    ...params,
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
}

export function createCustomRssSource(params: Omit<CustomRSSSource, 'id'>): CustomRSSSource {
  return {
    ...params,
    id: `custom_${Date.now()}`,
  };
}
