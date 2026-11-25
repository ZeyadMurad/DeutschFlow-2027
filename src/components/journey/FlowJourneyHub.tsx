import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Flame,
  GraduationCap,
  Headphones,
  KeyRound,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useUserData } from '../../context/UserDataContext';
import type { AppSectionId, CEFRLevel, DailyMission, UILanguage } from '../../types/media';
import { SectionShell } from '../sections/SectionShell';
import { VocabularyBankView } from '../sections/VocabularyBankView';
import { AchievementsAndReportsView } from './AchievementsAndReportsView';
import { CEFRPathView } from './CEFRPathView';

export type JourneyTab = 'overview' | 'cefr' | 'grammar' | 'vocabulary' | 'reports';

interface FlowJourneyHubProps {
  lang: UILanguage;
  onBack: () => void;
  onNavigate: (sec: AppSectionId) => void;
  initialTab?: JourneyTab;
}

function speakDe(text: string) {
  if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'de-DE';
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}

export const FlowJourneyHub: React.FC<FlowJourneyHubProps> = ({
  lang,
  onBack,
  onNavigate,
  initialTab = 'overview',
}) => {
  const { appConfig } = usePreferences();
  const {
    learnerProfile,
    profileLoading,
    refreshLearnerProfile,
    restoreSyncCode,
    updateLearnerGoals,
    addRichVocabItems,
    completeDailyVocabChallenge,
  } = useUserData();

  const [tab, setTab] = useState<JourneyTab>(initialTab);
  const [copiedSync, setCopiedSync] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState('');
  const [restoringSync, setRestoringSync] = useState(false);

  // Editable goals
  const [dailyGoalInput, setDailyGoalInput] = useState<number>(20);
  const [weeklyGoalInput, setWeeklyGoalInput] = useState<number>(140);
  const [savingGoals, setSavingGoals] = useState(false);
  const [goalsSavedMsg, setGoalsSavedMsg] = useState('');

  // Daily 5-word Vocabulary Challenge Modal
  const [vocabChallengeMission, setVocabChallengeMission] = useState<DailyMission | null>(null);
  const [savedDailyMap, setSavedDailyMap] = useState<Record<string, boolean>>({});
  const [dailyQuizAnswers, setDailyQuizAnswers] = useState<Record<number, string>>({});
  const [dailyChallengeResult, setDailyChallengeResult] = useState<{
    score: number;
    total: number;
    passed: boolean;
  } | null>(null);
  const [completingChallenge, setCompletingChallenge] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (learnerProfile) {
      setDailyGoalInput(learnerProfile.dailyGoalMinutes);
      setWeeklyGoalInput(learnerProfile.weeklyGoalMinutes);
    }
  }, [learnerProfile]);

  const handleCopySyncCode = async () => {
    if (!learnerProfile?.syncCode) return;
    try {
      await navigator.clipboard.writeText(learnerProfile.syncCode);
      setCopiedSync(true);
      window.setTimeout(() => setCopiedSync(false), 2500);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleRestoreSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncInput.trim()) return;
    setSyncError('');
    setSyncSuccess('');
    setRestoringSync(true);
    try {
      await restoreSyncCode(syncInput.trim());
      setSyncSuccess('تمت استعادة ملفك التعليمي ومزامنة مفرداتك وإحصائياتك بنجاح.');
      setSyncInput('');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'رمز المزامنة غير صالح.');
    } finally {
      setRestoringSync(false);
    }
  };

  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGoals(true);
    setGoalsSavedMsg('');
    try {
      await updateLearnerGoals({
        dailyGoalMinutes: dailyGoalInput,
        weeklyGoalMinutes: weeklyGoalInput,
      });
      setGoalsSavedMsg('تم تحديث أهدافك التعليمية.');
      window.setTimeout(() => setGoalsSavedMsg(''), 3000);
    } finally {
      setSavingGoals(false);
    }
  };

  const handleSaveDailyWord = async (
    target: NonNullable<DailyMission['vocabTargets']>[number]
  ) => {
    await addRichVocabItems([
      {
        word: target.word,
        article: target.article,
        plural: target.plural,
        translation: target.translationAr,
        sentence: target.exampleDe,
        sentenceTranslationAr: target.exampleAr,
        cefrLevel: target.cefrLevel,
        wordCategory: target.wordCategory,
        sourceTitle: 'Daily Mission Vocabulary',
        collections: ['Daily Life'],
      },
    ]);
    setSavedDailyMap((prev) => ({ ...prev, [target.word]: true }));
  };

  const handleSaveAllDailyWords = async () => {
    if (!vocabChallengeMission?.vocabTargets?.length) return;
    await addRichVocabItems(
      vocabChallengeMission.vocabTargets.map((t) => ({
        word: t.word,
        article: t.article,
        plural: t.plural,
        translation: t.translationAr,
        sentence: t.exampleDe,
        sentenceTranslationAr: t.exampleAr,
        cefrLevel: t.cefrLevel,
        wordCategory: t.wordCategory,
        sourceTitle: 'Daily Mission Vocabulary',
        collections: ['Daily Life'],
      }))
    );
    const next: Record<string, boolean> = {};
    vocabChallengeMission.vocabTargets.forEach((t) => {
      next[t.word] = true;
    });
    setSavedDailyMap((prev) => ({ ...prev, ...next }));
  };

  const handleCompleteDailyVocabQuiz = async () => {
    const targets = vocabChallengeMission?.vocabTargets || [];
    if (targets.length === 0) return;
    let correct = 0;
    targets.forEach((t, idx) => {
      if (dailyQuizAnswers[idx] === t.translationAr) {
        correct += 1;
      }
    });
    const passed = correct >= Math.ceil(targets.length * 0.6);
    setCompletingChallenge(true);
    try {
      if (passed) {
        await completeDailyVocabChallenge(targets.length, true);
      }
      setDailyChallengeResult({ score: correct, total: targets.length, passed });
    } finally {
      setCompletingChallenge(false);
    }
  };

  const missions = learnerProfile?.dailyMissions || [];
  const missionsDone = missions.filter((m) => m.completed).length;
  const missionsEnabled = appConfig?.learningConfig?.featureFlags?.dailyMissionsEnabled !== false;
  const cefrEnabled = appConfig?.learningConfig?.featureFlags?.cefrPathEnabled !== false;

  const tabs: Array<{ id: JourneyTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: lang === 'en' ? 'Daily Missions & Overview' : 'المهام اليومية ونظرة عامة', icon: <Target className="w-3.5 h-3.5" /> },
    ...(cefrEnabled
      ? [{ id: 'cefr' as const, label: lang === 'en' ? 'CEFR Path (A1–B2)' : 'مسار المستويات CEFR', icon: <Compass className="w-3.5 h-3.5" /> }]
      : []),
    { id: 'grammar', label: lang === 'en' ? 'Grammar & Sentences' : 'القواعد والجمل المهمة', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'vocabulary', label: lang === 'en' ? 'Smart Vocabulary Bank' : 'بنك المفردات الذكي', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'reports', label: lang === 'en' ? 'Achievements & Weekly Report' : 'الإنجازات والتقرير الأسبوعي', icon: <Award className="w-3.5 h-3.5" /> },
  ];

  return (
    <SectionShell
      sectionId="flow-journey"
      lang={lang}
      onBack={onBack}
      onRefresh={() => void refreshLearnerProfile()}
      refreshing={profileLoading}
    >
      {/* Top Sub-Navigation */}
      <div className="df-card rounded-2xl p-3 mb-6 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
              tab === t.id
                ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#172320] dark:text-[#DCECE8] hover:bg-[#EFE8D8] dark:hover:bg-[#0B3C35]'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW + DAILY MISSIONS + SYNC CODE */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Learner Profile & Cross-Device Sync Hero */}
          <section className="df-card rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/85 p-4 border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22">
                <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">المستوى التقديري CEFR</p>
                <p className="text-2xl font-extrabold text-[#093D38] dark:text-[#7FF9EB] font-mono-num mt-1">
                  {learnerProfile?.cefrLevel || 'A1'}
                </p>
                <p className="text-[10px] text-[#52615D] dark:text-[#9EC5BE]">تقدير تعليمي داخلي</p>
              </div>
              <div className="rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/85 p-4 border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22">
                <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">رصيد Flow XP الفعلي</p>
                <p className="text-2xl font-extrabold text-[#B68934] dark:text-[#E8C35A] font-mono-num mt-1">
                  {learnerProfile?.totalXp ?? 0}
                </p>
                <p className="text-[10px] text-[#52615D] dark:text-[#9EC5BE]">مُحتسب من المهام والدروس</p>
              </div>
              <div className="rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/85 p-4 border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22">
                <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">سلسلة الاستمرارية اليومية</p>
                <p className="text-2xl font-extrabold text-[#D85A40] dark:text-[#FF957E] font-mono-num mt-1 inline-flex items-center gap-1">
                  <Flame className="w-5 h-5" />
                  <span>{learnerProfile?.streak.currentStreak ?? 0}</span>
                </p>
                <p className="text-[10px] text-[#52615D] dark:text-[#9EC5BE]">
                  الأطول: {learnerProfile?.streak.longestStreak ?? 0} يوم
                </p>
              </div>
              <div className="rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/85 p-4 border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22">
                <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">مفرداتي المحفوظة</p>
                <p className="text-2xl font-extrabold text-[#093D38] dark:text-[#7FF9EB] font-mono-num mt-1">
                  {learnerProfile?.vocabulary.length ?? 0}
                </p>
                <p className="text-[10px] text-[#52615D] dark:text-[#9EC5BE]">
                  مهام اليوم: {missionsDone}/{missions.length || 3}
                </p>
              </div>
            </div>

            {/* Goals + Sync Code Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-[#0D4A42]/10 dark:border-[#3EF2DF]/18">
              {/* Goal Editor */}
              <form onSubmit={handleSaveGoals} className="rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/75 p-4 space-y-3">
                <p className="text-xs font-bold text-[#093D38] dark:text-[#E8C35A]">
                  أهداف التعلّم اليومية والأسبوعية
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                    الهدف اليومي (دقائق)
                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={dailyGoalInput}
                      onChange={(e) => setDailyGoalInput(Number(e.target.value) || 20)}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-[#072B26] border border-[#0D4A42]/15 text-xs font-mono-num text-[#172320] dark:text-white"
                    />
                  </label>
                  <label className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                    الهدف الأسبوعي (دقائق)
                    <input
                      type="number"
                      min={15}
                      max={1680}
                      value={weeklyGoalInput}
                      onChange={(e) => setWeeklyGoalInput(Number(e.target.value) || 140)}
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-white dark:bg-[#072B26] border border-[#0D4A42]/15 text-xs font-mono-num text-[#172320] dark:text-white"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingGoals}
                    className="px-4 py-1.5 rounded-xl bg-[#093D38] dark:bg-[#E8C35A] text-white dark:text-[#041B18] text-xs font-bold cursor-pointer"
                  >
                    {savingGoals ? 'جارٍ الحفظ...' : 'حفظ الأهداف'}
                  </button>
                  {goalsSavedMsg && (
                    <span className="text-xs text-emerald-700 dark:text-[#7FF9EB]">{goalsSavedMsg}</span>
                  )}
                </div>
              </form>

              {/* Anonymous Cross-Device Sync Code */}
              <div className="rounded-2xl bg-[#FAF7F0] dark:bg-[#041B18]/75 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#093D38] dark:text-[#E8C35A] inline-flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>رمز المزامنة الخاص بك (بدون حسابات)</span>
                  </p>
                  {learnerProfile?.syncCode && (
                    <button
                      type="button"
                      onClick={() => void handleCopySyncCode()}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#072B26] border border-[#0D4A42]/15 text-xs font-mono-num font-bold text-[#093D38] dark:text-[#7FF9EB] inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedSync ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span dir="ltr">{learnerProfile.syncCode}</span>
                    </button>
                  )}
                </div>

                <form onSubmit={handleRestoreSync} className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={syncInput}
                    onChange={(e) => setSyncInput(e.target.value)}
                    placeholder="DF-XXXX-XXXX لاستعادة ملف من جهاز آخر"
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#072B26] border border-[#0D4A42]/15 text-xs font-mono-num text-[#172320] dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={restoringSync}
                    className="px-3.5 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-bold cursor-pointer shrink-0 inline-flex items-center gap-1"
                  >
                    {restoringSync ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>استعادة</span>
                  </button>
                </form>
                {syncError && <p className="text-[11px] text-[#D85A40]">{syncError}</p>}
                {syncSuccess && <p className="text-[11px] text-emerald-700 dark:text-[#7FF9EB]">{syncSuccess}</p>}
              </div>
            </div>
          </section>

          {/* Today's 3 Daily Missions */}
          {missionsEnabled && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[#093D38] dark:text-[#E8C35A] inline-flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  <span>مهام اليوم التفاعلية ({missionsDone}/{missions.length || 3})</span>
                </h2>
                <span className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                  تتجدد يومياً وتحفظ تقدمك الحقيقي تلقائياً
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {missions.map((m) => {
                  const pct = Math.min(
                    100,
                    Math.round((m.currentValue / Math.max(1, m.targetValue)) * 100)
                  );
                  const progressLabel =
                    m.unit === 'seconds'
                      ? `${Math.floor(m.currentValue / 60)}:${String(m.currentValue % 60).padStart(2, '0')} / ${Math.round(m.targetValue / 60)} د`
                      : `${m.currentValue} / ${m.targetValue} كلمات`;

                  return (
                    <article
                      key={m.id}
                      className={`df-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4 ${
                        m.completed ? 'border-emerald-500/45 ring-1 ring-emerald-500/20' : ''
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8C35A]/20 text-[#916714] dark:text-[#E8C35A]">
                            +{m.xpReward} XP
                          </span>
                          {m.completed ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-[#7FF9EB]">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>مكتملة</span>
                            </span>
                          ) : (
                            <span className="text-xs font-mono-num text-[#52615D] dark:text-[#9EC5BE]">
                              {progressLabel}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-[#093D38] dark:text-white">
                          {lang === 'de' ? m.titleDe : lang === 'en' ? m.titleEn : m.titleAr}
                        </h3>
                        <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] leading-relaxed">
                          {lang === 'de' ? m.descriptionDe : lang === 'en' ? m.descriptionEn : m.descriptionAr}
                        </p>

                        <div className="h-2 rounded-full bg-[#0D4A42]/10 dark:bg-[#3EF2DF]/15 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              m.completed ? 'bg-emerald-500' : 'bg-[#093D38] dark:bg-[#3EF2DF]'
                            }`}
                            style={{ width: `${m.completed ? 100 : pct}%` }}
                          />
                        </div>
                      </div>

                      {m.type === 'reading' && (
                        <button
                          type="button"
                          onClick={() => onNavigate('news')}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#093D38] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>{m.completed ? 'قراءة مقال إضافي' : 'ابدأ القراءة الآن'}</span>
                        </button>
                      )}

                      {m.type === 'listening' && (
                        <button
                          type="button"
                          onClick={() => onNavigate('podcasts')}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#093D38] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Headphones className="w-4 h-4" />
                          <span>{m.completed ? 'استماع إضافي' : 'افتح البودكاست والإذاعة'}</span>
                        </button>
                      )}

                      {m.type === 'vocabulary' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDailyQuizAnswers({});
                            setDailyChallengeResult(null);
                            setVocabChallengeMission(m);
                          }}
                          className="w-full py-2.5 px-3 rounded-xl bg-[#D85A40] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4" />
                          <span>{m.completed ? 'مراجعة كلمات اليوم' : 'دراسة الـ 5 كلمات والاختبار'}</span>
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Quick Entry Actions + Recent XP Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Quick Paths */}
            <div className="df-card rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#093D38] dark:text-[#E8C35A]">
                خطوتك التعليمية التالية
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTab('cefr')}
                  className="p-3.5 rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 text-start space-y-1 cursor-pointer hover:border-[#C8962E]"
                >
                  <Compass className="w-4 h-4 text-[#093D38] dark:text-[#7FF9EB]" />
                  <p className="text-xs font-bold text-[#093D38] dark:text-white">منهج CEFR المتكامل</p>
                  <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                    دروس A1–B2 + اختبار تحديد المستوى
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('vocabulary')}
                  className="p-3.5 rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 text-start space-y-1 cursor-pointer hover:border-[#C8962E]"
                >
                  <BookOpen className="w-4 h-4 text-[#D85A40]" />
                  <p className="text-xs font-bold text-[#093D38] dark:text-white">المراجعة الذكية SM-2</p>
                  <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                    8 أنماط تمارين وتصنيف الكلمات
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('grammar')}
                  className="p-3.5 rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 text-start space-y-1 cursor-pointer hover:border-[#C8962E]"
                >
                  <Layers className="w-4 h-4 text-[#B68934] dark:text-[#E8C35A]" />
                  <p className="text-xs font-bold text-[#093D38] dark:text-white">مكتبة القواعد والجمل</p>
                  <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                    قواعد مشروحة + 10 مواضيع جمل يومية
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setTab('reports')}
                  className="p-3.5 rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 text-start space-y-1 cursor-pointer hover:border-[#C8962E]"
                >
                  <Trophy className="w-4 h-4 text-emerald-600 dark:text-[#7FF9EB]" />
                  <p className="text-xs font-bold text-[#093D38] dark:text-white">التقرير الأسبوعي والأوسمة</p>
                  <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                    تحليل حقيقي لأدائك ونقاط قوتك
                  </p>
                </button>
              </div>
            </div>

            {/* XP Transactions Ledger */}
            <div className="df-card rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#093D38] dark:text-[#E8C35A]">
                سجل نقاط Flow XP المكتسبة ({learnerProfile?.xpTransactions.length || 0})
              </h3>
              {!learnerProfile?.xpTransactions.length ? (
                <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] leading-relaxed">
                  لم تكتسب نقاط XP بعد. ابدأ بقراءة مقال، الاستماع لإذاعة أو بودكاست، حفظ مفردات، أو إتمام إحدى المهام اليومية ليُسجَّل رصيدك فوراً!
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {learnerProfile.xpTransactions.slice(0, 15).map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18]/80 px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-[#172320] dark:text-white">{tx.labelAr}</p>
                        <p className="text-[10px] font-mono-num text-[#52615D] dark:text-[#9EC5BE]">
                          {new Date(tx.createdAt).toLocaleString('de-DE')}
                        </p>
                      </div>
                      <span className="font-mono-num font-bold text-[#B68934] dark:text-[#E8C35A] shrink-0">
                        +{tx.amount} XP
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CEFR STRUCTURED PATH */}
      {tab === 'cefr' && <CEFRPathView lang={lang} initialSubTab="path" />}

      {/* TAB 3: GRAMMAR & IMPORTANT SENTENCES */}
      {tab === 'grammar' && <CEFRPathView lang={lang} initialSubTab="grammar" />}

      {/* TAB 4: SMART VOCABULARY BANK */}
      {tab === 'vocabulary' && <VocabularyBankView lang={lang} />}

      {/* TAB 5: ACHIEVEMENTS & WEEKLY REPORT */}
      {tab === 'reports' && (
        <AchievementsAndReportsView
          lang={lang}
          onNavigate={(sec, subTab) => {
            if (sec === 'flow-journey' && subTab === 'vocabulary') {
              setTab('vocabulary');
            } else {
              onNavigate(sec);
            }
          }}
        />
      )}

      {/* DAILY 5-WORD VOCABULARY STUDY & QUIZ MODAL */}
      {vocabChallengeMission && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/20 dark:border-[#3EF2DF]/35 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-white dark:bg-[#072B26] border-b border-[#0D4A42]/12 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#D85A40]">
                  مهمة المفردات اليومية (+{vocabChallengeMission.xpReward} XP)
                </p>
                <h3 className="text-base font-bold text-[#093D38] dark:text-white">
                  ادرس الـ 5 كلمات السياقية ثم اجتز الاختبار القصير
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVocabChallengeMission(null)}
                className="p-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#093D38] dark:text-[#E8C35A]">
                  1. الكلمات الـ 5 لهذا اليوم:
                </p>
                <button
                  type="button"
                  onClick={() => void handleSaveAllDailyWords()}
                  className="px-3 py-1.5 rounded-xl bg-[#093D38] text-white text-xs font-semibold cursor-pointer"
                >
                  + حفظ كل الكلمات في مفرداتي
                </button>
              </div>

              <div className="space-y-2.5">
                {(vocabChallengeMission.vocabTargets || []).map((t, i) => {
                  const saved = Boolean(savedDailyMap[t.word]);
                  return (
                    <div key={i} className="df-card rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm sm:text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                            {t.article ? `${t.article} ` : ''}
                            {t.word}
                          </span>
                          <span className="text-xs font-semibold text-[#D85A40] dark:text-[#FF957E]">
                            {t.translationAr}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#093D38]/10 dark:bg-[#3EF2DF]/15">
                            {t.cefrLevel}
                          </span>
                        </div>
                        <p className="text-xs font-german" dir="ltr">{t.exampleDe}</p>
                        <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">{t.exampleAr}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => speakDe(`${t.article ? `${t.article} ` : ''}${t.word}. ${t.exampleDe}`)}
                          className="p-2 rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] text-[#093D38] dark:text-[#7FF9EB] cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveDailyWord(t)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                            saved
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#7FF9EB]'
                              : 'bg-[#D85A40] text-white'
                          }`}
                        >
                          {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{saved ? 'محفوظة' : '+ حفظ'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini-Quiz */}
              <div className="space-y-3 pt-2 border-t border-[#0D4A42]/12 dark:border-[#3EF2DF]/22">
                <p className="text-xs font-bold text-[#093D38] dark:text-[#E8C35A]">
                  2. الاختبار القصير لتأكيد الإتقان (3 من 5 على الأقل):
                </p>
                {(vocabChallengeMission.vocabTargets || []).map((t, idx) => {
                  const allTargets = vocabChallengeMission.vocabTargets || [];
                  const options = allTargets.map((x) => x.translationAr);
                  return (
                    <div key={idx} className="df-card rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold font-german text-[#093D38] dark:text-white" dir="ltr">
                        ما معنى: {t.article ? `${t.article} ` : ''}{t.word} ؟
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {options.map((opt, oi) => (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => setDailyQuizAnswers((p) => ({ ...p, [idx]: opt }))}
                            className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                              dailyQuizAnswers[idx] === opt
                                ? 'bg-[#093D38] text-white border-[#093D38] dark:bg-[#E8C35A] dark:text-[#041B18]'
                                : 'bg-[#FAF7F0] dark:bg-[#041B18]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  disabled={completingChallenge}
                  onClick={() => void handleCompleteDailyVocabQuiz()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#093D38] to-[#0E5D55] text-white text-sm font-bold cursor-pointer"
                >
                  {completingChallenge ? 'جارٍ التسجيل...' : 'تأكيد إتمام مهمة المفردات'}
                </button>

                {dailyChallengeResult && (
                  <div
                    className={`rounded-2xl p-4 text-sm font-bold text-center ${
                      dailyChallengeResult.passed
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#7FF9EB]'
                        : 'bg-[#D85A40]/15 text-[#D85A40]'
                    }`}
                  >
                    النتيجة: {dailyChallengeResult.score} / {dailyChallengeResult.total} —{' '}
                    {dailyChallengeResult.passed
                      ? 'تم إكمال المهمة اليومية ومنحك نقاط XP!'
                      : 'تحتاج إلى 3 إجابات صحيحة على الأقل. حاول مرة أخرى!'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionShell>
  );
};
