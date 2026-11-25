import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Home,
  Layers,
  Moon,
  Search,
  Settings,
  Star,
  Sun,
} from 'lucide-react';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { UserDataProvider, useUserData } from './context/UserDataContext';
import { GlobalAudioProvider } from './components/players/GlobalAudioContext';
import { PersistentAudioBar } from './components/players/PersistentAudioBar';
import { YouTubeModalPlayer } from './components/players/YouTubeModalPlayer';
import { ArticleReaderModal } from './components/readers/ArticleReaderModal';
import { renderSectionSvgIcon } from './components/icons/SectionIcons';
import { LandingPage } from './components/landing/LandingPage';
import { OfflineIndicator, PWAInstallButton } from './components/pwa/PWAInstallButton';
import { PWAUpdateBanner } from './components/pwa/PWAUpdateBanner';
import { RadioSection } from './components/sections/RadioSection';
import { NewsSection } from './components/sections/NewsSection';
import { NewspapersSection } from './components/sections/NewspapersSection';
import { YouTubeSection } from './components/sections/YouTubeSection';
import { DocumentariesSection } from './components/sections/DocumentariesSection';
import { PodcastsSection } from './components/sections/PodcastsSection';
import { MoviesSection } from './components/sections/MoviesSection';
import { LearningSection } from './components/sections/LearningSection';
import { TopicHubSection } from './components/sections/TopicHubSection';
import { FavoritesSection } from './components/sections/FavoritesSection';
import { LibrarySection, type LibraryTab } from './components/sections/LibrarySection';
import { SettingsSection } from './components/sections/SettingsSection';
import { UnifiedSearchModal } from './components/sections/UnifiedSearchModal';
import {
  HOME_SECTION_ORDER,
  MAIN_SECTIONS,
  UI_TEXT,
  getSectionSubtitle,
  getSectionTitle,
} from './i18n/translations';
import type { AppSectionId, NewsArticle, UILanguage, YouTubeVideo } from './types/media';

const VALID_SECTIONS = new Set<AppSectionId>([
  'home',
  'radio',
  'news',
  'newspapers',
  'youtube',
  'documentaries',
  'podcasts',
  'movies',
  'learning',
  'reading',
  'culture',
  'science',
  'kids',
  'favorites',
  'library',
  'settings',
]);

function readSectionFromHash(): AppSectionId {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#/, '') as AppSectionId;
  return VALID_SECTIONS.has(raw) ? raw : 'home';
}

function shouldStartOnLanding(): boolean {
  if (typeof window === 'undefined') return true;
  const hash = window.location.hash.replace(/^#/, '');
  return !hash;
}

const ModuleArtwork: React.FC<{
  sectionId: Exclude<AppSectionId, 'home' | 'settings'>;
  title: string;
}> = ({ sectionId, title }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full aspect-[16/10] bg-gradient-to-br from-[#0A463E] to-[#041B18] flex items-center justify-center">
        <div className="df-icon-stage w-16 h-16 rounded-2xl flex items-center justify-center">
          {renderSectionSvgIcon(sectionId, 'w-12 h-12')}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#041E1A]">
      <img
        src={`/assets/illustrations/${sectionId}.webp`}
        alt={title}
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.04]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#F7F3EA]/90 via-[#F7F3EA]/20 to-transparent dark:from-[#041D1A] dark:via-[#041D1A]/35 dark:to-transparent"
      />
    </div>
  );
};

