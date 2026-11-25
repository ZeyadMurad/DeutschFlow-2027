import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, ExternalLink, Heart, Play, Search, Sparkles } from 'lucide-react';
import { fetchYouTubeVideos } from '../../services/api';
import type {
  UILanguage,
  YouTubeCategory,
  YouTubeChannelMeta,
  YouTubeVideo,
} from '../../types/media';
import { useUserData } from '../../context/UserDataContext';
import { SectionShell } from './SectionShell';

interface YouTubeSectionProps {
  sectionId?: 'youtube' | 'documentaries' | 'learning' | 'culture' | 'science' | 'kids';
  lang: UILanguage;
  onBack: () => void;
  defaultCategory?: YouTubeCategory;
  lockedCategory?: YouTubeCategory;
  onSelectVideo: (video: YouTubeVideo, channelVideos: YouTubeVideo[]) => void;
}

const YT_CATEGORIES: Array<{ id: YouTubeCategory; labelAr: string; labelDe: string }> = [
  { id: 'all', labelAr: 'الكل', labelDe: 'Alle' },
  { id: 'news', labelAr: 'الأخبار', labelDe: 'Nachrichten' },
  { id: 'documentary', labelAr: 'الوثائقيات', labelDe: 'Dokumentationen' },
  { id: 'investigation', labelAr: 'التحقيقات', labelDe: 'Investigativer Journalismus' },
  { id: 'learning', labelAr: 'تعلم الألمانية', labelDe: 'Deutsch lernen' },
  { id: 'talk_podcast', labelAr: 'الحوارات والبودكاست', labelDe: 'Talk & Podcasts' },
  { id: 'culture_science', labelAr: 'الثقافة والعلوم', labelDe: 'Kultur & Wissen' },
  { id: 'kids', labelAr: 'الأطفال', labelDe: 'Kinder' },
];

