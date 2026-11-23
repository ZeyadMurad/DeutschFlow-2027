import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Layers,
  RotateCcw,
  Shuffle,
  Volume2,
} from 'lucide-react';
import { useUserData } from '../../context/UserDataContext';
import type { UILanguage, VocabItem } from '../../types/media';

interface FlashcardEngineProps {
  lang: UILanguage;
  onGoToVocab: () => void;
}

const LABELS: Record<
  UILanguage,
  {
    emptyTitle: string;
    emptyDesc: string;
    goAddWords: string;
    allCards: string;
    reviewOnly: string;
    shuffle: string;
    restart: string;
    tapToFlip: string;
    tapBack: string;
    translationLabel: string;
    contextLabel: string;
    noteLabel: string;
    sourceLabel: string;
    listenDe: string;
    needReview: string;
    known: string;
    prev: string;
    next: string;
    flip: string;
    roundCompleteTitle: string;
    roundCompleteDesc: string;
    masteredCount: string;
    reviewCount: string;
  }
> = {
  ar: {
    emptyTitle: 'لا توجد بطاقات مراجعة بعد',
    emptyDesc: 'احفظ كلمات ألمانية أثناء قراءة المقالات أو أضفها في تبويب «مفرداتي وجُملي» لتظهر هنا تلقائياً كبطاقات مراجعة تفاعلية.',
    goAddWords: 'إضافة مفردات الآن',
    allCards: 'كل البطاقات',
    reviewOnly: 'للمراجعة فقط',
    shuffle: 'خلط عشوائي',
    restart: 'إعادة الجلسة',
    tapToFlip: 'اضغط على البطاقة لإظهار الترجمة العربية وسياق الجملة',
    tapBack: 'اضغط للعودة إلى الكلمة الألمانية',
    translationLabel: 'الترجمة العربية',
    contextLabel: 'الجملة الأصلية (السياق)',
    noteLabel: 'ملاحظتك',
    sourceLabel: 'المصدر',
    listenDe: 'نطق الكلمة (de-DE)',
    needReview: 'أحتاج مراجعتها',
    known: 'أتقنتها',
    prev: 'السابق',
    next: 'التالي',
    flip: 'اقلب البطاقة',
    roundCompleteTitle: 'أحسنت! أتممت جولة المراجعة',
    roundCompleteDesc: 'يمكنك إعادة مراجعة الكلمات التي تحتاج تدريباً إضافياً أو البدء من جديد.',
    masteredCount: 'متقَنة',
    reviewCount: 'للمراجعة',
  },
  de: {
    emptyTitle: 'Noch keine Lernkarten vorhanden',
    emptyDesc: 'Speichere beim Lesen deutscher Artikel Wörter oder füge sie unter „Meine Vokabeln“ hinzu, um sie hier als Lernkarten zu üben.',
    goAddWords: 'Vokabeln hinzufügen',
    allCards: 'Alle Karten',
    reviewOnly: 'Nur Wiederholung',
    shuffle: 'Mischen',
    restart: 'Neu starten',
    tapToFlip: 'Klicken zum Umdrehen (Übersetzung & Kontextsatz)',
    tapBack: 'Klicken für die deutsche Vorderseite',
    translationLabel: 'Arabische Übersetzung',
    contextLabel: 'Originalsatz (Kontext)',
    noteLabel: 'Notiz',
    sourceLabel: 'Quelle',
    listenDe: 'Aussprache (de-DE)',
    needReview: 'Noch üben',
    known: 'Gewusst',
    prev: 'Zurück',
    next: 'Weiter',
    flip: 'Umdrehen',
    roundCompleteTitle: 'Runde abgeschlossen!',
    roundCompleteDesc: 'Du kannst jetzt gezielt die noch unsicheren Wörter wiederholen oder neu starten.',
    masteredCount: 'Gewusst',
    reviewCount: 'Wiederholen',
  },
  en: {
    emptyTitle: 'No flashcards yet',
    emptyDesc: 'Save German words while reading articles or add them in the Vocabulary tab to practice them here.',
    goAddWords: 'Add Vocabulary',
    allCards: 'All Cards',
    reviewOnly: 'Review Only',
    shuffle: 'Shuffle',
    restart: 'Restart',
    tapToFlip: 'Click card to reveal Arabic translation & context sentence',
    tapBack: 'Click to flip back to German word',
    translationLabel: 'Arabic Translation',
    contextLabel: 'Original Context Sentence',
    noteLabel: 'Note',
    sourceLabel: 'Source',
    listenDe: 'Pronounce (de-DE)',
    needReview: 'Review Again',
    known: 'Got It',
    prev: 'Previous',
    next: 'Next',
    flip: 'Flip Card',
    roundCompleteTitle: 'Study round complete!',
    roundCompleteDesc: 'Review the words marked for practice or start a fresh pass.',
    masteredCount: 'Known',
    reviewCount: 'To review',
  },
};

