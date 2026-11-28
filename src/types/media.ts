export type UILanguage = 'ar' | 'de' | 'en';

export type UITheme = 'dark' | 'light';

export type AppSectionId =
  | 'home'
  | 'flow-journey'
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
  | 'library'
  | 'settings';

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

export type WordCategory = 'noun' | 'verb' | 'adjective' | 'expression' | 'other';
export type VocabMasteryStatus = 'new' | 'practicing' | 'mastered';
export type VocabReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type VocabExerciseMode =
  | 'de_to_ar'
  | 'ar_to_de'
  | 'select_article'
  | 'select_plural'
  | 'fill_missing_word'
  | 'match_pairs'
  | 'listen_identify'
  | 'complete_sentence';

export interface VocabSourceRef {
  title: string;
  url?: string;
  type?: string;
  addedAt: string;
}

export interface VocabVerbForms {
  infinitive?: string;
  presentConjugation?: string;
  pastParticiple?: string;
  auxiliaryVerb?: 'haben' | 'sein' | string;
  prepositions?: string;
}

export interface VocabAdjectiveForms {
  comparative?: string;
  superlative?: string;
}

export interface VocabItem {
  id: string;
  word: string;
  translation: string;
  translationEn?: string;
  sentence: string;
  sentenceTranslationAr?: string;
  sourceTitle: string;
  sourceUrl?: string;
  note?: string;
  lemma?: string;
  partOfSpeech?: string;
  wordCategory?: WordCategory;
  article?: string;
  plural?: string;
  phonetic?: string;
  cefrLevel?: CEFRLevel;
  verbForms?: VocabVerbForms;
  adjectiveForms?: VocabAdjectiveForms;
  sources?: VocabSourceRef[];
  collections?: string[];
  status?: VocabMasteryStatus;
  masteryScore?: number; // 0..100
  intervalDays?: number;
  easeFactor?: number;
  repetitions?: number;
  lapses?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DictionaryLookupResult {
  word: string;
  lemma: string;
  translation: string;
  partOfSpeech: string;
  article?: string;
  plural?: string;
  explanation?: string;
  alternatives?: string[];
  provider: string;
  cached?: boolean;
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

// ---------------------------------------------------------------------------
// DeutschFlow 2.0 — Intelligent Language Learning Ecosystem Types
// ---------------------------------------------------------------------------

export type LearningActivityType =
  | 'reading'
  | 'listening'
  | 'watching'
  | 'vocab_added'
  | 'vocab_reviewed'
  | 'quiz_completed'
  | 'lesson_completed'
  | 'cefr_lesson_completed'
  | 'cefr_unit_passed'
  | 'writing_submitted'
  | 'mission_completed'
  | 'placement_completed';

export interface XPTransaction {
  id: string;
  actionKey: string;
  type: LearningActivityType | 'achievement_bonus';
  amount: number;
  labelAr: string;
  labelEn: string;
  createdAt: string;
}

export interface LearningActivityEvent {
  id: string;
  type: LearningActivityType;
  dateKey: string; // YYYY-MM-DD in learner timezone
  weekKey: string; // YYYY-Www ISO week
  durationSeconds?: number;
  scorePct?: number;
  cefrLevel?: CEFRLevel;
  skill?: 'reading' | 'listening' | 'vocabulary' | 'grammar' | 'writing';
  sourceId?: string;
  sourceTitle?: string;
  createdAt: string;
}

export type DailyMissionType = 'reading' | 'listening' | 'vocabulary';

export interface DailyMissionVocabTarget {
  word: string;
  article?: string;
  plural?: string;
  translationAr: string;
  exampleDe: string;
  exampleAr: string;
  cefrLevel: CEFRLevel;
  wordCategory: WordCategory;
}

export interface DailyMission {
  id: string;
  dateKey: string;
  type: DailyMissionType;
  titleAr: string;
  titleDe: string;
  titleEn: string;
  descriptionAr: string;
  descriptionDe: string;
  descriptionEn: string;
  xpReward: number;
  targetValue: number;
  currentValue: number;
  unit: 'seconds' | 'words';
  completed: boolean;
  completedAt?: string;
  vocabTargets?: DailyMissionVocabTarget[];
  quizPassed?: boolean;
}

export interface LearningStreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDateKey?: string;
  activeDates: string[]; // YYYY-MM-DD recent active history
}

export interface UserAchievement {
  id: string;
  code:
    | 'first_100_words'
    | 'streak_7_days'
    | 'streak_30_days'
    | 'reading_explorer'
    | 'listening_master'
    | 'grammar_champion'
    | 'vocab_collector'
    | 'german_news_reader'
    | 'first_complete_lesson'
    | 'first_learning_engine'
    | 'cefr_level_completed'
    | 'weekly_goal_achieved';
  titleAr: string;
  titleDe: string;
  titleEn: string;
  criteriaAr: string;
  criteriaEn: string;
  xpBonus: number;
  unlocked: boolean;
  unlockedAt?: string;
  progressCurrent: number;
  progressTarget: number;
}

export interface UserMistake {
  id: string;
  category: 'article' | 'plural' | 'grammar' | 'vocabulary' | 'comprehension' | 'spelling';
  promptDe: string;
  expected: string;
  userAnswer: string;
  explanationAr?: string;
  cefrLevel?: CEFRLevel;
  count: number;
  lastSeenAt: string;
}

export interface WeeklyReportRecommendation {
  id: string;
  titleAr: string;
  titleEn: string;
  reasonAr: string;
  reasonEn: string;
  actionTarget: 'flow-journey' | 'learning' | 'reading' | 'podcasts' | 'vocabulary';
}

export interface WeeklyReport {
  weekKey: string;
  weekStartDate: string;
  weekEndDate: string;
  totalMinutes: number;
  readingMinutes: number;
  listeningMinutes: number;
  watchingMinutes: number;
  newVocabularyAdded: number;
  vocabularyReviewed: number;
  articlesCompleted: number;
  videosWatched: number;
  lessonsCompleted: number;
  quizzesCompleted: number;
  averageQuizScore: number | null;
  grammarAccuracy: number | null;
  weeklyXp: number;
  currentStreak: number;
  strongestSkill: string | null;
  weakestSkill: string | null;
  topMistakes: UserMistake[];
  recommendations: WeeklyReportRecommendation[];
  dailyBreakdown: Array<{
    dateKey: string;
    minutes: number;
    xp: number;
    reviews: number;
  }>;
  weeklyGoalMinutes: number;
  goalAchieved: boolean;
}

// ---------------------------------------------------------------------------
// DeutschFlow Learning Engine ("From Content to Fluency")
// ---------------------------------------------------------------------------

export type LearningContentType =
  | 'article'
  | 'video'
  | 'podcast'
  | 'documentary'
  | 'reading'
  | 'manual';

export type LearningDifficulty = 'original' | 'simplified' | 'advanced';

export interface LearningContentInput {
  sourceId: string;
  contentType: LearningContentType;
  title: string;
  text: string;
  sourceName: string;
  sourceUrl?: string;
  audioUrl?: string;
  videoId?: string;
  difficulty: LearningDifficulty;
  targetCefr?: CEFRLevel;
}

export interface LessonVocabularyItem {
  word: string;
  lemma?: string;
  article?: string;
  plural?: string;
  wordCategory: WordCategory;
  meaningAr: string;
  meaningEn?: string;
  phoneticHint?: string;
  exampleDe: string;
  exampleAr: string;
  cefrLevel: CEFRLevel;
  contextualMeaningAr: string;
  verbForms?: VocabVerbForms;
  adjectiveForms?: VocabAdjectiveForms;
}

export interface LessonGrammarPoint {
  titleDe: string;
  titleAr: string;
  explanationAr: string;
  structureFormula: string;
  reasonUsedAr: string;
  examples: Array<{ de: string; ar: string }>;
  practiceQuestion: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanationAr: string;
  };
}

