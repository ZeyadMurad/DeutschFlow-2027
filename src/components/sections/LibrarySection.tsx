import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Plus, Trash2, Upload } from 'lucide-react';
import type { UILanguage } from '../../types/media';
import { useUserData } from '../../context/UserDataContext';
import { FlashcardEngine } from './FlashcardEngine';
import { SectionShell } from './SectionShell';

export type LibraryTab = 'vocab' | 'flashcards' | 'history' | 'backup';

interface LibrarySectionProps {
  lang: UILanguage;
  onBack: () => void;
  initialTab?: LibraryTab;
}

export const LibrarySection: React.FC<LibrarySectionProps> = ({
  lang,
  onBack,
  initialTab = 'vocab',
}) => {
  const {
    data,
    addVocab,
    updateVocabNote,
    removeVocab,
    exportBackup,
    importBackup,
  } = useUserData();

  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [vocabSearch, setVocabSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newTrans, setNewTrans] = useState('');
  const [newSentence, setNewSentence] = useState('');
  const [newNote, setNewNote] = useState('');
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const filteredVocab = data.vocabulary.filter((v) => {
    if (!vocabSearch.trim()) return true;
    const q = vocabSearch.trim().toLowerCase();
    return `${v.word} ${v.translation} ${v.sentence} ${v.note || ''}`
      .toLowerCase()
      .includes(q);
  });

  const handleAddManualVocab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    addVocab({
      word: newWord,
      translation: newTrans || '—',
      sentence: newSentence,
      sourceTitle: lang === 'de' ? 'Eigener Eintrag' : lang === 'en' ? 'Personal Entry' : 'إضافة شخصية',
      note: newNote,
    });
    setNewWord('');
    setNewTrans('');
    setNewSentence('');
    setNewNote('');
  };

  const handleExportJson = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deutschflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importBackup(text);
      setImportStatus(
        lang === 'de'
          ? 'Backup erfolgreich importiert und Daten wiederhergestellt.'
          : lang === 'en'
          ? 'Backup imported and personal data restored.'
          : 'تم استيراد النسخة الاحتياطية بنجاح واستعادة بياناتك.'
      );
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : 'ملف JSON غير صالح');
    }
  };

  const tabs: Array<{ id: LibraryTab; label: string }> = [
    {
      id: 'vocab',
      label: lang === 'de' ? 'Meine Vokabeln' : lang === 'en' ? 'My Vocabulary' : 'مفرداتي وجُملي',
    },
    {
      id: 'flashcards',
      label: lang === 'de' ? 'Lernkarten' : lang === 'en' ? 'Flashcards' : 'بطاقات المراجعة',
    },
    {
      id: 'history',
      label: lang === 'de' ? 'Lernverlauf' : lang === 'en' ? 'Activity History' : 'سجل التعلّم والنشاط',
    },
    {
      id: 'backup',
      label: lang === 'de' ? 'Backup (JSON)' : lang === 'en' ? 'Backup (JSON)' : 'نسخ احتياطي (JSON)',
    },
  ];

  return (
    <SectionShell sectionId="library" lang={lang} onBack={onBack}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="df-card rounded-2xl p-4">
          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">وقت التعرض للألمانية</p>
          <p className="text-2xl font-bold text-[#0E4B4B] dark:text-[#7FF9EB] font-mono-num mt-1">
            {Math.round(data.exposureMinutes)} <span className="text-xs font-normal">دقيقة</span>
          </p>
        </div>
        <div className="df-card rounded-2xl p-4">
          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">المفردات المحفوظة</p>
          <p className="text-2xl font-bold text-[#D85A40] dark:text-[#FF8D75] font-mono-num mt-1">
            {data.vocabulary.length}
          </p>
        </div>
        <div className="df-card rounded-2xl p-4">
          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">سجل الاستماع والمشاهدة</p>
          <p className="text-2xl font-bold text-[#B68934] dark:text-[#E8C35A] font-mono-num mt-1">
            {data.history.length}
          </p>
        </div>
        <div className="df-card rounded-2xl p-4">
          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">العناصر المفضلة</p>
          <p className="text-2xl font-bold text-[#0E4B4B] dark:text-[#7FF9EB] font-mono-num mt-1">
            {data.favorites.radio.length +
              data.favorites.articles.length +
              data.favorites.videos.length +
              data.favorites.episodes.length}
          </p>
        </div>
      </div>

      {/* Tabs (Source Management cleanly removed per specification) */}
      <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-3 mb-6 flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              tab === t.id
                ? 'bg-[#0E4B4B] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                : 'bg-[#F7F3EA] text-[#1A2421] hover:bg-[#EFE8D8] dark:bg-[#041B18]/75 dark:text-[#D5EAE5] dark:hover:bg-[#0B3C35]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* VOCAB TAB */}
      {tab === 'vocab' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddManualVocab}
            className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-4 sm:p-5 space-y-3"
          >
            <h2 className="text-sm font-semibold text-[#0E4B4B] dark:text-[#E8C35A]">
              إضافة كلمة أو جملة ألمانية جديدة
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="الكلمة بالألمانية..."
                dir="ltr"
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/25 text-sm font-german text-[#172320] dark:text-white"
              />
              <input
                type="text"
                value={newTrans}
                onChange={(e) => setNewTrans(e.target.value)}
                placeholder="المعنى بالعربية..."
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
              />
              <input
                type="text"
                value={newSentence}
                onChange={(e) => setNewSentence(e.target.value)}
                placeholder="الجملة التي وردت فيها..."
                dir="ltr"
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/25 text-sm font-german text-[#172320] dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-105"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة للمفردات</span>
              </button>
            </div>
          </form>

          <input
            type="text"
            value={vocabSearch}
            onChange={(e) => setVocabSearch(e.target.value)}
            placeholder="ابحث في مفرداتك المحفوظة..."
            className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#072B26] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
          />

          {filteredVocab.length === 0 ? (
            <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-8 text-center text-sm text-[#52615D] dark:text-[#9EC5BE]">
              لا توجد مفردات محفوظة بعد. افتح أي مقال ألماني واضغط على أي كلمة لحفظها هنا!
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVocab.map((v) => (
                <article key={v.id} className="df-card rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div>
                        <span className="text-base font-bold text-[#0E4B4B] dark:text-[#7FF9EB] font-german" dir="ltr">
                          {v.article ? `${v.article} ` : ''}
                          {v.word}
                        </span>
                        <span className="mx-2 text-[#52615D] dark:text-[#9EC5BE]">—</span>
                        <span className="text-sm font-semibold text-[#D85A40] dark:text-[#FF957E]">{v.translation}</span>
                      </div>
                      {(v.lemma || v.partOfSpeech || v.plural) && (
                        <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          {v.partOfSpeech && <span>{v.partOfSpeech}</span>}
                          {v.lemma && (
                            <span className="font-german" dir="ltr">
                              Lemma: {v.lemma}
                            </span>
                          )}
                          {v.plural && (
                            <span className="font-german" dir="ltr">
                              Pl.: {v.plural}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVocab(v.id)}
                      className="p-1.5 rounded-lg text-[#52615D] dark:text-[#9EC5BE] hover:text-[#D85A40] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {v.sentence && (
                    <p className="text-xs text-[#1A2421] dark:text-[#E8F3F0] bg-[#FAF7F0] dark:bg-[#041B18]/80 p-2.5 rounded-xl font-german" dir="ltr">
                      {v.sentence}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#52615D] dark:text-[#9EC5BE]">
                    <span>المصدر: {v.sourceTitle}</span>
                    <input
                      type="text"
                      defaultValue={v.note || ''}
                      onBlur={(e) => updateVocabNote(v.id, e.target.value)}
                      placeholder="أضف ملاحظة..."
                      className="px-2.5 py-1 rounded-lg bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/10 dark:border-[#3EF2DF]/22 text-xs text-[#172320] dark:text-white min-w-[200px]"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FLASHCARDS TAB */}
      {tab === 'flashcards' && (
        <FlashcardEngine lang={lang} onGoToVocab={() => setTab('vocab')} />
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="space-y-2.5">
          {data.history.length === 0 ? (
            <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-8 text-center text-sm text-[#52615D] dark:text-[#9EC5BE]">
              سجل التعلّم فارغ حالياً — سيُسجل نشاطك هنا تلقائياً عند الاستماع أو القراءة أو المشاهدة.
            </div>
          ) : (
            data.history.map((h) => (
              <div
                key={h.id}
                className="df-card rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                    {h.type} · {h.subtitle} ·{' '}
                    <span className="font-mono-num">
                      {new Date(h.timestamp).toLocaleString('de-DE')}
                    </span>
                  </p>
                  <p className="text-sm font-medium text-[#1A2421] dark:text-white truncate font-german" dir="ltr">
                    {h.title}
                  </p>
                </div>
                {h.url && (
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#F7F3EA] dark:bg-[#041B18] text-[#0E4B4B] dark:text-[#7FF9EB] shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* BACKUP TAB */}
      {tab === 'backup' && (
        <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-[#0E4B4B] dark:text-[#E8C35A] mb-1">
              النسخ الاحتياطي المحلي بدون حسابات
            </h2>
            <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
              يتم حفظ جميع مفضلاتك، مفرداتك، ملاحظاتك، وسجل التعلّم محلياً في المتصفح (IndexedDB + LocalStorage). يمكنك تصدير نسخة JSON أو استيرادها في أي وقت.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-5 py-2.5 rounded-xl bg-[#0E4B4B] dark:bg-[#E8C35A] text-white dark:text-[#041B18] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer hover:brightness-105"
            >
              <Download className="w-4 h-4" />
              <span>تصدير نسخة احتياطية (JSON)</span>
            </button>

            <label className="px-5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/20 dark:border-[#3EF2DF]/25 text-[#0E4B4B] dark:text-[#F4EFE3] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer hover:bg-[#EFE8D8] dark:hover:bg-[#0B3C35]">
              <Upload className="w-4 h-4" />
              <span>استيراد نسخة (JSON)</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {importStatus && (
            <p className="text-xs font-medium text-[#0E4B4B] dark:text-[#7FF9EB]">{importStatus}</p>
          )}
        </div>
      )}
    </SectionShell>
  );
};
