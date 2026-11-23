import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  BookmarkPlus,
  Check,
  ExternalLink,
  Focus,
  Headphones,
  Heart,
  Languages,
  Loader2,
  Pause,
  Plus,
  Volume2,
  X,
} from 'lucide-react';
import type { DictionaryLookupResult, NewsArticle } from '../../types/media';
import { useUserData } from '../../context/UserDataContext';
import { useGlobalAudio } from '../players/GlobalAudioContext';
import { translateGermanOnDemand } from '../../services/api';

interface ArticleReaderModalProps {
  article: NewsArticle | null;
  onClose: () => void;
}

function cleanGermanToken(raw: string): string {
  return raw.replace(/^[„"«(\[\s']+|[.,!?;:»"')\]…\s']+$/g, '').trim();
}

function extractContextSentence(fullText: string, word: string): string {
  if (!fullText) return '';
  const sentences = fullText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lower = word.toLowerCase();
  const match = sentences.find((s) => s.toLowerCase().includes(lower));
  return match || fullText;
}

function providerLabel(provider: string): string {
  switch (provider) {
    case 'gemini':
      return 'المعجم الذكي السياقي';
    case 'local_lexicon':
    case 'local_glossary':
      return 'المعجم الألماني المدمج';
    case 'local_compound':
      return 'تحليل الكلمات المركبة';
    case 'mymemory+wiktionary':
      return 'MyMemory + Wiktionary';
    case 'mymemory':
      return 'MyMemory Dictionary';
    default:
      return provider;
  }
}

