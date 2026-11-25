import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  GraduationCap,
  Headphones,
  Layers,
  Loader2,
  Lock,
  MessageSquareQuote,
  PenLine,
  Plus,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useUserData } from '../../context/UserDataContext';
import { fetchCefrCurriculum } from '../../services/api';
import type {
  CEFRLevel,
  CurriculumLesson,
  CurriculumUnit,
  GrammarLibraryEntry,
  ImportantSentenceEntry,
  PlacementQuestion,
  UILanguage,
  UserMistake,
} from '../../types/media';

interface CEFRPathViewProps {
  lang: UILanguage;
  initialSubTab?: 'path' | 'grammar' | 'sentences';
}

function speakDe(text: string) {
  if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'de-DE';
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}

const TOPIC_FILTERS: Array<{
  id: 'all' | ImportantSentenceEntry['topicId'];
  labelAr: string;
  labelEn: string;
}> = [
  { id: 'all', labelAr: 'كل المواضيع (10)', labelEn: 'All 10 Topics' },
  { id: 'daily_life', labelAr: 'الحياة اليومية', labelEn: 'Daily Life' },
  { id: 'greetings', labelAr: 'التحيات والتعارف', labelEn: 'Greetings' },
  { id: 'travel', labelAr: 'السفر والمواصلات', labelEn: 'Travel & Transit' },
  { id: 'restaurants', labelAr: 'المطاعم والمقاهي', labelEn: 'Restaurants' },
  { id: 'shopping', labelAr: 'التسوق والأسعار', labelEn: 'Shopping' },
  { id: 'education', labelAr: 'الدراسة والجامعة', labelEn: 'Education' },
  { id: 'work', labelAr: 'العمل والمهنة', labelEn: 'Work & Career' },
  { id: 'health', labelAr: 'الصحة والطبيب', labelEn: 'Health' },
  { id: 'communication', labelAr: 'التواصل والهاتف', labelEn: 'Communication' },
  { id: 'opinions', labelAr: 'التعبير عن الرأي', labelEn: 'Opinions' },
];

type LessonTab =
  | 'vocab'
  | 'grammar'
  | 'sentences'
  | 'pronunciation'
  | 'reading'
  | 'listening'
  | 'writing'
  | 'quiz';