function renderHighlightedSentence(sentence: string, word: string): React.ReactNode {
  if (!sentence) return null;
  const cleanWord = word.trim();
  if (!cleanWord) return sentence;
  const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = sentence.split(regex);
  if (parts.length === 1) return sentence;
  return parts.map((part, i) =>
    part.toLowerCase() === cleanWord.toLowerCase() ? (
      <mark key={i} className="bg-[#B68934]/25 text-[#0E4B4B] font-semibold px-1 rounded">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

export const FlashcardEngine: React.FC<FlashcardEngineProps> = ({ lang, onGoToVocab }) => {
  const { data } = useUserData();
  const t = LABELS[lang];
  const isRtl = lang === 'ar';

  const [mode, setMode] = useState<'all' | 'review'>('all');
  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownIds, setKnownIds] = useState<string[]>([]);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [roundFinished, setRoundFinished] = useState(false);

  const deck: VocabItem[] = useMemo(() => {
    const base =
      mode === 'review' && reviewIds.length > 0
        ? data.vocabulary.filter((v) => reviewIds.includes(v.id))
        : data.vocabulary;

    if (!shuffledOrder) return base;
    const byId = new Map(base.map((v) => [v.id, v]));
    const ordered = shuffledOrder
      .map((id) => byId.get(id))
      .filter((v): v is VocabItem => Boolean(v));
    const orderedIds = new Set(ordered.map((v) => v.id));
    const remaining = base.filter((v) => !orderedIds.has(v.id));
    return [...ordered, ...remaining];
  }, [data.vocabulary, mode, reviewIds, shuffledOrder]);

  useEffect(() => {
    if (currentIndex >= deck.length && deck.length > 0) {
      setCurrentIndex(0);
      setIsFlipped(false);
    }
  }, [currentIndex, deck.length]);

  const currentCard = deck[currentIndex] || null;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (deck.length === 0) return;
    setIsFlipped(false);
    if (currentIndex + 1 >= deck.length) {
      setRoundFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, deck.length]);

  const handlePrev = useCallback(() => {
    if (deck.length === 0) return;
    setIsFlipped(false);
    setRoundFinished(false);
    setCurrentIndex((i) => (i > 0 ? i - 1 : deck.length - 1));
  }, [deck.length]);

  const handleMark = useCallback(
    (status: 'known' | 'review') => {
      if (!currentCard) return;
      if (status === 'known') {
        setKnownIds((prev) => (prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]));
        setReviewIds((prev) => prev.filter((id) => id !== currentCard.id));
      } else {
        setReviewIds((prev) => (prev.includes(currentCard.id) ? prev : [...prev, currentCard.id]));
        setKnownIds((prev) => prev.filter((id) => id !== currentCard.id));
      }
      handleNext();
    },
    [currentCard, handleNext]
  );

  const handleShuffle = () => {
    const ids = deck.map((v) => v.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setShuffledOrder(ids);
    setCurrentIndex(0);
    setIsFlipped(false);
    setRoundFinished(false);
  };

  const handleRestart = (nextMode: 'all' | 'review' = mode) => {
    setMode(nextMode);
    setCurrentIndex(0);
    setIsFlipped(false);
    setRoundFinished(false);
    if (nextMode === 'all') {
      setKnownIds([]);
    }
  };

  const handleSpeakWord = (e: React.MouseEvent, word: string) => {
    e.stopPropagation();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'de-DE';
    utt.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find((v) => v.lang.toLowerCase().startsWith('de'));
    if (deVoice) utt.voice = deVoice;
    window.speechSynthesis.speak(utt);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        !currentCard ||
        roundFinished
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        if (isRtl) handlePrev();
        else handleNext();
      } else if (e.code === 'ArrowLeft') {
        if (isRtl) handleNext();
        else handlePrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentCard, handleFlip, handleNext, handlePrev, isRtl, roundFinished]);

  if (data.vocabulary.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-8 sm:p-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-[#F7F3EA] border border-[#0E4B4B]/12 flex items-center justify-center mx-auto text-[#0E4B4B]">
          <Layers className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h2 className="text-lg font-semibold text-[#0E4B4B]">{t.emptyTitle}</h2>
          <p className="text-sm text-[#52615D] leading-relaxed">{t.emptyDesc}</p>
        </div>
        <button
          type="button"
          onClick={onGoToVocab}
          className="px-5 py-2.5 rounded-xl bg-[#0E4B4B] text-white text-xs font-semibold hover:bg-[#093535] cursor-pointer"
        >
          {t.goAddWords}
        </button>
      </div>
    );
  }

  const progressPct = deck.length > 0 ? Math.round(((currentIndex + 1) / deck.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleRestart('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              mode === 'all'
                ? 'bg-[#0E4B4B] text-white'
                : 'bg-[#F7F3EA] text-[#1A2421] hover:bg-[#EFE8D8]'
            }`}
          >
            {t.allCards} (<span className="font-mono-num">{data.vocabulary.length}</span>)
          </button>

          <button
            type="button"
            disabled={reviewIds.length === 0}
            onClick={() => handleRestart('review')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-45 ${
              mode === 'review'
                ? 'bg-[#D85A40] text-white'
                : 'bg-[#F7F3EA] text-[#1A2421] hover:bg-[#EFE8D8]'
            }`}
          >
            {t.reviewOnly} (<span className="font-mono-num">{reviewIds.length}</span>)
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#0E4B4B] font-medium font-mono-num">
            {t.masteredCount}: {knownIds.length}
          </span>
          <span aria-hidden="true" className="text-[#52615D]">·</span>
          <span className="text-[#D85A40] font-medium font-mono-num">
            {t.reviewCount}: {reviewIds.length}
          </span>

          <button
            type="button"
            onClick={handleShuffle}
            className="ms-2 px-3 py-1.5 rounded-lg bg-[#F7F3EA] text-[#0E4B4B] hover:bg-[#EFE8D8] font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>{t.shuffle}</span>
          </button>

          <button
            type="button"
            onClick={() => handleRestart(mode)}
            className="px-3 py-1.5 rounded-lg bg-[#F7F3EA] text-[#0E4B4B] hover:bg-[#EFE8D8] font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.restart}</span>
          </button>
        </div>
      </div>

      {/* Round Complete State */}
      {roundFinished ? (
        <div className="bg-white rounded-2xl border border-[#0E4B4B]/15 p-8 sm:p-10 text-center space-y-4">
          <CheckCircle2 className="w-11 h-11 text-[#0E4B4B] mx-auto" />
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-xl font-editorial font-semibold text-[#0E4B4B]">
              {t.roundCompleteTitle}
            </h3>
            <p className="text-sm text-[#52615D]">{t.roundCompleteDesc}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {reviewIds.length > 0 && (
              <button
                type="button"
                onClick={() => handleRestart('review')}
                className="px-5 py-2.5 rounded-xl bg-[#D85A40] text-white text-xs font-semibold hover:bg-[#c54d35] cursor-pointer"
              >
                {t.reviewOnly} ({reviewIds.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => handleRestart('all')}
              className="px-5 py-2.5 rounded-xl bg-[#0E4B4B] text-white text-xs font-semibold hover:bg-[#093535] cursor-pointer"
            >
              {t.restart}
            </button>
          </div>
        </div>
      ) : currentCard ? (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Progress indicator */}
          <div className="flex items-center gap-3 text-xs text-[#52615D]">
            <span className="font-mono-num font-semibold text-[#0E4B4B]">
              {currentIndex + 1} / {deck.length}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-[#EFE8D8] overflow-hidden">
              <div
                className="h-full bg-[#0E4B4B] transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Interactive Flashcard */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleFlip}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleFlip();
              }
            }}
            aria-label={isFlipped ? t.tapBack : t.tapToFlip}
            className="df-card rounded-3xl p-6 sm:p-10 min-h-[290px] flex flex-col justify-between cursor-pointer select-none border-[#0E4B4B]/18 hover:border-[#0E4B4B]/40"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#52615D]">
                {isFlipped ? t.translationLabel : 'Deutsch'}
              </span>

              <button
                type="button"
                onClick={(e) => handleSpeakWord(e, currentCard.word)}
                className="px-3 py-1.5 rounded-xl bg-[#F7F3EA] text-[#0E4B4B] hover:bg-[#EFE8D8] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                title={t.listenDe}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>de-DE</span>
              </button>
            </div>

            {!isFlipped ? (
              /* FRONT: German word */
              <div className="my-auto py-8 text-center space-y-3">
                <p
                  className="text-3xl sm:text-4xl font-editorial font-bold text-[#0E4B4B] font-german break-words"
                  dir="ltr"
                  lang="de"
                >
                  {currentCard.word}
                </p>
              </div>
            ) : (
              /* BACK: Arabic translation + Original Context Sentence */
              <div className="my-auto py-4 space-y-4 text-center">
                <div>
                  <p
                    className="text-sm font-semibold text-[#52615D] font-german mb-1"
                    dir="ltr"
                    lang="de"
                  >
                    {currentCard.article ? `${currentCard.article} ` : ''}
                    {currentCard.word}
                    {currentCard.plural ? ` (${currentCard.plural})` : ''}
                  </p>
                  {currentCard.partOfSpeech && (
                    <p className="text-[11px] text-[#52615D] mb-1">{currentCard.partOfSpeech}</p>
                  )}
                  <p className="text-2xl sm:text-3xl font-bold text-[#D85A40]">
                    {currentCard.translation}
                  </p>
                </div>

                {currentCard.sentence && (
                  <div className="bg-[#FAF7F0] border border-[#0E4B4B]/10 rounded-2xl p-4 text-start space-y-1">
                    <p className="text-[11px] font-semibold text-[#52615D]">{t.contextLabel}</p>
                    <p
                      className="text-sm sm:text-base text-[#1A2421] leading-relaxed font-german"
                      dir="ltr"
                      lang="de"
                    >
                      {renderHighlightedSentence(currentCard.sentence, currentCard.word)}
                    </p>
                  </div>
                )}

                {(currentCard.note || currentCard.sourceTitle) && (
                  <div className="text-xs text-[#52615D] flex flex-wrap items-center justify-center gap-2 pt-1">
                    {currentCard.note && (
                      <span>
                        {t.noteLabel}: <strong className="text-[#1A2421]">{currentCard.note}</strong>
                      </span>
                    )}
                    {currentCard.note && currentCard.sourceTitle && <span aria-hidden="true">·</span>}
                    {currentCard.sourceTitle && (
                      <span className="inline-flex items-center gap-1">
                        {t.sourceLabel}: {currentCard.sourceTitle}
                        {currentCard.sourceUrl && (
                          <a
                            href={currentCard.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#0E4B4B] hover:underline inline-flex items-center"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            <p className="text-[11px] text-[#52615D] text-center">
              {isFlipped ? t.tapBack : t.tapToFlip}
            </p>
          </div>

          {/* Card Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-[#0E4B4B]/15 text-[#0E4B4B] hover:bg-[#F7F3EA] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{t.prev}</span>
              </button>

              <button
                type="button"
                onClick={handleFlip}
                className="px-4 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-[#0E4B4B] hover:bg-[#EFE8D8] text-xs font-semibold cursor-pointer"
              >
                {t.flip}
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-[#0E4B4B]/15 text-[#0E4B4B] hover:bg-[#F7F3EA] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{t.next}</span>
                {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMark('review')}
                className="px-4 py-2.5 rounded-xl bg-[#D85A40]/12 text-[#D85A40] hover:bg-[#D85A40]/20 text-xs font-semibold cursor-pointer"
              >
                {t.needReview}
              </button>
              <button
                type="button"
                onClick={() => handleMark('known')}
                className="px-4 py-2.5 rounded-xl bg-[#0E4B4B] text-white hover:bg-[#093535] text-xs font-semibold cursor-pointer"
              >
                {t.known}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