export const YouTubeSection: React.FC<YouTubeSectionProps> = ({
  sectionId = 'youtube',
  lang,
  onBack,
  defaultCategory = 'all',
  lockedCategory,
  onSelectVideo,
}) => {
  const { isFavorite, toggleFavorite, openLearningEngine } = useUserData();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [channels, setChannels] = useState<YouTubeChannelMeta[]>([]);
  const [category, setCategory] = useState<YouTubeCategory>(lockedCategory || defaultCategory);
  const [channelFilter, setChannelFilter] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [offlineCache, setOfflineCache] = useState(false);

  const loadVideos = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetchYouTubeVideos({ force });
      setVideos(res.videos);
      setChannels(res.channels);
      setLastUpdated(res.lastUpdated);
      setOfflineCache(Boolean(res.fromOfflineCache));
    } catch {
      setOfflineCache(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVideos(false);
  }, [loadVideos]);

  const activeCategory = lockedCategory || category;

  const visibleChannels = useMemo(
    () =>
      channels.filter((c) => activeCategory === 'all' || c.category === activeCategory),
    [channels, activeCategory]
  );

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (activeCategory !== 'all' && v.category !== activeCategory) return false;
      if (channelFilter && v.channelId !== channelFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${v.title} ${v.description} ${v.channelName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeCategory, channelFilter, query, videos]);

  return (
    <SectionShell
      sectionId={sectionId}
      lang={lang}
      onBack={onBack}
      onRefresh={() => void loadVideos(true)}
      refreshing={loading}
      lastUpdated={lastUpdated}
      offlineCache={offlineCache}
    >
      {/* Controls */}
      <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-4 sm:p-5 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#52615D] dark:text-[#9EC5BE] absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الفيديوهات والقنوات الألمانية..."
              className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 text-sm"
            />
          </div>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            aria-label="Filter by YouTube channel"
            className="px-3 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 text-sm min-w-[210px]"
          >
            <option value="">كل القنوات ({visibleChannels.length})</option>
            {visibleChannels.map((ch) => (
              <option key={ch.channelId} value={ch.channelId}>
                {ch.name}
              </option>
            ))}
          </select>
        </div>

        {!lockedCategory && (
          <div className="flex flex-wrap gap-1.5">
            {YT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(cat.id);
                  setChannelFilter('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  category === cat.id
                    ? 'bg-[#0E4B4B] text-white'
                    : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#1A2421] dark:text-[#F4EFE3] hover:bg-[#EFE8D8] dark:hover:bg-[#0B3C35]'
                }`}
              >
                {lang === 'de' ? cat.labelDe : cat.labelAr}
              </button>
            ))}
          </div>
        )}

        {/* Channel Quick Selector Strip */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleChannels.map((ch) => {
            const active = channelFilter === ch.channelId;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setChannelFilter(active ? '' : ch.channelId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#D85A40] text-white border-[#D85A40]'
                    : 'bg-[#FAF7F0] dark:bg-[#05231F] text-[#0E4B4B] dark:text-[#7FF9EB] border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 hover:border-[#0E4B4B]/40'
                }`}
              >
                <span className="font-german">{ch.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Video Grid */}
      {loading && videos.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="h-64 rounded-2xl bg-white/70 dark:bg-[#072B26]/65 animate-pulse" />
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-10 text-center text-sm text-[#52615D] dark:text-[#9EC5BE]">
          لا توجد فيديوهات مطابقة حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.slice(0, 60).map((video) => {
            const isFav = isFavorite('videos', video.id);
            const isWatchLater = isFavorite('watchLater', video.id);
            const channelVids = videos.filter((v) => v.channelId === video.channelId);

            return (
              <article
                key={video.id}
                className="df-card df-card-hover rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectVideo(video, channelVids)}
                    className="relative block w-full aspect-video bg-[#131D1A] overflow-hidden group cursor-pointer"
                  >
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-12 h-12 rounded-full bg-[#D85A40]/95 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <Play className="w-5 h-5 fill-current ms-0.5" />
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-[11px] text-white/95">
                      <span className="font-semibold truncate">{video.channelName}</span>
                      <span className="font-mono-num shrink-0">
                        {new Date(video.publishedAt).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </button>

                  <div className="p-4">
                    <h3
                      onClick={() => onSelectVideo(video, channelVids)}
                      className="text-sm sm:text-base font-semibold text-[#1A2421] dark:text-[#F4EFE3] line-clamp-2 cursor-pointer hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB] font-german"
                      dir="ltr"
                      lang="de"
                    >
                      {video.title}
                    </h3>
                    {video.description && (
                      <p
                        className="text-xs text-[#52615D] dark:text-[#9EC5BE] line-clamp-2 mt-1.5 font-german"
                        dir="ltr"
                        lang="de"
                      >
                        {video.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-[#FAF7F0] dark:bg-[#05231F] border-t border-[#0E4B4B]/8 dark:border-[#3EF2DF]/24 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectVideo(video, channelVids)}
                      className="px-3 py-1.5 rounded-lg bg-[#0E4B4B] text-white text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#093535] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>تشغيل داخل التطبيق</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openLearningEngine({
                          sourceId: video.id,
                          contentType: 'video',
                          title: video.title,
                          text: `${video.title}. ${video.description}`.trim(),
                          sourceName: video.channelName,
                          sourceUrl: video.watchUrl,
                          videoId: video.videoId,
                          difficulty: 'original',
                          targetCefr: video.cefrLevel,
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#E8C35A]/22 text-[#7A5710] dark:text-[#E8C35A] text-xs font-bold inline-flex items-center gap-1 hover:bg-[#E8C35A]/35 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>تعلّم</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleFavorite({ kind: 'videos', item: video })}
                      aria-label="Favorite video"
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        isFav ? 'text-[#D85A40]' : 'text-[#52615D] dark:text-[#9EC5BE] hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite({ kind: 'watchLater', item: video })}
                      aria-label="Watch later"
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        isWatchLater ? 'text-[#0E4B4B] dark:text-[#7FF9EB]' : 'text-[#52615D] dark:text-[#9EC5BE] hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB]'
                      }`}
                    >
                      <BookmarkPlus className="w-4 h-4" />
                    </button>
                    <a
                      href={video.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="فتح على YouTube"
                      className="p-1.5 rounded-lg text-[#52615D] dark:text-[#9EC5BE] hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB]"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
};
