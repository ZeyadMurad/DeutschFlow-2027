import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Globe,
  Heart,
  Lock,
  LogOut,
  Mail,
  MessageSquarePlus,
  Moon,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Trash2,
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useUserData } from '../../context/UserDataContext';
import { MAIN_SECTIONS, getSectionTitle } from '../../i18n/translations';
import {
  bootstrapAdminOwner,
  fetchAdminOverview,
  fetchAdminSession,
  loginAdminOwner,
  submitDeveloperSuggestion,
  updateAdminConfig,
  type AdminSessionStatus,
  type PublicAppConfig,
  type SuggestionItem,
} from '../../services/api';
import type { AppSectionId, SourceHealthStatus, UILanguage, UITheme } from '../../types/media';
import { SectionShell } from './SectionShell';

interface SettingsSectionProps {
  onBack: () => void;
  onNavigate: (sec: AppSectionId) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ onBack, onNavigate }) => {
  const {
    lang,
    setLang,
    theme,
    setTheme,
    appConfig,
    setAppConfig,
    adminToken,
    setAdminToken,
  } = usePreferences();
  const { data, exportBackup, resetAllData } = useUserData();
  const isRtl = lang === 'ar';

  // Privacy confirmation state (no window.confirm)
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Suggestion form state
  const [sugTitle, setSugTitle] = useState('');
  const [sugCategory, setSugCategory] = useState('feature');
  const [sugMessage, setSugMessage] = useState('');
  const [sugEmail, setSugEmail] = useState('');
  const [sugSending, setSugSending] = useState(false);
  const [sugError, setSugError] = useState('');
  const [sugResult, setSugResult] = useState<{
    id: string;
    deliveredViaEmail: boolean;
    mailtoUrl: string;
  } | null>(null);

  // Admin state (server-verified only)
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminSessionStatus | null>(null);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [adminPassConfirm, setAdminPassConfirm] = useState('');
  const [adminAuthLoading, setAdminAuthLoading] = useState(false);
  const [adminAuthError, setAdminAuthError] = useState('');

  const [overviewLoading, setOverviewLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [sourceHealth, setSourceHealth] = useState<SourceHealthStatus[]>([]);
  const [draftConfig, setDraftConfig] = useState<PublicAppConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedMsg, setConfigSavedMsg] = useState('');

  const favoritesCount =
    data.favorites.radio.length +
    data.favorites.articles.length +
    data.favorites.videos.length +
    data.favorites.episodes.length +
    data.favorites.movies.length;

  const loadAdminState = useCallback(async () => {
    try {
      const st = await fetchAdminSession(adminToken);
      setAdminStatus(st);
      if (st.authenticated && adminToken) {
        setOverviewLoading(true);
        const ov = await fetchAdminOverview(adminToken);
        setDraftConfig(ov.config);
        setSuggestions(ov.suggestions);
        setSourceHealth(ov.sourceHealth);
      }
    } catch {
      // Token may have expired or server restarted
      setAdminToken(null);
    } finally {
      setOverviewLoading(false);
    }
  }, [adminToken, setAdminToken]);

  useEffect(() => {
    if (adminOpen || adminToken) {
      void loadAdminState();
    }
  }, [adminOpen, adminToken, loadAdminState]);

  const handleExportLocal = () => {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deutschflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmReset = () => {
    resetAllData();
    setConfirmReset(false);
    setResetSuccess(true);
    window.setTimeout(() => setResetSuccess(false), 4000);
  };

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSugError('');
    setSugResult(null);
    if (sugTitle.trim().length < 2 || sugMessage.trim().length < 5) {
      setSugError(
        lang === 'de'
          ? 'Bitte Titel und ausführliche Nachricht eingeben.'
          : lang === 'en'
          ? 'Please enter a title and a clear message.'
          : 'يرجى إدخال عنوان واضح ونص للاقتراح (5 أحرف على الأقل).'
      );
      return;
    }

    setSugSending(true);
    try {
      const res = await submitDeveloperSuggestion({
        title: sugTitle.trim(),
        category: sugCategory,
        message: sugMessage.trim(),
        senderEmail: sugEmail.trim() || undefined,
      });
      setSugResult({
        id: res.id,
        deliveredViaEmail: res.deliveredViaEmail,
        mailtoUrl: res.mailtoUrl,
      });
      setSugTitle('');
      setSugMessage('');
      setSugEmail('');
    } catch (err) {
      setSugError(err instanceof Error ? err.message : 'تعذر إرسال الاقتراح.');
    } finally {
      setSugSending(false);
    }
  };

  const handleAdminBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    if (adminPassInput !== adminPassConfirm) {
      setAdminAuthError('كلمة المرور وتأكيدها غير متطابقتين.');
      return;
    }
    setAdminAuthLoading(true);
    try {
      const res = await bootstrapAdminOwner(adminEmailInput.trim(), adminPassInput);
      setAdminToken(res.token);
      setAdminPassInput('');
      setAdminPassConfirm('');
    } catch (err) {
      setAdminAuthError(err instanceof Error ? err.message : 'تعذر تفعيل الإدارة.');
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError('');
    setAdminAuthLoading(true);
    try {
      const res = await loginAdminOwner(adminEmailInput.trim(), adminPassInput);
      setAdminToken(res.token);
      setAdminPassInput('');
    } catch (err) {
      setAdminAuthError(err instanceof Error ? err.message : 'بيانات الدخول غير صحيحة.');
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminLogout = async () => {
    if (adminToken) {
      try {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
        });
      } catch {
        // Ignore network error during logout
      }
    }
    setAdminToken(null);
    setDraftConfig(null);
    setSuggestions([]);
    setSourceHealth([]);
  };

  const handleSaveAdminConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !draftConfig) return;
    setSavingConfig(true);
    setConfigSavedMsg('');
    try {
      const updated = await updateAdminConfig(adminToken, draftConfig);
      setDraftConfig(updated);
      setAppConfig(updated);
      setConfigSavedMsg(
        lang === 'de'
          ? 'Änderungen gespeichert und live aktualisiert.'
          : lang === 'en'
          ? 'Configuration saved and applied live.'
          : 'تم حفظ إعدادات المنصة وتحديثها مباشرة لجميع المستخدمين.'
      );
    } catch (err) {
      setAdminAuthError(err instanceof Error ? err.message : 'تعذر حفظ التعديلات.');
    } finally {
      setSavingConfig(false);
    }
  };

  const toggleModuleVisibility = (modId: string) => {
    if (!draftConfig) return;
    const exists = draftConfig.hiddenModuleIds.includes(modId);
    setDraftConfig({
      ...draftConfig,
      hiddenModuleIds: exists
        ? draftConfig.hiddenModuleIds.filter((id) => id !== modId)
        : [...draftConfig.hiddenModuleIds, modId],
    });
  };

  const activeConfig = draftConfig || appConfig;

  return (
    <SectionShell sectionId="settings" lang={lang} onBack={onBack}>
      <div className="space-y-6">
        {/* 7.1 + 7.2 Language & Theme Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 7.1 Interface Language */}
          <div className="df-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#0D4A42]/10 dark:bg-[#3EF2DF]/15 text-[#093D38] dark:text-[#7FF9EB] flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#093D38] dark:text-white">
                  {lang === 'de'
                    ? 'Sprache der Oberfläche'
                    : lang === 'en'
                    ? 'Application Language'
                    : 'لغة واجهة التطبيق'}
                </h2>
                <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                  {lang === 'de'
                    ? 'Sofortiger Wechsel zwischen Arabisch, Englisch und Deutsch'
                    : lang === 'en'
                    ? 'Switch between Arabic (RTL), English, and German anytime'
                    : 'بدّل فوراً بين العربية والإنجليزية والألمانية مع حفظ التفضيل تلقائياً'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { code: 'ar' as UILanguage, label: 'العربية', sub: 'RTL' },
                  { code: 'en' as UILanguage, label: 'English', sub: 'LTR' },
                  { code: 'de' as UILanguage, label: 'Deutsch', sub: 'LTR' },
                ] as const
              ).map((item) => {
                const selected = lang === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setLang(item.code)}
                    className={`rounded-xl px-3 py-3 text-center border transition-all cursor-pointer ${
                      selected
                        ? 'bg-[#093D38] text-white border-[#C8962E] dark:bg-[#E8C35A] dark:text-[#041B18] dark:border-[#FFF0B8] shadow-sm'
                        : 'bg-[#F7F3EA] text-[#172320] border-[#0D4A42]/14 hover:border-[#0D4A42]/35 dark:bg-[#041B18]/80 dark:text-[#E5F2EE] dark:border-[#3EF2DF]/22 dark:hover:border-[#3EF2DF]/48'
                    }`}
                  >
                    <p className="text-sm font-bold">{item.label}</p>
                    <p
                      className={`text-[10px] mt-0.5 font-mono-num ${
                        selected ? 'opacity-85' : 'text-[#52615D] dark:text-[#9EC5BE]'
                      }`}
                    >
                      {item.sub}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7.2 Appearance Mode: Dark Mode / Light Mode */}
          <div className="df-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#C8962E]/15 text-[#C8962E] dark:text-[#E8C35A] flex items-center justify-center">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#093D38] dark:text-white">
                  {lang === 'de'
                    ? 'Darstellungsmodus'
                    : lang === 'en'
                    ? 'Appearance Theme'
                    : 'مظهر التطبيق'}
                </h2>
                <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                  {lang === 'de'
                    ? 'Zwischen Dunkelmodus und Hellmodus wechseln'
                    : lang === 'en'
                    ? 'Choose between Dark Mode and Light Mode'
                    : 'اختر بين الوضع الداكن الزمردي المعتمد أو الوضع الفاتح المريح للقراءة'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    id: 'dark' as UITheme,
                    label:
                      lang === 'de'
                        ? 'Dunkelmodus'
                        : lang === 'en'
                        ? 'Dark Mode'
                        : 'الوضع الداكن',
                    desc:
                      lang === 'de'
                        ? 'Smaragd-Nachtansicht'
                        : lang === 'en'
                        ? 'Emerald Night'
                        : 'الزمردي الداكن الرسمي',
                    icon: Moon,
                  },
                  {
                    id: 'light' as UITheme,
                    label:
                      lang === 'de'
                        ? 'Hellmodus'
                        : lang === 'en'
                        ? 'Light Mode'
                        : 'الوضع الفاتح',
                    desc:
                      lang === 'de'
                        ? 'Elfenbein-Tageslicht'
                        : lang === 'en'
                        ? 'Warm Ivory'
                        : 'العاجي المشرق',
                    icon: Sun,
                  },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={`rounded-2xl p-3.5 border text-start flex items-center gap-3 transition-all cursor-pointer ${
                      active
                        ? 'bg-[#093D38] text-white border-[#E8C35A] dark:bg-gradient-to-br dark:from-[#126258] dark:to-[#07322D] dark:border-[#E8C35A] shadow-md'
                        : 'bg-[#F7F3EA] text-[#172320] border-[#0D4A42]/14 hover:border-[#0D4A42]/35 dark:bg-[#041B18]/80 dark:text-[#DCECE8] dark:border-[#3EF2DF]/22 dark:hover:border-[#3EF2DF]/50'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        active
                          ? 'bg-[#E8C35A] text-[#041B18]'
                          : 'bg-white dark:bg-[#093D38] text-[#093D38] dark:text-[#E8C35A]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{opt.label}</p>
                      <p
                        className={`text-[11px] truncate ${
                          active ? 'text-[#DFECE9]' : 'text-[#52615D] dark:text-[#9EC5BE]'
                        }`}
                      >
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 7.3 Direct Favorites Access */}
        <div className="df-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#D85A40]/12 text-[#D85A40] dark:text-[#FF8D75] flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#093D38] dark:text-white">
                {lang === 'de' ? 'Favoriten & Merklisten' : lang === 'en' ? 'Favorites & Saved Lists' : 'المفضلة وقوائمي'}
              </h2>
              <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] mt-0.5">
                {lang === 'de'
                  ? `Direkter Zugriff auf ${favoritesCount} gespeicherte Sender, Artikel, Videos und Podcasts.`
                  : lang === 'en'
                  ? `Jump directly to your ${favoritesCount} saved stations, articles, videos, and podcasts.`
                  : `وصول مباشر إلى ${favoritesCount} عنصر محفوظ من الإذاعات والمقالات والفيديوهات والبودكاست والأفلام.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('favorites')}
            className="px-5 py-2.5 rounded-xl bg-[#093D38] dark:bg-[#E8C35A] text-white dark:text-[#041B18] text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer hover:brightness-105 shrink-0"
          >
            <span>
              {lang === 'de' ? 'Favoriten öffnen' : lang === 'en' ? 'Open Favorites' : 'فتح المفضلة'}
            </span>
            {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* 7.4 Application Privacy Policy + 7.5 Developer Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 7.4 Privacy Policy */}
          <article className="df-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#0D4A42]/10 dark:bg-[#3EF2DF]/15 text-[#093D38] dark:text-[#7FF9EB] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#093D38] dark:text-white">
                  {lang === 'de'
                    ? 'Datenschutzhinweise der App'
                    : lang === 'en'
                    ? 'Application Privacy Policy'
                    : 'سياسة خصوصية التطبيق'}
                </h2>
                <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                  {lang === 'de'
                    ? 'Transparente Datenverarbeitung ohne Benutzerkonten'
                    : lang === 'en'
                    ? 'Transparent local-first privacy without accounts'
                    : 'شفافية كاملة حول كيفية حفظ بياناتك واستخدام التطبيق'}
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-[#172320] dark:text-[#DCECE8] leading-relaxed">
              <li className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18]/75 border border-[#0D4A42]/10 dark:border-[#3EF2DF]/18 p-3">
                <strong className="text-[#093D38] dark:text-[#E8C35A] block mb-0.5">
                  {lang === 'ar'
                    ? '1. التخزين المحلي لبيانات التعلّم:'
                    : lang === 'de'
                    ? '1. Lokale Speicherung im Browser:'
                    : '1. Local-First Learning Storage:'}
                </strong>
                {lang === 'ar'
                  ? 'جميع مفرداتك المحفوظة، بطاقات المراجعة، المفضلة، وسجل الاستماع والقراءة وتفضيل اللغة والمظهر تُحفظ محلياً داخل متصفحك فقط (LocalStorage و IndexedDB) دون إنشاء حسابات أو تتبع إعلاني.'
                  : lang === 'de'
                  ? 'Vokabeln, Lernkarten, Favoriten, Verlauf sowie Sprach- und Designeinstellungen werden ausschließlich lokal in deinem Browser (LocalStorage & IndexedDB) gespeichert — ohne Konten oder Werbetracking.'
                  : 'All saved vocabulary, flashcards, favorites, history, language, and theme preferences remain stored locally inside your browser (LocalStorage & IndexedDB) with zero user accounts or ad tracking.'}
              </li>
              <li className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18]/75 border border-[#0D4A42]/10 dark:border-[#3EF2DF]/18 p-3">
                <strong className="text-[#093D38] dark:text-[#E8C35A] block mb-0.5">
                  {lang === 'ar'
                    ? '2. جلب المحتوى والترجمة الفورية:'
                    : lang === 'de'
                    ? '2. Medienabruf & Übersetzung:'
                    : '2. Live Media & Dictionary Requests:'}
                </strong>
                {lang === 'ar'
                  ? 'يتم جلب الإذاعات والأخبار والبودكاست عبر خادم التطبيق من المصادر الألمانية العامة الرسمية، وتُرسل الكلمة والجملة المختارة عند طلب الترجمة الفورية فقط.'
                  : lang === 'de'
                  ? 'Radio-, News- und Podcast-Feeds stammen aus öffentlichen deutschen Quellen. Bei aktiver Wortübersetzung wird nur das gewählte Wort samt Kontextsatz verarbeitet.'
                  : 'Radio, news, and podcast feeds come from official German public sources. Only on-demand word lookups send the selected term and context sentence for translation.'}
              </li>
              <li className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18]/75 border border-[#0D4A42]/10 dark:border-[#3EF2DF]/18 p-3">
                <strong className="text-[#093D38] dark:text-[#E8C35A] block mb-0.5">
                  {lang === 'ar'
                    ? '3. الاقتراحات والتحكم بالبيانات:'
                    : lang === 'de'
                    ? '3. Feedback & Datenkontrolle:'
                    : '3. Suggestions & Data Control:'}
                </strong>
                {lang === 'ar'
                  ? 'تُستخدم بيانات نموذج «إرسال اقتراح للمطور» للرد على ملاحظاتك وتحسين المنصة فقط. يمكنك تصدير نسخة احتياطية JSON أو مسح بيانات المتصفح المحلية في أي لحظة.'
                  : lang === 'de'
                  ? 'Nachrichten aus dem Feedback-Formular werden ausschließlich zur Verbesserung von DeutschFlow verwendet. Du kannst deine lokalen Daten jederzeit exportieren oder löschen.'
                  : 'Suggestion form submissions are used strictly to improve DeutschFlow. You can export a JSON backup or wipe local browser data anytime below.'}
              </li>
            </ul>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportLocal}
                className="px-3.5 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/18 dark:border-[#3EF2DF]/28 text-xs font-semibold text-[#093D38] dark:text-[#7FF9EB] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تصدير بياناتي' : 'Export Data'}</span>
              </button>

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#D85A40]/12 text-[#D85A40] dark:text-[#FF957E] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'مسح البيانات المحلية' : 'Clear Local Data'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="px-3 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-semibold cursor-pointer"
                  >
                    {lang === 'ar' ? 'تأكيد المسح النهائي' : 'Confirm Clear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-2 rounded-xl bg-[#EFE8D8] dark:bg-[#041B18] text-xs font-semibold cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              )}

              {resetSuccess && (
                <span className="text-xs font-semibold text-[#093D38] dark:text-[#7FF9EB]">
                  {lang === 'ar' ? 'تم مسح البيانات المحلية بنجاح.' : 'Local data cleared.'}
                </span>
              )}
            </div>
          </article>

          {/* 7.5 Send a Suggestion to the Developer */}
          <div className="df-card rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#C8962E]/15 text-[#C8962E] dark:text-[#E8C35A] flex items-center justify-center">
                  <MessageSquarePlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#093D38] dark:text-white">
                    {lang === 'de'
                      ? 'Vorschlag an den Entwickler senden'
                      : lang === 'en'
                      ? 'Send a Suggestion to the Developer'
                      : 'إرسال اقتراح للمطور'}
                  </h2>
                  <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]" dir="ltr">
                    zeyad.ali.murad2@gmail.com
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitSuggestion} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  value={sugTitle}
                  onChange={(e) => setSugTitle(e.target.value)}
                  placeholder={
                    lang === 'de'
                      ? 'Titel des Vorschlags...'
                      : lang === 'en'
                      ? 'Suggestion title...'
                      : 'عنوان الاقتراح...'
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
                />
                <select
                  value={sugCategory}
                  onChange={(e) => setSugCategory(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
                >
                  <option value="feature">
                    {lang === 'ar' ? 'اقتراح ميزة جديدة' : lang === 'de' ? 'Neue Funktion' : 'Feature Idea'}
                  </option>
                  <option value="content">
                    {lang === 'ar' ? 'محتوى أو قناة ألمانية' : lang === 'de' ? 'Deutscher Inhalt' : 'German Content'}
                  </option>
                  <option value="design">
                    {lang === 'ar' ? 'تحسين التصميم والتجربة' : lang === 'de' ? 'Design & UX' : 'UI & UX Improvement'}
                  </option>
                  <option value="bug">
                    {lang === 'ar' ? 'الإبلاغ عن مشكلة' : lang === 'de' ? 'Fehler melden' : 'Bug Report'}
                  </option>
                </select>
              </div>

              <textarea
                required
                rows={4}
                value={sugMessage}
                onChange={(e) => setSugMessage(e.target.value)}
                placeholder={
                  lang === 'de'
                    ? 'Schreibe hier deinen Vorschlag oder dein Feedback...'
                    : lang === 'en'
                    ? 'Write your suggestion or feedback details...'
                    : 'اكتب تفاصيل اقتراحك أو ملاحظتك هنا ليتم إرسالها إلى المطور...'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white resize-y"
              />

              <input
                type="email"
                value={sugEmail}
                onChange={(e) => setSugEmail(e.target.value)}
                dir="ltr"
                placeholder={
                  lang === 'de'
                    ? 'Deine E-Mail für Rückantwort (optional)'
                    : lang === 'en'
                    ? 'Your reply email (optional)'
                    : 'بريدك الإلكتروني للرد (اختياري)'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
              />

              {sugError && (
                <p className="text-xs text-[#D85A40] dark:text-[#FF957E] font-medium">{sugError}</p>
              )}

              {sugResult && (
                <div className="rounded-xl bg-[#0D4A42]/10 dark:bg-[#3EF2DF]/12 border border-[#0D4A42]/20 dark:border-[#3EF2DF]/30 p-3 text-xs space-y-2">
                  <p className="font-semibold text-[#093D38] dark:text-[#7FF9EB] inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    <span>
                      {sugResult.deliveredViaEmail
                        ? lang === 'ar'
                          ? 'تم إرسال اقتراحك بنجاح مباشرة إلى بريد المطور!'
                          : 'Suggestion sent directly to developer email!'
                        : lang === 'ar'
                        ? 'تم حفظ اقتراحك في سجل المطور بنجاح. يمكنك أيضاً فتحه عبر تطبيق البريد لإرساله مباشرة:'
                        : 'Suggestion saved cleanly. You can also send it via your mail app:'}
                    </span>
                  </p>
                  <a
                    href={sugResult.mailtoUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#093D38] dark:bg-[#E8C35A] text-white dark:text-[#041B18] font-semibold"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>zeyad.ali.murad2@gmail.com</span>
                  </a>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="submit"
                  disabled={sugSending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E8C35A] to-[#C8962E] text-[#041B18] text-xs font-bold inline-flex items-center gap-2 cursor-pointer hover:brightness-105 disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {sugSending
                      ? lang === 'ar'
                        ? 'جارٍ الإرسال...'
                        : 'Sending...'
                      : lang === 'de'
                      ? 'Vorschlag senden'
                      : lang === 'en'
                      ? 'Send Suggestion'
                      : 'إرسال الاقتراح'}
                  </span>
                </button>

                <a
                  href={`mailto:zeyad.ali.murad2@gmail.com?subject=${encodeURIComponent('DeutschFlow Suggestion')}`}
                  className="text-xs font-semibold text-[#093D38] dark:text-[#7FF9EB] hover:underline inline-flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'فتح تطبيق البريد' : 'Open Mail App'}</span>
                </a>
              </div>
            </form>
          </div>
        </div>

        {/* Part 4: Server-Verified Website Administrator Management */}
        <div className="df-card rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#093D38] text-[#E8C35A] border border-[#E8C35A]/35 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#093D38] dark:text-white">
                  {lang === 'de'
                    ? 'Plattform-Verwaltung (Nur Inhaber)'
                    : lang === 'en'
                    ? 'Website Administrator Console'
                    : 'لوحة إدارة المالك الرسمي للمنصة'}
                </h2>
                <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                  {lang === 'de'
                    ? 'Serverseitig verifizierter Verwaltungszugang für das offizielle Administratorkonto'
                    : lang === 'en'
                    ? 'Server-verified administrative controls for the official website owner'
                    : 'تحقق أمني من الخادم لصلاحيات مدير المنصة (تعديل النصوص، إظهار الأقسام، ومراجعة الاقتراحات)'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAdminOpen((v) => !v)}
              className="px-4 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/18 dark:border-[#3EF2DF]/28 text-xs font-semibold text-[#093D38] dark:text-[#E8C35A] inline-flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {adminOpen
                  ? lang === 'ar'
                    ? 'إخفاء لوحة الإدارة'
                    : 'Hide Console'
                  : lang === 'ar'
                  ? 'فتح إدارة المالك'
                  : 'Open Console'}
              </span>
            </button>
          </div>

          {adminOpen && (
            <div className="pt-2 border-t border-[#0D4A42]/12 dark:border-[#3EF2DF]/18 space-y-5">
              {!adminStatus?.authenticated ? (
                adminStatus && !adminStatus.isBootstrapped ? (
                  /* First-run server owner setup */
                  <form onSubmit={handleAdminBootstrap} className="max-w-lg space-y-3">
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] leading-relaxed">
                      أدخل البريد الإلكتروني للمالك المعتمد لدى الخادم وحدد كلمة مرور الإدارة لأول مرة لتفعيل جلسة المدير:
                    </p>
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={adminEmailInput}
                      onChange={(e) => setAdminEmailInput(e.target.value)}
                      placeholder="Official administrator email"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={adminPassInput}
                        onChange={(e) => setAdminPassInput(e.target.value)}
                        placeholder="Passcode (8+ chars)"
                        className="px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
                      />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={adminPassConfirm}
                        onChange={(e) => setAdminPassConfirm(e.target.value)}
                        placeholder="Confirm passcode"
                        className="px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
                      />
                    </div>
                    {adminAuthError && (
                      <p className="text-xs text-[#D85A40] dark:text-[#FF957E]">{adminAuthError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={adminAuthLoading}
                      className="px-5 py-2.5 rounded-xl bg-[#093D38] dark:bg-[#E8C35A] text-white dark:text-[#041B18] text-xs font-bold cursor-pointer"
                    >
                      {adminAuthLoading ? 'جارٍ التحقق...' : 'تفعيل وتأكيد صلاحيات المالك'}
                    </button>
                  </form>
                ) : (
                  /* Standard server owner sign-in */
                  <form onSubmit={handleAdminLogin} className="max-w-lg space-y-3">
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                      تحقق الخادم مطلوب لإدارة محتوى التطبيق واقتراحات المستخدمين:
                    </p>
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={adminEmailInput}
                      onChange={(e) => setAdminEmailInput(e.target.value)}
                      placeholder="Administrator email"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
                    />
                    <input
                      type="password"
                      required
                      value={adminPassInput}
                      onChange={(e) => setAdminPassInput(e.target.value)}
                      placeholder="Administrator passcode"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-sm text-[#172320] dark:text-white"
                    />
                    {adminAuthError && (
                      <p className="text-xs text-[#D85A40] dark:text-[#FF957E]">{adminAuthError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={adminAuthLoading}
                      className="px-5 py-2.5 rounded-xl bg-[#093D38] dark:bg-[#E8C35A] text-white dark:text-[#041B18] text-xs font-bold cursor-pointer"
                    >
                      {adminAuthLoading ? 'جارٍ التحقق...' : 'دخول الإدارة'}
                    </button>
                  </form>
                )
              ) : (
                /* Authenticated Owner Management Dashboard */
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0D4A42]/8 dark:bg-[#3EF2DF]/10 rounded-xl px-4 py-2.5">
                    <span className="text-xs font-semibold text-[#093D38] dark:text-[#7FF9EB]" dir="ltr">
                      Verified Admin: {adminStatus.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleAdminLogout()}
                      className="px-3 py-1.5 rounded-lg bg-[#D85A40]/15 text-[#D85A40] dark:text-[#FF957E] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>خروج الإدارة</span>
                    </button>
                  </div>

                  {overviewLoading || !activeConfig ? (
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">جارٍ تحميل لوحة الإدارة...</p>
                  ) : (
                    <>
                      {/* Content & Layout Configuration */}
                      {draftConfig && (
                        <form onSubmit={handleSaveAdminConfig} className="space-y-4">
                          <h3 className="text-sm font-semibold text-[#093D38] dark:text-[#E8C35A]">
                            إدارة العناوين والإعلانات والمحتوى
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] text-[#52615D] dark:text-[#9EC5BE] mb-1">
                                عنوان الرئيسية (عربي)
                              </label>
                              <input
                                type="text"
                                value={draftConfig.heroTitleAr}
                                onChange={(e) =>
                                  setDraftConfig({ ...draftConfig, heroTitleAr: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-xs text-[#172320] dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-[#52615D] dark:text-[#9EC5BE] mb-1">
                                شريط تنبيه أعلى الصفحة (اختياري)
                              </label>
                              <input
                                type="text"
                                value={draftConfig.announcementAr}
                                onChange={(e) =>
                                  setDraftConfig({ ...draftConfig, announcementAr: e.target.value })
                                }
                                className="w-full px-3 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/25 text-xs text-[#172320] dark:text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE] mb-2">
                              إظهار / إخفاء الأقسام في الشاشة الرئيسية:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {MAIN_SECTIONS.map((sec) => {
                                const hidden = draftConfig.hiddenModuleIds.includes(sec.id);
                                return (
                                  <button
                                    key={sec.id}
                                    type="button"
                                    onClick={() => toggleModuleVisibility(sec.id)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border ${
                                      hidden
                                        ? 'bg-[#D85A40]/12 border-[#D85A40]/35 text-[#D85A40]'
                                        : 'bg-[#093D38]/10 dark:bg-[#3EF2DF]/15 border-[#093D38]/20 dark:border-[#3EF2DF]/30 text-[#093D38] dark:text-[#7FF9EB]'
                                    }`}
                                  >
                                    {getSectionTitle(sec, lang)} ({hidden ? 'مخفي' : 'ظاهر'})
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="submit"
                              disabled={savingConfig}
                              className="px-4 py-2 rounded-xl bg-[#093D38] dark:bg-[#E8C35A] text-white dark:text-[#041B18] text-xs font-bold cursor-pointer"
                            >
                              {savingConfig ? 'جارٍ الحفظ...' : 'حفظ ونشر التغييرات'}
                            </button>
                            {configSavedMsg && (
                              <span className="text-xs font-semibold text-[#093D38] dark:text-[#7FF9EB]">
                                {configSavedMsg}
                              </span>
                            )}
                          </div>
                        </form>
                      )}

                      {/* Submitted Suggestions Inbox */}
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-[#093D38] dark:text-[#E8C35A]">
                          الاقتراحات الواردة ({suggestions.length})
                        </h3>
                        {suggestions.length === 0 ? (
                          <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">لا توجد اقتراحات مستلمة بعد.</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {suggestions.map((s) => (
                              <div
                                key={s.id}
                                className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18]/80 border border-[#0D4A42]/12 dark:border-[#3EF2DF]/20 p-3 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <strong className="text-[#093D38] dark:text-white">{s.title}</strong>
                                  <span className="text-[10px] font-mono-num text-[#52615D] dark:text-[#9EC5BE]">
                                    {s.category} · {new Date(s.createdAt).toLocaleDateString('de-DE')}
                                  </span>
                                </div>
                                <p className="text-[#172320] dark:text-[#DCECE8]">{s.message}</p>
                                {s.senderEmail && (
                                  <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE]" dir="ltr">
                                    Reply: {s.senderEmail}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Owner-Only Source Health Telemetry */}
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-[#093D38] dark:text-[#E8C35A] inline-flex items-center gap-1.5">
                          <Activity className="w-4 h-4" />
                          <span>حالة المصادر الخلفية للمالك ({sourceHealth.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                          {sourceHealth.map((sh) => (
                            <div
                              key={sh.id}
                              className="rounded-xl bg-[#F7F3EA] dark:bg-[#041B18]/80 border border-[#0D4A42]/12 dark:border-[#3EF2DF]/20 p-2.5 text-xs flex items-center justify-between gap-2"
                            >
                              <span className="truncate font-german" dir="ltr">
                                {sh.name}
                              </span>
                              <span
                                className={`font-semibold shrink-0 ${
                                  sh.status === 'ok'
                                    ? 'text-[#0D4A42] dark:text-[#7FF9EB]'
                                    : 'text-[#D85A40] dark:text-[#FF957E]'
                                }`}
                              >
                                {sh.status} ({sh.itemCount})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
};