export const ArticleReaderModal: React.FC<ArticleReaderModalProps> = ({ article, onClose }) => {
  const { isFavorite, toggleFavorite, addVocab, recordHistory } = useUserData();
  const {
    mode,
    status,
    activeArticle,
    playbackRate,
    germanVoices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    playArticleAudio,
    togglePlayPause,
    setPlaybackRate,
  } = useGlobalAudio();

  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [focusMode, setFocusMode] = useState(false);

  // Interactive German dictionary & vocab saving
  const [selectedWord, setSelectedWord] = useState('');
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<string | null>(null);
  const [selectedSentence, setSelectedSentence] = useState('');
  const [translation, setTranslation] = useState('');
  const [lookupDetails, setLookupDetails] = useState<DictionaryLookupResult | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  React.useEffect(() => {
    if (article) {
      recordHistory({
        type: 'news',
        title: article.title,
        subtitle: article.sourceName,
        url: article.link,
      });
      setSelectedWord('');
      setSelectedTokenIndex(null);
      setSelectedSentence('');
      setTranslation('');
      setLookupDetails(null);
      setTranslateError('');
      setNoteInput('');
      setSavedNotice(false);
    }
  }, [article, recordHistory]);

  const titleTokens = useMemo(() => {
    if (!article) return [];
    return article.title.split(/(\s+)/);
  }, [article]);

  const bodyTokens = useMemo(() => {
    if (!article) return [];
    return article.excerpt.split(/(\s+)/);
  }, [article]);

  if (!article) return null;

  const isThisPlayingOriginal =
    mode === 'article_original' && activeArticle?.id === article.id && status === 'playing';
  const isThisPlayingTts =
    mode === 'article_tts' && activeArticle?.id === article.id && status === 'playing';
  const isThisActive =
    (mode === 'article_original' || mode === 'article_tts') && activeArticle?.id === article.id;

  const isFav = isFavorite('articles', article.id);
  const isReadLater = isFavorite('readLater', article.id);

  const fontSizeClass =
    fontSize === 'sm'
      ? 'text-base'
      : fontSize === 'md'
      ? 'text-lg'
      : fontSize === 'lg'
      ? 'text-xl'
      : 'text-2xl';

  const speakWordDe = (word: string) => {
    if (!word.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word);
    utt.lang = 'de-DE';
    utt.rate = 0.9;
    const chosen = germanVoices.find((v) => v.voiceURI === selectedVoiceURI) || germanVoices[0];
    if (chosen) utt.voice = chosen;
    window.speechSynthesis.speak(utt);
  };

  const performLookup = async (word: string, contextSentence: string) => {
    setTranslating(true);
    setTranslateError('');
    setSavedNotice(false);
    try {
      const res = await translateGermanOnDemand(word, 'ar', contextSentence);
      setLookupDetails(res);
      setTranslation(res.translation);
    } catch (e) {
      setLookupDetails(null);
      setTranslation('');
      setTranslateError(
        e instanceof Error
          ? e.message
          : 'تعذرت الترجمة الفورية حالياً. يمكنك إدخال المعنى يدوياً وحفظ الكلمة.'
      );
    } finally {
      setTranslating(false);
    }
  };

  const handleWordClick = (rawToken: string, tokenKey: string, sourceBlock: string) => {
    const cleaned = cleanGermanToken(rawToken);
    if (!cleaned || cleaned.length < 2) return;
    const context = extractContextSentence(sourceBlock, cleaned) || article.excerpt || article.title;
    setSelectedWord(cleaned);
    setSelectedTokenIndex(tokenKey);
    setSelectedSentence(context);
    void performLookup(cleaned, context);
  };

  const handleManualTranslate = () => {
    const word = cleanGermanToken(selectedWord);
    if (!word) return;
    const context =
      selectedSentence.trim() ||
      extractContextSentence(article.excerpt, word) ||
      article.title;
    setSelectedWord(word);
    setSelectedSentence(context);
    void performLookup(word, context);
  };

  const handleSaveVocab = () => {
    if (!selectedWord.trim()) return;
    addVocab({
      word: selectedWord.trim(),
      translation: translation.trim() || '—',
      sentence: selectedSentence.trim() || article.excerpt || article.title,
      sourceTitle: `${article.sourceName}: ${article.title}`,
      sourceUrl: article.link,
      note: noteInput.trim() || undefined,
      lemma: lookupDetails?.lemma,
      partOfSpeech: lookupDetails?.partOfSpeech,
      article: lookupDetails?.article,
      plural: lookupDetails?.plural,
    });
    setSavedNotice(true);
    setNoteInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
    >
      <div className="bg-[#FAF7F0] text-[#1A2421] w-full max-w-4xl rounded-2xl border border-[#0E4B4B]/20 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#093D38] text-[#F7F3EA]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-[#F7F3EA]/85 truncate">
              {article.sourceName} · {new Date(article.publishedAt).toLocaleString('de-DE')}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setFocusMode((f) => !f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer ${
                focusMode ? 'bg-[#C8962E] text-white' : 'bg-white/10 text-[#F7F3EA] hover:bg-white/20'
              }`}
              title="وضع التركيز"
            >
              <Focus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{focusMode ? 'إنهاء التركيز' : 'وضع التركيز'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audio & Reading Controls */}
        <div className="bg-white border-b border-[#0E4B4B]/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {article.audioUrl && (
              <button
                type="button"
                onClick={() =>
                  isThisPlayingOriginal ? togglePlayPause() : playArticleAudio(article, false)
                }
                className="px-3 py-1.5 rounded-xl bg-[#0E4B4B] text-white text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#093535] cursor-pointer"
              >
                {isThisPlayingOriginal ? <Pause className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                <span>تسجيل صوتي أصلي ({article.sourceName})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                isThisActive && mode === 'article_tts' ? togglePlayPause() : playArticleAudio(article, true)
              }
              className={`px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                isThisPlayingTts
                  ? 'bg-[#D85A40] text-white'
                  : 'bg-[#D85A40]/12 text-[#D85A40] hover:bg-[#D85A40]/20'
              }`}
            >
              {isThisPlayingTts ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>
                {isThisPlayingTts
                  ? 'إيقاف النطق الآلي'
                  : isThisActive && mode === 'article_tts'
                  ? 'استئناف النطق (de-DE)'
                  : 'استماع نطق آلي (de-DE TTS)'}
              </span>
            </button>

            <div className="flex items-center gap-1 bg-[#F7F3EA] rounded-lg px-2 py-1 text-xs">
              <span className="text-[#52615D]">السرعة:</span>
              {[0.75, 1, 1.25].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setPlaybackRate(r)}
                  className={`px-1.5 py-0.5 rounded font-mono-num cursor-pointer ${
                    playbackRate === r ? 'bg-[#0E4B4B] text-white' : 'text-[#1A2421]'
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>

            {germanVoices.length > 0 && (
              <select
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                aria-label="German TTS Voice"
                className="text-xs bg-[#F7F3EA] border border-[#0E4B4B]/15 rounded-lg px-2 py-1 max-w-[160px]"
              >
                {germanVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#F7F3EA] rounded-lg p-1 text-xs">
            {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setFontSize(sz)}
                className={`px-2 py-0.5 rounded font-medium cursor-pointer ${
                  fontSize === sz ? 'bg-[#0E4B4B] text-white' : 'text-[#52615D]'
                }`}
              >
                {sz.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Reading body */}
        <div className="p-5 sm:p-8 max-h-[75vh] overflow-y-auto space-y-6">
          <div className="max-w-2xl mx-auto space-y-4">
            {article.imageUrl && !focusMode && (
              <img
                src={article.imageUrl}
                alt={article.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-72 object-cover rounded-xl border border-[#0E4B4B]/10"
              />
            )}

            {/* Tappable German Headline */}
            <h2
              className="text-2xl sm:text-3xl font-editorial font-semibold text-[#1A2421] leading-snug"
              dir="ltr"
              lang="de"
            >
              {titleTokens.map((tok, i) => {
                if (/^\s+$/.test(tok)) return <React.Fragment key={i}>{tok}</React.Fragment>;
                const tKey = `title_${i}`;
                const active = selectedTokenIndex === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => handleWordClick(tok, tKey, article.title)}
                    className={`inline rounded-md px-0.5 transition-colors cursor-pointer text-start ${
                      active
                        ? 'bg-[#C8962E]/30 text-[#093D38] ring-1 ring-[#C8962E]'
                        : 'hover:bg-[#C8962E]/20'
                    }`}
                    title="اضغط لترجمة هذه الكلمة وحفظها"
                  >
                    {tok}
                  </button>
                );
              })}
            </h2>

            <div className="text-xs text-[#52615D] bg-[#EFE8D8]/75 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span>
                {article.audioUrl
                  ? 'الصوت المتاح: تسجيل صوتي أصلي من المصدر الرسمي'
                  : 'ملاحظة: يتم عرض المقتطف المتاح رسمياً من خلاصة RSS — اضغط على أي كلمة ألمانية للترجمة الفورية والحفظ.'}
              </span>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0E4B4B] font-semibold inline-flex items-center gap-1 hover:underline shrink-0"
              >
                <span>قراءة المقال الأصلي كاملاً</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Interactive German Prose (tap any word!) */}
            <p
              className={`${fontSizeClass} leading-relaxed text-[#1A2421] font-german select-text`}
              dir="ltr"
              lang="de"
            >
              {bodyTokens.map((tok, i) => {
                if (/^\s+$/.test(tok)) return <React.Fragment key={i}>{tok}</React.Fragment>;
                const tKey = `body_${i}`;
                const active = selectedTokenIndex === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => handleWordClick(tok, tKey, article.excerpt)}
                    className={`inline rounded-md px-0.5 transition-colors cursor-pointer text-start ${
                      active
                        ? 'bg-[#C8962E]/30 text-[#093D38] ring-1 ring-[#C8962E]'
                        : 'hover:bg-[#C8962E]/20 focus:bg-[#C8962E]/25'
                    }`}
                    title="اضغط لترجمة هذه الكلمة وحفظها"
                  >
                    {tok}
                  </button>
                );
              })}
            </p>

            {/* Upgraded Compact German Dictionary Panel */}
            {!focusMode && (
              <div className="bg-white rounded-2xl border border-[#0E4B4B]/18 shadow-sm p-4 sm:p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#0E4B4B]">
                    <Languages className="w-4 h-4 text-[#D85A40]" />
                    <span>المعجم الألماني المتكامل والترجمة السياقية</span>
                  </div>
                  {lookupDetails?.provider && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#F7F3EA] text-[#52615D] border border-[#0E4B4B]/10">
                      {providerLabel(lookupDetails.provider)}
                      {lookupDetails.cached ? ' · مخزن مؤقتاً' : ''}
                    </span>
                  )}
                </div>

                {/* Word Input + Translate + Speak */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={selectedWord}
                      onChange={(e) => setSelectedWord(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleManualTranslate();
                        }
                      }}
                      placeholder="اضغط على كلمة في النص أو اكتبها هنا..."
                      dir="ltr"
                      className="flex-1 px-3 py-2 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm font-german font-semibold text-[#093D38]"
                    />
                    {selectedWord.trim() && (
                      <button
                        type="button"
                        onClick={() => speakWordDe(selectedWord)}
                        aria-label="Pronounce selected word"
                        title="نطق الكلمة بالألمانية"
                        className="p-2.5 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-[#0E4B4B] hover:bg-[#EFE8D8] cursor-pointer shrink-0"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={translation}
                      onChange={(e) => setTranslation(e.target.value)}
                      placeholder="المعنى بالعربية..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm font-semibold text-[#1A2421]"
                    />
                    <button
                      type="button"
                      onClick={handleManualTranslate}
                      disabled={translating || !selectedWord.trim()}
                      className="px-3.5 py-2 rounded-xl bg-[#0E4B4B] text-white text-xs font-semibold hover:bg-[#093535] disabled:opacity-50 cursor-pointer shrink-0 inline-flex items-center gap-1.5"
                    >
                      {translating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ترجم'}
                    </button>
                  </div>
                </div>

                {/* Rich Lexical Breakdown Card */}
                {translating && (
                  <div className="flex items-center gap-2 text-xs text-[#52615D] bg-[#FAF7F0] rounded-xl px-3.5 py-2.5 border border-[#0E4B4B]/10">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0E4B4B]" />
                    <span>جارٍ تحليل الكلمة والبحث في المعجم...</span>
                  </div>
                )}

                {!translating && lookupDetails && (
                  <div className="bg-[#FAF7F0] rounded-xl border border-[#0E4B4B]/12 p-3.5 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <div>
                        <span className="text-[#52615D]">الكلمة المحددة: </span>
                        <strong className="font-german text-[#093D38]" dir="ltr">
                          {lookupDetails.word}
                        </strong>
                      </div>

                      {lookupDetails.lemma && (
                        <div>
                          <span className="text-[#52615D]">الأساس (Lemma): </span>
                          <strong className="font-german text-[#0E4B4B]" dir="ltr">
                            {lookupDetails.article ? `${lookupDetails.article} ` : ''}
                            {lookupDetails.lemma}
                          </strong>
                        </div>
                      )}

                      {lookupDetails.partOfSpeech && (
                        <div>
                          <span className="text-[#52615D]">نوع الكلمة: </span>
                          <span className="font-semibold text-[#1A2421]">{lookupDetails.partOfSpeech}</span>
                        </div>
                      )}

                      {lookupDetails.plural && (
                        <div>
                          <span className="text-[#52615D]">الجمع: </span>
                          <strong className="font-german text-[#0E4B4B]" dir="ltr">
                            {lookupDetails.plural}
                          </strong>
                        </div>
                      )}
                    </div>

                    {lookupDetails.explanation && (
                      <p className="text-[#1A2421] leading-relaxed border-t border-[#0E4B4B]/8 pt-2">
                        <BookOpen className="w-3.5 h-3.5 inline-block me-1.5 text-[#C8962E]" />
                        {lookupDetails.explanation}
                      </p>
                    )}

                    {lookupDetails.alternatives && lookupDetails.alternatives.length > 0 && (
                      <p className="text-[#52615D]">
                        معانٍ أخرى: <span className="text-[#1A2421] font-medium">{lookupDetails.alternatives.join(' · ')}</span>
                      </p>
                    )}
                  </div>
                )}

                {translateError && (
                  <p className="text-xs text-[#D85A40] bg-[#D85A40]/8 border border-[#D85A40]/20 rounded-xl px-3 py-2">
                    {translateError}
                  </p>
                )}

                {/* Original Context Sentence Preview */}
                {selectedSentence && selectedWord && (
                  <div className="text-xs bg-[#F7F3EA]/70 border border-[#0E4B4B]/10 rounded-xl px-3 py-2 space-y-0.5">
                    <span className="text-[11px] font-semibold text-[#52615D]">الجملة الأصلية (السياق):</span>
                    <p className="font-german text-[#1A2421] leading-relaxed" dir="ltr" lang="de">
                      {selectedSentence}
                    </p>
                  </div>
                )}

                {/* Note + Save Word + Full Context Sentence */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="ملاحظة شخصية اختيارية (مثال: جمع الكلمة أو تصريف الفعل)..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSaveVocab}
                    disabled={!selectedWord.trim()}
                    className="px-4 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-semibold hover:bg-[#c54d35] disabled:opacity-45 cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {savedNotice ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تم الحفظ في مفرداتي</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>حفظ الكلمة + الجملة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#0E4B4B]/10">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFavorite({ kind: 'articles', item: article })}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                    isFav
                      ? 'bg-[#D85A40] text-white border-[#D85A40]'
                      : 'bg-white text-[#0E4B4B] border-[#0E4B4B]/15'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                  <span>{isFav ? 'محفوظ في المفضلة' : 'حفظ في المفضلة'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleFavorite({ kind: 'readLater', item: article })}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                    isReadLater
                      ? 'bg-[#0E4B4B] text-white border-[#0E4B4B]'
                      : 'bg-white text-[#0E4B4B] border-[#0E4B4B]/15'
                  }`}
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>{isReadLater ? 'في قائمة القراءة لاحقاً' : 'اقرأ لاحقاً'}</span>
                </button>
              </div>

              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-[#0E4B4B] text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#093535]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح المقال الأصلي في {article.sourceName}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
