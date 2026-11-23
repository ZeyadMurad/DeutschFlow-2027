import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookmarkPlus,
  ExternalLink,
  Headphones,
  Heart,
  ListPlus,
  Loader2,
  Pause,
  Play,
  Search,
} from 'lucide-react';
import { discoverPodcasts, fetchPodcasts, loadPodcastEpisodes } from '../../services/api';
import type {
  PodcastCategory,
  PodcastEpisode,
  PodcastShowWithEpisodes,
  UILanguage,
} from '../../types/media';
import { useGlobalAudio } from '../players/GlobalAudioContext';
import { useUserData } from '../../context/UserDataContext';
import { SectionShell } from './SectionShell';

interface PodcastsSectionProps {
  lang: UILanguage;
  onBack: () => void;
  defaultCategory?: PodcastCategory;
}

const PODCAST_CATS: Array<{ id: PodcastCategory; labelAr: string }> = [
  { id: 'all', labelAr: 'كل البرامج' },
  { id: 'news_daily', labelAr: 'الأخبار اليومية' },
  { id: 'politics', labelAr: 'السياسة والمجتمع' },
  { id: 'knowledge_science', labelAr: 'المعرفة والعلوم' },
  { id: 'history', labelAr: 'التاريخ' },
  { id: 'society_culture', labelAr: 'الحوارات والثقافة' },
  { id: 'true_crime', labelAr: 'التحقيقات والجرائم' },
  { id: 'learning', labelAr: 'مخصص للمتعلمين' },
];

