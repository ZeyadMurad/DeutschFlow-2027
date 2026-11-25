import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Sparkles, Upload } from 'lucide-react';
import type { UILanguage } from '../../types/media';
import { useUserData } from '../../context/UserDataContext';
import { FlashcardEngine } from './FlashcardEngine';
import { SectionShell } from './SectionShell';
import { VocabularyBankView } from './VocabularyBankView';

export type LibraryTab = 'vocab' | 'flashcards' | 'history' | 'backup';

interface LibrarySectionProps {
  lang: UILanguage;
  onBack: () => void;
  initialTab?: LibraryTab;
  onOpenFlowJourney?: () => void;
}

export const LibrarySection: React.FC<LibrarySectionProps> = ({
  lang,
  onBack,
  initialTab = 'vocab',
  onOpenFlowJourney,
}) => {
  const {
    data,
    exportBackup,
    importBackup,
  } = useUserData();

  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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
      <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-3 mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
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

        {onOpenFlowJourney && (
          <button
            type="button"
            onClick={onOpenFlowJourney}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F3CF68] to-[#C8962E] text-[#041B18] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>فتح Flow Journey والتقرير الأسبوعي</span>
          </button>
        )}
      </div>

      {/* VOCAB TAB (Smart Vocabulary Bank 2.0) */}
      {tab === 'vocab' && <VocabularyBankView lang={lang} />}

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
