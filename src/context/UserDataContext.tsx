import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  completeCefrTarget,
  completeLearningEngineLesson,
  fetchLearnerProfile,
  fetchWeeklyReport,
  postDailyVocabMissionComplete,
  postLearnerActivity,
  postLearningMistakes,
  restoreProfileBySyncCode,
  submitCefrPlacement,
  submitVocabSM2Review,
  updateLearnerProfilePreferences,
  upsertLearnerVocabulary,
  type ProfilePayloadResponse,
} from '../services/api';
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
  CEFRLevel,
  CustomRSSSource,
  HistoryItem,
  LearnerProfileState,
  LearningActivityType,
  LearningContentInput,
  NewsCategory,
  RadioStation,
  UserAchievement,
  UserLearningData,
  UserMistake,
  VocabItem,
  VocabReviewRating,
  WeeklyReport,
  XPTransaction,
} from '../types/media';

interface XpRewardNotice {
  id: string;
  xpAmount: number;
  labelAr: string;
  labelEn: string;
  achievements: UserAchievement[];
}

interface UserDataContextValue {
  data: UserLearningData;
  learnerProfile: LearnerProfileState | null;
  weeklyReport: WeeklyReport | null;
  availableWeeks: string[];
  profileLoading: boolean;
  latestXpNotice: XpRewardNotice | null;
  dismissXpNotice: () => void;
  learningEngineInput: LearningContentInput | null;
  openLearningEngine: (input: LearningContentInput) => void;
  closeLearningEngine: () => void;
  refreshLearnerProfile: (weekKey?: string) => Promise<void>;
  loadReportForWeek: (weekKey: string) => Promise<void>;
  restoreSyncCode: (syncCode: string) => Promise<void>;
  updateLearnerGoals: (patch: {
    dailyGoalMinutes?: number;
    weeklyGoalMinutes?: number;
    cefrLevel?: CEFRLevel;
  }) => Promise<void>;
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
    wordCategory?: VocabItem['wordCategory'];
    cefrLevel?: CEFRLevel;
    phonetic?: string;
    sentenceTranslationAr?: string;
    verbForms?: VocabItem['verbForms'];
    adjectiveForms?: VocabItem['adjectiveForms'];
    collections?: string[];
  }) => void;
  addRichVocabItems: (
    items: Array<Partial<VocabItem> & { word: string }>
  ) => Promise<{ addedCount: number; mergedCount: number }>;
  reviewVocabWord: (vocabId: string, rating: VocabReviewRating) => Promise<void>;
  updateVocabCollections: (vocabId: string, collections: string[], note?: string) => Promise<void>;
  updateVocabNote: (id: string, note: string) => void;
  removeVocab: (id: string) => void;
  logLearningActivity: (payload: {
    type: LearningActivityType;
    durationSeconds?: number;
    scorePct?: number;
    cefrLevel?: CEFRLevel;
    skill?: 'reading' | 'listening' | 'vocabulary' | 'grammar' | 'writing';
    sourceId?: string;
    sourceTitle?: string;
    articleCompleted?: boolean;
  }) => Promise<void>;
  completeDailyVocabChallenge: (savedWordsCount: number, quizPassed: boolean) => Promise<void>;
  completeCefrCurriculumItem: (payload: {
    kind: 'lesson' | 'unit';
    targetId: string;
    scorePct: number;
    cefrLevel: CEFRLevel;
    mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
  }) => Promise<{ passed: boolean }>;
  submitPlacementTest: (
    answers: Array<{ questionId: string; selectedIndex: number }>
  ) => Promise<{ level: CEFRLevel; scorePct: number; correctCount: number; totalCount: number }>;
  completeLearningEngineCourseClient: (payload: {
    lessonId: string;
    sourceTitle: string;
    cefrLevel?: CEFRLevel;
    quizScorePct: number;
    mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
  }) => Promise<void>;
  recordMistakes: (mistakes: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>) => Promise<void>;
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
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfileState | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([]);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [latestXpNotice, setLatestXpNotice] = useState<XpRewardNotice | null>(null);
  const [learningEngineInput, setLearningEngineInput] = useState<LearningContentInput | null>(null);
  const migratedInitialRef = useRef(false);
  const noticeTimerRef = useRef<number | null>(null);

  const dismissXpNotice = useCallback(() => {
    setLatestXpNotice(null);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }, []);

  const announceXpAndBadges = useCallback(
    (xpAwarded?: XPTransaction[], unlockedAchievements?: UserAchievement[]) => {
      const totalAdded = (xpAwarded || []).reduce((acc, tx) => acc + tx.amount, 0);
      const badges = unlockedAchievements || [];
      if (totalAdded <= 0 && badges.length === 0) return;
      const firstTx = xpAwarded?.[0];
      setLatestXpNotice({
        id: `notice_${Date.now()}`,
        xpAmount: totalAdded,
        labelAr: firstTx?.labelAr || badges[0]?.titleAr || 'نشاط تعلّم مكتمل',
        labelEn: firstTx?.labelEn || badges[0]?.titleEn || 'Learning progress saved',
        achievements: badges,
      });
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = window.setTimeout(() => {
        setLatestXpNotice(null);
      }, 4500);
    },
    []
  );

  const applyServerPayload = useCallback(
    (res: ProfilePayloadResponse) => {
      setLearnerProfile(res.profile);
      setWeeklyReport(res.weeklyReport);
      setAvailableWeeks(res.availableWeeks || []);
      // Mirror backend smart vocabulary back to local UserLearningData so flashcards & legacy views stay synced
      setData((prev) => {
        const next: UserLearningData = {
          ...prev,
          vocabulary: res.profile.vocabulary,
        };
        persistUserData(next);
        return next;
      });
      announceXpAndBadges(res.xpAwarded, res.unlockedAchievements);
    },
    [announceXpAndBadges]
  );

  const refreshLearnerProfile = useCallback(async (weekKey?: string) => {
    setProfileLoading(true);
    try {
      const res = await fetchLearnerProfile(weekKey);
      setLearnerProfile(res.profile);
      setWeeklyReport(res.weeklyReport);
      setAvailableWeeks(res.availableWeeks || []);
      // Sync local saved words to server once on initial boot if server bank has fewer items
      if (!migratedInitialRef.current) {
        migratedInitialRef.current = true;
        const localSnap = loadUserDataSync();
        if (localSnap.vocabulary.length > 0) {
          const serverWords = new Set(res.profile.vocabulary.map((v) => v.word.trim().toLowerCase()));
          const missing = localSnap.vocabulary.filter((v) => !serverWords.has(v.word.trim().toLowerCase()));
          if (missing.length > 0) {
            const synced = await upsertLearnerVocabulary(missing);
            setLearnerProfile(synced.profile);
            setWeeklyReport(synced.weeklyReport);
            setAvailableWeeks(synced.availableWeeks || []);
          } else if (res.profile.vocabulary.length > localSnap.vocabulary.length) {
            setData((prev) => {
              const next = { ...prev, vocabulary: res.profile.vocabulary };
              persistUserData(next);
              return next;
            });
          }
        } else if (res.profile.vocabulary.length > 0) {
          setData((prev) => {
            const next = { ...prev, vocabulary: res.profile.vocabulary };
            persistUserData(next);
            return next;
          });
        }
      }
    } catch {
      // Offline mode continues cleanly with local IndexedDB/localStorage data
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUserDataFromIDB().then((idbData) => {
      if (idbData) {
        setData(idbData);
      }
      void refreshLearnerProfile();
    });
  }, [refreshLearnerProfile]);

  const loadReportForWeek = useCallback(async (weekKey: string) => {
    const res = await fetchWeeklyReport(weekKey);
    setWeeklyReport(res.report);
    setAvailableWeeks(res.availableWeeks || []);
  }, []);

  const restoreSyncCode = useCallback(
    async (syncCode: string) => {
      const res = await restoreProfileBySyncCode(syncCode);
      applyServerPayload(res);
    },
    [applyServerPayload]
  );

  const updateLearnerGoals = useCallback(
    async (patch: { dailyGoalMinutes?: number; weeklyGoalMinutes?: number; cefrLevel?: CEFRLevel }) => {
      const res = await updateLearnerProfilePreferences(patch);
      applyServerPayload(res);
    },
    [applyServerPayload]
  );

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
      wordCategory?: VocabItem['wordCategory'];
      cefrLevel?: CEFRLevel;
      phonetic?: string;
      sentenceTranslationAr?: string;
      verbForms?: VocabItem['verbForms'];
      adjectiveForms?: VocabItem['adjectiveForms'];
      collections?: string[];
    }) => {
      const entry: VocabItem = {
        ...createVocabEntry(params),
        wordCategory: params.wordCategory,
        cefrLevel: params.cefrLevel,
        phonetic: params.phonetic,
        sentenceTranslationAr: params.sentenceTranslationAr,
        verbForms: params.verbForms,
        adjectiveForms: params.adjectiveForms,
        collections: params.collections,
      };
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
            wordCategory: entry.wordCategory || prevItem.wordCategory,
            cefrLevel: entry.cefrLevel || prevItem.cefrLevel,
            phonetic: entry.phonetic || prevItem.phonetic,
          };
          return { ...prev, vocabulary: updated };
        }
        return {
          ...prev,
          vocabulary: [entry, ...prev.vocabulary],
        };
      });

      void upsertLearnerVocabulary([entry])
        .then((res) => applyServerPayload(res))
        .catch(() => {
          // Offline local entry preserved
        });
    },
    [updateAndPersist, applyServerPayload]
  );

  const addRichVocabItems = useCallback(
    async (items: Array<Partial<VocabItem> & { word: string }>) => {
      if (!items.length) return { addedCount: 0, mergedCount: 0 };
      try {
        const res = await upsertLearnerVocabulary(items);
        applyServerPayload(res);
        return { addedCount: res.addedCount, mergedCount: res.mergedCount };
      } catch {
        for (const it of items) {
          addVocab({
            word: it.word,
            translation: it.translation || '—',
            sentence: it.sentence || '',
            sourceTitle: it.sourceTitle || 'DeutschFlow',
            sourceUrl: it.sourceUrl,
            note: it.note,
            lemma: it.lemma,
            partOfSpeech: it.partOfSpeech,
            article: it.article,
            plural: it.plural,
            wordCategory: it.wordCategory,
            cefrLevel: it.cefrLevel,
            phonetic: it.phonetic,
            sentenceTranslationAr: it.sentenceTranslationAr,
            verbForms: it.verbForms,
            adjectiveForms: it.adjectiveForms,
            collections: it.collections,
          });
        }
        return { addedCount: items.length, mergedCount: 0 };
      }
    },
    [addVocab, applyServerPayload]
  );

  const reviewVocabWord = useCallback(
    async (vocabId: string, rating: VocabReviewRating) => {
      const res = await submitVocabSM2Review(vocabId, rating);
      applyServerPayload(res);
    },
    [applyServerPayload]
  );

  const updateVocabCollections = useCallback(
    async (vocabId: string, collections: string[], note?: string) => {
      const res = await updateLearnerProfilePreferences({
        vocabCollectionUpdate: { vocabId, collections, note },
      });
      applyServerPayload(res);
    },
    [applyServerPayload]
  );

  const updateVocabNote = useCallback(
    (id: string, note: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.map((v) => (v.id === id ? { ...v, note } : v)),
      }));
      const target = data.vocabulary.find((v) => v.id === id);
      void updateLearnerProfilePreferences({
        vocabCollectionUpdate: { vocabId: id, collections: target?.collections || [], note },
      })
        .then((res) => applyServerPayload(res))
        .catch(() => {});
    },
    [updateAndPersist, data.vocabulary, applyServerPayload]
  );

  const removeVocab = useCallback(
    (id: string) => {
      updateAndPersist((prev) => ({
        ...prev,
        vocabulary: prev.vocabulary.filter((v) => v.id !== id),
      }));
      void updateLearnerProfilePreferences({ deleteVocabId: id })
        .then((res) => applyServerPayload(res))
        .catch(() => {});
    },
    [updateAndPersist, applyServerPayload]
  );

  const logLearningActivity = useCallback(
    async (payload: {
      type: LearningActivityType;
      durationSeconds?: number;
      scorePct?: number;
      cefrLevel?: CEFRLevel;
      skill?: 'reading' | 'listening' | 'vocabulary' | 'grammar' | 'writing';
      sourceId?: string;
      sourceTitle?: string;
      articleCompleted?: boolean;
    }) => {
      try {
        const res = await postLearnerActivity(payload);
        applyServerPayload(res);
      } catch {
        // Ignore offline activity failure
      }
    },
    [applyServerPayload]
  );

  const completeDailyVocabChallenge = useCallback(
    async (savedWordsCount: number, quizPassed: boolean) => {
      const res = await postDailyVocabMissionComplete({ savedWordsCount, quizPassed });
      applyServerPayload(res);
    },
    [applyServerPayload]
  );

  const completeCefrCurriculumItem = useCallback(
    async (payload: {
      kind: 'lesson' | 'unit';
      targetId: string;
      scorePct: number;
      cefrLevel: CEFRLevel;
      mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
    }) => {
      const res = await completeCefrTarget(payload);
      applyServerPayload(res);
      return { passed: res.passed };
    },
    [applyServerPayload]
  );

  const submitPlacementTest = useCallback(
    async (answers: Array<{ questionId: string; selectedIndex: number }>) => {
      const res = await submitCefrPlacement(answers);
      applyServerPayload(res);
      return res.result;
    },
    [applyServerPayload]
  );

  const completeLearningEngineCourseClient = useCallback(
    async (payload: {
      lessonId: string;
      sourceTitle: string;
      cefrLevel?: CEFRLevel;
      quizScorePct: number;
      mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
    }) => {
      const res = await completeLearningEngineLesson(payload);
      applyServerPayload(res);
    },
    [applyServerPayload]
  );

  const recordMistakes = useCallback(
    async (mistakes: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>) => {
      if (!mistakes.length) return;
      try {
        const res = await postLearningMistakes(mistakes);
        applyServerPayload(res);
      } catch {
        // Ignore offline
      }
    },
    [applyServerPayload]
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
      if (parsed.vocabulary.length > 0) {
        void upsertLearnerVocabulary(parsed.vocabulary)
          .then((res) => applyServerPayload(res))
          .catch(() => {});
      }
    },
    [updateAndPersist, applyServerPayload]
  );

  const resetAllData = useCallback(() => {
    updateAndPersist(() => structuredClone(DEFAULT_USER_DATA));
  }, [updateAndPersist]);

  const openLearningEngine = useCallback((input: LearningContentInput) => {
    setLearningEngineInput(input);
  }, []);

  const closeLearningEngine = useCallback(() => {
    setLearningEngineInput(null);
  }, []);

  return (
    <UserDataContext.Provider
      value={{
        data,
        learnerProfile,
        weeklyReport,
        availableWeeks,
        profileLoading,
        latestXpNotice,
        dismissXpNotice,
        learningEngineInput,
        openLearningEngine,
        closeLearningEngine,
        refreshLearnerProfile,
        loadReportForWeek,
        restoreSyncCode,
        updateLearnerGoals,
        isFavorite,
        toggleFavorite,
        addVocab,
        addRichVocabItems,
        reviewVocabWord,
        updateVocabCollections,
        updateVocabNote,
        removeVocab,
        logLearningActivity,
        completeDailyVocabChallenge,
        completeCefrCurriculumItem,
        submitPlacementTest,
        completeLearningEngineCourseClient,
        recordMistakes,
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