export interface LessonExpressionItem {
  expressionDe: string;
  register: 'formal' | 'informal' | 'idiomatic' | 'collocation';
  meaningAr: string;
  usageNoteAr: string;
  exampleDe: string;
}

export interface LessonSentenceItem {
  sentenceDe: string;
  translationAr: string;
  grammarNoteAr: string;
  verbIdentified: string;
  caseAnalysisAr: string;
  wordOrderNoteAr: string;
  wordByWord: Array<{ token: string; lemma: string; role: string; meaningAr: string }>;
}

export interface LessonComprehensionQuestion {
  id: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  questionDe: string;
  questionAr: string;
  options?: string[];
  correctAnswer: string;
  explanationAr: string;
}

export interface LessonQuizQuestion {
  id: string;
  skill: 'vocabulary' | 'grammar' | 'comprehension' | 'expressions';
  promptDe: string;
  promptAr: string;
  options: string[];
  correctIndex: number;
  explanationAr: string;
}

export interface TranscriptSegment {
  /** Start time in seconds within the original audio/video. */
  tSec: number;
  textDe: string;
}

export interface LearningLesson {
  lessonId: string;
  sourceId: string;
  contentType: LearningContentType;
  difficulty: LearningDifficulty;
  provider: 'gemini' | 'structured_fallback';
  cached: boolean;
  createdAt: string;
  sourceLimitationNoteAr?: string;
  sourceLimitationNoteEn?: string;
  /** Honest coverage indicator: full = built from the actual source content, partial = title/description only. */
  coverage?: 'full' | 'partial' | 'unavailable';
  coverageNoteAr?: string;
  /** Timestamped transcript segments (when the spoken/written content was retrieved). */
  transcriptSegments?: TranscriptSegment[];
  overview: {
    titleDe: string;
    sourceName: string;
    sourceUrl?: string;
    topicAr: string;
    topicEn: string;
    cefrLevel: CEFRLevel;
    summaryDe: string;
    summaryAr: string;
    estimatedMinutes: number;
    audioAvailable: boolean;
    audioUrl?: string;
    videoId?: string;
  };
  importantVocabulary: LessonVocabularyItem[];
  grammarInContext: LessonGrammarPoint[];
  importantExpressions: LessonExpressionItem[];
  sentenceAnalysisBank: LessonSentenceItem[];
  readingComprehension: LessonComprehensionQuestion[];
  listeningComprehension: {
    available: boolean;
    transcriptExcerptDe: string;
    noteAr: string;
    questions: LessonComprehensionQuestion[];
  };
  writingPractice: {
    promptDe: string;
    promptAr: string;
    targetWords: string[];
    minWords: number;
    modelExampleDe: string;
  };
  finalQuiz: LessonQuizQuestion[];
}

