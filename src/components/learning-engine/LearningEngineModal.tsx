import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  CheckCircle2,
  Flag,
  GraduationCap,
  Headphones,
  Layers,
  Loader2,
  PenLine,
  Plus,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useUserData } from '../../context/UserDataContext';
import {
  analyzeSentenceViaEngine,
  evaluateWritingViaEngine,
  generateLearningEngineCourse,
  reportLearningEngineError,
} from '../../services/api';
import type {
  LearningDifficulty,
  LearningLesson,
  SentenceAnalysisResult,
  UserMistake,
  WritingEvaluationResult,
} from '../../types/media';

type EngineStep =
  | 'overview'
  | 'vocab'
  | 'grammar'
  | 'expressions'
  | 'sentences'
  | 'reading'
  | 'listening'
  | 'writing'
  | 'quiz';

function speakDe(text: string) {
  if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'de-DE';
  utt.rate = 0.92;
  window.speechSynthesis.speak(utt);
}

export const LearningEngineModal: React.FC = () => {
  const { lang } = usePreferences();
  const {
    learningEngineInput,
    closeLearningEngine,
    addRichVocabItems,
    completeLearningEngineCourseClient,
    learnerProfile,
  } = useUserData();

  const [difficulty, setDifficulty] = useState<LearningDifficulty>('original');
  const [lesson, setLesson] = useState<LearningLesson | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState<EngineStep>('overview');

  // Saved word tracking
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);

  // Interactive Grammar / Comprehension / Final Quiz answers
  const [grammarAnswers, setGrammarAnswers] = useState<Record<number, number>>({});
  const [readingAnswers, setReadingAnswers] = useState<Record<string, string>>({});
  const [listeningAnswers, setListeningAnswers] = useState<Record<string, string>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScorePct, setQuizScorePct] = useState<number | null>(null);

  // Sentence Analyzer state
  const [selectedSentenceIdx, setSelectedSentenceIdx] = useState<number>(0);
  const [customSentence, setCustomSentence] = useState('');
  const [customAnalysis, setCustomAnalysis] = useState<SentenceAnalysisResult | null>(null);
  const [analyzingSentence, setAnalyzingSentence] = useState(false);
  const [sentenceError, setSentenceError] = useState('');

  // Writing Evaluator state
  const [writingText, setWritingText] = useState('');
  const [evaluatingWriting, setEvaluatingWriting] = useState(false);
  const [writingEval, setWritingEval] = useState<WritingEvaluationResult | null>(null);
  const [writingError, setWritingError] = useState('');

  // Report error drawer
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [reportSending, setReportSending] = useState(false);

  const loadCourse = async (diff: LearningDifficulty) => {
    if (!learningEngineInput) return;
    setLoading(true);
    setErrorMsg('');
    setLesson(null);
    setStep('overview');
    setSavedWords({});
    setGrammarAnswers({});
    setReadingAnswers({});
    setListeningAnswers({});
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScorePct(null);
    setCustomAnalysis(null);
    setWritingText('');
    setWritingEval(null);
    setWritingError('');
    try {
      const res = await generateLearningEngineCourse({
        ...learningEngineInput,
        difficulty: diff,
        targetCefr: learnerProfile?.cefrLevel || learningEngineInput.targetCefr,
      });
      setLesson(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر تحميل الدرس الذكي حالياً.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!learningEngineInput) {
      setLesson(null);
      return;
    }
    setDifficulty(learningEngineInput.difficulty || 'original');
    void loadCourse(learningEngineInput.difficulty || 'original');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learningEngineInput?.sourceId, learningEngineInput?.title]);

  if (!learningEngineInput) return null;

  const handleSaveSingleWord = async (
    word: string,
    meaningAr: string,
    exampleDe: string,
    opts?: {
      article?: string;
      plural?: string;
      lemma?: string;
      wordCategory?: 'noun' | 'verb' | 'adjective' | 'expression' | 'other';
      phonetic?: string;
      cefrLevel?: LearningLesson['overview']['cefrLevel'];
      exampleAr?: string;
      meaningEn?: string;
    }
  ) => {
    await addRichVocabItems([
      {
        word,
        translation: meaningAr,
        translationEn: opts?.meaningEn,
        sentence: exampleDe,
        sentenceTranslationAr: opts?.exampleAr,
        article: opts?.article,
        plural: opts?.plural,
        lemma: opts?.lemma || word,
        wordCategory: opts?.wordCategory || 'other',
        phonetic: opts?.phonetic,
        cefrLevel: opts?.cefrLevel || lesson?.overview.cefrLevel,
        sourceTitle: `${learningEngineInput.sourceName}: ${learningEngineInput.title}`,
        sourceUrl: learningEngineInput.sourceUrl,
      },
    ]);
    setSavedWords((prev) => ({ ...prev, [word]: true }));
  };

  const handleSaveAllVocab = async () => {
    if (!lesson || !lesson.importantVocabulary.length) return;
    setSavingAll(true);
    try {
      await addRichVocabItems(
        lesson.importantVocabulary.map((v) => ({
          word: v.word,
          translation: v.meaningAr,
          translationEn: v.meaningEn,
          sentence: v.exampleDe,
          sentenceTranslationAr: v.exampleAr,
          article: v.article,
          plural: v.plural,
          lemma: v.lemma || v.word,
          wordCategory: v.wordCategory,
          phonetic: v.phoneticHint,
          cefrLevel: v.cefrLevel || lesson.overview.cefrLevel,
          sourceTitle: `${learningEngineInput.sourceName}: ${learningEngineInput.title}`,
          sourceUrl: learningEngineInput.sourceUrl,
        }))
      );
      const next: Record<string, boolean> = {};
      for (const v of lesson.importantVocabulary) next[v.word] = true;
      setSavedWords((prev) => ({ ...prev, ...next }));
    } finally {
      setSavingAll(false);
    }
  };

  const handleAnalyzeCustomSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSentence.trim()) return;
    setAnalyzingSentence(true);
    setSentenceError('');
    try {
      const res = await analyzeSentenceViaEngine(customSentence.trim());
      setCustomAnalysis(res);
    } catch (err) {
      setSentenceError(err instanceof Error ? err.message : 'تعذر تحليل الجملة.');
    } finally {
      setAnalyzingSentence(false);
    }
  };

  const handleEvaluateWriting = async () => {
    if (!lesson || !writingText.trim()) return;
    setEvaluatingWriting(true);
    setWritingError('');
    try {
      const ev = await evaluateWritingViaEngine({
        promptDe: lesson.writingPractice.promptDe,
        userText: writingText,
        targetWords: lesson.writingPractice.targetWords,
        cefrLevel: lesson.overview.cefrLevel,
      });
      setWritingEval(ev);
    } catch (err) {
      setWritingError(err instanceof Error ? err.message : 'تعذر تقييم الكتابة.');
    } finally {
      setEvaluatingWriting(false);
    }
  };

  const handleSubmitFinalQuiz = async () => {
    if (!lesson || !lesson.finalQuiz.length) return;
    let correct = 0;
    const mistakes: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>> = [];

    for (const q of lesson.finalQuiz) {
      const chosen = quizAnswers[q.id];
      if (chosen === q.correctIndex) {
        correct += 1;
      } else {
        mistakes.push({
          category: q.skill === 'grammar' ? 'grammar' : q.skill === 'comprehension' ? 'comprehension' : 'vocabulary',
          promptDe: q.promptDe,
          expected: q.options[q.correctIndex] || '',
          userAnswer: typeof chosen === 'number' ? (q.options[chosen] || '—') : 'Unanswered',
          explanationAr: q.explanationAr,
          cefrLevel: lesson.overview.cefrLevel,
        });
      }
    }

    const score = Math.round((correct / lesson.finalQuiz.length) * 100);
    setQuizScorePct(score);
    setQuizSubmitted(true);

    try {
      await completeLearningEngineCourseClient({
        lessonId: lesson.lessonId,
        sourceTitle: lesson.overview.titleDe,
        cefrLevel: lesson.overview.cefrLevel,
        quizScorePct: score,
        mistakes,
      });
    } catch {
      // Offline non-blocking
    }
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim()) return;
    setReportSending(true);
    try {
      await reportLearningEngineError({
        lessonId: lesson?.lessonId || learningEngineInput.sourceId,
        sourceTitle: learningEngineInput.title,
        section: step,
        message: reportText.trim(),
      });
      setReportSent(true);
      setReportText('');
    } finally {
      setReportSending(false);
    }
  };

  const steps: Array<{ id: EngineStep; labelAr: string; labelEn: string }> = [
    { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview' },
    { id: 'vocab', labelAr: 'المفردات', labelEn: 'Vocabulary' },
    { id: 'grammar', labelAr: 'القواعد', labelEn: 'Grammar' },
    { id: 'expressions', labelAr: 'التعابير', labelEn: 'Expressions' },
    { id: 'sentences', labelAr: 'تحليل الجمل', labelEn: 'Sentences' },
    { id: 'reading', labelAr: 'فهم المقروء', labelEn: 'Reading' },
    { id: 'listening', labelAr: 'الاستماع', labelEn: 'Listening' },
    { id: 'writing', labelAr: 'الكتابة بالذكاء', labelEn: 'Writing AI' },
    { id: 'quiz', labelAr: 'الاختبار النهائي', labelEn: 'Final Test' },
  ];

  const writingWordCount = writingText.trim() ? writingText.trim().split(/\s+/).length : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={learningEngineInput.title}
    >
      <div className="bg-[#FAF7F0] dark:bg-[#041D1A] text-[#172320] dark:text-[#F4EFE3] w-full max-w-5xl rounded-3xl border border-[#0D4A42]/20 dark:border-[#3EF2DF]/30 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Banner Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#093D38] via-[#0D4A42] to-[#062B27] text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] text-[#E8C35A] font-semibold">
              <GraduationCap className="w-4 h-4" />
              <span>DeutschFlow Learning Engine · From Content to Fluency</span>
            </div>
            <h2 className="text-sm sm:text-lg font-bold font-german truncate mt-0.5" dir="ltr">
              {learningEngineInput.title}
            </h2>
            <p className="text-[11px] text-[#DFECE9] truncate">
              {learningEngineInput.sourceName} · {learningEngineInput.contentType}
              {lesson ? ` · ${lesson.overview.cefrLevel} · ~${lesson.overview.estimatedMinutes} min` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Difficulty Selector */}
            <div className="flex items-center bg-black/25 rounded-xl p-0.5 text-[11px] border border-white/15">
              {(
                [
                  { id: 'simplified', label: lang === 'ar' ? 'مبسّط' : 'Simplified' },
                  { id: 'original', label: lang === 'ar' ? 'أصلي' : 'Original' },
                  { id: 'advanced', label: lang === 'ar' ? 'متقدم' : 'Advanced' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setDifficulty(d.id);
                    void loadCourse(d.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer whitespace-nowrap transition-colors ${
                    difficulty === d.id ? 'bg-[#E8C35A] text-[#041B18]' : 'text-white/85 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setReportOpen((r) => !r);
                setReportSent(false);
              }}
              title="الإبلاغ عن خطأ تعليمي"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFE99E] cursor-pointer"
            >
              <Flag className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={closeLearningEngine}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Educational Error Inline Bar */}
        {reportOpen && (
          <form
            onSubmit={handleSendReport}
            className="px-4 sm:px-6 py-3 bg-[#D85A40]/12 border-b border-[#D85A40]/25 flex flex-wrap items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="اكتب ملاحظة حول خطأ في الترجمة أو القاعدة أو السؤال ليتم مراجعتها في لوحة الإدارة..."
              className="flex-1 min-w-[220px] px-3 py-1.5 rounded-xl bg-white dark:bg-[#05231F] border border-[#D85A40]/30 text-xs"
            />
            <button
              type="submit"
              disabled={reportSending || !reportText.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-[#D85A40] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {reportSending ? 'جارٍ الإرسال...' : reportSent ? 'تم استلام البلاغ' : 'إرسال البلاغ'}
            </button>
          </form>
        )}

        {/* Navigation Tabs */}
        {lesson && (
          <div className="px-4 sm:px-6 py-2.5 bg-white dark:bg-[#072B26] border-b border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 flex gap-1.5 overflow-x-auto shrink-0">
            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  step === s.id
                    ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                    : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#52615D] dark:text-[#CFE5E0] hover:bg-[#EFE8D8] dark:hover:bg-[#0B3C35]'
                }`}
              >
                {lang === 'ar' ? s.labelAr : s.labelEn}
              </button>
            ))}
          </div>
        )}

        {/* Main Scrollable Course Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-9 h-9 animate-spin text-[#C8962E]" />
              <p className="text-sm font-semibold text-[#093D38] dark:text-[#7FF9EB]">
                جارٍ تحويل المحتوى الألماني إلى درس تفاعلي متكامل...
              </p>
              <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] max-w-md">
                يستخرج المحرك المفردات الأساسية، القواعد في السياق، التعابير، تحليل الجمل، وأسئلة الفهم بالاعتماد على النص الحقيقي للمصدر فقط.
              </p>
            </div>
          ) : errorMsg ? (
            <div className="rounded-2xl bg-[#D85A40]/10 border border-[#D85A40]/30 p-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-[#D85A40] mx-auto" />
              <p className="text-sm font-semibold text-[#172320] dark:text-white">{errorMsg}</p>
              <button
                type="button"
                onClick={() => void loadCourse(difficulty)}
                className="px-4 py-2 rounded-xl bg-[#093D38] text-white text-xs font-semibold cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : lesson ? (
            <>
              {/* Source Transparency Notice */}
              {(lesson.sourceLimitationNoteAr || lesson.sourceLimitationNoteEn) && (
                <div className="rounded-xl bg-[#C8962E]/15 border border-[#C8962E]/35 px-4 py-2.5 text-xs text-[#6E4F12] dark:text-[#FBE8A6]">
                  {lang === 'ar' ? lesson.sourceLimitationNoteAr : lesson.sourceLimitationNoteEn}
                </div>
              )}

              {/* STEP 1: OVERVIEW */}
              {step === 'overview' && (
                <div className="space-y-4">
                  <div className="df-card rounded-2xl p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-[#C8962E]">
                          {lesson.overview.topicAr} · {lesson.overview.cefrLevel}
                        </span>
                        <h3 className="text-lg font-bold font-german text-[#093D38] dark:text-white mt-0.5" dir="ltr">
                          {lesson.overview.titleDe}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => speakDe(lesson.overview.summaryDe)}
                        className="px-3 py-1.5 rounded-xl bg-[#093D38] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>استمع للملخص بالألمانية</span>
                      </button>
                    </div>

                    <p className="text-sm font-german leading-relaxed text-[#172320] dark:text-[#F4EFE3]" dir="ltr" lang="de">
                      {lesson.overview.summaryDe}
                    </p>
                    <p className="text-sm leading-relaxed text-[#52615D] dark:text-[#CFE5E0] border-t border-[#0D4A42]/10 dark:border-[#3EF2DF]/20 pt-3">
                      {lesson.overview.summaryAr}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('vocab')}
                      className="df-card rounded-2xl p-4 text-start hover:border-[#C8962E] cursor-pointer"
                    >
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">المفردات المستخرجة</p>
                      <p className="text-xl font-bold font-mono-num text-[#093D38] dark:text-[#7FF9EB] mt-1">
                        {lesson.importantVocabulary.length}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('grammar')}
                      className="df-card rounded-2xl p-4 text-start hover:border-[#C8962E] cursor-pointer"
                    >
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">قواعد في السياق</p>
                      <p className="text-xl font-bold font-mono-num text-[#C8962E] mt-1">
                        {lesson.grammarInContext.length}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('sentences')}
                      className="df-card rounded-2xl p-4 text-start hover:border-[#C8962E] cursor-pointer"
                    >
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">جمل محللة</p>
                      <p className="text-xl font-bold font-mono-num text-[#D85A40] mt-1">
                        {lesson.sentenceAnalysisBank.length}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('quiz')}
                      className="df-card rounded-2xl p-4 text-start hover:border-[#C8962E] cursor-pointer"
                    >
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">أسئلة الاختبار</p>
                      <p className="text-xl font-bold font-mono-num text-[#093D38] dark:text-[#7FF9EB] mt-1">
                        {lesson.finalQuiz.length}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: IMPORTANT VOCABULARY + ONE-CLICK SAVE ALL */}
              {step === 'vocab' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-[#093D38] dark:text-[#E8C35A]">
                        المفردات الأساسية من هذا المحتوى ({lesson.importantVocabulary.length})
                      </h3>
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                        أضف أي كلمة أو جميع الكلمات مباشرة إلى بنك المفردات الذكي (My Vocabulary) للمراجعة المتباعدة SM-2.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={savingAll}
                      onClick={() => void handleSaveAllVocab()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8C35A] to-[#C8962E] text-[#041B18] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:brightness-105"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{savingAll ? 'جارٍ الحفظ...' : 'حفظ كل الكلمات المهمة'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {lesson.importantVocabulary.map((v) => {
                      const isSaved = Boolean(savedWords[v.word]);
                      return (
                        <article key={v.word} className="df-card rounded-2xl p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                                  {v.article ? `${v.article} ` : ''}
                                  {v.word}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => speakDe(v.article ? `${v.article} ${v.word}` : v.word)}
                                  className="p-1 rounded-lg bg-[#F7F3EA] dark:bg-[#041B18] text-[#093D38] dark:text-[#7FF9EB] cursor-pointer"
                                  title="نطق"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE] mt-0.5">
                                {v.wordCategory} · {v.cefrLevel}
                                {v.plural ? ` · Pl.: ${v.plural}` : ''}
                                {v.phoneticHint ? ` · (${v.phoneticHint})` : ''}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                void handleSaveSingleWord(v.word, v.meaningAr, v.exampleDe, {
                                  article: v.article,
                                  plural: v.plural,
                                  lemma: v.lemma,
                                  wordCategory: v.wordCategory,
                                  phonetic: v.phoneticHint,
                                  cefrLevel: v.cefrLevel,
                                  exampleAr: v.exampleAr,
                                  meaningEn: v.meaningEn,
                                })
                              }
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 ${
                                isSaved
                                  ? 'bg-[#093D38] text-[#7FF9EB]'
                                  : 'bg-[#D85A40] text-white hover:brightness-105'
                              }`}
                            >
                              {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                              <span>{isSaved ? 'في مفرداتي' : '+ أضف لمفرداتي'}</span>
                            </button>
                          </div>

                          <p className="text-sm font-semibold text-[#D85A40] dark:text-[#FF957E]">
                            {v.meaningAr}
                            {v.contextualMeaningAr && v.contextualMeaningAr !== v.meaningAr
                              ? ` · (${v.contextualMeaningAr})`
                              : ''}
                          </p>
                          <div className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] p-2.5 text-xs space-y-1">
                            <p className="font-german text-[#172320] dark:text-[#F4EFE3]" dir="ltr">
                              {v.exampleDe}
                            </p>
                            <p className="text-[#52615D] dark:text-[#9EC5BE]">{v.exampleAr}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 3: GRAMMAR IN CONTEXT */}
              {step === 'grammar' && (
                <div className="space-y-4">
                  {lesson.grammarInContext.map((g, idx) => {
                    const selectedIdx = grammarAnswers[idx];
                    return (
                      <div key={idx} className="df-card rounded-2xl p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-base font-bold text-[#093D38] dark:text-[#E8C35A]" dir="ltr">
                            {g.titleDe} — <span dir="rtl">{g.titleAr}</span>
                          </h3>
                          {g.structureFormula && (
                            <code className="px-2.5 py-1 rounded-lg bg-[#F7F3EA] dark:bg-[#041B18] text-xs font-mono-num text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                              {g.structureFormula}
                            </code>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed">{g.explanationAr}</p>
                        {g.reasonUsedAr && (
                          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                            لماذا استُخدمت هنا؟ {g.reasonUsedAr}
                          </p>
                        )}
                        <div className="space-y-1.5">
                          {g.examples.map((ex, i) => (
                            <div key={i} className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] px-3 py-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="font-german font-semibold" dir="ltr">
                                {ex.de}
                              </span>
                              <span className="text-[#52615D] dark:text-[#9EC5BE]">{ex.ar}</span>
                            </div>
                          ))}
                        </div>

                        {g.practiceQuestion?.options?.length > 0 && (
                          <div className="pt-3 border-t border-[#0D4A42]/12 dark:border-[#3EF2DF]/20 space-y-2">
                            <p className="text-xs font-bold text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                              تطبيق سريع: {g.practiceQuestion.prompt}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {g.practiceQuestion.options.map((opt, oIdx) => {
                                const picked = selectedIdx === oIdx;
                                const correct = oIdx === g.practiceQuestion.correctIndex;
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => setGrammarAnswers((p) => ({ ...p, [idx]: oIdx }))}
                                    className={`px-3 py-2 rounded-xl text-xs text-start font-german border cursor-pointer ${
                                      selectedIdx === undefined
                                        ? 'bg-white dark:bg-[#05231F] border-[#0D4A42]/15 dark:border-[#3EF2DF]/25'
                                        : correct
                                        ? 'bg-[#093D38] text-[#7FF9EB] border-[#3EF2DF]'
                                        : picked
                                        ? 'bg-[#D85A40]/20 text-[#D85A40] border-[#D85A40]'
                                        : 'opacity-65 bg-white dark:bg-[#05231F]'
                                    }`}
                                    dir="ltr"
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {selectedIdx !== undefined && (
                              <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                                {g.practiceQuestion.explanationAr}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 4: EXPRESSIONS */}
              {step === 'expressions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lesson.importantExpressions.map((exp, idx) => (
                    <article key={idx} className="df-card rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold text-[#C8962E] uppercase">
                            {exp.register}
                          </span>
                          <h4 className="text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                            {exp.expressionDe}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            void handleSaveSingleWord(exp.expressionDe, exp.meaningAr, exp.exampleDe, {
                              wordCategory: 'expression',
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            savedWords[exp.expressionDe]
                              ? 'bg-[#093D38] text-[#7FF9EB]'
                              : 'bg-[#D85A40] text-white'
                          }`}
                        >
                          {savedWords[exp.expressionDe] ? 'محفوظ' : '+ أضف لمفرداتي'}
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-[#D85A40] dark:text-[#FF957E]">
                        {exp.meaningAr}
                      </p>
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{exp.usageNoteAr}</p>
                      <div className="flex items-center justify-between gap-2 bg-[#F7F3EA] dark:bg-[#041B18] rounded-xl px-3 py-2 text-xs">
                        <span className="font-german" dir="ltr">
                          {exp.exampleDe}
                        </span>
                        <button
                          type="button"
                          onClick={() => speakDe(exp.exampleDe)}
                          className="p-1 text-[#093D38] dark:text-[#7FF9EB] cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* STEP 5: INTERACTIVE SENTENCE ANALYZER */}
              {step === 'sentences' && (
                <div className="space-y-4">
                  {/* Interactive Custom Sentence Analyzer */}
                  <form onSubmit={handleAnalyzeCustomSentence} className="df-card rounded-2xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-[#093D38] dark:text-[#E8C35A] flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>محلل الجمل الألمانية التفاعلي (Interactive Sentence Analyzer)</span>
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={customSentence}
                        onChange={(e) => setCustomSentence(e.target.value)}
                        placeholder="الصق أو اكتب أي جملة ألمانية لتحليل مفرداتها وأفعالها وحالاتها الإعرابية..."
                        dir="ltr"
                        className="flex-1 px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/18 dark:border-[#3EF2DF]/28 text-sm font-german"
                      />
                      <button
                        type="submit"
                        disabled={analyzingSentence || !customSentence.trim()}
                        className="px-4 py-2 rounded-xl bg-[#093D38] dark:bg-[#E8C35A] text-white dark:text-[#041B18] text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {analyzingSentence ? 'جارٍ التحليل...' : 'حلّل الجملة'}
                      </button>
                    </div>
                    {sentenceError && <p className="text-xs text-[#D85A40]">{sentenceError}</p>}
                    {customAnalysis && (
                      <div className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] p-4 space-y-2.5 text-xs">
                        <p className="font-bold text-sm text-[#093D38] dark:text-[#7FF9EB]">
                          {customAnalysis.translationAr}
                        </p>
                        <p><strong>البنية النحوية:</strong> {customAnalysis.grammarStructureAr}</p>
                        <p><strong>الفعل الأساسي:</strong> <span className="font-german" dir="ltr">{customAnalysis.verbIdentified}</span> · <strong>الحالات:</strong> {customAnalysis.caseAnalysisAr}</p>
                        <p><strong>ترتيب الجملة:</strong> {customAnalysis.wordOrderNoteAr}</p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {customAnalysis.wordByWord.map((w, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() =>
                                void handleSaveSingleWord(w.token, w.meaningAr, customAnalysis.sentenceDe, {
                                  lemma: w.lemma,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#072B26] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-start cursor-pointer hover:border-[#C8962E]"
                              title="اضغط للحفظ في مفرداتي"
                            >
                              <span className="font-german font-bold block" dir="ltr">{w.token}</span>
                              <span className="text-[10px] text-[#D85A40] block">{w.meaningAr} ({w.role})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </form>

                  {/* Pre-extracted Sentences From Source */}
                  {lesson.sentenceAnalysisBank.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {lesson.sentenceAnalysisBank.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedSentenceIdx(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                              selectedSentenceIdx === idx
                                ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                                : 'bg-white dark:bg-[#072B26] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25'
                            }`}
                          >
                            جملة {idx + 1}
                          </button>
                        ))}
                      </div>

                      {lesson.sentenceAnalysisBank[selectedSentenceIdx] && (
                        <div className="df-card rounded-2xl p-5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                              {lesson.sentenceAnalysisBank[selectedSentenceIdx].sentenceDe}
                            </p>
                            <button
                              type="button"
                              onClick={() => speakDe(lesson.sentenceAnalysisBank[selectedSentenceIdx].sentenceDe)}
                              className="p-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] cursor-pointer shrink-0"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-[#D85A40] dark:text-[#FF957E]">
                            {lesson.sentenceAnalysisBank[selectedSentenceIdx].translationAr}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            <div className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] p-3">
                              <strong>الفعل:</strong>{' '}
                              <span className="font-german" dir="ltr">
                                {lesson.sentenceAnalysisBank[selectedSentenceIdx].verbIdentified || '—'}
                              </span>
                            </div>
                            <div className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] p-3">
                              <strong>الحالات الإعرابية:</strong>{' '}
                              {lesson.sentenceAnalysisBank[selectedSentenceIdx].caseAnalysisAr || '—'}
                            </div>
                          </div>
                          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                            {lesson.sentenceAnalysisBank[selectedSentenceIdx].grammarNoteAr}{' '}
                            {lesson.sentenceAnalysisBank[selectedSentenceIdx].wordOrderNoteAr}
                          </p>
                          {lesson.sentenceAnalysisBank[selectedSentenceIdx].wordByWord.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {lesson.sentenceAnalysisBank[selectedSentenceIdx].wordByWord.map((w, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() =>
                                    void handleSaveSingleWord(
                                      w.token,
                                      w.meaningAr,
                                      lesson.sentenceAnalysisBank[selectedSentenceIdx].sentenceDe,
                                      { lemma: w.lemma }
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/12 dark:border-[#3EF2DF]/22 text-xs text-start cursor-pointer hover:border-[#C8962E]"
                                >
                                  <span className="font-german font-bold block" dir="ltr">{w.token}</span>
                                  <span className="text-[10px] text-[#52615D] dark:text-[#9EC5BE]">{w.meaningAr}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: READING COMPREHENSION */}
              {step === 'reading' && (
                <div className="space-y-4">
                  <div className="df-card rounded-2xl p-4 space-y-2">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-[#093D38] dark:text-[#E8C35A]">
                      <BookOpen className="w-4 h-4" />
                      <span>أسئلة فهم المقروء ({lesson.readingComprehension.length})</span>
                    </h3>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                      اختر الإجابة الصحيحة بناءً على النص الفعلي للمحتوى:
                    </p>
                  </div>
                  {lesson.readingComprehension.map((q) => {
                    const chosen = readingAnswers[q.id];
                    return (
                      <div key={q.id} className="df-card rounded-2xl p-4 space-y-2.5">
                        <p className="text-sm font-bold font-german" dir="ltr">{q.questionDe}</p>
                        <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.questionAr}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || ['Richtig', 'Falsch']).map((opt) => {
                            const isPicked = chosen === opt;
                            const isRight = opt === q.correctAnswer;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setReadingAnswers((p) => ({ ...p, [q.id]: opt }))}
                                className={`px-3 py-2 rounded-xl text-xs text-start font-german border cursor-pointer ${
                                  !chosen
                                    ? 'bg-[#F7F3EA] dark:bg-[#041B18] border-[#0D4A42]/15 dark:border-[#3EF2DF]/22'
                                    : isRight
                                    ? 'bg-[#093D38] text-[#7FF9EB] border-[#3EF2DF]'
                                    : isPicked
                                    ? 'bg-[#D85A40]/20 text-[#D85A40] border-[#D85A40]'
                                    : 'opacity-65 bg-[#F7F3EA] dark:bg-[#041B18]'
                                }`}
                                dir="ltr"
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {chosen && <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.explanationAr}</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 7: LISTENING COMPREHENSION */}
              {step === 'listening' && (
                <div className="space-y-4">
                  <div className="df-card rounded-2xl p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-[#093D38] dark:text-[#E8C35A] flex items-center gap-2">
                        <Headphones className="w-4 h-4" />
                        <span>التدريب السمعي (Listening Comprehension)</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => speakDe(lesson.listeningComprehension.transcriptExcerptDe)}
                        className="px-3.5 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>تشغيل المقطع الصوتي (de-DE)</span>
                      </button>
                    </div>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                      {lesson.listeningComprehension.noteAr}
                    </p>
                    <details className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] p-3 text-xs">
                      <summary className="cursor-pointer font-semibold text-[#093D38] dark:text-[#7FF9EB]">
                        إظهار النص المقروء (المقتبس من المصدر فقط)
                      </summary>
                      <p className="mt-2 font-german leading-relaxed" dir="ltr">
                        {lesson.listeningComprehension.transcriptExcerptDe}
                      </p>
                    </details>
                  </div>

                  {lesson.listeningComprehension.questions.map((q) => {
                    const chosen = listeningAnswers[q.id];
                    return (
                      <div key={q.id} className="df-card rounded-2xl p-4 space-y-2.5">
                        <p className="text-sm font-bold font-german" dir="ltr">{q.questionDe}</p>
                        <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.questionAr}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || ['Richtig', 'Falsch']).map((opt) => {
                            const isPicked = chosen === opt;
                            const isRight = opt === q.correctAnswer;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setListeningAnswers((p) => ({ ...p, [q.id]: opt }))}
                                className={`px-3 py-2 rounded-xl text-xs text-start font-german border cursor-pointer ${
                                  !chosen
                                    ? 'bg-[#F7F3EA] dark:bg-[#041B18] border-[#0D4A42]/15 dark:border-[#3EF2DF]/22'
                                    : isRight
                                    ? 'bg-[#093D38] text-[#7FF9EB] border-[#3EF2DF]'
                                    : isPicked
                                    ? 'bg-[#D85A40]/20 text-[#D85A40] border-[#D85A40]'
                                    : 'opacity-65 bg-[#F7F3EA] dark:bg-[#041B18]'
                                }`}
                                dir="ltr"
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {chosen && <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.explanationAr}</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* STEP 8: AI WRITING EVALUATOR */}
              {step === 'writing' && (
                <div className="df-card rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 text-base font-bold text-[#093D38] dark:text-[#E8C35A]">
                    <PenLine className="w-5 h-5" />
                    <span>تدريب الكتابة والتصحيح الفوري بالذكاء الاصطناعي</span>
                  </div>

                  <div className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] p-4 space-y-2">
                    <p className="text-sm font-bold font-german" dir="ltr">{lesson.writingPractice.promptDe}</p>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{lesson.writingPractice.promptAr}</p>
                    <p className="text-xs text-[#C8962E] font-semibold">
                      كلمات مقترحة للاستخدام: {lesson.writingPractice.targetWords.join(' · ')}
                    </p>
                  </div>

                  <textarea
                    rows={4}
                    value={writingText}
                    onChange={(e) => setWritingText(e.target.value)}
                    dir="ltr"
                    placeholder="Schreiben Sie Ihre deutsche Antwort hier..."
                    className="w-full px-4 py-3 rounded-2xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/18 dark:border-[#3EF2DF]/28 text-sm font-german"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono-num text-[#52615D] dark:text-[#9EC5BE]">
                      عدد الكلمات: {writingWordCount} / الهدف ~{lesson.writingPractice.minWords}
                    </span>
                    <button
                      type="button"
                      disabled={evaluatingWriting || writingWordCount < 4}
                      onClick={() => void handleEvaluateWriting()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8C35A] to-[#C8962E] text-[#041B18] text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      {evaluatingWriting ? 'جارٍ التقييم...' : 'قيّم كتابتي الآن'}
                    </button>
                  </div>

                  {writingError && (
                    <div className="rounded-xl bg-[#D85A40]/12 border border-[#D85A40]/30 p-3 text-xs text-[#D85A40]">
                      {writingError}
                    </div>
                  )}

                  {writingEval && (
                    <div className="rounded-2xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#3EF2DF]/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#093D38] dark:text-[#7FF9EB]">
                          التقييم: {writingEval.scorePct}%
                        </span>
                        <button
                          type="button"
                          onClick={() => speakDe(writingEval.correctedGerman)}
                          className="px-2.5 py-1 rounded-lg bg-[#093D38] text-white text-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>نطق النسخة المصححة</span>
                        </button>
                      </div>
                      <div className="rounded-xl bg-white dark:bg-[#072B26] p-3">
                        <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE] mb-1">الصياغة الألمانية المصححة:</p>
                        <p className="text-sm font-german font-semibold text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                          {writingEval.correctedGerman}
                        </p>
                      </div>
                      <p className="text-xs leading-relaxed">{writingEval.feedbackAr}</p>
                      {writingEval.grammarNotesAr.length > 0 && (
                        <ul className="text-xs space-y-1 text-[#52615D] dark:text-[#9EC5BE] list-disc ps-4">
                          {writingEval.grammarNotesAr.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      )}
                      {writingEval.vocabularyTipAr && (
                        <p className="text-xs text-[#C8962E] font-medium">{writingEval.vocabularyTipAr}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 9: FINAL QUIZ + COMPLETION */}
              {step === 'quiz' && (
                <div className="space-y-4">
                  {lesson.finalQuiz.map((q, qIdx) => {
                    const picked = quizAnswers[q.id];
                    return (
                      <div key={q.id} className="df-card rounded-2xl p-4 space-y-2.5">
                        <div className="text-[11px] font-semibold text-[#C8962E]">
                          سؤال {qIdx + 1} · {q.skill}
                        </div>
                        <p className="text-sm font-bold font-german" dir="ltr">{q.promptDe}</p>
                        <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.promptAr}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => {
                            const selected = picked === oIdx;
                            const correct = oIdx === q.correctIndex;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={quizSubmitted}
                                onClick={() => setQuizAnswers((p) => ({ ...p, [q.id]: oIdx }))}
                                className={`px-3 py-2 rounded-xl text-xs text-start font-german border cursor-pointer ${
                                  !quizSubmitted
                                    ? selected
                                      ? 'bg-[#093D38] text-white border-[#E8C35A]'
                                      : 'bg-[#F7F3EA] dark:bg-[#041B18] border-[#0D4A42]/15 dark:border-[#3EF2DF]/22'
                                    : correct
                                    ? 'bg-[#093D38] text-[#7FF9EB] border-[#3EF2DF]'
                                    : selected
                                    ? 'bg-[#D85A40]/20 text-[#D85A40] border-[#D85A40]'
                                    : 'opacity-65 bg-[#F7F3EA] dark:bg-[#041B18]'
                                }`}
                                dir="ltr"
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {quizSubmitted && (
                          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{q.explanationAr}</p>
                        )}
                      </div>
                    );
                  })}

                  <div className="df-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                    {quizSubmitted && quizScorePct !== null ? (
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-[#3EF2DF]" />
                        <div>
                          <p className="text-base font-bold text-[#093D38] dark:text-[#7FF9EB]">
                            النتيجة النهائية: {quizScorePct}%
                          </p>
                          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                            تم تسجيل إتمام الدرس وحفظ النقاط في ملفك التعليمي.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                        أكمل جميع الأسئلة واضغط لإنهاء الدرس والحصول على نقاط الخبرة Flow XP.
                      </p>
                    )}

                    {!quizSubmitted ? (
                      <button
                        type="button"
                        onClick={() => void handleSubmitFinalQuiz()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E8C35A] to-[#C8962E] text-[#041B18] text-xs font-bold cursor-pointer"
                      >
                        إنهاء الدرس وحساب النتيجة
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={closeLearningEngine}
                        className="px-5 py-2.5 rounded-xl bg-[#093D38] text-white text-xs font-bold cursor-pointer"
                      >
                        إغلاق والعودة
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
