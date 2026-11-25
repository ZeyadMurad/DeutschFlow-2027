import React, { useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, Sparkles, Volume2, X } from 'lucide-react';
import { useUserData } from '../../context/UserDataContext';
import type { UILanguage, UserMistake, VocabItem, VocabReviewRating } from '../../types/media';

export type PracticeExerciseMode =
  | 'sm2_srs'
  | 'de_to_ar'
  | 'ar_to_de'
  | 'select_article'
  | 'select_plural'
  | 'fill_missing_word'
  | 'match_pairs'
  | 'listen_identify'
  | 'complete_sentence';

interface VocabularyPracticeModalProps {
  lang: UILanguage;
  mode: PracticeExerciseMode | null;
  words: VocabItem[];
  onClose: () => void;
}

function speakDe(text: string) {
  if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'de-DE';
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const VocabularyPracticeModal: React.FC<VocabularyPracticeModalProps> = ({
  lang,
  mode,
  words,
  onClose,
}) => {
  const { reviewVocabWord, recordMistakes, logLearningActivity } = useUserData();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>>([]);
  const [finished, setFinished] = useState(false);

  // Match-pairs sub-state
  const [matchLeftPicked, setMatchLeftPicked] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);

  const deck = useMemo(() => {
    if (!mode) return [];
    if (mode === 'select_article') {
      return words.filter((w) => w.article && ['der', 'die', 'das'].includes(w.article.toLowerCase()));
    }
    if (mode === 'select_plural') {
      return words.filter((w) => Boolean(w.plural && w.plural.trim().length > 1));
    }
    if (mode === 'fill_missing_word' || mode === 'complete_sentence') {
      return words.filter((w) => w.sentence && w.sentence.toLowerCase().includes(w.word.toLowerCase()));
    }
    return words;
  }, [mode, words]);

  const activeDeck = deck.slice(0, 12);
  const current = activeDeck[index];

  const options = useMemo(() => {
    if (!current || !mode) return [];
    if (mode === 'select_article') return ['der', 'die', 'das'];
    if (mode === 'select_plural') {
      const right = current.plural || current.word;
      const pool = words
        .filter((w) => w.id !== current.id && w.plural)
        .map((w) => w.plural!)
        .slice(0, 3);
      while (pool.length < 3) {
        const fake = `die ${current.word}${pool.length === 0 ? 'e' : pool.length === 1 ? 'en' : 'er'}`;
        if (fake !== right && !pool.includes(fake)) pool.push(fake);
        else break;
      }
      return [right, ...pool].sort();
    }
    const others = words.filter((w) => w.id !== current.id).slice(0, 15);
    const distractors: string[] = [];
    for (const o of others) {
      const val = mode === 'de_to_ar' ? o.translation : o.word;
      if (val && val !== (mode === 'de_to_ar' ? current.translation : current.word) && !distractors.includes(val)) {
        distractors.push(val);
      }
      if (distractors.length >= 3) break;
    }
    const rightVal = mode === 'de_to_ar' ? current.translation : current.word;
    return [rightVal, ...distractors].sort();
  }, [current, mode, words]);

  const matchSet = useMemo(() => {
    const subset = activeDeck.slice(0, 5);
    const rightShuffled = [...subset].sort((a, b) => a.translation.localeCompare(b.translation));
    return { left: subset, right: rightShuffled };
  }, [activeDeck]);

  if (!mode) return null;

  const advance = async (wasCorrect?: boolean) => {
    const nextScore = wasCorrect ? score + 1 : score;
    if (wasCorrect) setScore(nextScore);

    if (index + 1 >= activeDeck.length) {
      setFinished(true);
      const pct = activeDeck.length > 0 ? Math.round((nextScore / activeDeck.length) * 100) : 100;
      if (mistakes.length > 0) await recordMistakes(mistakes);
      if (mode !== 'sm2_srs') {
        await logLearningActivity({
          type: 'quiz_completed',
          durationSeconds: Math.max(30, activeDeck.length * 12),
          scorePct: pct,
          skill: mode === 'select_article' || mode === 'select_plural' ? 'grammar' : 'vocabulary',
          sourceTitle: `Vocab Practice (${mode})`,
        });
      }
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
      setSelectedOpt(null);
      setTypedAnswer('');
    }
  };

  const handleSm2Rate = async (rating: VocabReviewRating) => {
    if (!current || submitting) return;
    setSubmitting(true);
    try {
      await reviewVocabWord(current.id, rating);
      await advance(rating !== 'again');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickOption = (opt: string) => {
    if (!current || selectedOpt) return;
    setSelectedOpt(opt);
    const expected =
      mode === 'de_to_ar'
        ? current.translation
        : mode === 'select_article'
        ? (current.article || '').toLowerCase()
        : mode === 'select_plural'
        ? current.plural || ''
        : current.word;

    const ok = opt.trim().toLowerCase() === expected.trim().toLowerCase();
    if (!ok) {
      setMistakes((prev) => [
        ...prev,
        {
          category: mode === 'select_article' ? 'article' : mode === 'select_plural' ? 'plural' : 'vocabulary',
          promptDe: current.word,
          expected,
          userAnswer: opt,
          explanationAr: current.sentence,
          cefrLevel: current.cefrLevel,
        },
      ]);
    }
  };

  const handleCheckTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || selectedOpt) return;
    const ok = typedAnswer.trim().toLowerCase() === current.word.trim().toLowerCase();
    setSelectedOpt(typedAnswer.trim() || '—');
    if (!ok) {
      setMistakes((prev) => [
        ...prev,
        {
          category: 'spelling',
          promptDe: current.sentence || current.translation,
          expected: current.word,
          userAnswer: typedAnswer.trim() || '—',
          explanationAr: current.translation,
          cefrLevel: current.cefrLevel,
        },
      ]);
    }
  };

  const maskedSentence =
    current && current.sentence
      ? current.sentence.replace(new RegExp(escapeRegExp(current.word), 'i'), '______')
      : '';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#FAF7F0] dark:bg-[#05231F] text-[#172320] dark:text-[#F4EFE3] w-full max-w-2xl rounded-3xl border border-[#0D4A42]/20 dark:border-[#3EF2DF]/30 shadow-2xl overflow-hidden my-auto">
        <div className="px-5 py-4 bg-[#093D38] text-white flex items-center justify-between">
          <div>
            <p className="text-[11px] text-[#E8C35A] font-semibold">
              {mode === 'sm2_srs'
                ? 'SM-2 Spaced Repetition'
                : lang === 'ar'
                ? 'تدريب تفاعلي من مفرداتك المحفوظة'
                : 'Interactive Vocabulary Practice'}
            </p>
            <h3 className="text-sm sm:text-base font-bold">
              {activeDeck.length > 0 && !finished
                ? `${index + 1} / ${activeDeck.length}`
                : lang === 'ar'
                ? 'جلسة التدريب'
                : 'Practice Session'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {activeDeck.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-[#52615D] dark:text-[#9EC5BE]">
                {mode === 'select_article'
                  ? 'لا توجد أسماء محفوظة بأداة تعريف (der / die / das) بعد. احفظ أسماء من المقالات أو بنك المفردات أولاً!'
                  : mode === 'select_plural'
                  ? 'لا توجد كلمات محفوظة بصيغة الجمع بعد.'
                  : mode === 'fill_missing_word' || mode === 'complete_sentence'
                  ? 'لا توجد كلمات محفوظة مع جملة سياقية مناسبة لهذا التمرين بعد.'
                  : 'احفظ 3 كلمات على الأقل للبدء بالتدريب.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-[#093D38] text-white text-xs font-semibold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          ) : finished ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[#3EF2DF] mx-auto" />
              <h4 className="text-xl font-bold text-[#093D38] dark:text-[#E8C35A]">
                أحسنت! اكتملت الجلسة
              </h4>
              <p className="text-sm">
                النتيجة: <strong className="font-mono-num">{score} / {activeDeck.length}</strong> (
                {Math.round((score / activeDeck.length) * 100)}%)
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIndex(0);
                    setScore(0);
                    setFinished(false);
                    setFlipped(false);
                    setSelectedOpt(null);
                    setMistakes([]);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/20 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة التمرين</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl bg-[#093D38] text-white text-xs font-bold cursor-pointer"
                >
                  إنهاء
                </button>
              </div>
            </div>
          ) : mode === 'match_pairs' ? (
            <div className="space-y-4">
              <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                صل كل كلمة ألمانية بمعناها العربي الصحيح ({matchedIds.length} / {matchSet.left.length}):
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  {matchSet.left.map((item) => {
                    const done = matchedIds.includes(item.id);
                    const active = matchLeftPicked === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={done}
                        onClick={() => setMatchLeftPicked(item.id)}
                        dir="ltr"
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-german font-bold border text-start cursor-pointer ${
                          done
                            ? 'bg-[#093D38]/20 text-[#093D38] dark:text-[#7FF9EB] border-[#3EF2DF]/30 opacity-60'
                            : active
                            ? 'bg-[#E8C35A] text-[#041B18] border-[#C8962E]'
                            : 'bg-white dark:bg-[#072B26] border-[#0D4A42]/15 dark:border-[#3EF2DF]/25'
                        }`}
                      >
                        {item.article ? `${item.article} ` : ''}
                        {item.word}
                      </button>
                    );
                  })}
                </div>
                <div className="space-y-2">
                  {matchSet.right.map((item) => {
                    const done = matchedIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={done || !matchLeftPicked}
                        onClick={() => {
                          if (matchLeftPicked === item.id) {
                            const nextMatched = [...matchedIds, item.id];
                            setMatchedIds(nextMatched);
                            setMatchLeftPicked(null);
                            if (nextMatched.length >= matchSet.left.length) {
                              setScore(matchSet.left.length);
                              setFinished(true);
                              void logLearningActivity({
                                type: 'quiz_completed',
                                durationSeconds: 45,
                                scorePct: 100,
                                skill: 'vocabulary',
                                sourceTitle: 'Match Pairs Exercise',
                              });
                            }
                          } else {
                            setMatchLeftPicked(null);
                          }
                        }}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-semibold border text-start cursor-pointer ${
                          done
                            ? 'bg-[#093D38]/20 border-[#3EF2DF]/30 opacity-60'
                            : 'bg-white dark:bg-[#072B26] border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 hover:border-[#C8962E]'
                        }`}
                      >
                        {item.translation}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : mode === 'sm2_srs' && current ? (
            <div className="space-y-4">
              <div
                onClick={() => setFlipped((f) => !f)}
                className="df-card rounded-2xl p-6 text-center space-y-3 cursor-pointer min-h-[210px] flex flex-col items-center justify-center"
              >
                <span className="text-[11px] font-semibold text-[#C8962E]">
                  {flipped ? 'الترجمة والسياق' : 'اضغط لقلب البطاقة'} · الفاصل الحالي: {current.intervalDays || 0} يوم
                </span>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                    {current.article ? `${current.article} ` : ''}
                    {current.word}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakDe(current.article ? `${current.article} ${current.word}` : current.word);
                    }}
                    className="p-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {flipped && (
                  <div className="space-y-2 pt-3 border-t border-[#0D4A42]/12 dark:border-[#3EF2DF]/20 w-full">
                    <p className="text-lg font-bold text-[#D85A40] dark:text-[#FF957E]">
                      {current.translation}
                    </p>
                    {current.sentence && (
                      <p className="text-xs font-german text-[#52615D] dark:text-[#CFE5E0]" dir="ltr">
                        {current.sentence}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {(
                  [
                    { id: 'again' as VocabReviewRating, label: 'Again', sub: '1 يوم', cls: 'bg-[#D85A40] text-white' },
                    { id: 'hard' as VocabReviewRating, label: 'Hard', sub: 'أقصر', cls: 'bg-[#C8962E] text-white' },
                    { id: 'good' as VocabReviewRating, label: 'Good', sub: 'متباعد', cls: 'bg-[#093D38] text-white' },
                    { id: 'easy' as VocabReviewRating, label: 'Easy', sub: 'ممتاز', cls: 'bg-[#127A6E] text-white' },
                  ] as const
                ).map((btn) => (
                  <button
                    key={btn.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSm2Rate(btn.id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold cursor-pointer ${btn.cls}`}
                  >
                    <span className="block">{btn.label}</span>
                    <span className="text-[10px] opacity-85">{btn.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : current ? (
            <div className="space-y-4">
              <div className="df-card rounded-2xl p-5 text-center space-y-2">
                {mode === 'listen_identify' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                      استمع إلى الكلمة الألمانية ثم اختر الكلمة الصحيحة:
                    </p>
                    <button
                      type="button"
                      onClick={() => speakDe(current.word)}
                      className="px-4 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>تشغيل النطق (de-DE)</span>
                    </button>
                  </div>
                ) : mode === 'fill_missing_word' || mode === 'complete_sentence' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#C8962E] font-semibold">
                      أكمل الجملة بالكلمة المناسبة (المعنى: {current.translation}):
                    </p>
                    <p className="text-base font-german font-semibold" dir="ltr">
                      {maskedSentence}
                    </p>
                  </div>
                ) : mode === 'ar_to_de' ? (
                  <div>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">اختر الكلمة الألمانية الصحيحة للمعنى:</p>
                    <p className="text-xl font-bold text-[#D85A40] dark:text-[#FF957E] mt-1">{current.translation}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                      {mode === 'select_article'
                        ? 'اختر أداة التعريف الصحيحة:'
                        : mode === 'select_plural'
                        ? 'اختر صيغة الجمع الصحيحة:'
                        : 'ما المعنى الصحيح لهذه الكلمة؟'}
                    </p>
                    <p className="text-2xl font-bold font-german text-[#093D38] dark:text-[#7FF9EB] mt-1" dir="ltr">
                      {current.word}
                    </p>
                  </div>
                )}
              </div>

              {mode === 'complete_sentence' ? (
                <form onSubmit={handleCheckTyped} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      dir="ltr"
                      placeholder="اكتب الكلمة الألمانية المفقودة..."
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#072B26] border border-[#0D4A42]/18 text-sm font-german"
                    />
                    <button
                      type="submit"
                      disabled={Boolean(selectedOpt)}
                      className="px-4 py-2 rounded-xl bg-[#093D38] text-white text-xs font-bold cursor-pointer"
                    >
                      تحقق
                    </button>
                  </div>
                  {selectedOpt && (
                    <div className="flex items-center justify-between text-xs">
                      <span>
                        الإجابة الصحيحة: <strong className="font-german" dir="ltr">{current.word}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void advance(selectedOpt.toLowerCase() === current.word.toLowerCase())
                        }
                        className="px-4 py-1.5 rounded-xl bg-[#E8C35A] text-[#041B18] font-bold cursor-pointer"
                      >
                        التالي
                      </button>
                    </div>
                  )}
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {options.map((opt) => {
                      const expected =
                        mode === 'de_to_ar'
                          ? current.translation
                          : mode === 'select_article'
                          ? (current.article || '').toLowerCase()
                          : mode === 'select_plural'
                          ? current.plural || ''
                          : current.word;
                      const picked = selectedOpt === opt;
                      const right = opt.trim().toLowerCase() === expected.trim().toLowerCase();
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={Boolean(selectedOpt)}
                          onClick={() => handlePickOption(opt)}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border text-start cursor-pointer ${
                            !selectedOpt
                              ? 'bg-white dark:bg-[#072B26] border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 hover:border-[#C8962E]'
                              : right
                              ? 'bg-[#093D38] text-[#7FF9EB] border-[#3EF2DF]'
                              : picked
                              ? 'bg-[#D85A40]/20 text-[#D85A40] border-[#D85A40]'
                              : 'opacity-65 bg-white dark:bg-[#072B26]'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {selectedOpt && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const expected =
                            mode === 'de_to_ar'
                              ? current.translation
                              : mode === 'select_article'
                              ? (current.article || '').toLowerCase()
                              : mode === 'select_plural'
                              ? current.plural || ''
                              : current.word;
                          void advance(selectedOpt.trim().toLowerCase() === expected.trim().toLowerCase());
                        }}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#E8C35A] to-[#C8962E] text-[#041B18] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>التالي</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
