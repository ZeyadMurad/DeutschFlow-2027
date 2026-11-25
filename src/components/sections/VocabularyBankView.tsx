import React, { useMemo, useState } from 'react';
import {
  Brain,
  ExternalLink,
  FolderPlus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react';
import { useUserData } from '../../context/UserDataContext';
import type {
  CEFRLevel,
  UILanguage,
  VocabMasteryStatus,
  WordCategory,
} from '../../types/media';
import {
  VocabularyPracticeModal,
  type PracticeExerciseMode,
} from './VocabularyPracticeModal';

interface VocabularyBankViewProps {
  lang: UILanguage;
}

function speakDe(text: string) {
  if (!text.trim() || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'de-DE';
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}

const DEFAULT_COLLECTIONS = ['Daily Life', 'News', 'Travel', 'Medical', 'Work'];

export const VocabularyBankView: React.FC<VocabularyBankViewProps> = ({ lang }) => {
  const {
    data,
    learnerProfile,
    addVocab,
    updateVocabCollections,
    removeVocab,
  } = useUserData();

  const vocabList = learnerProfile?.vocabulary?.length
    ? learnerProfile.vocabulary
    : data.vocabulary;

  const [search, setSearch] = useState('');
  const [cefrFilter, setCefrFilter] = useState<'all' | CEFRLevel>('all');
  const [catFilter, setCatFilter] = useState<'all' | WordCategory>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | VocabMasteryStatus | 'due'>('all');
  const [collectionFilter, setCollectionFilter] = useState<string>('all');

  // Rich manual word entry
  const [word, setWord] = useState('');
  const [article, setArticle] = useState('');
  const [plural, setPlural] = useState('');
  const [translation, setTranslation] = useState('');
  const [sentence, setSentence] = useState('');
  const [wordCat, setWordCat] = useState<WordCategory>('noun');
  const [cefr, setCefr] = useState<CEFRLevel>('A2');
  const [collectionInput, setCollectionInput] = useState('');

  // Practice modal
  const [practiceMode, setPracticeMode] = useState<PracticeExerciseMode | null>(null);
  const [collectionEditId, setCollectionEditId] = useState<string | null>(null);
  const [newColTag, setNewColTag] = useState('');

  const nowMs = Date.now();
  const dueWords = useMemo(
    () =>
      vocabList.filter((v) => !v.nextReviewAt || new Date(v.nextReviewAt).getTime() <= nowMs),
    [vocabList, nowMs]
  );

  const allCollections = useMemo(() => {
    const s = new Set<string>(DEFAULT_COLLECTIONS);
    for (const v of vocabList) {
      for (const c of v.collections || []) s.add(c);
    }
    return Array.from(s);
  }, [vocabList]);

  const filtered = useMemo(() => {
    return vocabList.filter((v) => {
      if (cefrFilter !== 'all' && v.cefrLevel !== cefrFilter) return false;
      if (catFilter !== 'all' && (v.wordCategory || 'other') !== catFilter) return false;
      if (statusFilter === 'due') {
        if (v.nextReviewAt && new Date(v.nextReviewAt).getTime() > nowMs) return false;
      } else if (statusFilter !== 'all' && (v.status || 'new') !== statusFilter) {
        return false;
      }
      if (collectionFilter !== 'all' && !(v.collections || []).includes(collectionFilter)) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${v.word} ${v.translation} ${v.sentence} ${v.lemma || ''} ${v.note || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [vocabList, cefrFilter, catFilter, statusFilter, collectionFilter, search, nowMs]);

  const handleAddRich = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
    addVocab({
      word: word.trim(),
      article: article.trim() || undefined,
      plural: plural.trim() || undefined,
      translation: translation.trim() || '—',
      sentence: sentence.trim(),
      wordCategory: wordCat,
      cefrLevel: cefr,
      collections: collectionInput.trim() ? [collectionInput.trim()] : [],
      sourceTitle: lang === 'ar' ? 'إضافة شخصية' : 'Personal Entry',
    });
    setWord('');
    setArticle('');
    setPlural('');
    setTranslation('');
    setSentence('');
    setCollectionInput('');
  };

  const practiceButtons: Array<{ id: PracticeExerciseMode; labelAr: string; labelEn: string }> = [
    { id: 'de_to_ar', labelAr: 'ألماني ← عربي', labelEn: 'DE → AR' },
    { id: 'ar_to_de', labelAr: 'عربي ← ألماني', labelEn: 'AR → DE' },
    { id: 'select_article', labelAr: 'أداة التعريف (der/die/das)', labelEn: 'Select Article' },
    { id: 'select_plural', labelAr: 'صيغة الجمع', labelEn: 'Select Plural' },
    { id: 'fill_missing_word', labelAr: 'املأ الفراغ', labelEn: 'Fill Missing' },
    { id: 'match_pairs', labelAr: 'مطابقة الأزواج', labelEn: 'Match Pairs' },
    { id: 'listen_identify', labelAr: 'استمع وحدد', labelEn: 'Listen & Pick' },
    { id: 'complete_sentence', labelAr: 'أكمل كتابةً', labelEn: 'Type Missing' },
  ];

  return (
    <div className="space-y-5">
      {/* SM-2 + 8 Practice Modes Bar */}
      <div className="df-card rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#093D38] dark:text-[#E8C35A] flex items-center gap-2">
              <Brain className="w-4 h-4 text-[#C8962E]" />
              <span>بنك المفردات الذكي والمراجعة المتباعدة (SM-2)</span>
            </h3>
            <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
              إجمالي الكلمات: <strong className="font-mono-num">{vocabList.length}</strong> · مستحقة للمراجعة اليوم:{' '}
              <strong className="font-mono-num text-[#D85A40]">{dueWords.length}</strong> · متقَنة:{' '}
              <strong className="font-mono-num text-[#093D38] dark:text-[#7FF9EB]">
                {vocabList.filter((v) => v.status === 'mastered').length}
              </strong>
            </p>
          </div>

          <button
            type="button"
            disabled={dueWords.length === 0 && vocabList.length === 0}
            onClick={() => setPracticeMode('sm2_srs')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8C35A] to-[#C8962E] text-[#041B18] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>بدء مراجعة SM-2 ({dueWords.length || vocabList.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#0D4A42]/10 dark:border-[#3EF2DF]/18">
          {practiceButtons.map((pb) => (
            <button
              key={pb.id}
              type="button"
              disabled={vocabList.length === 0}
              onClick={() => setPracticeMode(pb.id)}
              className="px-3 py-1.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/22 text-xs font-semibold text-[#093D38] dark:text-[#7FF9EB] hover:border-[#C8962E] cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {lang === 'ar' ? pb.labelAr : pb.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Add Rich Vocabulary Form */}
      <form onSubmit={handleAddRich} className="df-card rounded-2xl p-4 sm:p-5 space-y-3">
        <h4 className="text-xs font-bold text-[#093D38] dark:text-[#E8C35A]">
          + أضف كلمة ألمانية جديدة إلى مفرداتي (Add to My Vocabulary)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <input
            type="text"
            value={article}
            onChange={(e) => setArticle(e.target.value)}
            placeholder="der/die/das"
            dir="ltr"
            className="px-2.5 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs font-german"
          />
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="الكلمة الألمانية*"
            dir="ltr"
            required
            className="px-2.5 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs font-german"
          />
          <input
            type="text"
            value={plural}
            onChange={(e) => setPlural(e.target.value)}
            placeholder="الجمع (Pl.)"
            dir="ltr"
            className="px-2.5 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs font-german"
          />
          <input
            type="text"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="المعنى بالعربية"
            className="px-2.5 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs"
          />
          <select
            value={wordCat}
            onChange={(e) => setWordCat(e.target.value as WordCategory)}
            className="px-2.5 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs"
          >
            <option value="noun">اسم (Nomen)</option>
            <option value="verb">فعل (Verb)</option>
            <option value="adjective">صفة (Adjektiv)</option>
            <option value="expression">تعبير (Ausdruck)</option>
            <option value="other">أخرى</option>
          </select>
          <select
            value={cefr}
            onChange={(e) => setCefr(e.target.value as CEFRLevel)}
            className="px-2.5 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs"
          >
            {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={collectionInput}
            onChange={(e) => setCollectionInput(e.target.value)}
            placeholder="مجموعة (مثال: Travel)"
            className="px-2.5 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="جملة سياق ألمانية..."
            dir="ltr"
            className="flex-1 px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs font-german"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ أضف إلى مفرداتي</span>
          </button>
        </div>
      </form>

      {/* Multi-Faceted Filter Bar */}
      <div className="df-card rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#52615D] absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في الكلمات، الترجمة أو الجمل..."
              className="w-full ps-9 pe-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs"
            />
          </div>
          <select
            value={cefrFilter}
            onChange={(e) => setCefrFilter(e.target.value as 'all' | CEFRLevel)}
            className="px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs"
          >
            <option value="all">كل مستويات CEFR</option>
            {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as CEFRLevel[]).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value as 'all' | WordCategory)}
            className="px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs"
          >
            <option value="all">كل التصنيفات</option>
            <option value="noun">الأسماء (Nouns)</option>
            <option value="verb">الأفعال (Verbs)</option>
            <option value="adjective">الصفات (Adjectives)</option>
            <option value="expression">التعابير (Expressions)</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | VocabMasteryStatus | 'due')}
            className="px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 text-xs"
          >
            <option value="all">كل حالات الإتقان</option>
            <option value="due">مستحقة اليوم (Due)</option>
            <option value="new">جديدة (New)</option>
            <option value="practicing">قيد التمرين</option>
            <option value="mastered">متقَنة (Mastered)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCollectionFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
              collectionFilter === 'all'
                ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                : 'bg-[#F7F3EA] dark:bg-[#041B18]'
            }`}
          >
            كل المجموعات
          </button>
          {allCollections.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCollectionFilter(collectionFilter === c ? 'all' : c)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                collectionFilter === c
                  ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                  : 'bg-[#F7F3EA] dark:bg-[#041B18]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Rich Vocabulary Cards */}
      {filtered.length === 0 ? (
        <div className="df-card rounded-2xl p-8 text-center text-sm text-[#52615D] dark:text-[#9EC5BE]">
          لا توجد كلمات مطابقة للتصفية الحالية. أضف كلمات من المقالات أو الفيديوهات أو محرك التعلم!
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <article key={v.id} className="df-card rounded-2xl p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold font-german text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                      {v.article ? `${v.article} ` : ''}
                      {v.word}
                    </span>
                    <button
                      type="button"
                      onClick={() => speakDe(v.article ? `${v.article} ${v.word}` : v.word)}
                      className="p-1 rounded-lg bg-[#F7F3EA] dark:bg-[#041B18] text-[#093D38] dark:text-[#7FF9EB] cursor-pointer"
                      title="نطق ألماني"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-semibold text-[#D85A40] dark:text-[#FF957E]">
                      {v.translation}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE] flex flex-wrap gap-x-2">
                    <span>{v.wordCategory || v.partOfSpeech || 'word'}</span>
                    {v.cefrLevel && <span>· {v.cefrLevel}</span>}
                    {v.plural && <span dir="ltr">· Pl.: {v.plural}</span>}
                    {v.phonetic && <span>· ({v.phonetic})</span>}
                    <span>· الإتقان: {v.masteryScore ?? 0}%</span>
                    {v.nextReviewAt && (
                      <span>
                        · المراجعة التالية: {new Date(v.nextReviewAt).toLocaleDateString('de-DE')}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCollectionEditId(collectionEditId === v.id ? null : v.id)}
                    title="إضافة لمجموعة شخصية"
                    className="p-1.5 rounded-lg text-[#093D38] dark:text-[#7FF9EB] hover:bg-[#093D38]/10 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeVocab(v.id)}
                    title="حذف الكلمة"
                    className="p-1.5 rounded-lg text-[#D85A40] hover:bg-[#D85A40]/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Verb or Adjective Morphology */}
              {v.verbForms && (v.verbForms.presentConjugation || v.verbForms.pastParticiple || v.verbForms.auxiliaryVerb) && (
                <p className="text-[11px] font-german text-[#52615D] dark:text-[#9EC5BE]" dir="ltr">
                  {[
                    v.verbForms.presentConjugation,
                    v.verbForms.pastParticiple,
                    v.verbForms.auxiliaryVerb ? `Aux: ${v.verbForms.auxiliaryVerb}` : '',
                    v.verbForms.prepositions ? `Prep: ${v.verbForms.prepositions}` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}

              {v.sentence && (
                <p className="text-xs font-german bg-[#F7F3EA] dark:bg-[#041B18] rounded-xl px-3 py-2" dir="ltr">
                  {v.sentence}
                </p>
              )}

              {collectionEditId === v.id && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newColTag}
                    onChange={(e) => setNewColTag(e.target.value)}
                    placeholder="اسم المجموعة (مثال: Medical)..."
                    className="px-2.5 py-1 rounded-lg bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/18 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newColTag.trim()) return;
                      const merged = Array.from(new Set([...(v.collections || []), newColTag.trim()]));
                      void updateVocabCollections(v.id, merged, v.note);
                      setNewColTag('');
                      setCollectionEditId(null);
                    }}
                    className="px-3 py-1 rounded-lg bg-[#093D38] text-white text-xs font-semibold cursor-pointer"
                  >
                    إضافة للمجموعة
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                <span>
                  المصدر: {v.sourceTitle}
                  {v.collections && v.collections.length > 0 ? ` · [${v.collections.join(', ')}]` : ''}
                </span>
                {v.sourceUrl && (
                  <a
                    href={v.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#093D38] dark:text-[#7FF9EB] hover:underline"
                  >
                    <span>المصدر</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <VocabularyPracticeModal
        lang={lang}
        mode={practiceMode}
        words={practiceMode === 'sm2_srs' && dueWords.length > 0 ? dueWords : vocabList}
        onClose={() => setPracticeMode(null)}
      />
    </div>
  );
};
