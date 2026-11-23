import React, { useEffect, useState } from 'react';
import {
  Check,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { fetchAllSourcesHealth, validateCustomRss } from '../../services/api';
import type { NewsCategory, SourceHealthStatus, UILanguage } from '../../types/media';
import { useUserData } from '../../context/UserDataContext';
import { FlashcardEngine } from './FlashcardEngine';
import { SectionShell } from './SectionShell';

interface LibrarySectionProps {
  lang: UILanguage;
  onBack: () => void;
}

type LibTab = 'vocab' | 'flashcards' | 'history' | 'sources' | 'backup';

export const LibrarySection: React.FC<LibrarySectionProps> = ({ lang, onBack }) => {
  const {
    data,
    addVocab,
    updateVocabNote,
    removeVocab,
    toggleSourceEnabled,
    addCustomSource,
    removeCustomSource,
    exportBackup,
    importBackup,
  } = useUserData();

  const [tab, setTab] = useState<LibTab>('vocab');
  const [vocabSearch, setVocabSearch] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newTrans, setNewTrans] = useState('');
  const [newSentence, setNewSentence] = useState('');
  const [newNote, setNewNote] = useState('');

  const [sourceHealth, setSourceHealth] = useState<SourceHealthStatus[]>([]);
  const [customName, setCustomName] = useState('');
  const [customRss, setCustomRss] = useState('');
  const [customSite, setCustomSite] = useState('');
  const [customCat, setCustomCat] = useState<NewsCategory>('politics');
  const [validatingRss, setValidatingRss] = useState(false);
  const [rssError, setRssError] = useState('');
  const [rssSuccess, setRssSuccess] = useState('');

  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    if (tab === 'sources') {
      void fetchAllSourcesHealth().then((res) => setSourceHealth(res.health));
    }
  }, [tab]);

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
      sourceTitle: 'إضافة شخصية',
      note: newNote,
    });
    setNewWord('');
    setNewTrans('');
    setNewSentence('');
    setNewNote('');
  };

  const handleAddCustomRss = async (e: React.FormEvent) => {
    e.preventDefault();
    setRssError('');
    setRssSuccess('');
    setValidatingRss(true);
    try {
      const check = await validateCustomRss(customRss, customName);
      addCustomSource({
        name: check.name,
        rssUrl: check.rssUrl,
        websiteUrl: customSite.trim() || check.rssUrl,
        category: customCat,
      });
      setCustomName('');
      setCustomRss('');
      setCustomSite('');
      setRssSuccess('تم التحقق من الخلاصة وإضافتها إلى مصادر الأخبار بنجاح.');
    } catch (err) {
      setRssError(err instanceof Error ? err.message : 'تعذّر التحقق من رابط RSS');
    } finally {
      setValidatingRss(false);
    }
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
      setImportStatus('تم استيراد النسخة الاحتياطية بنجاح واستعادة بياناتك.');
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : 'ملف JSON غير صالح');
    }
  };

  return (
    <SectionShell sectionId="library" lang={lang} onBack={onBack}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="df-card rounded-2xl p-4">
          <p className="text-xs text-[#52615D]">وقت التعرض للألمانية</p>
          <p className="text-2xl font-bold text-[#0E4B4B] font-mono-num mt-1">
            {Math.round(data.exposureMinutes)} <span className="text-xs font-normal">دقيقة</span>
          </p>
        </div>
        <div className="df-card rounded-2xl p-4">
          <p className="text-xs text-[#52615D]">المفردات المحفوظة</p>
          <p className="text-2xl font-bold text-[#D85A40] font-mono-num mt-1">
            {data.vocabulary.length}
          </p>
        </div>
        <div className="df-card rounded-2xl p-4">
          <p className="text-xs text-[#52615D]">سجل الاستماع والمشاهدة</p>
          <p className="text-2xl font-bold text-[#B68934] font-mono-num mt-1">
            {data.history.length}
          </p>
        </div>
        <div className="df-card rounded-2xl p-4">
          <p className="text-xs text-[#52615D]">العناصر المفضلة</p>
          <p className="text-2xl font-bold text-[#0E4B4B] font-mono-num mt-1">
            {data.favorites.radio.length +
              data.favorites.articles.length +
              data.favorites.videos.length +
              data.favorites.episodes.length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-3 mb-6 flex flex-wrap gap-1.5">
        {[
          { id: 'vocab', label: 'مفرداتي وجُملي' },
          {
            id: 'flashcards',
            label:
              lang === 'de'
                ? 'Lernkarten'
                : lang === 'en'
                ? 'Flashcards'
                : 'بطاقات المراجعة',
          },
          { id: 'history', label: 'سجل التعلّم والنشاط' },
          { id: 'sources', label: 'إدارة المصادر وحالتها' },
          { id: 'backup', label: 'نسخ احتياطي (JSON)' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as LibTab)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              tab === t.id
                ? 'bg-[#0E4B4B] text-white'
                : 'bg-[#F7F3EA] text-[#1A2421] hover:bg-[#EFE8D8]'
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
            className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-4 sm:p-5 space-y-3"
          >
            <h2 className="text-sm font-semibold text-[#0E4B4B]">إضافة كلمة أو جملة ألمانية جديدة</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="الكلمة بالألمانية..."
                dir="ltr"
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm font-german"
              />
              <input
                type="text"
                value={newTrans}
                onChange={(e) => setNewTrans(e.target.value)}
                placeholder="المعنى بالعربية..."
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm"
              />
              <input
                type="text"
                value={newSentence}
                onChange={(e) => setNewSentence(e.target.value)}
                placeholder="الجملة التي وردت فيها..."
                dir="ltr"
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm font-german"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
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
            className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#0E4B4B]/15 text-sm"
          />

          {filteredVocab.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-8 text-center text-sm text-[#52615D]">
              لا توجد مفردات محفوظة بعد. افتح أي مقال ألماني واضغط على أي كلمة لحفظها هنا!
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVocab.map((v) => (
                <article key={v.id} className="df-card rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-base font-bold text-[#0E4B4B] font-german" dir="ltr">
                        {v.word}
                      </span>
                      <span className="mx-2 text-[#52615D]">—</span>
                      <span className="text-sm font-semibold text-[#D85A40]">{v.translation}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVocab(v.id)}
                      className="p-1.5 rounded-lg text-[#52615D] hover:text-[#D85A40] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {v.sentence && (
                    <p className="text-xs text-[#1A2421] bg-[#FAF7F0] p-2.5 rounded-xl font-german" dir="ltr">
                      {v.sentence}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#52615D]">
                    <span>المصدر: {v.sourceTitle}</span>
                    <input
                      type="text"
                      defaultValue={v.note || ''}
                      onBlur={(e) => updateVocabNote(v.id, e.target.value)}
                      placeholder="أضف ملاحظة..."
                      className="px-2.5 py-1 rounded-lg bg-[#F7F3EA] border border-[#0E4B4B]/10 text-xs min-w-[200px]"
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
            <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-8 text-center text-sm text-[#52615D]">
              سجل التعلّم فارغ حالياً — سيُسجل نشاطك هنا تلقائياً عند الاستماع أو القراءة أو المشاهدة.
            </div>
          ) : (
            data.history.map((h) => (
              <div
                key={h.id}
                className="df-card rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs text-[#52615D]">
                    {h.type} · {h.subtitle} ·{' '}
                    <span className="font-mono-num">
                      {new Date(h.timestamp).toLocaleString('de-DE')}
                    </span>
                  </p>
                  <p className="text-sm font-medium text-[#1A2421] truncate font-german" dir="ltr">
                    {h.title}
                  </p>
                </div>
                {h.url && (
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-[#F7F3EA] text-[#0E4B4B] shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* SOURCES TAB */}
      {tab === 'sources' && (
        <div className="space-y-6">
          <form
            onSubmit={handleAddCustomRss}
            className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-4 sm:p-5 space-y-3"
          >
            <h2 className="text-sm font-semibold text-[#0E4B4B]">
              إضافة مصدر RSS ألماني شخصي (HTTPS)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="اسم المصدر..."
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm"
              />
              <input
                type="url"
                required
                value={customRss}
                onChange={(e) => setCustomRss(e.target.value)}
                placeholder="https://example.de/rss.xml"
                dir="ltr"
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm"
              />
              <select
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value as NewsCategory)}
                className="px-3 py-2 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm"
              >
                <option value="politics">السياسة</option>
                <option value="business">الاقتصاد</option>
                <option value="science">العلوم</option>
                <option value="tech">التكنولوجيا</option>
                <option value="culture">الثقافة</option>
              </select>
              <button
                type="submit"
                disabled={validatingRss}
                className="px-4 py-2 rounded-xl bg-[#0E4B4B] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {validatingRss ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>تحقق وأضف</span>
              </button>
            </div>
            {rssError && <p className="text-xs text-[#D85A40]">{rssError}</p>}
            {rssSuccess && (
              <p className="text-xs text-[#0E4B4B] inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {rssSuccess}
              </p>
            )}
          </form>

          {data.customSources.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#0E4B4B]">مصادرك المضافة شخصياً</h3>
              {data.customSources.map((cs) => (
                <div key={cs.id} className="df-card rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{cs.name}</p>
                    <p className="text-xs text-[#52615D]" dir="ltr">
                      {cs.rssUrl}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomSource(cs.id)}
                    className="p-2 text-[#D85A40] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#0E4B4B]">
              حالة المصادر المتصلة ({sourceHealth.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sourceHealth.map((sh) => {
                const disabled = data.disabledSourceIds.includes(sh.id);
                return (
                  <div key={sh.id} className="df-card rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1A2421] truncate font-german" dir="ltr">
                        {sh.name}
                      </p>
                      <p className="text-[11px] text-[#52615D]">
                        {sh.type} ·{' '}
                        <span
                          className={
                            sh.status === 'ok'
                              ? 'text-[#0E4B4B] font-semibold'
                              : sh.status === 'error'
                              ? 'text-[#D85A40] font-semibold'
                              : 'text-[#B68934]'
                          }
                        >
                          {sh.status}
                        </span>{' '}
                        · {sh.itemCount} عنصر
                      </p>
                      {sh.lastError && (
                        <p className="text-[11px] text-[#D85A40] truncate">{sh.lastError}</p>
                      )}
                    </div>
                    {sh.type === 'news' && (
                      <button
                        type="button"
                        onClick={() => toggleSourceEnabled(sh.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer shrink-0 ${
                          disabled
                            ? 'bg-[#D85A40]/15 text-[#D85A40]'
                            : 'bg-[#0E4B4B]/10 text-[#0E4B4B]'
                        }`}
                      >
                        {disabled ? 'معطّل' : 'مفعّل'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BACKUP TAB */}
      {tab === 'backup' && (
        <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-6 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-[#0E4B4B] mb-1">
              النسخ الاحتياطي المحلي بدون حسابات
            </h2>
            <p className="text-xs text-[#52615D]">
              يتم حفظ جميع مفضلاتك، مفرداتك، ملاحظاتك، وسجل التعلّم محلياً في المتصفح (IndexedDB + LocalStorage). يمكنك تصدير نسخة JSON أو استيرادها في أي وقت.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-5 py-2.5 rounded-xl bg-[#0E4B4B] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer hover:bg-[#093535]"
            >
              <Download className="w-4 h-4" />
              <span>تصدير نسخة احتياطية (JSON)</span>
            </button>

            <label className="px-5 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/20 text-[#0E4B4B] text-xs font-semibold inline-flex items-center gap-2 cursor-pointer hover:bg-[#EFE8D8]">
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

          {importStatus && <p className="text-xs font-medium text-[#0E4B4B]">{importStatus}</p>}
        </div>
      )}
    </SectionShell>
  );
};
