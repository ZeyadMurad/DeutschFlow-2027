import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getPublicAppConfig } from './admin.js';
import { CEFR_CURRICULUM_UNITS, DAILY_VOCAB_POOL, evaluatePlacementLevel } from './cefrCurriculum.js';
import { getLearningEngineTelemetry } from './learningEngine.js';
import type {
  CEFRLevel,
  DailyMission,
  LearnerProfileState,
  LearningActivityEvent,
  LearningActivityType,
  LearningEngineErrorReport,
  LearningTelemetryStats,
  UserAchievement,
  UserMistake,
  VocabItem,
  VocabReviewRating,
  WeeklyReport,
  WeeklyReportRecommendation,
  XPTransaction,
} from '../src/types/media.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const LEARNERS_PATH = path.join(DATA_DIR, 'deutschflow-learners.json');
const REPORTS_PATH = path.join(DATA_DIR, 'learning-engine-reports.json');

interface LearnersFileStore {
  profiles: Record<string, LearnerProfileState>;
  syncCodeIndex: Record<string, string>; // syncCode -> profileId
}

let inMemoryStore: LearnersFileStore | null = null;
let inMemoryReports: LearningEngineErrorReport[] | null = null;
let writeTimer: NodeJS.Timeout | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function loadStore(): LearnersFileStore {
  if (inMemoryStore) return inMemoryStore;
  try {
    if (fs.existsSync(LEARNERS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(LEARNERS_PATH, 'utf8')) as Partial<LearnersFileStore>;
      inMemoryStore = {
        profiles: parsed.profiles && typeof parsed.profiles === 'object' ? parsed.profiles : {},
        syncCodeIndex:
          parsed.syncCodeIndex && typeof parsed.syncCodeIndex === 'object' ? parsed.syncCodeIndex : {},
      };
      return inMemoryStore;
    }
  } catch {
    // Fallback cleanly
  }
  inMemoryStore = { profiles: {}, syncCodeIndex: {} };
  return inMemoryStore;
}

function flushStore(): void {
  if (!inMemoryStore) return;
  try {
    ensureDataDir();
    const tmp = `${LEARNERS_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(inMemoryStore), { mode: 0o600 });
    fs.renameSync(tmp, LEARNERS_PATH);
  } catch {
    // Keep operating cleanly in memory if FS is read-only
  }
}

function scheduleWrite(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    flushStore();
    writeTimer = null;
  }, 350);
}

export function loadErrorReports(): LearningEngineErrorReport[] {
  if (inMemoryReports) return inMemoryReports;
  try {
    if (fs.existsSync(REPORTS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(REPORTS_PATH, 'utf8'));
      if (Array.isArray(parsed)) {
        inMemoryReports = parsed;
        return inMemoryReports;
      }
    }
  } catch {
    // Ignore
  }
  inMemoryReports = [];
  return inMemoryReports;
}

export function addLearningErrorReport(params: {
  lessonId: string;
  sourceTitle: string;
  section: string;
  message: string;
}): LearningEngineErrorReport {
  const reports = loadErrorReports();
  const entry: LearningEngineErrorReport = {
    id: `rep_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    lessonId: params.lessonId.slice(0, 80),
    sourceTitle: params.sourceTitle.slice(0, 180),
    section: params.section.slice(0, 80),
    message: params.message.trim().slice(0, 1200),
    createdAt: new Date().toISOString(),
    resolved: false,
  };
  inMemoryReports = [entry, ...reports].slice(0, 200);
  try {
    ensureDataDir();
    fs.writeFileSync(REPORTS_PATH, JSON.stringify(inMemoryReports, null, 2), { mode: 0o600 });
  } catch {
    // Ignore FS write error
  }
  return entry;
}

export function resolveLearningErrorReport(id: string): LearningEngineErrorReport | null {
  const reports = loadErrorReports();
  const target = reports.find((r) => r.id === id);
  if (!target) return null;
  target.resolved = true;
  try {
    ensureDataDir();
    fs.writeFileSync(REPORTS_PATH, JSON.stringify(reports, null, 2), { mode: 0o600 });
  } catch {
    // Ignore
  }
  return target;
}

// ---------------------------------------------------------------------------
// Timezone & Calendar Helpers
// ---------------------------------------------------------------------------

export function sanitizeTimezone(tz?: string): string {
  if (!tz || typeof tz !== 'string') return 'UTC';
  try {
    Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return 'UTC';
  }
}

