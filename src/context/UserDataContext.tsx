import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createCustomRssSource,
  createHistoryEntry,
  createVocabEntry,
  DEFAULT_USER_DATA,
  exportUserDataJson,
  loadUserDataFromIDB,
  loadUserDataSync,
  parseImportedUserData,
  persistUserData,
  type FavoriteToggleItem,
} from '../services/storage';
import type {
  CustomRSSSource,
  HistoryItem,
  NewsCategory,
  RadioStation,
  UserLearningData,
} from '../types/media';

interface UserDataContextValue {
  data: UserLearningData;
  isFavorite: (kind: FavoriteToggleItem['kind'], id: string) => boolean;
  toggleFavorite: (payload: FavoriteToggleItem) => void;
  addVocab: (params: {
    word: string;
    translation: string;
    sentence: string;
    sourceTitle: string;
    sourceUrl?: string;
    note?: string;
    lemma?: string;
    partOfSpeech?: string;
    article?: string;
    plural?: string;
  }) => void;
  updateVocabNote: (id: string, note: string) => void;
  removeVocab: (id: string) => void;
  recordHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  recordRecentStation: (station: RadioStation) => void;
  savePodcastPosition: (episodeId: string, seconds: number) => void;
  addExposureSeconds: (seconds: number) => void;
  toggleSourceEnabled: (sourceId: string) => void;
  addCustomSource: (params: {
    name: string;
    rssUrl: string;
    websiteUrl: string;
    category: NewsCategory;
  }) => void;
  removeCustomSource: (id: string) => void;
  exportBackup: () => string;
  importBackup: (jsonStr: string) => void;
  resetAllData: () => void;
}