const DeutschFlowWorkspace: React.FC = () => {
  const { data } = useUserData();
  const { lang, setLang, theme, toggleTheme, appConfig } = usePreferences();

  const [showLanding, setShowLanding] = useState<boolean>(() => shouldStartOnLanding());
  const [activeSection, setActiveSection] = useState<AppSectionId>(() => readSectionFromHash());
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('vocab');
  const [searchOpen, setSearchOpen] = useState(false);

  // Active modals
  const [readingArticle, setReadingArticle] = useState<NewsArticle | null>(null);
  const [activeVideo, setActiveVideo] = useState<{
    video: YouTubeVideo;
    related: YouTubeVideo[];
  } | null>(null);

  useEffect(() => {
    const onHashChange = () => {
      const rawHash = window.location.hash.replace(/^#/, '');
      if (!rawHash) {
        setShowLanding(true);
        return;
      }
      const next = readSectionFromHash();
      setActiveSection(next);
      setShowLanding(false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateTo = useCallback((sec: AppSectionId, opts?: { libTab?: LibraryTab }) => {
    if (opts?.libTab) {
      setLibraryTab(opts.libTab);
    } else if (sec === 'library') {
      setLibraryTab('vocab');
    }
    setShowLanding(false);
    setActiveSection(sec);
    if (typeof window !== 'undefined') {
      const nextHash = sec === 'home' ? '#home' : `#${sec}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, '', nextHash);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Fingerprint-only entry: the ONLY caller of handleContinueFromLanding is
  // the biometric card's onAuthenticated (fingerprint success) callback.
  const handleContinueFromLanding = useCallback(
    (targetSection?: AppSectionId) => {
      // Only invoked by the biometric card's onAuthenticated callback —
      // after the green check the user is taken straight into the app.
      navigateTo(targetSection || 'home');
    },
    [navigateTo]
  );

  const ui = UI_TEXT[lang];
  const isRtl = lang === 'ar';

  if (showLanding) {
    return (
      <>
        <PWAUpdateBanner lang={lang} />
        <LandingPage
          lang={lang}
          onChangeLang={setLang}
          theme={theme}
          onToggleTheme={toggleTheme}
          onContinue={handleContinueFromLanding}
          appConfig={appConfig}
        />
        <OfflineIndicator lang={lang} />
        <PersistentAudioBar hasBottomNav={false} />
      </>
    );
  }

  const hiddenSet = new Set(appConfig?.hiddenModuleIds || []);
  const orderedSections = HOME_SECTION_ORDER
    .map((id) => MAIN_SECTIONS.find((s) => s.id === id))
    .filter((s): s is (typeof MAIN_SECTIONS)[number] => Boolean(s && !hiddenSet.has(s.id)));

  const heroTitle =
    (lang === 'ar'
      ? appConfig?.heroTitleAr
      : lang === 'de'
      ? appConfig?.heroTitleDe
      : appConfig?.heroTitleEn) || ui.tagline;

  const heroSubtitle =
    (lang === 'ar'
      ? appConfig?.heroSubtitleAr
      : lang === 'de'
      ? appConfig?.heroSubtitleDe
      : appConfig?.heroSubtitleEn) ||
    (lang === 'ar'
      ? 'اكتشف، تعلّم واستمتع بمحتوى ألماني أصلي لتطوير لغتك يومياً عبر الإذاعة، الأخبار، الصحف، الفيديو، البودكاست والقراءة التفاعلية.'
      : lang === 'de'
      ? 'Entdecke, lerne und erlebe authentische deutsche Medien – Radio, Nachrichten, Zeitungen, German Studio, Dokus, Podcasts und Leseraum.'
      : 'Discover, learn, and immerse yourself daily with live German radio, news, newspapers, German Studio, documentaries, podcasts, and interactive reading.');

  const announcement =
    lang === 'ar'
      ? appConfig?.announcementAr
      : lang === 'de'
      ? appConfig?.announcementDe
      : appConfig?.announcementEn;

  const bottomNavLabels = {
    flashcards: lang === 'de' ? 'Karten' : lang === 'en' ? 'Flashcards' : 'بطاقات المراجعة',
    favorites: lang === 'de' ? 'Favoriten' : lang === 'en' ? 'Favorites' : 'المفضلة',
    home: lang === 'de' ? 'Start' : lang === 'en' ? 'Home' : 'الرئيسية',
    stats: lang === 'de' ? 'Statistik' : lang === 'en' ? 'My Stats' : 'إحصائياتي',
    settings: lang === 'de' ? 'Optionen' : lang === 'en' ? 'Settings' : 'الإعدادات',
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3EA] text-[#172320] dark:bg-[#041B18] dark:text-[#F4EFE3]">
      {/* Thin Top German Tricolor Hairline */}
      <div className="h-[3px] w-full flex shrink-0" aria-hidden="true">
        <div className="flex-1 bg-[#111111]" />
        <div className="flex-1 bg-[#DD0000]" />
        <div className="flex-1 bg-[#FFCE00]" />
      </div>

      {/* Auto-Update Prompt Banner */}
      <PWAUpdateBanner lang={lang} />

      {/* Official Glassmorphic Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#F7F3EA]/92 dark:bg-[#041D1A]/88 backdrop-blur-md border-b border-[#0D4A42]/12 dark:border-[#3EF2DF]/22">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand Logo + Wordmark */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 text-start cursor-pointer whitespace-nowrap shrink-0"
          >
            <img
              src="/brand/deutschflow-logo.png"
              alt="DeutschFlow"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#D4AF37]/75 shadow-sm object-cover shrink-0"
            />
            <span className="text-base sm:text-xl font-editorial font-bold tracking-tight text-[#093D38] dark:text-white">
              Deutsch<span className="text-[#C8962E] dark:text-[#E8C35A]">Flow</span>
            </span>
          </button>

          {/* Controls: PWA Install + Theme Toggle + Language Switch + Unified Search */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <PWAInstallButton lang={lang} variant="header" />

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={
                theme === 'dark'
                  ? lang === 'ar'
                    ? 'الوضع الفاتح'
                    : 'Light Mode'
                  : lang === 'ar'
                  ? 'الوضع الداكن'
                  : 'Dark Mode'
              }
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-[#08302B] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/28 text-[#093D38] dark:text-[#E8C35A] hover:border-[#C8962E] flex items-center justify-center cursor-pointer transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Language Segmented Pill (EN | DE | AR) */}
            <div
              className="flex items-center bg-white dark:bg-[#062924] border border-[#0D4A42]/15 dark:border-[#3EF2DF]/30 rounded-full p-0.5 text-[11px] sm:text-xs shadow-2xs"
              role="group"
              aria-label="Interface language"
            >
              {(['en', 'de', 'ar'] as UILanguage[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2 sm:px-2.5 py-1 rounded-full font-semibold uppercase cursor-pointer transition-colors ${
                    lang === code
                      ? 'bg-[#093D38] text-white dark:bg-[#E8C35A] dark:text-[#041B18]'
                      : 'text-[#52615D] dark:text-[#CFE5E0] hover:text-[#093D38] dark:hover:text-white'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Unified Search Pill */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#093D38] text-white hover:bg-[#052522] dark:bg-[#08332E] dark:border dark:border-[#3EF2DF]/38 dark:hover:border-[#E8C35A] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              <Search className="w-3.5 h-3.5 text-[#E8C35A]" />
              <span className="hidden sm:inline">{ui.unifiedSearch}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeSection === 'home' ? (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-32">
            {announcement && announcement.trim() && (
              <div className="mb-4 rounded-2xl bg-[#D4AF37]/15 border border-[#C8962E]/35 px-4 py-2.5 text-xs font-medium text-[#6E4F12] dark:text-[#FBE8A6] text-center">
                {announcement}
              </div>
            )}

            {/* Official Reference Hero Banner (Brandenburg Gate + Holographic Heart + Berlin Tower) */}
            <section className="relative overflow-hidden rounded-3xl border border-[#0D4A42]/18 dark:border-[#3EF2DF]/32 bg-[#052622] text-white shadow-xl mb-7 min-h-[210px] sm:min-h-[245px] flex items-center">
              {/* Left visual backdrop (Brandenburg Gate + glowing German flag) */}
              <img
                src="/assets/illustrations/hero-left.webp"
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute inset-y-0 left-0 w-[56%] sm:w-[48%] h-full object-cover object-left opacity-80 dark:opacity-90"
              />
              {/* Right visual backdrop (Holographic heart + Berlin Fernsehturm) */}
              <img
                src="/assets/illustrations/hero-right.webp"
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute inset-y-0 right-0 w-[56%] sm:w-[48%] h-full object-cover object-right opacity-80 dark:opacity-90"
              />
              {/* Atmospheric readable gradient scrim */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#041B18]/75 via-[#052924]/88 to-[#041B18]/75"
              />

              {/* Centered Editorial Copy & Personal Stats */}
              <div className="relative z-10 w-full px-5 sm:px-10 py-6 sm:py-8 text-center max-w-3xl mx-auto space-y-3.5">
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-[#E8C35A]">
                  Your German Media Universe
                </p>
                <h1 className="text-2xl sm:text-4xl font-editorial font-bold text-white leading-tight drop-shadow-sm">
                  {heroTitle}
                </h1>
                <p className="text-xs sm:text-sm text-[#DFECE9] leading-relaxed max-w-2xl mx-auto">
                  {heroSubtitle}
                </p>

                {/* Quick Personal Learning Strip */}
                <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs">
                  <div className="px-3.5 py-1.5 rounded-full bg-white/10 border border-[#3EF2DF]/30 backdrop-blur-sm">
                    <strong className="text-[#7FF9EB] font-mono-num me-1.5">
                      {Math.round(data.exposureMinutes)}
                    </strong>
                    <span className="text-[#DFECE9]">{ui.minutesExposure}</span>
                  </div>
                  <div className="px-3.5 py-1.5 rounded-full bg-white/10 border border-[#E8C35A]/35 backdrop-blur-sm">
                    <strong className="text-[#E8C35A] font-mono-num me-1.5">
                      {data.vocabulary.length}
                    </strong>
                    <span className="text-[#DFECE9]">{ui.vocabSavedCount}</span>
                  </div>
                  {data.history[0] && (
                    <button
                      type="button"
                      onClick={() => navigateTo('library', { libTab: 'history' })}
                      className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/18 border border-white/20 backdrop-blur-sm max-w-[230px] truncate cursor-pointer text-[#F7F3EA]"
                    >
                      <span className="text-[#E8C35A] me-1">{ui.recentTitle}:</span>
                      <span className="font-german" dir="ltr">
                        {data.history[0].title}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* 14 Module Cards Grid matching Reference Images 1 & 2 (3-col RTL Row 3 = reading | learning | documentaries) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
              {orderedSections.map((sec) => {
                const title = getSectionTitle(sec, lang);
                const subtitle = getSectionSubtitle(sec, lang);

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => navigateTo(sec.id)}
                    className="group df-module-card rounded-2xl overflow-hidden text-start flex flex-col justify-between cursor-pointer"
                  >
                    <ModuleArtwork sectionId={sec.id} title={title} />

                    <div className="p-3 sm:p-4 flex items-center justify-between gap-2.5 flex-1">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm sm:text-base font-bold text-[#093D38] dark:text-white leading-snug truncate">
                          {title}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-[#52615D] dark:text-[#A9C9C3] leading-relaxed line-clamp-2 mt-0.5">
                          {subtitle}
                        </p>
                      </div>

                      {/* Signature Gold Directional Action Circle */}
                      <span
                        aria-hidden="true"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#F3CF68] to-[#C8962E] text-[#041B18] flex items-center justify-center shrink-0 shadow-md transition-transform duration-200 group-hover:scale-110"
                      >
                        {isRtl ? (
                          <ArrowLeft className="w-4 h-4 stroke-[2.4]" />
                        ) : (
                          <ArrowRight className="w-4 h-4 stroke-[2.4]" />
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : activeSection === 'radio' ? (
          <RadioSection lang={lang} onBack={() => navigateTo('home')} />
        ) : activeSection === 'news' ? (
          <NewsSection
            sectionId="news"
            lang={lang}
            onBack={() => navigateTo('home')}
            onOpenArticle={setReadingArticle}
          />
        ) : activeSection === 'newspapers' ? (
          <NewspapersSection
            lang={lang}
            onBack={() => navigateTo('home')}
            onOpenArticle={setReadingArticle}
          />
        ) : activeSection === 'youtube' ? (
          <YouTubeSection
            sectionId="youtube"
            lang={lang}
            onBack={() => navigateTo('home')}
            onSelectVideo={(video, related) => setActiveVideo({ video, related })}
          />
        ) : activeSection === 'documentaries' ? (
          <DocumentariesSection
            lang={lang}
            onBack={() => navigateTo('home')}
            onSelectVideo={(video, related) => setActiveVideo({ video, related })}
          />
        ) : activeSection === 'podcasts' ? (
          <PodcastsSection lang={lang} onBack={() => navigateTo('home')} />
        ) : activeSection === 'movies' ? (
          <MoviesSection lang={lang} onBack={() => navigateTo('home')} />
        ) : activeSection === 'learning' ? (
          <LearningSection
            lang={lang}
            onBack={() => navigateTo('home')}
            onOpenArticle={setReadingArticle}
            onSelectVideo={(video, related) => setActiveVideo({ video, related })}
          />
        ) : activeSection === 'reading' ? (
          <NewsSection
            sectionId="reading"
            lang={lang}
            onBack={() => navigateTo('home')}
            onOpenArticle={setReadingArticle}
          />
        ) : activeSection === 'culture' ||
          activeSection === 'science' ||
          activeSection === 'kids' ? (
          <TopicHubSection
            sectionId={activeSection}
            lang={lang}
            onBack={() => navigateTo('home')}
            onOpenArticle={setReadingArticle}
            onSelectVideo={(video, related) => setActiveVideo({ video, related })}
          />
        ) : activeSection === 'favorites' ? (
          <FavoritesSection
            lang={lang}
            onBack={() => navigateTo('home')}
            onOpenArticle={setReadingArticle}
            onSelectVideo={(video, related) => setActiveVideo({ video, related })}
          />
        ) : activeSection === 'settings' ? (
          <SettingsSection
            onBack={() => navigateTo('home')}
            onNavigate={(sec) => navigateTo(sec)}
          />
        ) : (
          <LibrarySection
            lang={lang}
            initialTab={libraryTab}
            onBack={() => navigateTo('home')}
          />
        )}
      </main>

      {/* Fixed Glassmorphic 5-Icon Bottom Navigation Bar (Matching Reference Image 1) */}
      <nav
        aria-label="Primary bottom navigation"
        className="df-bottom-nav fixed bottom-2.5 inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(640px,calc(100%-2rem))] z-40 rounded-3xl px-2 sm:px-4 py-1.5"
      >
        <div className="grid grid-cols-5 items-center gap-1">
          {/* 1. Flashcards (Right in RTL) */}
          <button
            type="button"
            onClick={() => navigateTo('library', { libTab: 'flashcards' })}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-colors cursor-pointer ${
              activeSection === 'library' && libraryTab === 'flashcards'
                ? 'text-[#C8962E] dark:text-[#E8C35A]'
                : 'text-[#52615D] dark:text-[#B9D7D1] hover:text-[#093D38] dark:hover:text-white'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] font-semibold truncate max-w-full px-0.5">
              {bottomNavLabels.flashcards}
            </span>
          </button>

          {/* 2. Favorites */}
          <button
            type="button"
            onClick={() => navigateTo('favorites')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-colors cursor-pointer ${
              activeSection === 'favorites'
                ? 'text-[#C8962E] dark:text-[#E8C35A]'
                : 'text-[#52615D] dark:text-[#B9D7D1] hover:text-[#093D38] dark:hover:text-white'
            }`}
          >
            <Star className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] font-semibold truncate max-w-full px-0.5">
              {bottomNavLabels.favorites}
            </span>
          </button>

          {/* 3. Center Glowing Golden Home Orb */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex flex-col items-center justify-center -mt-4 cursor-pointer group"
          >
            <span
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-105 ${
                activeSection === 'home'
                  ? 'bg-gradient-to-br from-[#F7D774] via-[#D4AF37] to-[#B8821D] text-[#041B18] border-[#FFF3C4] shadow-[0_0_20px_rgba(232,195,90,0.55)]'
                  : 'bg-[#093D38] text-[#E8C35A] border-[#E8C35A]/65 dark:bg-[#0B463F] shadow-lg'
              }`}
            >
              <Home className="w-5 h-5" />
            </span>
            <span
              className={`text-[10px] sm:text-[11px] font-bold mt-0.5 ${
                activeSection === 'home'
                  ? 'text-[#093D38] dark:text-[#E8C35A]'
                  : 'text-[#52615D] dark:text-[#B9D7D1]'
              }`}
            >
              {bottomNavLabels.home}
            </span>
          </button>

          {/* 4. My Stats / Vocab Bank */}
          <button
            type="button"
            onClick={() => navigateTo('library', { libTab: 'vocab' })}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-colors cursor-pointer ${
              activeSection === 'library' && libraryTab !== 'flashcards'
                ? 'text-[#C8962E] dark:text-[#E8C35A]'
                : 'text-[#52615D] dark:text-[#B9D7D1] hover:text-[#093D38] dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] font-semibold truncate max-w-full px-0.5">
              {bottomNavLabels.stats}
            </span>
          </button>

          {/* 5. Settings (Left in RTL) */}
          <button
            type="button"
            onClick={() => navigateTo('settings')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-colors cursor-pointer ${
              activeSection === 'settings'
                ? 'text-[#C8962E] dark:text-[#E8C35A]'
                : 'text-[#52615D] dark:text-[#B9D7D1] hover:text-[#093D38] dark:hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] font-semibold truncate max-w-full px-0.5">
              {bottomNavLabels.settings}
            </span>
          </button>
        </div>
      </nav>

      {/* Modals & Persistent Audio Player */}
      <YouTubeModalPlayer
        video={activeVideo?.video || null}
        relatedVideos={activeVideo?.related || []}
        onSelectRelated={(video) =>
          setActiveVideo((prev) => (prev ? { video, related: prev.related } : null))
        }
        onClose={() => setActiveVideo(null)}
      />

      <ArticleReaderModal
        article={readingArticle}
        onClose={() => setReadingArticle(null)}
      />

      <UnifiedSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onOpenArticle={setReadingArticle}
        onSelectVideo={(video, related) => setActiveVideo({ video, related })}
        onNavigateSection={(sec) => navigateTo(sec)}
      />

      <OfflineIndicator lang={lang} />
      <PersistentAudioBar hasBottomNav />
    </div>
  );
};

export default function App() {
  return (
    <PreferencesProvider>
      <UserDataProvider>
        <GlobalAudioProvider>
          <DeutschFlowWorkspace />
        </GlobalAudioProvider>
      </UserDataProvider>
    </PreferencesProvider>
  );
}