export interface SentenceAnalysisResult {
  sentenceDe: string;
  translationAr: string;
  grammarStructureAr: string;
  verbIdentified: string;
  caseAnalysisAr: string;
  wordOrderNoteAr: string;
  wordByWord: Array<{ token: string; lemma: string; role: string; meaningAr: string }>;
  provider: 'gemini' | 'heuristic';
}

export interface WritingEvaluationResult {
  scorePct: number;
  correctedGerman: string;
  feedbackAr: string;
  strengthsAr: string[];
  grammarNotesAr: string[];
  vocabularyTipAr: string;
  provider: 'gemini' | 'heuristic';
}

export interface LearningEngineErrorReport {
  id: string;
  lessonId: string;
  sourceTitle: string;
  section: string;
  message: string;
  createdAt: string;
  resolved: boolean;
}

// ---------------------------------------------------------------------------
// CEFR Structured Learning Path (A1 - B2, extensible to C1 - C2)
// ---------------------------------------------------------------------------

export interface CurriculumLesson {
  id: string;
  unitId: string;
  cefrLevel: CEFRLevel;
  order: number;
  titleDe: string;
  titleAr: string;
  titleEn: string;
  topicAr: string;
  estimatedMinutes: number;
  vocabulary: LessonVocabularyItem[];
  grammar: LessonGrammarPoint[];
  importantSentences: Array<{ de: string; ar: string; audioHint?: string }>;
  everydayExpressions: LessonExpressionItem[];
  pronunciationTip: { focusDe: string; guideAr: string; drillWords: string[] };
  readingText: {
    titleDe: string;
    textDe: string;
    translationAr: string;
    questions: LessonQuizQuestion[];
  };
  listeningScript: {
    titleDe: string;
    scriptDe: string;
    questions: LessonQuizQuestion[];
  };
  writingPrompt: {
    promptDe: string;
    promptAr: string;
    checklistAr: string[];
    exampleDe: string;
  };
  speakingPrompt: {
    promptDe: string;
    promptAr: string;
    keyPhrasesDe: string[];
  };
  exercises: LessonQuizQuestion[];
}