export function getDateKeyInTz(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: sanitizeTimezone(tz),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function getIsoWeekKey(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return '2026-W01';
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getWeekBoundsFromDateKey(dateKey: string): { start: string; end: string; days: string[] } {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  const mon = new Date(d);
  mon.setUTCDate(d.getUTCDate() - (day - 1));
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(mon);
    cur.setUTCDate(mon.getUTCDate() + i);
    days.push(cur.toISOString().slice(0, 10));
  }
  return { start: days[0], end: days[6], days };
}

function prevDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Profile Initialization & Daily Missions
// ---------------------------------------------------------------------------

export function validateProfileId(raw?: string | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (/^[a-zA-Z0-9_-]{8,64}$/.test(trimmed)) return trimmed;
  return null;
}

function makeSyncCode(): string {
  return `DF-${crypto.randomBytes(2).toString('hex').toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function buildInitialAchievements(): UserAchievement[] {
  return [
    {
      id: 'ach_100_words',
      code: 'first_100_words',
      titleAr: 'أول 100 كلمة',
      titleDe: 'Erste 100 Wörter',
      titleEn: 'First 100 Words',
      criteriaAr: 'احفظ 100 كلمة ألمانية في بنك المفردات الخاص بك.',
      criteriaEn: 'Save 100 German words to your personal Vocabulary Bank.',
      xpBonus: 50,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 100,
    },
    {
      id: 'ach_streak_7',
      code: 'streak_7_days',
      titleAr: 'سلسلة 7 أيام متواصلة',
      titleDe: '7-Tage-Lernserie',
      titleEn: '7-Day Learning Streak',
      criteriaAr: 'حافظ على نشاط تعلّم ألماني حقيقي لمدة 7 أيام متتالية.',
      criteriaEn: 'Complete real learning activity 7 consecutive days.',
      xpBonus: 45,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 7,
    },
    {
      id: 'ach_streak_30',
      code: 'streak_30_days',
      titleAr: 'سلسلة 30 يوماً',
      titleDe: '30-Tage-Serie',
      titleEn: '30-Day Learning Streak',
      criteriaAr: 'حافظ على الاستمرارية لمدة 30 يوماً متتالياً.',
      criteriaEn: 'Sustain active learning for 30 consecutive days.',
      xpBonus: 120,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 30,
    },
    {
      id: 'ach_reading_exp',
      code: 'reading_explorer',
      titleAr: 'مستكشف القراءة',
      titleDe: 'Lese-Entdecker',
      titleEn: 'Reading Explorer',
      criteriaAr: 'اقرأ 10 مقالات ألمانية بوقت قراءة فعلي.',
      criteriaEn: 'Read 10 German articles with active reading time.',
      xpBonus: 35,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 10,
    },
    {
      id: 'ach_listen_master',
      code: 'listening_master',
      titleAr: 'سيد الاستماع الألماني',
      titleDe: 'Hörverstehen-Meister',
      titleEn: 'Listening Master',
      criteriaAr: 'استمع إلى 60 دقيقة من الإذاعات والبودكاست الألماني.',
      criteriaEn: 'Reach 60 minutes of active German radio/podcast listening.',
      xpBonus: 40,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 60,
    },
    {
      id: 'ach_grammar_champ',
      code: 'grammar_champion',
      titleAr: 'بطل القواعد الألمانية',
      titleDe: 'Grammatik-Champion',
      titleEn: 'Grammar Champion',
      criteriaAr: 'اجتز 3 دروس أو اختبارات بدرجة لا تقل عن 80%.',
      criteriaEn: 'Pass 3 curriculum lessons or quizzes with at least 80%.',
      xpBonus: 40,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 3,
    },
    {
      id: 'ach_vocab_collector',
      code: 'vocab_collector',
      titleAr: 'جامع المفردات',
      titleDe: 'Wortschatz-Sammler',
      titleEn: 'Vocabulary Collector',
      criteriaAr: 'أضف أول 25 كلمة ألمانية مع سياقها إلى مفرداتك.',
      criteriaEn: 'Save your first 25 contextual German words.',
      xpBonus: 25,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 25,
    },
    {
      id: 'ach_news_reader',
      code: 'german_news_reader',
      titleAr: 'قارئ الصحف الألمانية',
      titleDe: 'Nachrichtenleser',
      titleEn: 'German News Reader',
      criteriaAr: 'أكمل قراءة 3 مقالات إخبارية ألمانية.',
      criteriaEn: 'Complete reading 3 German news articles.',
      xpBonus: 25,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 3,
    },
    {
      id: 'ach_first_lesson',
      code: 'first_complete_lesson',
      titleAr: 'أول درس مكتمل',
      titleDe: 'Erste Lektion abgeschlossen',
      titleEn: 'First Complete Lesson',
      criteriaAr: 'أكمل درسك الأول في مسار مستويات CEFR.',
      criteriaEn: 'Complete your first CEFR structured lesson.',
      xpBonus: 20,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 1,
    },
    {
      id: 'ach_first_engine',
      code: 'first_learning_engine',
      titleAr: 'من المحتوى إلى الطلاقة',
      titleDe: 'Vom Inhalt zur Flüssigkeit',
      titleEn: 'First Learning Engine Lesson',
      criteriaAr: 'حوّل أول مقال أو فيديو أو بودكاست إلى درس متكامل وأنهِه بنجاح.',
      criteriaEn: 'Convert and complete your first real-media Learning Engine lesson.',
      xpBonus: 30,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 1,
    },
    {
      id: 'ach_cefr_level',
      code: 'cefr_level_completed',
      titleAr: 'إتمام مستوى CEFR',
      titleDe: 'CEFR-Stufe gemeistert',
      titleEn: 'CEFR Level Completed',
      criteriaAr: 'اجتز تقييم وحدة كاملة في مسار المستويات.',
      criteriaEn: 'Pass a full CEFR level unit assessment.',
      xpBonus: 60,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 1,
    },
    {
      id: 'ach_weekly_goal',
      code: 'weekly_goal_achieved',
      titleAr: 'هدف الأسبوع المُنجز',
      titleDe: 'Wochenziel erreicht',
      titleEn: 'Weekly Learning Goal Achieved',
      criteriaAr: 'حقق هدف الدقائق الأسبوعي المحدد للتعلّم.',
      criteriaEn: 'Reach your weekly German study time goal.',
      xpBonus: 35,
      unlocked: false,
      progressCurrent: 0,
      progressTarget: 1,
    },
  ];
}

function generateDailyMissionsForDate(profile: LearnerProfileState, dateKey: string): DailyMission[] {
  const lc = getPublicAppConfig().learningConfig;
  const readingTargetSec = (lc.dailyMissionTargets.readingMinutes || 5) * 60;
  const listeningTargetSec = (lc.dailyMissionTargets.listeningMinutes || 5) * 60;
  const vocabTargetCount = lc.dailyMissionTargets.vocabWordsCount || 5;

  const cefrPoolKey: 'A1' | 'A2' | 'B1' | 'B2' =
    profile.cefrLevel === 'A1' || profile.cefrLevel === 'A2' || profile.cefrLevel === 'B1'
      ? profile.cefrLevel
      : 'B2';
  const pool = DAILY_VOCAB_POOL[cefrPoolKey];

  // Deterministic rotation per profile + dateKey so refreshes never reshuffle mid-day
  const seedHex = crypto.createHash('sha256').update(`${profile.profileId}:${dateKey}`).digest('hex');
  const startIdx = parseInt(seedHex.slice(0, 6), 16) % pool.length;
  const rotated = [...pool.slice(startIdx), ...pool.slice(0, startIdx)];
  const chosenWords = rotated.slice(0, Math.min(vocabTargetCount, rotated.length));

  return [
    {
      id: `mis_read_${dateKey}`,
      dateKey,
      type: 'reading',
      titleAr: `اقرأ مقالاً ألمانياً لمدة ${lc.dailyMissionTargets.readingMinutes} دقائق`,
      titleDe: `${lc.dailyMissionTargets.readingMinutes} Minuten Deutsch lesen`,
      titleEn: `Read a German article for ${lc.dailyMissionTargets.readingMinutes} min`,
      descriptionAr: `افتح مقالاً حقيقياً في غرفة القراءة أو الأخبار بمستوى يناسبك (${cefrPoolKey}).`,
      descriptionDe: 'Aktive sichtbare Lesezeit in einem deutschen Artikel sammeln.',
      descriptionEn: 'Accumulate active reading time inside any German article.',
      xpReward: lc.xpRewards.articleReadingMission || 20,
      targetValue: readingTargetSec,
      currentValue: 0,
      unit: 'seconds',
      completed: false,
    },
    {
      id: `mis_listen_${dateKey}`,
      dateKey,
      type: 'listening',
      titleAr: `استمع لمحتوى ألماني لمدة ${lc.dailyMissionTargets.listeningMinutes} دقائق`,
      titleDe: `${lc.dailyMissionTargets.listeningMinutes} Minuten Deutsch hören`,
      titleEn: `Listen to German audio for ${lc.dailyMissionTargets.listeningMinutes} min`,
      descriptionAr: 'شغّل الإذاعة الألمانية أو بودكاست أو نطق مقال — يُحتسب وقت التشغيل الفعلي فقط.',
      descriptionDe: 'Radio, Podcast oder Vorlesefunktion aktiv anhören.',
      descriptionEn: 'Listen to German radio, podcast, or TTS audio (paused time excluded).',
      xpReward: lc.xpRewards.listeningMission || 15,
      targetValue: listeningTargetSec,
      currentValue: 0,
      unit: 'seconds',
      completed: false,
    },
    {
      id: `mis_vocab_${dateKey}`,
      dateKey,
      type: 'vocabulary',
      titleAr: `تعلّم واختبر ${chosenWords.length} كلمات (${cefrPoolKey})`,
      titleDe: `${chosenWords.length} neue ${cefrPoolKey}-Wörter meistern`,
      titleEn: `Learn & quiz ${chosenWords.length} ${cefrPoolKey} words`,
      descriptionAr: 'تعرّف على المعاني والأمثلة، احفظها في بنك مفرداتك، واجتز الاختبار المصغّر.',
      descriptionDe: 'Bedeutungen ansehen, speichern und im Kurztest bestehen.',
      descriptionEn: 'Study contextual words, save to Vocabulary Bank, and pass the mini-quiz.',
      xpReward: lc.xpRewards.vocabMission || 25,
      targetValue: chosenWords.length,
      currentValue: 0,
      unit: 'words',
      completed: false,
      vocabTargets: chosenWords,
      quizPassed: false,
    },
  ];
}

function ensureTodayMissions(profile: LearnerProfileState, tz: string): void {
  const safeTz = sanitizeTimezone(tz || profile.timezone);
  profile.timezone = safeTz;
  const todayKey = getDateKeyInTz(new Date(), safeTz);
  const currentHasToday =
    Array.isArray(profile.dailyMissions) &&
    profile.dailyMissions.length === 3 &&
    profile.dailyMissions.every((m) => m.dateKey === todayKey);
  if (!currentHasToday) {
    profile.dailyMissions = generateDailyMissionsForDate(profile, todayKey);
  }
}

export function getOrCreateProfile(profileId: string, timezone?: string): LearnerProfileState {
  const store = loadStore();
  let profile = store.profiles[profileId];
  const tz = sanitizeTimezone(timezone);

  if (!profile) {
    let syncCode = makeSyncCode();
    while (store.syncCodeIndex[syncCode]) {
      syncCode = makeSyncCode();
    }
    const now = new Date().toISOString();
    profile = {
      profileId,
      syncCode,
      timezone: tz,
      cefrLevel: 'A1',
      cefrEstimatedOnly: true,
      totalXp: 0,
      dailyGoalMinutes: 15,
      weeklyGoalMinutes: 90,
      xpTransactions: [],
      streak: { currentStreak: 0, longestStreak: 0, activeDates: [] },
      dailyMissions: [],
      achievements: buildInitialAchievements(),
      curriculumProgress: {
        completedLessonIds: [],
        lessonScores: {},
        passedUnitIds: [],
        unitScores: {},
        placementTaken: false,
      },
      vocabulary: [],
      mistakes: [],
      activityEvents: [],
      completedEngineLessonIds: [],
      totalArticlesCompleted: 0,
      totalVideosWatched: 0,
      totalListeningSeconds: 0,
      totalReadingSeconds: 0,
      updatedAt: now,
    };
    ensureTodayMissions(profile, tz);
    store.profiles[profileId] = profile;
    store.syncCodeIndex[syncCode] = profileId;
    scheduleWrite();
  } else {
    ensureTodayMissions(profile, timezone || profile.timezone);
    evaluateAchievements(profile);
  }

  return profile;
}

export function resolveProfileBySyncCode(syncCode: string): LearnerProfileState | null {
  const store = loadStore();
  const normalized = syncCode.trim().toUpperCase();
  const pid = store.syncCodeIndex[normalized];
  if (!pid) return null;
  return store.profiles[pid] || null;
}

// ---------------------------------------------------------------------------
// XP Awards, Streak & Achievements Engine
// ---------------------------------------------------------------------------

function awardXp(
  profile: LearnerProfileState,
  params: {
    actionKey: string;
    type: LearningActivityType | 'achievement_bonus';
    amount: number;
    labelAr: string;
    labelEn: string;
    dailyTypeCap?: number;
  }
): XPTransaction | null {
  if (params.amount <= 0) return null;
  if (profile.xpTransactions.some((tx) => tx.actionKey === params.actionKey)) {
    return null; // Idempotent deduplication
  }
  const todayKey = getDateKeyInTz(new Date(), profile.timezone);
  if (params.dailyTypeCap) {
    const todayTotalForType = profile.xpTransactions
      .filter((tx) => tx.type === params.type && getDateKeyInTz(new Date(tx.createdAt), profile.timezone) === todayKey)
      .reduce((sum, tx) => sum + tx.amount, 0);
    if (todayTotalForType >= params.dailyTypeCap) return null;
  }

  const tx: XPTransaction = {
    id: `xp_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    actionKey: params.actionKey,
    type: params.type,
    amount: params.amount,
    labelAr: params.labelAr,
    labelEn: params.labelEn,
    createdAt: new Date().toISOString(),
  };
  profile.totalXp += params.amount;
  profile.xpTransactions = [tx, ...profile.xpTransactions].slice(0, 400);
  return tx;
}

