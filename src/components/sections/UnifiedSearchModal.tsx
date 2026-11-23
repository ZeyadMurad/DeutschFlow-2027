import React, { useState } from 'react';
import { BookOpen, ExternalLink, Loader2, Play, Radio, Search, X } from 'lucide-react';
import { runUnifiedSearch } from '../../services/api';
import type {
  MovieSeriesTitle,
  NewsArticle,
  PodcastEpisode,
  PodcastShowMeta,
  RadioStation,
  StreamingPlatform,
  YouTubeVideo,
} from '../../types/media';
import { useGlobalAudio } from '../players/GlobalAudioContext';

interface UnifiedSearchModalProps {
  open: boolean;
  onClose: () => void;
  onOpenArticle: (article: NewsArticle) => void;
  onSelectVideo: (video: YouTubeVideo, related: YouTubeVideo[]) => void;
  onNavigateSection: (sec: 'podcasts' | 'movies') => void;
}

type SearchTypeFilter = 'all' | 'radio' | 'news' | 'videos' | 'podcasts' | 'movies';

export const UnifiedSearchModal: React.FC<UnifiedSearchModalProps> = ({
  open,
  onClose,
  onOpenArticle,
  onSelectVideo,
  onNavigateSection,
}) => {
  const { playRadio, playPodcastEpisode } = useGlobalAudio();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<SearchTypeFilter>('all');
  const [onlyInternal, setOnlyInternal] = useState(false);
  const [onlyFree, setOnlyFree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [results, setResults] = useState<{
    radio: RadioStation[];
    news: NewsArticle[];
    videos: YouTubeVideo[];
    podcasts: PodcastShowMeta[];
    episodes: PodcastEpisode[];
    movies: MovieSeriesTitle[];
    platforms: StreamingPlatform[];
  }>({
    radio: [],
    news: [],
    videos: [],
    podcasts: [],
    episodes: [],
    movies: [],
    platforms: [],
  });

  if (!open) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await runUnifiedSearch(query.trim());
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  const showType = (t: Exclude<SearchTypeFilter, 'all'>) =>
    filterType === 'all' || filterType === t;

  const visibleMovies = results.movies.filter((m) => {
    if (onlyInternal) return false; // Platforms require official external opening
    if (onlyFree && m.accessType !== 'free' && m.accessType !== 'free_restricted') return false;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Unified Search"
    >
      <div className="bg-[#FAF7F0] text-[#1A2421] w-full max-w-4xl rounded-2xl border border-[#0E4B4B]/20 shadow-2xl overflow-hidden my-6">
        <div className="bg-[#0E4B4B] text-[#F7F3EA] px-5 py-4 flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-editorial font-semibold">
            البحث الموحد في عالم الإعلام الألماني
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#52615D] absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن محطة إذاعية، صحيفة، خبر، فيديو، بودكاست، فيلم أو منصة..."
                className="w-full ps-9 pe-3 py-3 rounded-xl bg-white border border-[#0E4B4B]/20 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-[#D85A40] text-white text-sm font-semibold hover:bg-[#c54d35] cursor-pointer inline-flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>بحث</span>
            </button>
          </form>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'radio', label: 'إذاعات' },
                { id: 'news', label: 'أخبار ومقالات' },
                { id: 'videos', label: 'فيديوهات' },
                { id: 'podcasts', label: 'بودكاست' },
                { id: 'movies', label: 'أفلام ومنصات' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterType(t.id as SearchTypeFilter)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                    filterType === t.id
                      ? 'bg-[#0E4B4B] text-white'
                      : 'bg-white text-[#1A2421] border border-[#0E4B4B]/12'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyInternal}
                  onChange={(e) => setOnlyInternal(e.target.checked)}
                  className="accent-[#0E4B4B]"
                />
                <span>تشغيل داخلي فقط</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyFree}
                  onChange={(e) => setOnlyFree(e.target.checked)}
                  className="accent-[#0E4B4B]"
                />
                <span>مجاني فقط</span>
              </label>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[58vh] overflow-y-auto space-y-5 pt-2">
            {!searched && (
              <p className="text-xs text-[#52615D] text-center py-8">
                اكتب كلمة مفتاحية بالألمانية أو اسم مصدر (مثال: Berlin, Wirtschaft, Tagesschau, ARTE, WDR).
              </p>
            )}

            {searched && showType('radio') && results.radio.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#0E4B4B] mb-2">
                  الإذاعات ({results.radio.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {results.radio.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        playRadio(st);
                        onClose();
                      }}
                      className="p-3 rounded-xl bg-white border border-[#0E4B4B]/12 flex items-center justify-between text-start hover:border-[#0E4B4B] cursor-pointer"
                    >
                      <span className="text-xs font-semibold font-german truncate" dir="ltr">
                        {st.name}
                      </span>
                      <Radio className="w-4 h-4 text-[#0E4B4B] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searched && showType('news') && results.news.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#0E4B4B] mb-2">
                  الأخبار والمقالات ({results.news.length})
                </h3>
                <div className="space-y-2">
                  {results.news.map((art) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => {
                        onOpenArticle(art);
                        onClose();
                      }}
                      className="w-full p-3 rounded-xl bg-white border border-[#0E4B4B]/12 flex items-center justify-between gap-3 text-start hover:border-[#0E4B4B] cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] text-[#0E4B4B] font-semibold">{art.sourceName}</p>
                        <p className="text-xs font-medium text-[#1A2421] truncate font-german" dir="ltr">
                          {art.title}
                        </p>
                      </div>
                      <BookOpen className="w-4 h-4 text-[#0E4B4B] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searched && showType('videos') && results.videos.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#0E4B4B] mb-2">
                  فيديوهات ووثائقيات ({results.videos.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {results.videos.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        onSelectVideo(v, results.videos);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl bg-white border border-[#0E4B4B]/12 flex items-center gap-3 text-start hover:border-[#0E4B4B] cursor-pointer"
                    >
                      <img
                        src={v.thumbnailUrl}
                        alt={v.title}
                        referrerPolicy="no-referrer"
                        className="w-20 aspect-video rounded-lg object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium line-clamp-2 font-german" dir="ltr">
                          {v.title}
                        </p>
                        <p className="text-[11px] text-[#52615D] mt-0.5">{v.channelName}</p>
                      </div>
                      <Play className="w-4 h-4 text-[#D85A40] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searched &&
              showType('podcasts') &&
              (results.podcasts.length > 0 || results.episodes.length > 0) && (
                <div>
                  <h3 className="text-xs font-semibold text-[#0E4B4B] mb-2">
                    البودكاست ({results.podcasts.length + results.episodes.length})
                  </h3>
                  <div className="space-y-2">
                    {results.podcasts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onNavigateSection('podcasts');
                          onClose();
                        }}
                        className="w-full p-3 rounded-xl bg-white border border-[#0E4B4B]/12 flex items-center justify-between text-start cursor-pointer"
                      >
                        <span className="text-xs font-semibold font-german" dir="ltr">
                          {p.title} · {p.publisher}
                        </span>
                        <span className="text-[11px] text-[#0E4B4B]">عرض الحلقات</span>
                      </button>
                    ))}
                    {results.episodes.map((ep) => (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => {
                          if (ep.hasAudio) playPodcastEpisode(ep);
                          onClose();
                        }}
                        className="w-full p-3 rounded-xl bg-white border border-[#0E4B4B]/12 flex items-center justify-between text-start cursor-pointer"
                      >
                        <span className="text-xs font-german truncate" dir="ltr">
                          {ep.title} ({ep.showTitle})
                        </span>
                        <Play className="w-4 h-4 text-[#0E4B4B] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {searched && showType('movies') && (visibleMovies.length > 0 || results.platforms.length > 0) && (
              <div>
                <h3 className="text-xs font-semibold text-[#0E4B4B] mb-2">الأفلام والمنصات</h3>
                <div className="space-y-2">
                  {visibleMovies.map((m) => (
                    <a
                      key={m.id}
                      href={m.watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl bg-white border border-[#0E4B4B]/12 flex items-center justify-between"
                    >
                      <span className="text-xs font-semibold font-german" dir="ltr">
                        {m.title} ({m.platformName})
                      </span>
                      <ExternalLink className="w-4 h-4 text-[#0E4B4B]" />
                    </a>
                  ))}
                  {!onlyInternal &&
                    results.platforms.map((pl) => (
                      <button
                        key={pl.id}
                        type="button"
                        onClick={() => {
                          onNavigateSection('movies');
                          onClose();
                        }}
                        className="w-full p-3 rounded-xl bg-white border border-[#0E4B4B]/12 flex items-center justify-between text-start cursor-pointer"
                      >
                        <span className="text-xs font-semibold font-german" dir="ltr">
                          {pl.name}
                        </span>
                        <span className="text-[11px] text-[#0E4B4B]">دليل المنصات</span>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