export interface CurriculumUnit {
  id: string;
  cefrLevel: CEFRLevel;
  order: number;
  titleDe: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  lessons: CurriculumLesson[];
  unitAssessment: LessonQuizQuestion[];
}

export interface GrammarLibraryEntry {
  id: string;
  cefrLevel: CEFRLevel;
  titleDe: string;
  titleAr: string;
  explanationAr: string;
  structureFormula: string;
  examples: Array<{ de: string; ar: string }>;
  commonMistakes: Array<{ wrong: string; right: string; reasonAr: string }>;
  relatedVocabulary: string[];
  quiz: LessonQuizQuestion[];
}

export interface ImportantSentenceEntry {
  id: string;
  topicId:
    | 'daily_life'
    | 'greetings'
    | 'travel'
    | 'restaurants'
    | 'shopping'
    | 'education'
    | 'work'
    | 'health'
    | 'communication'
    | 'opinions';
  topicLabelAr: string;
  topicLabelEn: string;
  cefrLevel: CEFRLevel;
  sentenceDe: string;
  translationAr: string;
  usageNoteAr: string;
}

export interface PlacementQuestion {
  id: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2';
  skill: 'vocabulary' | 'grammar' | 'reading' | 'listening';
  passageDe?: string;
  listenTextDe?: string;
  promptDe: string;
  promptAr: string;
  options: string[];
  correctIndex: number;
}

export interface CurriculumProgress {
  completedLessonIds: string[];
  lessonScores: Record<string, number>;
  passedUnitIds: string[];
  unitScores: Record<string, number>;
  placementTaken: boolean;
  placementLevel?: CEFRLevel;
  placementScorePct?: number;
  placementNote?: string;
}

export interface LearnerProfileState {
  profileId: string;
  syncCode: string;
  timezone: string;
  cefrLevel: CEFRLevel;
  cefrEstimatedOnly: boolean;
  totalXp: number;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  xpTransactions: XPTransaction[];
  streak: LearningStreakState;
  dailyMissions: DailyMission[];
  achievements: UserAchievement[];
  curriculumProgress: CurriculumProgress;
  vocabulary: VocabItem[];
  mistakes: UserMistake[];
  activityEvents: LearningActivityEvent[];
  completedEngineLessonIds: string[];
  totalArticlesCompleted: number;
  totalVideosWatched: number;
  totalListeningSeconds: number;
  totalReadingSeconds: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Admin 2.0 Configuration & Telemetry
// ---------------------------------------------------------------------------

export interface DeutschFlow2AdminConfig {
  xpRewards: {
    articleReadingMission: number;
    listeningMission: number;
    vocabMission: number;
    vocabSaved: number;
    vocabReviewed: number;
    learningEngineComplete: number;
    cefrLessonComplete: number;
    cefrUnitAssessmentPass: number;
    placementComplete: number;
  };
  dailyMissionTargets: {
    readingMinutes: number;
    listeningMinutes: number;
    vocabWordsCount: number;
  };
  featureFlags: {
    flowJourneyEnabled: boolean;
    dailyMissionsEnabled: boolean;
    learningEngineEnabled: boolean;
    cefrPathEnabled: boolean;
    aiWritingTutorEnabled: boolean;
    weeklyReportEnabled: boolean;
    placementTestEnabled: boolean;
  };
  cefrNotes: Partial<Record<CEFRLevel, string>>;
}

export interface LearningTelemetryStats {
  totalProfiles: number;
  totalLessonsGenerated: number;
  aiRequestsCount: number;
  aiCacheHitsCount: number;
  aiErrorsCount: number;
  totalVocabStoredAcrossProfiles: number;
  reportedErrorsCount: number;
}