export const PodcastsSection: React.FC<PodcastsSectionProps> = ({
  lang,
  onBack,
  defaultCategory = 'all',
}) => {
  const {
    mode,
    status,
    activeEpisode,
    playPodcastEpisode,
    enqueuePodcastEpisode,
    togglePlayPause,
  } = useGlobalAudio();
  const { data, isFavorite, toggleFavorite } = useUserData();

  const [shows, setShows] = useState<PodcastShowWithEpisodes[]>([]);
  const [selectedShow, setSelectedShow] = useState<PodcastShowWithEpisodes | null>(null);
  const [category, setCategory] = useState<PodcastCategory>(defaultCategory);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [offlineCache, setOfflineCache] = useState(false);

  // Live iTunes DE Discovery
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverResults, setDiscoverResults] = useState<
    Array<{
      id: string;
      title: string;
      publisher: string;
      rssUrl: string;
      websiteUrl: string;
      coverUrl?: string;
      genre: string;
    }>
  >([]);
  const [discovering, setDiscovering] = useState(false);
  const [loadingDiscoveredId, setLoadingDiscoveredId] = useState<string | null>(null);

  const loadShows = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetchPodcasts({ force });
      setShows(res.shows);
      setLastUpdated(res.lastUpdated);
      setOfflineCache(Boolean(res.fromOfflineCache));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShows(false);
  }, [loadShows]);

  const filteredShows = useMemo(() => {
    return shows.filter((s) => {
      if (category !== 'all' && s.category !== category) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${s.title} ${s.publisher} ${s.descriptionDe} ${s.descriptionAr}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [category, query, shows]);

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoverQuery.trim()) return;
    setDiscovering(true);
    try {
      const results = await discoverPodcasts(discoverQuery.trim());
      setDiscoverResults(results);
    } finally {
      setDiscovering(false);
    }
  };

  const handleOpenDiscovered = async (item: (typeof discoverResults)[number]) => {
    setLoadingDiscoveredId(item.id);
    try {
      const loaded = await loadPodcastEpisodes({
        id: item.id,
        title: item.title,
        publisher: item.publisher,
        rssUrl: item.rssUrl,
        websiteUrl: item.websiteUrl,
        category: 'society_culture',
        descriptionDe: item.genre,
        descriptionAr: item.genre,
        coverUrl: item.coverUrl,
      });
      setSelectedShow(loaded);
    } finally {
      setLoadingDiscoveredId(null);
    }
  };

  // Show Episodes Detail View
  if (selectedShow) {
    const showFav = isFavorite('podcasts', selectedShow.id);
    return (
      <SectionShell sectionId="podcasts" lang={lang} onBack={onBack} lastUpdated={lastUpdated}>
        <button
          type="button"
          onClick={() => setSelectedShow(null)}
          className="mb-4 px-3.5 py-2 rounded-xl bg-white dark:bg-[#072B26] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 text-xs font-semibold text-[#0E4B4B] dark:text-[#7FF9EB] inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#F7F3EA] dark:hover:bg-[#0B3C35] dark:bg-[#041B18]"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>العودة إلى قائمة البودكاست</span>
        </button>

        <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-5 sm:p-6 mb-6 flex flex-col sm:flex-row gap-5">
          {selectedShow.coverUrl ? (
            <img
              src={selectedShow.coverUrl}
              alt={selectedShow.title}
              referrerPolicy="no-referrer"
              className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover shrink-0 border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 bg-[#EFE8D8]"
            />
          ) : (
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-[#0E4B4B]/10 dark:bg-[#3EF2DF]/12 flex items-center justify-center shrink-0">
              <Headphones className="w-10 h-10 text-[#0E4B4B] dark:text-[#7FF9EB]" />
            </div>
          )}

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">{selectedShow.publisher}</p>
                <h2 className="text-xl sm:text-2xl font-editorial font-semibold text-[#1A2421] dark:text-[#F4EFE3]" dir="ltr">
                  {selectedShow.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFavorite({ kind: 'podcasts', item: selectedShow })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                    showFav
                      ? 'bg-[#D85A40] text-white border-[#D85A40]'
                      : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#0E4B4B] dark:text-[#7FF9EB] border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${showFav ? 'fill-current' : ''}`} />
                  <span>{showFav ? 'متابَع' : 'حفظ البرنامج'}</span>
                </button>
                <a
                  href={selectedShow.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#0E4B4B]/10 dark:bg-[#3EF2DF]/12 text-[#0E4B4B] dark:text-[#7FF9EB] text-xs font-medium inline-flex items-center gap-1"
                >
                  <span>الموقع الرسمي</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <p className="text-sm text-[#52615D] dark:text-[#9EC5BE]">{selectedShow.descriptionAr}</p>
            <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] font-german" dir="ltr">
              {selectedShow.descriptionDe}
            </p>
          </div>
        </div>

        {/* Episodes List */}
        {selectedShow.episodes.length === 0 ? (
          <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-8 text-center space-y-2">
            <p className="text-sm font-medium text-[#1A2421] dark:text-[#F4EFE3]">
              تعذّر جلب حلقات هذا البودكاست مباشرة الآن.
            </p>
            {selectedShow.lastError && (
              <p className="text-xs text-[#D85A40]">{selectedShow.lastError}</p>
            )}
            <a
              href={selectedShow.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E4B4B] text-white text-xs font-medium mt-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح صفحة البودكاست الرسمية</span>
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedShow.episodes.map((ep: PodcastEpisode) => {
              const isCurr = mode === 'podcast' && activeEpisode?.id === ep.id;
              const isPlaying = isCurr && status === 'playing';
              const savedPos = data.podcastPositions[ep.id] || 0;
              const isFavEp = isFavorite('episodes', ep.id);
              const isListenLater = isFavorite('listenLater', ep.id);

              return (
                <article
                  key={ep.id}
                  className={`df-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCurr ? 'border-[#0E4B4B] ring-1 ring-[#0E4B4B]/20' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-xs text-[#52615D] dark:text-[#9EC5BE] flex flex-wrap items-center gap-2 font-mono-num">
                      <span>{new Date(ep.publishedAt).toLocaleDateString('de-DE')}</span>
                      {ep.duration && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{ep.duration}</span>
                        </>
                      )}
                      {savedPos > 15 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#D85A40] font-semibold">
                            محفوظ عند {Math.floor(savedPos / 60)}:{String(savedPos % 60).padStart(2, '0')}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-[#1A2421] dark:text-[#F4EFE3] font-german" dir="ltr" lang="de">
                      {ep.title}
                    </h3>
                    {ep.description && (
                      <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] line-clamp-2 font-german" dir="ltr" lang="de">
                        {ep.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {ep.hasAudio ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            isCurr
                              ? togglePlayPause()
                              : playPodcastEpisode(ep, selectedShow.episodes)
                          }
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                            isPlaying
                              ? 'bg-[#D85A40] text-white'
                              : 'bg-[#0E4B4B] text-white hover:bg-[#093535]'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          <span>
                            {isPlaying ? 'إيقاف مؤقت' : savedPos > 15 ? 'استئناف' : 'تشغيل الحلقة'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => enqueuePodcastEpisode(ep)}
                          title="إضافة إلى قائمة التشغيل"
                          className="p-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] text-[#0E4B4B] dark:text-[#7FF9EB] hover:bg-[#EFE8D8] dark:hover:bg-[#0B3C35] cursor-pointer"
                        >
                          <ListPlus className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <a
                        href={ep.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] text-[#0E4B4B] dark:text-[#7FF9EB] text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>التشغيل في الموقع الرسمي</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleFavorite({ kind: 'episodes', item: ep })}
                      aria-label="Favorite episode"
                      className={`p-2 rounded-xl cursor-pointer ${
                        isFavEp ? 'text-[#D85A40]' : 'text-[#52615D] dark:text-[#9EC5BE] hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFavEp ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite({ kind: 'listenLater', item: ep })}
                      aria-label="Listen later"
                      className={`p-2 rounded-xl cursor-pointer ${
                        isListenLater ? 'text-[#0E4B4B] dark:text-[#7FF9EB]' : 'text-[#52615D] dark:text-[#9EC5BE] hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB]'
                      }`}
                    >
                      <BookmarkPlus className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SectionShell>
    );
  }

  return (
    <SectionShell
      sectionId="podcasts"
      lang={lang}
      onBack={onBack}
      onRefresh={() => void loadShows(true)}
      refreshing={loading}
      lastUpdated={lastUpdated}
      offlineCache={offlineCache}
    >
      {/* Filters & Discovery */}
      <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-4 sm:p-5 mb-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#52615D] dark:text-[#9EC5BE] absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="تصفية البودكاستات المدمجة (11KM, Was jetzt?, Hotel Matze, Mordlust...)"
              className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 text-sm"
            />
          </div>

          <form onSubmit={handleDiscover} className="flex gap-2">
            <input
              type="text"
              value={discoverQuery}
              onChange={(e) => setDiscoverQuery(e.target.value)}
              placeholder="اكتشف بودكاست ألماني إضافي من دليل أبل الألماني..."
              className="flex-1 px-3 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 text-sm"
            />
            <button
              type="submit"
              disabled={discovering}
              className="px-4 py-2.5 rounded-xl bg-[#D85A40] text-white text-xs font-semibold hover:bg-[#c54d35] cursor-pointer shrink-0 inline-flex items-center gap-1.5"
            >
              {discovering && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>اكتشف</span>
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PODCAST_CATS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                category === cat.id
                  ? 'bg-[#0E4B4B] text-white'
                  : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#1A2421] dark:text-[#F4EFE3] hover:bg-[#EFE8D8] dark:hover:bg-[#0B3C35]'
              }`}
            >
              {cat.labelAr}
            </button>
          ))}
        </div>

        {discoverResults.length > 0 && (
          <div className="pt-3 border-t border-[#0E4B4B]/10 dark:border-[#3EF2DF]/24 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#0E4B4B] dark:text-[#7FF9EB]">نتائج الاكتشاف من الدليل الألماني:</p>
              <button
                type="button"
                onClick={() => setDiscoverResults([])}
                className="text-xs text-[#D85A40] cursor-pointer"
              >
                إغلاق
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {discoverResults.map((dr) => (
                <button
                  key={dr.id}
                  type="button"
                  onClick={() => void handleOpenDiscovered(dr)}
                  className="p-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] hover:bg-[#EFE8D8] dark:hover:bg-[#0B3C35] flex items-center gap-3 text-start cursor-pointer"
                >
                  {dr.coverUrl && (
                    <img
                      src={dr.coverUrl}
                      alt={dr.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#1A2421] dark:text-[#F4EFE3] truncate font-german" dir="ltr">
                      {dr.title}
                    </p>
                    <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE] truncate">{dr.publisher}</p>
                  </div>
                  {loadingDiscoveredId === dr.id && (
                    <Loader2 className="w-4 h-4 animate-spin text-[#0E4B4B] dark:text-[#7FF9EB]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Shows Grid */}
      {loading && shows.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="h-44 rounded-2xl bg-white/70 dark:bg-[#072B26]/65 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredShows.map((show) => {
            const latestEp = show.episodes[0];
            const isFav = isFavorite('podcasts', show.id);

            return (
              <article
                key={show.id}
                className="df-card df-card-hover rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex gap-3.5">
                  {show.coverUrl ? (
                    <img
                      src={show.coverUrl}
                      alt={show.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-[#0E4B4B]/10 dark:border-[#3EF2DF]/24 bg-[#EFE8D8]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/10 dark:border-[#3EF2DF]/24 flex items-center justify-center shrink-0">
                      <Headphones className="w-7 h-7 text-[#0E4B4B] dark:text-[#7FF9EB]" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3
                        onClick={() => setSelectedShow(show)}
                        className="text-base font-semibold text-[#1A2421] dark:text-[#F4EFE3] line-clamp-2 cursor-pointer hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB] font-german"
                        dir="ltr"
                      >
                        {show.title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => toggleFavorite({ kind: 'podcasts', item: show })}
                        className={`p-1 rounded-lg cursor-pointer shrink-0 ${
                          isFav ? 'text-[#D85A40]' : 'text-[#52615D] dark:text-[#9EC5BE]'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] mt-0.5 truncate">{show.publisher}</p>
                    <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] line-clamp-2 mt-1.5">
                      {lang === 'de' ? show.descriptionDe : show.descriptionAr}
                    </p>
                  </div>
                </div>

                {latestEp && (
                  <div className="bg-[#FAF7F0] dark:bg-[#05231F] rounded-xl p-3 border border-[#0E4B4B]/8 dark:border-[#3EF2DF]/24 text-xs space-y-1">
                    <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE] font-mono-num">
                      أحدث حلقة · {new Date(latestEp.publishedAt).toLocaleDateString('de-DE')}
                      {latestEp.duration ? ` · ${latestEp.duration}` : ''}
                    </p>
                    <p className="font-medium text-[#1A2421] dark:text-[#F4EFE3] line-clamp-1 font-german" dir="ltr">
                      {latestEp.title}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedShow(show)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#0E4B4B] text-white text-xs font-semibold hover:bg-[#093535] cursor-pointer"
                  >
                    عرض الحلقات ({show.episodes.length})
                  </button>
                  {latestEp?.hasAudio && (
                    <button
                      type="button"
                      onClick={() => playPodcastEpisode(latestEp, show.episodes)}
                      className="px-3 py-2 rounded-xl bg-[#D85A40] text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-[#c54d35] cursor-pointer"
                      title="تشغيل أحدث حلقة"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>تشغيل</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
};
