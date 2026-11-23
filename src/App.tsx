import React, { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { UserDataProvider, useUserData } from './context/UserDataContext';
import { GlobalAudioProvider } from './components/players/GlobalAudioContext';
import { PersistentAudioBar } from './components/players/PersistentAudioBar';
import { YouTubeModalPlayer } from './components/players/YouTubeModalPlayer';
import { ArticleReaderModal } from './components/readers/ArticleReaderModal';
import { BrandCrestSvg, renderSectionSvgIcon } from './components/icons/SectionIcons';
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
import { LibrarySection } from './components/sections/LibrarySection';
import { UnifiedSearchModal } from './components/sections/UnifiedSearchModal';
import {
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
]);

function readSectionFromHash(): AppSectionId {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#/, '') as AppSectionId;
  return VALID_SECTIONS.has(raw) ? raw : 'home';
}

const DeutschFlowWorkspace: React.FC = () => {
  const { data } = useUserData();
  const [lang, setLang] = useState<UILanguage>('ar');
  const [activeSection, setActiveSection] = useState<AppSectionId>(() => readSectionFromHash());
  const [searchOpen, setSearchOpen] = useState(false);

  // Active modals
  const [readingArticle, setReadingArticle] = useState<NewsArticle | null>(null);
  const [activeVideo, setActiveVideo] = useState<{
    video: YouTubeVideo;
    related: YouTubeVideo[];
  } | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const onHashChange = () => {
      setActiveSection(readSectionFromHash());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateTo = useCallback((sec: AppSectionId) => {
    setActiveSection(sec);
    if (typeof window !== 'undefined') {
      const nextHash = sec === 'home' ? '' : `#${sec}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, '', nextHash || window.location.pathname);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const ui = UI_TEXT[lang];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3EA] text-[#1A2421]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#F7F3EA]/92 backdrop-blur-md border-b border-[#0E4B4B]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 text-start cursor-pointer whitespace-nowrap shrink-0"
          >
            <BrandCrestSvg className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
            <span className="text-base sm:text-lg font-editorial font-bold text-[#0E4B4B] tracking-tight">
              DeutschFlow Ultimate
            </span>
          </button>

          {/* Language Switch + Unified Search */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div
              className="flex items-center bg-white border border-[#0E4B4B]/14 rounded-xl p-0.5 text-xs"
              role="group"
              aria-label="Interface language"
            >
              {(['ar', 'de', 'en'] as UILanguage[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg font-semibold uppercase cursor-pointer transition-colors ${
                    lang === code
                      ? 'bg-[#0E4B4B] text-white'
                      : 'text-[#52615D] hover:text-[#0E4B4B]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="px-3 sm:px-4 py-2 rounded-xl bg-[#0E4B4B] text-white hover:bg-[#093535] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ui.unifiedSearch}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Either Home Hub Grid OR Dedicated Section View */}
      <main className="flex-1">
        {activeSection === 'home' ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-28">
            {/* Editorial Intro Banner */}
            <div className="bg-white rounded-3xl border border-[#0E4B4B]/12 p-6 sm:p-8 mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <p className="text-xs font-semibold tracking-wide text-[#D85A40]">
                  Your German Media Universe
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-editorial font-bold text-[#0E4B4B] leading-tight">
                  {ui.tagline}
                </h1>
                <p className="text-sm text-[#52615D] leading-relaxed">
                  {lang === 'ar'
                    ? 'اختر قسماً إعلامياً للبدء: الإذاعات الحية، غرفة الأخبار والصحف، قنوات يوتيوب والوثائقيات، البودكاست، القراءة وحفظ المفردات.'
                    : lang === 'de'
                    ? 'Wähle einen Medienbereich: Live-Radio, Nachrichten, Zeitungen, YouTube, Dokus, Podcasts, Leseraum und deine Lernbibliothek.'
                    : 'Choose any media universe below to listen, watch, read, and save German vocabulary in one personal hub.'}
                </p>
              </div>

              {/* Quick Personal Summary */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0 bg-[#FAF7F0] rounded-2xl border border-[#0E4B4B]/10 px-5 py-4">
                <div>
                  <p className="text-xs text-[#52615D]">{ui.minutesExposure}</p>
                  <p className="text-xl font-bold text-[#0E4B4B] font-mono-num">
                    {Math.round(data.exposureMinutes)}
                  </p>
                </div>
                <div className="w-px h-8 bg-[#0E4B4B]/15" />
                <div>
                  <p className="text-xs text-[#52615D]">{ui.vocabSavedCount}</p>
                  <p className="text-xl font-bold text-[#D85A40] font-mono-num">
                    {data.vocabulary.length}
                  </p>
                </div>
                {data.history[0] && (
                  <>
                    <div className="w-px h-8 bg-[#0E4B4B]/15 hidden sm:block" />
                    <button
                      type="button"
                      onClick={() => navigateTo('library')}
                      className="text-start max-w-[190px] cursor-pointer hidden sm:block"
                    >
                      <p className="text-[11px] text-[#52615D]">{ui.recentTitle}</p>
                      <p className="text-xs font-semibold text-[#0E4B4B] truncate font-german" dir="ltr">
                        {data.history[0].title}
                      </p>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 14 Main Section Cards ONLY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {MAIN_SECTIONS.map((sec) => {
                const accentRing =
                  sec.accent === 'coral'
                    ? 'group-hover:border-[#D85A40]/45'
                    : sec.accent === 'gold'
                    ? 'group-hover:border-[#B68934]/50'
                    : 'group-hover:border-[#0E4B4B]/45';

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => navigateTo(sec.id)}
                    className={`group df-card df-card-hover ${accentRing} rounded-2xl p-5 text-start flex flex-col justify-between gap-4 cursor-pointer min-h-[164px]`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#F7F3EA] border border-[#0E4B4B]/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                      {renderSectionSvgIcon(sec.id, 'w-10 h-10')}
                    </div>

                    <div>
                      <h2 className="text-base sm:text-lg font-semibold text-[#0E4B4B] mb-1">
                        {getSectionTitle(sec, lang)}
                      </h2>
                      <p className="text-xs text-[#52615D] leading-relaxed line-clamp-2">
                        {getSectionSubtitle(sec, lang)}
                      </p>
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
        ) : (
          <LibrarySection lang={lang} onBack={() => navigateTo('home')} />
        )}
      </main>

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

      <PersistentAudioBar />
    </div>
  );
};

export default function App() {
  return (
    <UserDataProvider>
      <GlobalAudioProvider>
        <DeutschFlowWorkspace />
      </GlobalAudioProvider>
    </UserDataProvider>
  );
}