const UserDataContext = createContext<UserDataContextValue | null>(null);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<UserLearningData>(() => loadUserDataSync());

  useEffect(() => {
    void loadUserDataFromIDB().then((idbData) => {
      if (idbData) {
        setData(idbData);
      }
    });
  }, []);

  const updateAndPersist = useCallback((updater: (prev: UserLearningData) => UserLearningData) => {
    setData((prev) => {
      const next = updater(prev);
      persistUserData(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (kind: FavoriteToggleItem['kind'], id: string) => {
      const arr = data.favorites[kind] as Array<{ id: string }>;
      return arr.some((x) => x.id === id);
    },
    [data.favorites]
  );

  const toggleFavorite = useCallback(
    (payload: FavoriteToggleItem) => {
      updateAndPersist((prev) => {
        const currentList = prev.favorites[payload.kind] as Array<{ id: string }>;
        const exists = currentList.some((x) => x.id === payload.item.id);
        const nextList = exists
          ? currentList.filter((x) => x.id !== payload.item.id)
          : [payload.item, ...currentList];
        return {
          ...prev,
          favorites: {
            ...prev.favorites,
            [payload.kind]: nextList,
          },
        };
      });
    },
    [updateAndPersist]
  );

  const addVocab = useCallback(
    (params: {
      word: string;
      translation: string;
      sentence: string;
      sourceTitle: string;
      sourceUrl?: string;
      note?: string;
      lemma?: string;
      partOfSpeech?: string;
      article?: string;
      plural?: string;
    }) => {
      const entry = createVocabEntry(params);
      const normWord = entry.word.toLowerCase();
      const normSent = entry.sentence.toLowerCase();
      updateAndPersist((prev) => {
        const existingIdx = prev.vocabulary.findIndex(
          (v) =>
            v.word.trim().toLowerCase() === normWord &&
            v.sentence.trim().toLowerCase() === normSent
        );
        if (existingIdx >= 0) {
          const updated = [...prev.vocabulary];
          const prevItem = updated[existingIdx];
          updated[existingIdx] = {
            ...prevItem,
            translation: entry.translation || prevItem.translation,
            note: entry.note || prevItem.note,
            lemma: entry.lemma || prevItem.lemma,
            partOfSpeech: entry.partOfSpeech || prevItem.partOfSpeech,
            article: entry.article || prevItem.article,
            plural: entry.plural || prevItem.plural,
          };
          return { ...prev, vocabulary: updated };
        }
        return {
          ...prev,
          vocabulary: [entry, ...prev.vocabulary],
        };
      });
    },
    [updateAndPersist]
  );

  const updateVocabNote = useCallback(
    (id: string, note: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.map((v) => (v.id === id ? { ...v, note } : v)),
      }));
    },
    [updateAndPersist]
  );

  const removeVocab = useCallback(
    (id: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.filter((v) => v.id !== id),
      }));
    },
    [updateAndPersist]
  );

  const recordHistory = useCallback(
    (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
      const entry = createHistoryEntry(item);
      updateAndPersist((prev) => ({
        ...prev,
        history: [entry, ...prev.history.filter((h) => h.title !== item.title)].slice(0, 80),
      }));
    },
    [updateAndPersist]
  );

  const recordRecentStation = useCallback(
    (station: RadioStation) => {
      updateAndPersist((prev) => ({
        ...prev,
        recentStations: [station, ...prev.recentStations.filter((s) => s.id !== station.id)].slice(0, 12),
      }));
    },
    [updateAndPersist]
  );

  const savePodcastPosition = useCallback(
    (episodeId: string, seconds: number) => {
      updateAndPersist((prev) => ({
        ...prev,
        podcastPositions: {
          ...prev.podcastPositions,
          [episodeId]: Math.floor(seconds),
        },
      }));
    },
    [updateAndPersist]
  );

  const addExposureSeconds = useCallback(
    (seconds: number) => {
      const mins = seconds / 60;
      if (mins <= 0) return;
      updateAndPersist((prev) => ({
        ...prev,
        exposureMinutes: Math.round((prev.exposureMinutes + mins) * 10) / 10,
      }));
    },
    [updateAndPersist]
  );

  const toggleSourceEnabled = useCallback(
    (sourceId: string) => {
      updateAndPersist((prev) => {
        const disabled = prev.disabledSourceIds.includes(sourceId);
        return {
          ...prev,
          disabledSourceIds: disabled
            ? prev.disabledSourceIds.filter((id) => id !== sourceId)
            : [...prev.disabledSourceIds, sourceId],
        };
      });
    },
    [updateAndPersist]
  );

  const addCustomSource = useCallback(
    (params: { name: string; rssUrl: string; websiteUrl: string; category: NewsCategory }) => {
      const src: CustomRSSSource = createCustomRssSource({ ...params, enabled: true });
      updateAndPersist((prev) => ({
        ...prev,
        customSources: [src, ...prev.customSources],
      }));
    },
    [updateAndPersist]
  );

  const removeCustomSource = useCallback(
    (id: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        customSources: prev.customSources.filter((s) => s.id !== id),
      }));
    },
    [updateAndPersist]
  );

  const exportBackup = useCallback(() => exportUserDataJson(data), [data]);

  const importBackup = useCallback(
    (jsonStr: string) => {
      const parsed = parseImportedUserData(jsonStr);
      updateAndPersist(() => parsed);
    },
    [updateAndPersist]
  );

  const resetAllData = useCallback(() => {
    updateAndPersist(() => structuredClone(DEFAULT_USER_DATA));
  }, [updateAndPersist]);

  return (
    <UserDataContext.Provider
      value={{
        data,
        isFavorite,
        toggleFavorite,
        addVocab,
        updateVocabNote,
        removeVocab,
        recordHistory,
        recordRecentStation,
        savePodcastPosition,
        addExposureSeconds,
        toggleSourceEnabled,
        addCustomSource,
        removeCustomSource,
        exportBackup,
        importBackup,
        resetAllData,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
};

export function useUserData(): UserDataContextValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used inside UserDataProvider');
  return ctx;
}