function recordQualifyingActivityForStreak(profile: LearnerProfileState, dateKey: string): void {
  const s = profile.streak;
  if (!s.activeDates.includes(dateKey)) {
    s.activeDates = [...s.activeDates, dateKey].sort().slice(-120);
  }
  if (!s.lastActiveDateKey) {
    s.currentStreak = 1;
    s.longestStreak = Math.max(s.longestStreak, 1);
    s.lastActiveDateKey = dateKey;
    return;
  }
  if (s.lastActiveDateKey === dateKey) {
    return;
  }
  if (s.lastActiveDateKey === prevDateKey(dateKey)) {
    s.currentStreak += 1;
  } else if (dateKey > s.lastActiveDateKey) {
    s.currentStreak = 1;
  }
  s.longestStreak = Math.max(s.longestStreak, s.currentStreak);
  s.lastActiveDateKey = dateKey;
}

function evaluateAchievements(profile: LearnerProfileState): UserAchievement[] {
  const newlyUnlocked: UserAchievement[] = [];
  const totalListeningMin = Math.floor((profile.totalListeningSeconds || 0) / 60);
  const highScoreCount = Object.values(profile.curriculumProgress.lessonScores || {}).filter((s) => s >= 80).length +
    profile.activityEvents.filter((e) => e.type === 'quiz_completed' && (e.scorePct || 0) >= 80).length;
  const currentWeekKey = getIsoWeekKey(getDateKeyInTz(new Date(), profile.timezone));
  const weekMinutes = Math.floor(
    profile.activityEvents
      .filter((e) => e.weekKey === currentWeekKey)
      .reduce((acc, e) => acc + (e.durationSeconds || 0), 0) / 60
  );

  for (const ach of profile.achievements) {
    switch (ach.code) {
      case 'first_100_words':
        ach.progressCurrent = Math.min(ach.progressTarget, profile.vocabulary.length);
        break;
      case 'vocab_collector':
        ach.progressCurrent = Math.min(ach.progressTarget, profile.vocabulary.length);
        break;
      case 'streak_7_days':
        ach.progressCurrent = Math.min(ach.progressTarget, profile.streak.longestStreak);
        break;
      case 'streak_30_days':
        ach.progressCurrent = Math.min(ach.progressTarget, profile.streak.longestStreak);
        break;
      case 'reading_explorer':
        ach.progressCurrent = Math.min(ach.progressTarget, profile.totalArticlesCompleted);
        break;
      case 'german_news_reader':
        ach.progressCurrent = Math.min(ach.progressTarget, profile.totalArticlesCompleted);
        break;
      case 'listening_master':
        ach.progressCurrent = Math.min(ach.progressTarget, totalListeningMin);
        break;
      case 'grammar_champion':
        ach.progressCurrent = Math.min(ach.progressTarget, highScoreCount);
        break;
      case 'first_complete_lesson':
        ach.progressCurrent = Math.min(ach.progressTarget, profile.curriculumProgress.completedLessonIds.length);
        break;
      case 'first_learning_engine':
        ach.progressCurrent = Math.min(ach.progressTarget, profile.completedEngineLessonIds.length);
        break;
      case 'cefr_level_completed':
        ach.progressCurrent = Math.min(ach.progressTarget, profile.curriculumProgress.passedUnitIds.length);
        break;
      case 'weekly_goal_achieved':
        ach.progressCurrent = weekMinutes >= profile.weeklyGoalMinutes ? 1 : 0;
        break;
    }

    if (!ach.unlocked && ach.progressCurrent >= ach.progressTarget) {
      ach.unlocked = true;
      ach.unlockedAt = new Date().toISOString();
      awardXp(profile, {
        actionKey: `ach_${ach.code}`,
        type: 'achievement_bonus',
        amount: ach.xpBonus,
        labelAr: `إنجاز: ${ach.titleAr}`,
        labelEn: `Achievement: ${ach.titleEn}`,
      });
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

// ---------------------------------------------------------------------------
// Activity Logging & Daily Missions Updates
// ---------------------------------------------------------------------------

export function recordLearnerActivity(
  profileId: string,
  payload: {
    type: LearningActivityType;
    timezone?: string;
    durationSeconds?: number;
    scorePct?: number;
    cefrLevel?: CEFRLevel;
    skill?: 'reading' | 'listening' | 'vocabulary' | 'grammar' | 'writing';
    sourceId?: string;
    sourceTitle?: string;
    articleCompleted?: boolean;
  }
): {
  profile: LearnerProfileState;
  xpAwarded: XPTransaction[];
  unlockedAchievements: UserAchievement[];
} {
  const profile = getOrCreateProfile(profileId, payload.timezone);
  const todayKey = getDateKeyInTz(new Date(), profile.timezone);
  const weekKey = getIsoWeekKey(todayKey);
  const duration = Math.max(0, Math.min(3600, Math.round(payload.durationSeconds || 0)));
  const xpAwarded: XPTransaction[] = [];

  const ev: LearningActivityEvent = {
    id: `ev_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
    type: payload.type,
    dateKey: todayKey,
    weekKey,
    durationSeconds: duration || undefined,
    scorePct: payload.scorePct,
    cefrLevel: payload.cefrLevel || profile.cefrLevel,
    skill: payload.skill,
    sourceId: payload.sourceId,
    sourceTitle: payload.sourceTitle,
    createdAt: new Date().toISOString(),
  };
  profile.activityEvents = [ev, ...profile.activityEvents].slice(0, 1200);

  if (payload.type === 'reading') {
    profile.totalReadingSeconds += duration;
    if (payload.articleCompleted) {
      profile.totalArticlesCompleted += 1;
    }
    const readMission = profile.dailyMissions.find((m) => m.type === 'reading' && m.dateKey === todayKey);
    if (readMission && !readMission.completed) {
      readMission.currentValue = Math.min(readMission.targetValue, readMission.currentValue + duration);
      if (readMission.currentValue >= readMission.targetValue) {
        readMission.completed = true;
        readMission.completedAt = new Date().toISOString();
        const tx = awardXp(profile, {
          actionKey: `mission_read_${todayKey}`,
          type: 'mission_completed',
          amount: readMission.xpReward,
          labelAr: `مهمة القراءة اليومية (${todayKey})`,
          labelEn: `Daily Reading Mission (${todayKey})`,
        });
        if (tx) xpAwarded.push(tx);
      }
    }
    if (duration >= 30 || payload.articleCompleted) {
      recordQualifyingActivityForStreak(profile, todayKey);
    }
  } else if (payload.type === 'listening') {
    profile.totalListeningSeconds += duration;
    const listenMission = profile.dailyMissions.find((m) => m.type === 'listening' && m.dateKey === todayKey);
    if (listenMission && !listenMission.completed) {
      listenMission.currentValue = Math.min(listenMission.targetValue, listenMission.currentValue + duration);
      if (listenMission.currentValue >= listenMission.targetValue) {
        listenMission.completed = true;
        listenMission.completedAt = new Date().toISOString();
        const tx = awardXp(profile, {
          actionKey: `mission_listen_${todayKey}`,
          type: 'mission_completed',
          amount: listenMission.xpReward,
          labelAr: `مهمة الاستماع اليومية (${todayKey})`,
          labelEn: `Daily Listening Mission (${todayKey})`,
        });
        if (tx) xpAwarded.push(tx);
      }
    }
    if (duration >= 30) {
      recordQualifyingActivityForStreak(profile, todayKey);
    }
  } else if (payload.type === 'watching') {
    profile.totalVideosWatched += 1;
    profile.totalListeningSeconds += duration;
    if (duration >= 30) recordQualifyingActivityForStreak(profile, todayKey);
  } else {
    recordQualifyingActivityForStreak(profile, todayKey);
  }

  const unlockedAchievements = evaluateAchievements(profile);
  profile.updatedAt = new Date().toISOString();
  scheduleWrite();
  return { profile, xpAwarded, unlockedAchievements };
}

export function completeDailyVocabMission(
  profileId: string,
  payload: { timezone?: string; savedWordsCount: number; quizPassed: boolean }
): {
  profile: LearnerProfileState;
  xpAwarded: XPTransaction[];
  unlockedAchievements: UserAchievement[];
} {
  const profile = getOrCreateProfile(profileId, payload.timezone);
  const todayKey = getDateKeyInTz(new Date(), profile.timezone);
  const mission = profile.dailyMissions.find((m) => m.type === 'vocabulary' && m.dateKey === todayKey);
  const xpAwarded: XPTransaction[] = [];

  if (mission) {
    mission.currentValue = Math.min(mission.targetValue, Math.max(mission.currentValue, payload.savedWordsCount));
    if (payload.quizPassed) {
      mission.quizPassed = true;
      mission.currentValue = mission.targetValue;
      if (!mission.completed) {
        mission.completed = true;
        mission.completedAt = new Date().toISOString();
        const tx = awardXp(profile, {
          actionKey: `mission_vocab_${todayKey}`,
          type: 'mission_completed',
          amount: mission.xpReward,
          labelAr: `مهمة المفردات اليومية (${todayKey})`,
          labelEn: `Daily Vocabulary Mission (${todayKey})`,
        });
        if (tx) xpAwarded.push(tx);
      }
      recordQualifyingActivityForStreak(profile, todayKey);
    }
  }

  const unlockedAchievements = evaluateAchievements(profile);
  profile.updatedAt = new Date().toISOString();
  scheduleWrite();
  return { profile, xpAwarded, unlockedAchievements };
}

// ---------------------------------------------------------------------------
// Smart Vocabulary Bank & SM-2 Spaced Repetition
// ---------------------------------------------------------------------------

export function upsertVocabularyItems(
  profileId: string,
  items: Array<Partial<VocabItem> & { word: string }>,
  timezone?: string
): {
  profile: LearnerProfileState;
  addedCount: number;
  mergedCount: number;
  xpAwarded: XPTransaction[];
  unlockedAchievements: UserAchievement[];
} {
  const profile = getOrCreateProfile(profileId, timezone);
  const lc = getPublicAppConfig().learningConfig;
  const now = new Date().toISOString();
  const todayKey = getDateKeyInTz(new Date(), profile.timezone);
  const weekKey = getIsoWeekKey(todayKey);

  let addedCount = 0;
  let mergedCount = 0;
  const xpAwarded: XPTransaction[] = [];

  for (const incoming of items) {
    const cleanWord = (incoming.word || '').trim();
    if (!cleanWord) continue;
    const normWord = cleanWord.toLowerCase();
    const normLemma = (incoming.lemma || cleanWord).trim().toLowerCase();

    const existing = profile.vocabulary.find(
      (v) =>
        v.word.trim().toLowerCase() === normWord ||
        (v.lemma && v.lemma.trim().toLowerCase() === normLemma && v.wordCategory === incoming.wordCategory)
    );

    if (existing) {
      mergedCount += 1;
      existing.translation = existing.translation && existing.translation !== '—'
        ? existing.translation
        : (incoming.translation || existing.translation || '—');
      existing.translationEn = incoming.translationEn || existing.translationEn;
      existing.sentence = existing.sentence || incoming.sentence || '';
      existing.sentenceTranslationAr = incoming.sentenceTranslationAr || existing.sentenceTranslationAr;
      existing.article = existing.article || incoming.article;
      existing.plural = existing.plural || incoming.plural;
      existing.phonetic = existing.phonetic || incoming.phonetic;
      existing.cefrLevel = incoming.cefrLevel || existing.cefrLevel || profile.cefrLevel;
      existing.wordCategory = incoming.wordCategory || existing.wordCategory || 'other';
      existing.verbForms = incoming.verbForms || existing.verbForms;
      existing.adjectiveForms = incoming.adjectiveForms || existing.adjectiveForms;
      existing.updatedAt = now;
      if (incoming.sourceTitle) {
        const srcs = existing.sources || [{ title: existing.sourceTitle, url: existing.sourceUrl, addedAt: existing.createdAt }];
        if (!srcs.some((s) => s.title === incoming.sourceTitle)) {
          srcs.push({ title: incoming.sourceTitle, url: incoming.sourceUrl, addedAt: now });
        }
        existing.sources = srcs;
      }
      if (Array.isArray(incoming.collections) && incoming.collections.length > 0) {
        existing.collections = Array.from(new Set([...(existing.collections || []), ...incoming.collections]));
      }
    } else {
      addedCount += 1;
      const newEntry: VocabItem = {
        id: incoming.id || `voc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        word: cleanWord,
        translation: (incoming.translation || '—').trim(),
        translationEn: incoming.translationEn,
        sentence: (incoming.sentence || '').trim(),
        sentenceTranslationAr: incoming.sentenceTranslationAr,
        sourceTitle: incoming.sourceTitle || 'DeutschFlow',
        sourceUrl: incoming.sourceUrl,
        note: incoming.note,
        lemma: incoming.lemma || cleanWord,
        partOfSpeech: incoming.partOfSpeech,
        wordCategory: incoming.wordCategory || 'other',
        article: incoming.article,
        plural: incoming.plural,
        phonetic: incoming.phonetic,
        cefrLevel: incoming.cefrLevel || profile.cefrLevel,
        verbForms: incoming.verbForms,
        adjectiveForms: incoming.adjectiveForms,
        sources: incoming.sourceTitle ? [{ title: incoming.sourceTitle, url: incoming.sourceUrl, addedAt: now }] : [],
        collections: incoming.collections || [],
        status: 'new',
        masteryScore: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        nextReviewAt: now,
        createdAt: now,
        updatedAt: now,
      };
      profile.vocabulary = [newEntry, ...profile.vocabulary];

      const tx = awardXp(profile, {
        actionKey: `vocab_add_${normLemma}`,
        type: 'vocab_added',
        amount: lc.xpRewards.vocabSaved ?? 4,
        labelAr: `حفظ كلمة: ${cleanWord}`,
        labelEn: `Saved word: ${cleanWord}`,
        dailyTypeCap: 40,
      });
      if (tx) xpAwarded.push(tx);

      profile.activityEvents = [
        {
          id: `ev_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
          type: 'vocab_added' as const,
          dateKey: todayKey,
          weekKey,
          skill: 'vocabulary' as const,
          cefrLevel: newEntry.cefrLevel,
          createdAt: now,
        },
        ...profile.activityEvents,
      ].slice(0, 1200);
    }
  }

  if (addedCount > 0) {
    recordQualifyingActivityForStreak(profile, todayKey);
  }

  const unlockedAchievements = evaluateAchievements(profile);
  profile.updatedAt = now;
  scheduleWrite();
  return { profile, addedCount, mergedCount, xpAwarded, unlockedAchievements };
}

export function reviewVocabWithSM2(
  profileId: string,
  vocabId: string,
  rating: VocabReviewRating,
  timezone?: string
): {
  profile: LearnerProfileState;
  updatedItem: VocabItem | null;
  xpAwarded: XPTransaction[];
  unlockedAchievements: UserAchievement[];
} {
  const profile = getOrCreateProfile(profileId, timezone);
  const lc = getPublicAppConfig().learningConfig;
  const item = profile.vocabulary.find((v) => v.id === vocabId);
  if (!item) {
    return { profile, updatedItem: null, xpAwarded: [], unlockedAchievements: [] };
  }

  // SM-2-inspired intervals (1 -> 3 -> 7 -> 14 -> 30+ days)
  const qMap: Record<VocabReviewRating, number> = { again: 1, hard: 3, good: 4, easy: 5 };
  const q = qMap[rating];
  let ef = item.easeFactor ?? 2.5;
  let reps = item.repetitions ?? 0;
  let interval = item.intervalDays ?? 0;
  let lapses = item.lapses ?? 0;

  if (q < 3) {
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 3;
    else if (reps === 2) interval = 7;
    else if (reps === 3) interval = 14;
    else interval = Math.max(30, Math.round(interval * ef));

    if (rating === 'hard') interval = Math.max(1, Math.round(interval * 0.75));
    if (rating === 'easy') interval = Math.round(interval * 1.35);
    reps += 1;
  }

  ef = Math.max(1.3, Number((ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))).toFixed(2)));
  const now = new Date();
  const nextReview = new Date(now.getTime() + interval * 86400000);

  item.easeFactor = ef;
  item.repetitions = reps;
  item.intervalDays = interval;
  item.lapses = lapses;
  item.lastReviewedAt = now.toISOString();
  item.nextReviewAt = nextReview.toISOString();
  item.updatedAt = now.toISOString();

  const scoreDelta = rating === 'again' ? -18 : rating === 'hard' ? 12 : rating === 'good' ? 24 : 34;
  item.masteryScore = Math.max(0, Math.min(100, (item.masteryScore ?? 0) + scoreDelta));
  item.status =
    reps >= 3 && item.masteryScore >= 75
      ? 'mastered'
      : reps >= 1 || item.masteryScore > 0
      ? 'practicing'
      : 'new';

  const todayKey = getDateKeyInTz(now, profile.timezone);
  const weekKey = getIsoWeekKey(todayKey);
  const xpAwarded: XPTransaction[] = [];

  const tx = awardXp(profile, {
    actionKey: `rev_${vocabId}_${todayKey}`,
    type: 'vocab_reviewed',
    amount: lc.xpRewards.vocabReviewed ?? 5,
    labelAr: `مراجعة متباعدة: ${item.word}`,
    labelEn: `Spaced Review: ${item.word}`,
    dailyTypeCap: 60,
  });
  if (tx) xpAwarded.push(tx);

  profile.activityEvents = [
    {
      id: `ev_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      type: 'vocab_reviewed' as const,
      dateKey: todayKey,
      weekKey,
      skill: 'vocabulary' as const,
      scorePct: rating === 'again' ? 30 : rating === 'hard' ? 70 : rating === 'good' ? 90 : 100,
      cefrLevel: item.cefrLevel,
      createdAt: now.toISOString(),
    },
    ...profile.activityEvents,
  ].slice(0, 1200);

  if (rating === 'again') {
    recordMistakeInternal(profile, {
      category: item.wordCategory === 'noun' && item.article ? 'article' : 'vocabulary',
      promptDe: item.word,
      expected: `${item.article ? `${item.article} ` : ''}${item.word} (${item.translation})`,
      userAnswer: 'Needs review',
      explanationAr: item.sentence,
      cefrLevel: item.cefrLevel,
    });
  }

  recordQualifyingActivityForStreak(profile, todayKey);
  const unlockedAchievements = evaluateAchievements(profile);
  profile.updatedAt = now.toISOString();
  scheduleWrite();

  return { profile, updatedItem: item, xpAwarded, unlockedAchievements };
}

function recordMistakeInternal(
  profile: LearnerProfileState,
  m: Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>
): void {
  const normPrompt = m.promptDe.trim().toLowerCase();
  const existing = profile.mistakes.find(
    (x) => x.category === m.category && x.promptDe.trim().toLowerCase() === normPrompt
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.count += 1;
    existing.userAnswer = m.userAnswer;
    existing.lastSeenAt = now;
  } else {
    profile.mistakes = [
      {
        ...m,
        id: `mis_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        count: 1,
        lastSeenAt: now,
      },
      ...profile.mistakes,
    ].slice(0, 100);
  }
}

export function recordMistakesBatch(
  profileId: string,
  mistakes: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>,
  timezone?: string
): LearnerProfileState {
  const profile = getOrCreateProfile(profileId, timezone);
  for (const m of mistakes.slice(0, 20)) {
    if (m.promptDe && m.expected) recordMistakeInternal(profile, m);
  }
  profile.updatedAt = new Date().toISOString();
  scheduleWrite();
  return profile;
}

// ---------------------------------------------------------------------------
// Learning Engine & CEFR Curriculum Completion
// ---------------------------------------------------------------------------

export function completeLearningEngineCourse(
  profileId: string,
  payload: {
    lessonId: string;
    sourceTitle: string;
    cefrLevel?: CEFRLevel;
    quizScorePct: number;
    mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
    timezone?: string;
  }
): {
  profile: LearnerProfileState;
  xpAwarded: XPTransaction[];
  unlockedAchievements: UserAchievement[];
} {
  const profile = getOrCreateProfile(profileId, payload.timezone);
  const lc = getPublicAppConfig().learningConfig;
  const now = new Date().toISOString();
  const todayKey = getDateKeyInTz(new Date(), profile.timezone);
  const weekKey = getIsoWeekKey(todayKey);

  if (!profile.completedEngineLessonIds.includes(payload.lessonId)) {
    profile.completedEngineLessonIds = [payload.lessonId, ...profile.completedEngineLessonIds];
  }

  for (const m of payload.mistakes || []) {
    if (m.promptDe && m.expected) recordMistakeInternal(profile, m);
  }

  profile.activityEvents = [
    {
      id: `ev_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      type: 'lesson_completed' as const,
      dateKey: todayKey,
      weekKey,
      durationSeconds: 300,
      scorePct: payload.quizScorePct,
      cefrLevel: payload.cefrLevel || profile.cefrLevel,
      skill: 'reading' as const,
      sourceId: payload.lessonId,
      sourceTitle: payload.sourceTitle,
      createdAt: now,
    },
    ...profile.activityEvents,
  ].slice(0, 1200);

  const xpAwarded: XPTransaction[] = [];
  const baseReward = lc.xpRewards.learningEngineComplete || 30;
  const tx = awardXp(profile, {
    actionKey: `engine_done_${payload.lessonId}`,
    type: 'lesson_completed',
    amount: payload.quizScorePct >= 80 ? baseReward + 10 : baseReward,
    labelAr: `إتمام درس محرك التعلم: ${payload.sourceTitle.slice(0, 40)}`,
    labelEn: `Completed Learning Engine lesson`,
  });
  if (tx) xpAwarded.push(tx);

  recordQualifyingActivityForStreak(profile, todayKey);
  const unlockedAchievements = evaluateAchievements(profile);
  profile.updatedAt = now;
  scheduleWrite();
  return { profile, xpAwarded, unlockedAchievements };
}

export function completeCurriculumLessonOrUnit(
  profileId: string,
  payload: {
    kind: 'lesson' | 'unit';
    targetId: string;
    scorePct: number;
    cefrLevel: CEFRLevel;
    mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
    timezone?: string;
  }
): {
  profile: LearnerProfileState;
  passed: boolean;
  xpAwarded: XPTransaction[];
  unlockedAchievements: UserAchievement[];
} {
  const profile = getOrCreateProfile(profileId, payload.timezone);
  const lc = getPublicAppConfig().learningConfig;
  const passed = payload.scorePct >= 70;
  const now = new Date().toISOString();
  const todayKey = getDateKeyInTz(new Date(), profile.timezone);
  const weekKey = getIsoWeekKey(todayKey);
  const xpAwarded: XPTransaction[] = [];

  for (const m of payload.mistakes || []) {
    if (m.promptDe && m.expected) recordMistakeInternal(profile, m);
  }

  if (payload.kind === 'lesson') {
    const prevBest = profile.curriculumProgress.lessonScores[payload.targetId] ?? 0;
    profile.curriculumProgress.lessonScores[payload.targetId] = Math.max(prevBest, payload.scorePct);
    if (passed && !profile.curriculumProgress.completedLessonIds.includes(payload.targetId)) {
      profile.curriculumProgress.completedLessonIds.push(payload.targetId);
    }
    if (passed) {
      const tx = awardXp(profile, {
        actionKey: `cefr_lesson_${payload.targetId}`,
        type: 'cefr_lesson_completed',
        amount: lc.xpRewards.cefrLessonComplete || 35,
        labelAr: `إتمام درس CEFR (${payload.cefrLevel})`,
        labelEn: `Completed CEFR ${payload.cefrLevel} Lesson`,
      });
      if (tx) xpAwarded.push(tx);
    }
  } else {
    const prevBest = profile.curriculumProgress.unitScores[payload.targetId] ?? 0;
    profile.curriculumProgress.unitScores[payload.targetId] = Math.max(prevBest, payload.scorePct);
    if (passed && !profile.curriculumProgress.passedUnitIds.includes(payload.targetId)) {
      profile.curriculumProgress.passedUnitIds.push(payload.targetId);
      // Advance learner CEFR estimate cleanly when unit assessment passes
      const unitIndex = CEFR_CURRICULUM_UNITS.findIndex((u) => u.id === payload.targetId);
      if (unitIndex >= 0 && unitIndex + 1 < CEFR_CURRICULUM_UNITS.length) {
        const nextLevel = CEFR_CURRICULUM_UNITS[unitIndex + 1].cefrLevel;
        const order: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        if (order.indexOf(nextLevel) > order.indexOf(profile.cefrLevel)) {
          profile.cefrLevel = nextLevel;
        }
      }
    }
    if (passed) {
      const tx = awardXp(profile, {
        actionKey: `cefr_unit_${payload.targetId}`,
        type: 'cefr_unit_passed',
        amount: lc.xpRewards.cefrUnitAssessmentPass || 60,
        labelAr: `اجتياز تقييم وحدة ${payload.cefrLevel}`,
        labelEn: `Passed ${payload.cefrLevel} Unit Assessment`,
      });
      if (tx) xpAwarded.push(tx);
    }
  }

  profile.activityEvents = [
    {
      id: `ev_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      type: payload.kind === 'lesson' ? ('cefr_lesson_completed' as const) : ('cefr_unit_passed' as const),
      dateKey: todayKey,
      weekKey,
      durationSeconds: 360,
      scorePct: payload.scorePct,
      cefrLevel: payload.cefrLevel,
      skill: 'grammar' as const,
      sourceId: payload.targetId,
      createdAt: now,
    },
    ...profile.activityEvents,
  ].slice(0, 1200);

  recordQualifyingActivityForStreak(profile, todayKey);
  const unlockedAchievements = evaluateAchievements(profile);
  profile.updatedAt = now;
  scheduleWrite();

  return { profile, passed, xpAwarded, unlockedAchievements };
}

export function submitPlacementAssessment(
  profileId: string,
  answers: Array<{ questionId: string; selectedIndex: number }>,
  timezone?: string
): {
  profile: LearnerProfileState;
  result: ReturnType<typeof evaluatePlacementLevel>;
  xpAwarded: XPTransaction[];
} {
  const profile = getOrCreateProfile(profileId, timezone);
  const lc = getPublicAppConfig().learningConfig;
  const result = evaluatePlacementLevel(answers);

  profile.cefrLevel = result.level;
  profile.cefrEstimatedOnly = true;
  profile.curriculumProgress.placementTaken = true;
  profile.curriculumProgress.placementLevel = result.level;
  profile.curriculumProgress.placementScorePct = result.scorePct;
  profile.curriculumProgress.placementNote =
    'تقدير تعليمي داخلي لترتيب خطتك في DeutschFlow وليس شهادة رسمية من معهد غوته.';

  // Regenerate today's vocab mission ONLY if not completed yet so level matches immediately
  const todayKey = getDateKeyInTz(new Date(), profile.timezone);
  const existingVocab = profile.dailyMissions.find((m) => m.type === 'vocabulary' && m.dateKey === todayKey);
  if (existingVocab && !existingVocab.completed && existingVocab.currentValue === 0) {
    const fresh = generateDailyMissionsForDate(profile, todayKey);
    const freshVocab = fresh.find((m) => m.type === 'vocabulary');
    if (freshVocab) {
      profile.dailyMissions = profile.dailyMissions.map((m) => (m.type === 'vocabulary' ? freshVocab : m));
    }
  }

  const xpAwarded: XPTransaction[] = [];
  const tx = awardXp(profile, {
    actionKey: `placement_${todayKey}`,
    type: 'placement_completed',
    amount: lc.xpRewards.placementComplete ?? 25,
    labelAr: `اختبار تحديد المستوى (${result.level})`,
    labelEn: `Placement Assessment (${result.level})`,
  });
  if (tx) xpAwarded.push(tx);

  recordQualifyingActivityForStreak(profile, todayKey);
  evaluateAchievements(profile);
  profile.updatedAt = new Date().toISOString();
  scheduleWrite();

  return { profile, result, xpAwarded };
}

// ---------------------------------------------------------------------------
// Weekly Learning Report (Calculated Strictly From Persisted Activity)
// ---------------------------------------------------------------------------

export function buildWeeklyReport(profile: LearnerProfileState, requestedWeekKey?: string): {
  report: WeeklyReport;
  availableWeeks: string[];
} {
  const todayKey = getDateKeyInTz(new Date(), profile.timezone);
  const currentWeekKey = getIsoWeekKey(todayKey);
  const availableSet = new Set<string>([currentWeekKey]);
  for (const ev of profile.activityEvents) {
    if (ev.weekKey) availableSet.add(ev.weekKey);
  }
  const availableWeeks = Array.from(availableSet).sort().reverse();
  const targetWeekKey = requestedWeekKey && availableSet.has(requestedWeekKey) ? requestedWeekKey : currentWeekKey;

  const events = profile.activityEvents.filter((e) => e.weekKey === targetWeekKey);
  const bounds = getWeekBoundsFromDateKey(
    events[0]?.dateKey || todayKey
  );

  const readingSec = events
    .filter((e) => e.type === 'reading')
    .reduce((s, e) => s + (e.durationSeconds || 0), 0);
  const listeningSec = events
    .filter((e) => e.type === 'listening')
    .reduce((s, e) => s + (e.durationSeconds || 0), 0);
  const watchingSec = events
    .filter((e) => e.type === 'watching')
    .reduce((s, e) => s + (e.durationSeconds || 0), 0);
  const otherSec = events
    .filter((e) => !['reading', 'listening', 'watching'].includes(e.type))
    .reduce((s, e) => s + (e.durationSeconds || 0), 0);

  const totalMinutes = Math.round((readingSec + listeningSec + watchingSec + otherSec) / 60);
  const readingMinutes = Math.round(readingSec / 60);
  const listeningMinutes = Math.round(listeningSec / 60);
  const watchingMinutes = Math.round(watchingSec / 60);

  const newVocabularyAdded = events.filter((e) => e.type === 'vocab_added').length;
  const vocabularyReviewed = events.filter((e) => e.type === 'vocab_reviewed').length;
  const articlesCompleted = events.filter((e) => e.type === 'reading' && (e.durationSeconds || 0) >= 60).length;
  const videosWatched = events.filter((e) => e.type === 'watching').length;
  const lessonsCompleted = events.filter(
    (e) => e.type === 'lesson_completed' || e.type === 'cefr_lesson_completed' || e.type === 'cefr_unit_passed'
  ).length;

  const scoredEvents = events.filter((e) => typeof e.scorePct === 'number');
  const quizzesCompleted = scoredEvents.length;
  const averageQuizScore =
    quizzesCompleted > 0
      ? Math.round(scoredEvents.reduce((s, e) => s + (e.scorePct || 0), 0) / quizzesCompleted)
      : null;

  const grammarEvents = scoredEvents.filter((e) => e.skill === 'grammar');
  const grammarAccuracy =
    grammarEvents.length > 0
      ? Math.round(grammarEvents.reduce((s, e) => s + (e.scorePct || 0), 0) / grammarEvents.length)
      : null;

  const weeklyXp = profile.xpTransactions
    .filter((tx) => getIsoWeekKey(getDateKeyInTz(new Date(tx.createdAt), profile.timezone)) === targetWeekKey)
    .reduce((s, tx) => s + tx.amount, 0);

  // Determine strongest & weakest skills strictly from recorded evidence
  const skillScores: Array<{ skill: string; score: number; hasData: boolean }> = [
    { skill: 'Reading', score: readingMinutes * 4, hasData: readingMinutes > 0 },
    { skill: 'Listening', score: listeningMinutes * 4, hasData: listeningMinutes > 0 },
    { skill: 'Vocabulary', score: (newVocabularyAdded + vocabularyReviewed) * 5, hasData: newVocabularyAdded + vocabularyReviewed > 0 },
    { skill: 'Grammar', score: grammarAccuracy ?? 0, hasData: grammarEvents.length > 0 },
  ].filter((x) => x.hasData);

  skillScores.sort((a, b) => b.score - a.score);
  const strongestSkill = skillScores[0]?.skill || null;
  const weakestSkill = skillScores.length >= 2 ? skillScores[skillScores.length - 1].skill : null;

  const dailyBreakdown = bounds.days.map((dk) => {
    const dayEvs = profile.activityEvents.filter((e) => e.dateKey === dk);
    const dayMins = Math.round(dayEvs.reduce((s, e) => s + (e.durationSeconds || 0), 0) / 60);
    const dayReviews = dayEvs.filter((e) => e.type === 'vocab_reviewed').length;
    const dayXp = profile.xpTransactions
      .filter((tx) => getDateKeyInTz(new Date(tx.createdAt), profile.timezone) === dk)
      .reduce((s, tx) => s + tx.amount, 0);
    return { dateKey: dk, minutes: dayMins, xp: dayXp, reviews: dayReviews };
  });

  // Recommendations only generated from real observed patterns
  const recommendations: WeeklyReportRecommendation[] = [];
  if (events.length > 0) {
    if (listeningMinutes < readingMinutes && readingMinutes > 0) {
      recommendations.push({
        id: 'rec_listen',
        titleAr: 'وازن مهاراتك بمزيد من الاستماع الألماني',
        titleEn: 'Balance skills with more German listening',
        reasonAr: `وقت القراءة (${readingMinutes} د) يتجاوز وقت الاستماع (${listeningMinutes} د) هذا الأسبوع.`,
        reasonEn: `Reading (${readingMinutes}m) exceeded listening (${listeningMinutes}m) this week.`,
        actionTarget: 'podcasts',
      });
    }
    if (vocabularyReviewed < newVocabularyAdded && newVocabularyAdded > 0) {
      recommendations.push({
        id: 'rec_srs',
        titleAr: 'راجع كلماتك المحفوظة بتكرار متباعد',
        titleEn: 'Review newly saved vocabulary with SRS',
        reasonAr: `أضفت ${newVocabularyAdded} كلمات جديدة وأكملت ${vocabularyReviewed} مراجعة فقط.`,
        reasonEn: `Added ${newVocabularyAdded} new words with only ${vocabularyReviewed} reviews.`,
        actionTarget: 'vocabulary',
      });
    }
    if (grammarAccuracy !== null && grammarAccuracy < 75) {
      recommendations.push({
        id: 'rec_grammar',
        titleAr: 'عزّز قواعد المستوى الحالي في مكتبة القواعد',
        titleEn: 'Reinforce grammar in the Grammar Library',
        reasonAr: `متوسط دقة القواعد هذا الأسبوع ${grammarAccuracy}% — مراجعة الأمثلة والاختبارات القصيرة سترفع النسبة.`,
        reasonEn: `Grammar accuracy is ${grammarAccuracy}% this week.`,
        actionTarget: 'flow-journey',
      });
    }
  }

  return {
    report: {
      weekKey: targetWeekKey,
      weekStartDate: bounds.start,
      weekEndDate: bounds.end,
      totalMinutes,
      readingMinutes,
      listeningMinutes,
      watchingMinutes,
      newVocabularyAdded,
      vocabularyReviewed,
      articlesCompleted,
      videosWatched,
      lessonsCompleted,
      quizzesCompleted,
      averageQuizScore,
      grammarAccuracy,
      weeklyXp,
      currentStreak: profile.streak.currentStreak,
      strongestSkill,
      weakestSkill,
      topMistakes: [...profile.mistakes].sort((a, b) => b.count - a.count).slice(0, 6),
      recommendations,
      dailyBreakdown,
      weeklyGoalMinutes: profile.weeklyGoalMinutes,
      goalAchieved: totalMinutes >= profile.weeklyGoalMinutes,
    },
    availableWeeks,
  };
}

export function getLearningTelemetryStats(): LearningTelemetryStats {
  const store = loadStore();
  const profiles = Object.values(store.profiles);
  const engine = getLearningEngineTelemetry();
  const reports = loadErrorReports();
  return {
    totalProfiles: profiles.length,
    totalLessonsGenerated: engine.totalLessonsGenerated,
    aiRequestsCount: engine.aiRequestsCount,
    aiCacheHitsCount: engine.aiCacheHitsCount,
    aiErrorsCount: engine.aiErrorsCount,
    totalVocabStoredAcrossProfiles: profiles.reduce((acc, p) => acc + (p.vocabulary?.length || 0), 0),
    reportedErrorsCount: reports.filter((r) => !r.resolved).length,
  };
}

export function updateProfilePreferences(
  profileId: string,
  patch: {
    dailyGoalMinutes?: number;
    weeklyGoalMinutes?: number;
    cefrLevel?: CEFRLevel;
    timezone?: string;
    vocabCollectionUpdate?: { vocabId: string; collections: string[]; note?: string };
    deleteVocabId?: string;
  }
): LearnerProfileState {
  const profile = getOrCreateProfile(profileId, patch.timezone);
  if (typeof patch.dailyGoalMinutes === 'number') {
    profile.dailyGoalMinutes = Math.max(5, Math.min(180, Math.round(patch.dailyGoalMinutes)));
  }
  if (typeof patch.weeklyGoalMinutes === 'number') {
    profile.weeklyGoalMinutes = Math.max(15, Math.min(1500, Math.round(patch.weeklyGoalMinutes)));
  }
  if (patch.cefrLevel) {
    profile.cefrLevel = patch.cefrLevel;
  }
  if (patch.vocabCollectionUpdate) {
    const v = profile.vocabulary.find((x) => x.id === patch.vocabCollectionUpdate!.vocabId);
    if (v) {
      v.collections = patch.vocabCollectionUpdate.collections;
      if (typeof patch.vocabCollectionUpdate.note === 'string') {
        v.note = patch.vocabCollectionUpdate.note;
      }
      v.updatedAt = new Date().toISOString();
    }
  }
  if (patch.deleteVocabId) {
    profile.vocabulary = profile.vocabulary.filter((x) => x.id !== patch.deleteVocabId);
  }
  evaluateAchievements(profile);
  profile.updatedAt = new Date().toISOString();
  scheduleWrite();
  return profile;
}