export const CEFRPathView: React.FC<CEFRPathViewProps> = ({
  lang,
  initialSubTab = 'path',
}) => {
  const { appConfig } = usePreferences();
  const {
    learnerProfile,
    addRichVocabItems,
    completeCefrCurriculumItem,
    submitPlacementTest,
    logLearningActivity,
  } = useUserData();

  const [subTab, setSubTab] = useState<'path' | 'grammar' | 'sentences'>(initialSubTab);
  const [cefrFilter, setCefrFilter] = useState<'all' | 'A1' | 'A2' | 'B1' | 'B2'>('all');
  const [topicFilter, setTopicFilter] = useState<'all' | ImportantSentenceEntry['topicId']>('all');

  const [units, setUnits] = useState<CurriculumUnit[]>([]);
  const [grammarLibrary, setGrammarLibrary] = useState<GrammarLibraryEntry[]>([]);
  const [importantSentences, setImportantSentences] = useState<ImportantSentenceEntry[]>([]);
  const [placementQuestions, setPlacementQuestions] = useState<PlacementQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Lesson viewer state
  const [activeLesson, setActiveLesson] = useState<{
    unit: CurriculumUnit;
    lesson: CurriculumLesson;
  } | null>(null);
  const [lessonTab, setLessonTab] = useState<LessonTab>('vocab');
  const [savedWordMap, setSavedWordMap] = useState<Record<string, boolean>>({});
  const [lessonQuizAnswers, setLessonQuizAnswers] = useState<Record<string, number>>({});
  const [lessonReadingAnswers, setLessonReadingAnswers] = useState<Record<string, number>>({});
  const [lessonListeningAnswers, setLessonListeningAnswers] = useState<Record<string, number>>({});
  const [lessonGrammarAnswer, setLessonGrammarAnswer] = useState<Record<number, number>>({});
  const [lessonSubmitResult, setLessonSubmitResult] = useState<{
    scorePct: number;
    passed: boolean;
  } | null>(null);
  const [submittingLesson, setSubmittingLesson] = useState(false);

  // Unit assessment modal state
  const [activeUnitAssessment, setActiveUnitAssessment] = useState<CurriculumUnit | null>(null);
  const [unitAnswers, setUnitAnswers] = useState<Record<string, number>>({});
  const [unitResult, setUnitResult] = useState<{ scorePct: number; passed: boolean } | null>(null);
  const [submittingUnit, setSubmittingUnit] = useState(false);

  // Placement modal state
  const [placementOpen, setPlacementOpen] = useState(false);
  const [placementAnswers, setPlacementAnswers] = useState<Record<string, number>>({});
  const [placementResult, setPlacementResult] = useState<{
    level: CEFRLevel;
    scorePct: number;
    correctCount: number;
    totalCount: number;
  } | null>(null);
  const [submittingPlacement, setSubmittingPlacement] = useState(false);

  // Grammar library interactive mini-quiz answers
  const [grammarLibQuizAnswers, setGrammarLibQuizAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCefrCurriculum()
      .then((res) => {
        if (!active) return;
        setUnits(res.units || []);
        setGrammarLibrary(res.grammarLibrary || []);
        setImportantSentences(res.importantSentences || []);
        setPlacementQuestions(res.placementQuestions || []);
      })
      .catch((err) => {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : 'تعذر تحميل المنهج.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const progress = learnerProfile?.curriculumProgress;
  const completedLessonsSet = useMemo(
    () => new Set(progress?.completedLessonIds || []),
    [progress?.completedLessonIds]
  );
  const passedUnitsSet = useMemo(
    () => new Set(progress?.passedUnitIds || []),
    [progress?.passedUnitIds]
  );

  const filteredUnits = useMemo(
    () => units.filter((u) => cefrFilter === 'all' || u.cefrLevel === cefrFilter),
    [units, cefrFilter]
  );

  const filteredGrammar = useMemo(
    () => grammarLibrary.filter((g) => cefrFilter === 'all' || g.cefrLevel === cefrFilter),
    [grammarLibrary, cefrFilter]
  );

  const filteredSentences = useMemo(
    () =>
      importantSentences.filter(
        (s) =>
          (cefrFilter === 'all' || s.cefrLevel === cefrFilter) &&
          (topicFilter === 'all' || s.topicId === topicFilter)
      ),
    [importantSentences, cefrFilter, topicFilter]
  );

  const cefrNotes = appConfig?.learningConfig?.cefrNotes || {};
  const placementEnabled = appConfig?.learningConfig?.featureFlags?.placementTestEnabled !== false;

  const isUnitUnlocked = (unit: CurriculumUnit): boolean => {
    const idx = units.findIndex((u) => u.id === unit.id);
    if (idx <= 0) return true;
    const prevUnit = units[idx - 1];
    if (passedUnitsSet.has(prevUnit.id)) return true;
    // Also allow learners placed at this CEFR level or higher via placement test
    const rank: Record<CEFRLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    const userLevel = learnerProfile?.cefrLevel || 'A1';
    return rank[unit.cefrLevel] <= rank[userLevel];
  };

  const openLesson = (unit: CurriculumUnit, lesson: CurriculumLesson) => {
    setActiveLesson({ unit, lesson });
    setLessonTab('vocab');
    setLessonQuizAnswers({});
    setLessonReadingAnswers({});
    setLessonListeningAnswers({});
    setLessonGrammarAnswer({});
    setLessonSubmitResult(null);
  };

  const handleSaveLessonWord = async (
    item: CurriculumLesson['vocabulary'][number],
    lessonTitle: string
  ) => {
    const key = `${item.word}_${item.cefrLevel}`;
    await addRichVocabItems([
      {
        word: item.word,
        lemma: item.lemma || item.word,
        article: item.article,
        plural: item.plural,
        wordCategory: item.wordCategory,
        translation: item.meaningAr,
        translationEn: item.meaningEn,
        sentence: item.exampleDe,
        sentenceTranslationAr: item.exampleAr,
        phonetic: item.phoneticHint,
        cefrLevel: item.cefrLevel,
        verbForms: item.verbForms,
        adjectiveForms: item.adjectiveForms,
        sourceTitle: `CEFR Path: ${lessonTitle}`,
        collections: ['CEFR Curriculum'],
      },
    ]);
    setSavedWordMap((prev) => ({ ...prev, [key]: true }));
  };

  const handleSaveSentenceToBank = async (s: ImportantSentenceEntry) => {
    await addRichVocabItems([
      {
        word: s.sentenceDe,
        translation: s.translationAr,
        sentence: s.sentenceDe,
        sentenceTranslationAr: s.translationAr,
        wordCategory: 'expression',
        cefrLevel: s.cefrLevel,
        sourceTitle: `Important Sentences (${s.topicLabelEn})`,
        note: s.usageNoteAr,
        collections: ['Important Sentences', s.topicLabelEn],
      },
    ]);
    setSavedWordMap((prev) => ({ ...prev, [s.id]: true }));
  };

  const handleSubmitLessonQuiz = async () => {
    if (!activeLesson) return;
    const { lesson } = activeLesson;
    const questions = lesson.exercises;
    if (!questions.length) return;
    let correct = 0;
    const mistakes: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>> = [];

    questions.forEach((q) => {
      const picked = lessonQuizAnswers[q.id];
      if (picked === q.correctIndex) {
        correct += 1;
      } else {
        mistakes.push({
          category: q.skill === 'grammar' ? 'grammar' : 'vocabulary',
          promptDe: q.promptDe,
          expected: q.options[q.correctIndex] || '',
          userAnswer: picked !== undefined ? q.options[picked] || '' : '—',
          explanationAr: q.explanationAr,
          cefrLevel: lesson.cefrLevel,
        });
      }
    });

    const scorePct = Math.round((correct / questions.length) * 100);
    setSubmittingLesson(true);
    try {
      const res = await completeCefrCurriculumItem({
        kind: 'lesson',
        targetId: lesson.id,
        scorePct,
        cefrLevel: lesson.cefrLevel,
        mistakes,
      });
      await logLearningActivity({
        type: 'quiz_completed',
        scorePct,
        cefrLevel: lesson.cefrLevel,
        skill: 'grammar',
        sourceId: lesson.id,
        sourceTitle: lesson.titleDe,
      });
      setLessonSubmitResult({ scorePct, passed: res.passed });
    } finally {
      setSubmittingLesson(false);
    }
  };

  const handleSubmitUnitAssessment = async () => {
    if (!activeUnitAssessment) return;
    const questions = activeUnitAssessment.unitAssessment;
    let correct = 0;
    const mistakes: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>> = [];
    questions.forEach((q) => {
      const picked = unitAnswers[q.id];
      if (picked === q.correctIndex) {
        correct += 1;
      } else {
        mistakes.push({
          category: q.skill === 'grammar' ? 'grammar' : 'comprehension',
          promptDe: q.promptDe,
          expected: q.options[q.correctIndex] || '',
          userAnswer: picked !== undefined ? q.options[picked] || '' : '—',
          explanationAr: q.explanationAr,
          cefrLevel: activeUnitAssessment.cefrLevel,
        });
      }
    });
    const scorePct = Math.round((correct / Math.max(1, questions.length)) * 100);
    setSubmittingUnit(true);
    try {
      const res = await completeCefrCurriculumItem({
        kind: 'unit',
        targetId: activeUnitAssessment.id,
        scorePct,
        cefrLevel: activeUnitAssessment.cefrLevel,
        mistakes,
      });
      setUnitResult({ scorePct, passed: res.passed });
    } finally {
      setSubmittingUnit(false);
    }
  };

  const handleSubmitPlacement = async () => {
    if (placementQuestions.length === 0) return;
    const payload = placementQuestions.map((q) => ({
      questionId: q.id,
      selectedIndex: placementAnswers[q.id] ?? -1,
    }));
    setSubmittingPlacement(true);
    try {
      const result = await submitPlacementTest(payload);
      setPlacementResult(result);
    } finally {
      setSubmittingPlacement(false);
    }
  };

  if (loading) {
    return (
      <div className="df-card rounded-2xl p-8 flex items-center justify-center gap-3 text-sm text-[#52615D] dark:text-[#9EC5BE]">
        <Loader2 className="w-5 h-5 animate-spin text-[#0E4B4B] dark:text-[#7FF9EB]" />
        <span>جارٍ تحميل مسار المستويات CEFR ومكتبة القواعد...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="df-card rounded-2xl p-6 text-sm text-[#D85A40]">{errorMsg}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation + Placement CTA */}
      <div className="df-card rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('path')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              subTab === 'path'
                ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#172320] dark:text-[#D5EAE5]'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{lang === 'de' ? 'CEFR-Lernpfad' : lang === 'en' ? 'CEFR Path (A1–B2)' : 'مسار المستويات (A1–B2)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('grammar')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              subTab === 'grammar'
                ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#172320] dark:text-[#D5EAE5]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{lang === 'de' ? 'Grammatik-Bibliothek' : lang === 'en' ? 'Grammar Library' : 'مكتبة القواعد'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('sentences')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              subTab === 'sentences'
                ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#172320] dark:text-[#D5EAE5]'
            }`}
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
            <span>
              {lang === 'de'
                ? 'Wichtige Sätze (10 Themen)'
                : lang === 'en'
                ? 'Important Sentences (10 Topics)'
                : 'الجمل الألمانية المهمة (10 مواضيع)'}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'A1', 'A2', 'B1', 'B2'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setCefrFilter(lvl)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                cefrFilter === lvl
                  ? 'bg-[#D85A40] text-white'
                  : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#52615D] dark:text-[#A9C9C3]'
              }`}
            >
              {lvl === 'all' ? 'الكل' : lvl}
            </button>
          ))}
          {placementEnabled && (
            <button
              type="button"
              onClick={() => {
                setPlacementAnswers({});
                setPlacementResult(null);
                setPlacementOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#E8C35A] to-[#C8962E] text-[#041B18] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <GraduationCap className="w-4 h-4" />
              <span>
                {progress?.placementTaken
                  ? `إعادة تحديد المستوى (${learnerProfile?.cefrLevel})`
                  : 'اختبار تحديد المستوى'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Placement Status Notice */}
      {progress?.placementTaken && (
        <div className="rounded-2xl bg-[#093D38]/8 dark:bg-[#3EF2DF]/10 border border-[#093D38]/15 dark:border-[#3EF2DF]/25 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div>
            <strong className="text-[#093D38] dark:text-[#7FF9EB]">
              المستوى التقديري الحالي: {learnerProfile?.cefrLevel}
            </strong>
            <span className="mx-2 text-[#52615D] dark:text-[#9EC5BE]">·</span>
            <span className="text-[#52615D] dark:text-[#9EC5BE]">
              نتيجة آخر تقييم: {progress.placementScorePct}% (تقدير تعليمي داخلي وليس شهادة Goethe رسمية)
            </span>
          </div>
          <span className="text-[11px] font-mono-num text-[#B68934] dark:text-[#E8C35A]">
            الدروس المكتملة: {progress.completedLessonIds.length} · الوحدات المجتازة: {progress.passedUnitIds.length}
          </span>
        </div>
      )}

      {/* SUBTAB 1: STRUCTURED CEFR PATH */}
      {subTab === 'path' && (
        <div className="space-y-5">
          {filteredUnits.map((unit) => {
            const unlocked = isUnitUnlocked(unit);
            const passed = passedUnitsSet.has(unit.id);
            const unitScore = progress?.unitScores?.[unit.id];
            const completedInUnit = unit.lessons.filter((l) => completedLessonsSet.has(l.id)).length;
            const adminNote = cefrNotes[unit.cefrLevel];

            return (
              <section
                key={unit.id}
                className={`df-card rounded-2xl p-4 sm:p-6 space-y-4 ${
                  !unlocked ? 'opacity-85' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]">
                        {unit.cefrLevel}
                      </span>
                      {passed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-[#7FF9EB]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>وحدة مجتازة ({unitScore}%)</span>
                        </span>
                      ) : unlocked ? (
                        <span className="text-xs font-semibold text-[#C8962E] dark:text-[#E8C35A]">
                          متاحة للتعلّم ({completedInUnit}/{unit.lessons.length} دروس)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[#52615D] dark:text-[#9EC5BE]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>تُفتح بعد اجتياز الوحدة السابقة أو عبر اختبار تحديد المستوى</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-[#093D38] dark:text-white font-german" dir="ltr">
                      {unit.titleDe}
                    </h3>
                    <p className="text-sm font-semibold text-[#172320] dark:text-[#E8F3F0]">{unit.titleAr}</p>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{unit.summaryAr}</p>
                    {adminNote && (
                      <p className="text-xs text-[#B68934] dark:text-[#E8C35A] bg-[#E8C35A]/10 rounded-lg px-3 py-1.5 mt-1">
                        ملاحظة المنهج ({unit.cefrLevel}): {adminNote}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      setActiveUnitAssessment(unit);
                      setUnitAnswers({});
                      setUnitResult(null);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 ${
                      unlocked
                        ? 'bg-[#D85A40] text-white hover:brightness-105 cursor-pointer'
                        : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#52615D] cursor-not-allowed'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>{passed ? 'إعادة تقييم الوحدة' : 'اختبار الوحدة (70%+)'}</span>
                  </button>
                </div>

                {/* Lessons in unit */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unit.lessons.map((lesson) => {
                    const done = completedLessonsSet.has(lesson.id);
                    const score = progress?.lessonScores?.[lesson.id];
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => openLesson(unit, lesson)}
                        className={`rounded-xl border p-3.5 text-start flex flex-col justify-between gap-2 transition-colors ${
                          done
                            ? 'bg-emerald-500/8 border-emerald-500/35 dark:bg-[#3EF2DF]/10 dark:border-[#3EF2DF]/35 cursor-pointer'
                            : unlocked
                            ? 'bg-[#FAF7F0] dark:bg-[#041B18]/80 border-[#0D4A42]/15 dark:border-[#3EF2DF]/22 hover:border-[#C8962E] cursor-pointer'
                            : 'bg-[#FAF7F0]/50 dark:bg-[#041B18]/40 border-[#0D4A42]/10 opacity-70 cursor-not-allowed'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-mono-num text-[#52615D] dark:text-[#9EC5BE]">
                              درس {lesson.order} · ~{lesson.estimatedMinutes} د
                            </span>
                            {done && (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-[#7FF9EB]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {score !== undefined ? `${score}%` : 'مكتمل'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-[#093D38] dark:text-white font-german" dir="ltr">
                            {lesson.titleDe}
                          </p>
                          <p className="text-xs font-medium text-[#172320] dark:text-[#DCECE8]">
                            {lesson.titleAr}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#B68934] dark:text-[#E8C35A] pt-1 border-t border-[#0D4A42]/8 dark:border-[#3EF2DF]/15">
                          <span>{lesson.vocabulary.length} مفردات · {lesson.grammar.length} قاعدة</span>
                          <span className="inline-flex items-center gap-0.5 font-semibold">
                            <span>{unlocked ? 'فتح الدرس' : 'مقفل'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* Honest C1-C2 Extensible Roadmap Notice */}
          <div className="df-card rounded-2xl p-5 border-dashed border-[#C8962E]/40 space-y-1.5">
            <p className="text-xs font-bold text-[#B68934] dark:text-[#E8C35A]">
              ملاحظة المسارات المتقدمة (C1 – C2)
            </p>
            <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] leading-relaxed">
              تغطي الوحدات المنهجية المتكاملة أعلاه مستويات A1 حتى B2 وفق معايير CEFR. للوصول إلى مستويات C1 و C2، استخدم «محرّك التعلّم الذكي» داخل الصحف والبودكاست والوثائقيات الأصلية مع ضبط صعوبة التمرين إلى Advanced.
            </p>
          </div>
        </div>
      )}

      {/* SUBTAB 2: GRAMMAR LIBRARY */}
      {subTab === 'grammar' && (
        <div className="space-y-4">
          {filteredGrammar.map((entry) => (
            <article key={entry.id} className="df-card rounded-2xl p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18] me-2">
                    {entry.cefrLevel}
                  </span>
                  <h3 className="inline text-base sm:text-lg font-bold text-[#093D38] dark:text-white font-german" dir="ltr">
                    {entry.titleDe}
                  </h3>
                  <p className="text-sm font-semibold text-[#D85A40] dark:text-[#FF957E] mt-1">
                    {entry.titleAr}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/22 text-xs font-mono-num text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                  {entry.structureFormula}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#172320] dark:text-[#E8F3F0] leading-relaxed">
                {entry.explanationAr}
              </p>

              {/* Examples */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {entry.examples.map((ex, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18]/80 p-3 flex items-start justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-semibold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                        {ex.de}
                      </p>
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{ex.ar}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakDe(ex.de)}
                      className="p-1.5 rounded-lg bg-white dark:bg-[#072B26] text-[#093D38] dark:text-[#E8C35A] cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Common Mistakes */}
              {entry.commonMistakes.length > 0 && (
                <div className="rounded-xl bg-[#D85A40]/8 border border-[#D85A40]/25 p-3.5 space-y-2">
                  <p className="text-xs font-bold text-[#D85A40] dark:text-[#FF957E]">أخطاء شائعة وتصحيحها:</p>
                  {entry.commonMistakes.map((m, idx) => (
                    <div key={idx} className="text-xs space-y-1">
                      <div className="flex flex-wrap items-center gap-2 font-german" dir="ltr">
                        <span className="line-through text-[#D85A40]">✗ {m.wrong}</span>
                        <span>→</span>
                        <span className="font-bold text-emerald-700 dark:text-[#7FF9EB]">✓ {m.right}</span>
                      </div>
                      <p className="text-[#52615D] dark:text-[#9EC5BE]">{m.reasonAr}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Interactive Check */}
              {entry.quiz.map((q) => {
                const picked = grammarLibQuizAnswers[q.id];
                return (
                  <div key={q.id} className="rounded-xl border border-[#0D4A42]/12 dark:border-[#3EF2DF]/20 p-3.5 space-y-2.5">
                    <p className="text-xs font-bold text-[#093D38] dark:text-[#E8C35A]">اختبر فهمك للقاعدة:</p>
                    <p className="text-sm font-semibold font-german text-[#172320] dark:text-white" dir="ltr">
                      {q.promptDe}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {q.options.map((opt, idx) => {
                        const isPicked = picked === idx;
                        const isCorrect = idx === q.correctIndex;
                        let cls =
                          'bg-[#F7F3EA] dark:bg-[#041B18] border-[#0D4A42]/15 dark:border-[#3EF2DF]/22 text-[#172320] dark:text-white';
                        if (picked !== undefined) {
                          if (isCorrect) cls = 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-[#7FF9EB]';
                          else if (isPicked) cls = 'bg-[#D85A40]/15 border-[#D85A40] text-[#D85A40]';
                        }
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setGrammarLibQuizAnswers((prev) => ({ ...prev, [q.id]: idx }))
                            }
                            className={`px-3 py-2 rounded-xl border text-xs font-medium text-start cursor-pointer font-german ${cls}`}
                            dir="ltr"
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {picked !== undefined && (
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.explanationAr}</p>
                    )}
                  </div>
                );
              })}
            </article>
          ))}
        </div>
      )}

      {/* SUBTAB 3: 10-TOPIC IMPORTANT GERMAN SENTENCES */}
      {subTab === 'sentences' && (
        <div className="space-y-4">
          <div className="df-card rounded-2xl p-4 flex flex-wrap gap-1.5">
            {TOPIC_FILTERS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTopicFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  topicFilter === t.id
                    ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                    : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#172320] dark:text-[#DCECE8]'
                }`}
              >
                {lang === 'en' ? t.labelEn : t.labelAr}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredSentences.map((s) => {
              const isSaved = Boolean(savedWordMap[s.id]);
              return (
                <article key={s.id} className="df-card rounded-2xl p-4 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#B68934] dark:text-[#E8C35A]">
                        {s.topicLabelAr} · {s.cefrLevel}
                      </span>
                      <button
                        type="button"
                        onClick={() => speakDe(s.sentenceDe)}
                        className="p-1.5 rounded-lg bg-[#F7F3EA] dark:bg-[#041B18] text-[#093D38] dark:text-[#7FF9EB] cursor-pointer"
                        title="نطق الجملة بالألمانية"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm sm:text-base font-bold font-german text-[#093D38] dark:text-white" dir="ltr">
                      {s.sentenceDe}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-[#D85A40] dark:text-[#FF957E]">
                      {s.translationAr}
                    </p>
                    <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">{s.usageNoteAr}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveSentenceToBank(s)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSaved
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#7FF9EB]'
                        : 'bg-[#093D38] text-white dark:bg-[#08332E] dark:border dark:border-[#3EF2DF]/30'
                    }`}
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isSaved ? 'تم الحفظ في مفرداتي' : '+ أضف إلى مفرداتي'}</span>
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* STRUCTURED LESSON VIEWER MODAL */}
      {activeLesson && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[92vh] bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/20 dark:border-[#3EF2DF]/35 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-white dark:bg-[#072B26] border-b border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-[#B68934] dark:text-[#E8C35A]">
                  {activeLesson.unit.cefrLevel} · {activeLesson.unit.titleAr}
                </p>
                <h3 className="text-base sm:text-lg font-bold text-[#093D38] dark:text-white font-german" dir="ltr">
                  {activeLesson.lesson.titleDe}
                </h3>
                <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{activeLesson.lesson.titleAr}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLesson(null)}
                className="p-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] text-[#52615D] dark:text-[#9EC5BE] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lesson Tabs */}
            <div className="px-4 sm:px-6 py-2.5 bg-white/70 dark:bg-[#05231F] border-b border-[#0D4A42]/10 dark:border-[#3EF2DF]/18 flex gap-1.5 overflow-x-auto">
              {(
                [
                  { id: 'vocab', label: 'المفردات' },
                  { id: 'grammar', label: 'القواعد' },
                  { id: 'sentences', label: 'الجمل والتعابير' },
                  { id: 'pronunciation', label: 'النطق' },
                  { id: 'reading', label: 'القراءة' },
                  { id: 'listening', label: 'الاستماع' },
                  { id: 'writing', label: 'الكتابة والمحادثة' },
                  { id: 'quiz', label: 'اختبار الدرس' },
                ] as Array<{ id: LessonTab; label: string }>
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLessonTab(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    lessonTab === t.id
                      ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                      : 'bg-white dark:bg-[#072B26] text-[#172320] dark:text-[#DCECE8]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {lessonTab === 'vocab' && (
                <div className="space-y-3">
                  {activeLesson.lesson.vocabulary.map((v, i) => {
                    const key = `${v.word}_${v.cefrLevel}`;
                    const saved = Boolean(savedWordMap[key]);
                    return (
                      <div key={i} className="df-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                              {v.article ? `${v.article} ` : ''}
                              {v.word}
                            </span>
                            {v.plural && (
                              <span className="text-xs font-german text-[#52615D] dark:text-[#9EC5BE]" dir="ltr">
                                Pl.: {v.plural}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-[#D85A40] dark:text-[#FF957E]">
                              {v.meaningAr}
                            </span>
                          </div>
                          <p className="text-xs font-german text-[#172320] dark:text-[#E8F3F0]" dir="ltr">
                            {v.exampleDe}
                          </p>
                          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{v.exampleAr}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => speakDe(`${v.article ? `${v.article} ` : ''}${v.word}. ${v.exampleDe}`)}
                            className="p-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] text-[#093D38] dark:text-[#7FF9EB] cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveLessonWord(v, activeLesson.lesson.titleDe)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                              saved
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#7FF9EB]'
                                : 'bg-[#D85A40] text-white'
                            }`}
                          >
                            {saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            <span>{saved ? 'محفوظة' : '+ أضف إلى مفرداتي'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {lessonTab === 'grammar' && (
                <div className="space-y-4">
                  {activeLesson.lesson.grammar.map((g, gi) => {
                    const picked = lessonGrammarAnswer[gi];
                    return (
                      <div key={gi} className="df-card rounded-2xl p-4 sm:p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                            {g.titleDe}
                          </h4>
                          <span className="px-2.5 py-1 rounded-lg bg-[#FAF7F0] dark:bg-[#041B18] text-xs font-mono-num" dir="ltr">
                            {g.structureFormula}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#D85A40] dark:text-[#FF957E]">{g.titleAr}</p>
                        <p className="text-xs sm:text-sm text-[#172320] dark:text-[#E8F3F0] leading-relaxed">
                          {g.explanationAr}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {g.examples.map((ex, ei) => (
                            <div key={ei} className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] p-3">
                              <p className="text-xs font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                                {ex.de}
                              </p>
                              <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] mt-0.5">{ex.ar}</p>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 p-3 space-y-2">
                          <p className="text-xs font-bold text-[#B68934] dark:text-[#E8C35A]">تمرين سريع:</p>
                          <p className="text-xs sm:text-sm font-german" dir="ltr">{g.practiceQuestion.prompt}</p>
                          <div className="flex flex-wrap gap-2">
                            {g.practiceQuestion.options.map((opt, oi) => (
                              <button
                                key={oi}
                                type="button"
                                onClick={() => setLessonGrammarAnswer((prev) => ({ ...prev, [gi]: oi }))}
                                className={`px-3 py-1.5 rounded-lg border text-xs font-german cursor-pointer ${
                                  picked === undefined
                                    ? 'bg-white dark:bg-[#072B26] border-[#0D4A42]/15'
                                    : oi === g.practiceQuestion.correctIndex
                                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-[#7FF9EB]'
                                    : picked === oi
                                    ? 'bg-[#D85A40]/15 border-[#D85A40] text-[#D85A40]'
                                    : 'opacity-70'
                                }`}
                                dir="ltr"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          {picked !== undefined && (
                            <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                              {g.practiceQuestion.explanationAr}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {lessonTab === 'sentences' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#093D38] dark:text-[#E8C35A]">الجمل الأساسية</h4>
                  <div className="space-y-2.5">
                    {activeLesson.lesson.importantSentences.map((s, idx) => (
                      <div key={idx} className="df-card rounded-xl p-3.5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold font-german text-[#093D38] dark:text-white" dir="ltr">
                            {s.de}
                          </p>
                          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] mt-0.5">{s.ar}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakDe(s.de)}
                          className="p-2 rounded-lg bg-[#F7F3EA] dark:bg-[#041B18] text-[#093D38] dark:text-[#7FF9EB] cursor-pointer shrink-0"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {activeLesson.lesson.everydayExpressions.length > 0 && (
                    <>
                      <h4 className="text-sm font-bold text-[#093D38] dark:text-[#E8C35A]">تعابير يومية شائعة</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {activeLesson.lesson.everydayExpressions.map((exp, idx) => (
                          <div key={idx} className="df-card rounded-xl p-3.5 space-y-1">
                            <p className="text-sm font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                              {exp.expressionDe}
                            </p>
                            <p className="text-xs font-semibold text-[#D85A40] dark:text-[#FF957E]">
                              {exp.meaningAr}
                            </p>
                            <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">{exp.usageNoteAr}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {lessonTab === 'pronunciation' && (
                <div className="df-card rounded-2xl p-5 space-y-4">
                  <h4 className="text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                    {activeLesson.lesson.pronunciationTip.focusDe}
                  </h4>
                  <p className="text-sm text-[#172320] dark:text-[#E8F3F0] leading-relaxed">
                    {activeLesson.lesson.pronunciationTip.guideAr}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeLesson.lesson.pronunciationTip.drillWords.map((w, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => speakDe(w)}
                        className="px-3.5 py-2 rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/22 text-xs font-bold font-german inline-flex items-center gap-1.5 cursor-pointer"
                        dir="ltr"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#D85A40]" />
                        <span>{w}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {lessonTab === 'reading' && (
                <div className="df-card rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                      <BookOpen className="w-4 h-4 inline me-1.5" />
                      {activeLesson.lesson.readingText.titleDe}
                    </h4>
                    <button
                      type="button"
                      onClick={() => speakDe(activeLesson.lesson.readingText.textDe)}
                      className="px-3 py-1.5 rounded-xl bg-[#093D38] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>قراءة صوتية</span>
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed font-german bg-[#FAF7F0] dark:bg-[#041B18] p-4 rounded-xl text-[#172320] dark:text-white" dir="ltr">
                    {activeLesson.lesson.readingText.textDe}
                  </p>
                  <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                    الترجمة: {activeLesson.lesson.readingText.translationAr}
                  </p>

                  {activeLesson.lesson.readingText.questions.map((q) => {
                    const picked = lessonReadingAnswers[q.id];
                    return (
                      <div key={q.id} className="rounded-xl border border-[#0D4A42]/12 dark:border-[#3EF2DF]/20 p-3.5 space-y-2">
                        <p className="text-sm font-semibold font-german" dir="ltr">{q.promptDe}</p>
                        <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.promptAr}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt, oi) => (
                            <button
                              key={oi}
                              type="button"
                              onClick={() => setLessonReadingAnswers((p) => ({ ...p, [q.id]: oi }))}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-german cursor-pointer ${
                                picked === undefined
                                  ? 'bg-white dark:bg-[#072B26]'
                                  : oi === q.correctIndex
                                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-[#7FF9EB]'
                                  : picked === oi
                                  ? 'bg-[#D85A40]/15 border-[#D85A40] text-[#D85A40]'
                                  : 'opacity-70'
                              }`}
                              dir="ltr"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {lessonTab === 'listening' && (
                <div className="df-card rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                      <Headphones className="w-4 h-4 inline me-1.5" />
                      {activeLesson.lesson.listeningScript.titleDe}
                    </h4>
                    <button
                      type="button"
                      onClick={() => speakDe(activeLesson.lesson.listeningScript.scriptDe)}
                      className="px-4 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>تشغيل النص الصوتي (de-DE)</span>
                    </button>
                  </div>
                  <details className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] p-3 text-xs">
                    <summary className="cursor-pointer font-semibold text-[#093D38] dark:text-[#E8C35A]">
                      إظهار النص المسموع (Transcript)
                    </summary>
                    <p className="mt-2 font-german text-sm leading-relaxed" dir="ltr">
                      {activeLesson.lesson.listeningScript.scriptDe}
                    </p>
                  </details>

                  {activeLesson.lesson.listeningScript.questions.map((q) => {
                    const picked = lessonListeningAnswers[q.id];
                    return (
                      <div key={q.id} className="rounded-xl border border-[#0D4A42]/12 dark:border-[#3EF2DF]/20 p-3.5 space-y-2">
                        <p className="text-sm font-semibold font-german" dir="ltr">{q.promptDe}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt, oi) => (
                            <button
                              key={oi}
                              type="button"
                              onClick={() => setLessonListeningAnswers((p) => ({ ...p, [q.id]: oi }))}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-german cursor-pointer ${
                                picked === undefined
                                  ? 'bg-white dark:bg-[#072B26]'
                                  : oi === q.correctIndex
                                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-[#7FF9EB]'
                                  : picked === oi
                                  ? 'bg-[#D85A40]/15 border-[#D85A40] text-[#D85A40]'
                                  : 'opacity-70'
                              }`}
                              dir="ltr"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {lessonTab === 'writing' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="df-card rounded-2xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-[#093D38] dark:text-[#E8C35A] inline-flex items-center gap-1.5">
                      <PenLine className="w-4 h-4" />
                      <span>مهمة الكتابة</span>
                    </h4>
                    <p className="text-sm font-semibold font-german" dir="ltr">
                      {activeLesson.lesson.writingPrompt.promptDe}
                    </p>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                      {activeLesson.lesson.writingPrompt.promptAr}
                    </p>
                    <ul className="text-xs space-y-1 list-disc list-inside text-[#172320] dark:text-[#DCECE8]">
                      {activeLesson.lesson.writingPrompt.checklistAr.map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                    <div className="rounded-xl bg-[#FAF7F0] dark:bg-[#041B18] p-3 text-xs">
                      <span className="font-bold text-[#B68934] dark:text-[#E8C35A]">نموذج استرشادي: </span>
                      <span className="font-german" dir="ltr">{activeLesson.lesson.writingPrompt.exampleDe}</span>
                    </div>
                  </div>

                  <div className="df-card rounded-2xl p-4 space-y-3">
                    <h4 className="text-sm font-bold text-[#093D38] dark:text-[#E8C35A] inline-flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>مهمة التحدث بصوت عالٍ</span>
                    </h4>
                    <p className="text-sm font-semibold font-german" dir="ltr">
                      {activeLesson.lesson.speakingPrompt.promptDe}
                    </p>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                      {activeLesson.lesson.speakingPrompt.promptAr}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeLesson.lesson.speakingPrompt.keyPhrasesDe.map((kp, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => speakDe(kp)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] dark:bg-[#041B18] text-xs font-german inline-flex items-center gap-1 cursor-pointer"
                          dir="ltr"
                        >
                          <Volume2 className="w-3 h-3 text-[#D85A40]" />
                          <span>{kp}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {lessonTab === 'quiz' && (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#093D38]/8 dark:bg-[#3EF2DF]/10 px-4 py-3 text-xs text-[#093D38] dark:text-[#7FF9EB]">
                    اجتز الاختبار بنسبة <strong>70% أو أكثر</strong> لتوثيق إتمام الدرس والحصول على مكافأة XP.
                  </div>
                  {activeLesson.lesson.exercises.map((q, qi) => {
                    const picked = lessonQuizAnswers[q.id];
                    return (
                      <div key={q.id} className="df-card rounded-2xl p-4 space-y-2.5">
                        <p className="text-xs font-mono-num text-[#B68934] dark:text-[#E8C35A]">
                          سؤال {qi + 1} · {q.skill}
                        </p>
                        <p className="text-sm font-bold font-german text-[#172320] dark:text-white" dir="ltr">
                          {q.promptDe}
                        </p>
                        <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.promptAr}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oi) => (
                            <button
                              key={oi}
                              type="button"
                              onClick={() =>
                                setLessonQuizAnswers((prev) => ({ ...prev, [q.id]: oi }))
                              }
                              className={`px-3 py-2 rounded-xl border text-xs font-german text-start cursor-pointer ${
                                picked === oi
                                  ? 'bg-[#093D38] text-white border-[#093D38] dark:bg-[#E8C35A] dark:text-[#041B18]'
                                  : 'bg-[#FAF7F0] dark:bg-[#041B18] border-[#0D4A42]/15 dark:border-[#3EF2DF]/22'
                              }`}
                              dir="ltr"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {lessonSubmitResult && (
                          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.explanationAr}</p>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    disabled={submittingLesson}
                    onClick={() => void handleSubmitLessonQuiz()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#093D38] to-[#0D5A52] text-white text-sm font-bold cursor-pointer"
                  >
                    {submittingLesson ? 'جارٍ التصحيح والحفظ...' : 'إرسال اختبار الدرس وحساب النتيجة'}
                  </button>

                  {lessonSubmitResult && (
                    <div
                      className={`rounded-2xl p-4 text-sm font-bold text-center ${
                        lessonSubmitResult.passed
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#7FF9EB]'
                          : 'bg-[#D85A40]/15 text-[#D85A40]'
                      }`}
                    >
                      نتيجتك: {lessonSubmitResult.scorePct}% —{' '}
                      {lessonSubmitResult.passed
                        ? 'ممتاز! تم توثيق إتمام الدرس ومنحك نقاط XP.'
                        : 'تحتاج إلى 70% على الأقل لاجتياز الدرس. راجع الشرح وحاول مجدداً.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* UNIT ASSESSMENT MODAL */}
      {activeUnitAssessment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/20 dark:border-[#3EF2DF]/35 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-white dark:bg-[#072B26] border-b border-[#0D4A42]/12 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#B68934] dark:text-[#E8C35A]">
                  تقييم الوحدة {activeUnitAssessment.cefrLevel} (النجاح 70%+)
                </p>
                <h3 className="text-base font-bold font-german text-[#093D38] dark:text-white" dir="ltr">
                  {activeUnitAssessment.titleDe}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveUnitAssessment(null)}
                className="p-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeUnitAssessment.unitAssessment.map((q, idx) => (
                <div key={q.id} className="df-card rounded-2xl p-4 space-y-2">
                  <p className="text-xs text-[#B68934] dark:text-[#E8C35A]">سؤال {idx + 1}</p>
                  <p className="text-sm font-bold font-german" dir="ltr">{q.promptDe}</p>
                  <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.promptAr}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => setUnitAnswers((p) => ({ ...p, [q.id]: oi }))}
                        className={`px-3 py-2 rounded-xl border text-xs font-german text-start cursor-pointer ${
                          unitAnswers[q.id] === oi
                            ? 'bg-[#093D38] text-white border-[#093D38] dark:bg-[#E8C35A] dark:text-[#041B18]'
                            : 'bg-[#FAF7F0] dark:bg-[#041B18]'
                        }`}
                        dir="ltr"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                type="button"
                disabled={submittingUnit}
                onClick={() => void handleSubmitUnitAssessment()}
                className="w-full py-3 rounded-xl bg-[#D85A40] text-white text-sm font-bold cursor-pointer"
              >
                {submittingUnit ? 'جارٍ التقييم...' : 'إرسال اختبار الوحدة'}
              </button>

              {unitResult && (
                <div
                  className={`rounded-2xl p-4 text-sm font-bold text-center ${
                    unitResult.passed
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#7FF9EB]'
                      : 'bg-[#D85A40]/15 text-[#D85A40]'
                  }`}
                >
                  نتيجة الوحدة: {unitResult.scorePct}% —{' '}
                  {unitResult.passed
                    ? 'مبروك! تم فتح الوحدة التالية وترقية مستواك.'
                    : 'تحتاج إلى 70% لاجتياز الوحدة وفتح الوحدة التالية.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PLACEMENT TEST MODAL */}
      {placementOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/20 dark:border-[#3EF2DF]/35 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-white dark:bg-[#072B26] border-b border-[#0D4A42]/12 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#093D38] dark:text-white">
                  اختبار تحديد المستوى (Placement Assessment)
                </h3>
                <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                  تقييم تقديري داخلي للمفردات والقواعد والقراءة والاستماع (A1–B2)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlacementOpen(false)}
                className="p-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {placementResult ? (
                <div className="df-card rounded-2xl p-6 text-center space-y-3">
                  <GraduationCap className="w-10 h-10 text-[#C8962E] mx-auto" />
                  <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">المستوى المقترح لك بناءً على إجاباتك:</p>
                  <p className="text-4xl font-extrabold text-[#093D38] dark:text-[#7FF9EB] font-mono-num">
                    {placementResult.level}
                  </p>
                  <p className="text-sm font-semibold text-[#172320] dark:text-white">
                    أجبت بشكل صحيح على {placementResult.correctCount} من {placementResult.totalCount} ({placementResult.scorePct}%)
                  </p>
                  <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                    ملاحظة: هذا تقدير تعليمي داخلي لتهيئة مسارك داخل DeutschFlow وليس شهادة Goethe رسمية.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPlacementOpen(false)}
                    className="px-6 py-2.5 rounded-xl bg-[#093D38] dark:bg-[#E8C35A] text-white dark:text-[#041B18] text-xs font-bold cursor-pointer"
                  >
                    العودة للمسار
                  </button>
                </div>
              ) : (
                <>
                  {placementQuestions.map((q, idx) => (
                    <div key={q.id} className="df-card rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#B68934] dark:text-[#E8C35A]">
                          سؤال {idx + 1} · {q.cefrLevel} · {q.skill}
                        </span>
                        {q.listenTextDe && (
                          <button
                            type="button"
                            onClick={() => speakDe(q.listenTextDe || '')}
                            className="px-2.5 py-1 rounded-lg bg-[#D85A40] text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>استمع للنص</span>
                          </button>
                        )}
                      </div>
                      {q.passageDe && (
                        <p className="text-xs font-german bg-[#FAF7F0] dark:bg-[#041B18] p-2.5 rounded-xl" dir="ltr">
                          {q.passageDe}
                        </p>
                      )}
                      <p className="text-sm font-bold font-german" dir="ltr">{q.promptDe}</p>
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.promptAr}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oi) => (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => setPlacementAnswers((p) => ({ ...p, [q.id]: oi }))}
                            className={`px-3 py-2 rounded-xl border text-xs font-german text-start cursor-pointer ${
                              placementAnswers[q.id] === oi
                                ? 'bg-[#093D38] text-white border-[#093D38] dark:bg-[#E8C35A] dark:text-[#041B18]'
                                : 'bg-[#FAF7F0] dark:bg-[#041B18]'
                            }`}
                            dir="ltr"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={submittingPlacement}
                    onClick={() => void handleSubmitPlacement()}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E8C35A] to-[#C8962E] text-[#041B18] text-sm font-bold cursor-pointer"
                  >
                    {submittingPlacement ? 'جارٍ التحليل...' : 'عرض المستوى التقديري'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
