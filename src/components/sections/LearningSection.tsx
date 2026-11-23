import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Headphones, Play, Volume2 } from 'lucide-react';
import { fetchNewsFeed, fetchPodcasts, fetchYouTubeVideos } from '../../services/api';
import type {
  CEFRLevel,
  NewsArticle,
  PodcastShowWithEpisodes,
  UILanguage,
  YouTubeVideo,
} from '../../types/media';
import { useGlobalAudio } from '../players/GlobalAudioContext';
import { SectionShell } from './SectionShell';

interface LearningSectionProps {
  lang: UILanguage;
  onBack: () => void;
  onOpenArticle: (article: NewsArticle) => void;
  onSelectVideo: (video: YouTubeVideo, related: YouTubeVideo[]) => void;
}

const CEFR_FILTERS: Array<{ id: 'all' | CEFRLevel; label: string }> = [
  { id: 'all', label: 'كل المستويات التعليمية' },
  { id: 'A1', label: 'A1 مبتدئ' },
  { id: 'A2', label: 'A2 أساسي' },
  { id: 'B1', label: 'B1 متوسط' },
  { id: 'B2', label: 'B2 فوق المتوسط' },
  { id: 'C1', label: 'C1 متقدم' },
  { id: 'C2', label: 'C2 إتقان' },
];

export const LearningSection: React.FC<LearningSectionProps> = ({
  lang,
  onBack,
  onOpenArticle,
  onSelectVideo,
}) => {
  const { playPodcastEpisode, playArticleAudio } = useGlobalAudio();
  const [cefr, setCefr] = useState<'all' | CEFRLevel>('all');
  const [simplifiedNews, setSimplifiedNews] = useState<NewsArticle[]>([]);
  const [learningPodcasts, setLearningPodcasts] = useState<PodcastShowWithEpisodes[]>([]);
  const [learningVideos, setLearningVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async (force = false) => {
    setLoading(true);
    try {
      const [newsRes, podRes, ytRes] = await Promise.all([
        fetchNewsFeed({ category: 'simplified', force }),
        fetchPodcasts({ category: 'learning', force }),
        fetchYouTubeVideos({ category: 'learning', force }),
      ]);
      setSimplifiedNews(newsRes.articles);
      setLearningPodcasts(podRes.shows);
      setLearningVideos(ytRes.videos);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll(false);
  }, []);

  const filteredNews = useMemo(
    () =>
      simplifiedNews.filter((a) => cefr === 'all' || a.cefrLevel === cefr),
    [cefr, simplifiedNews]
  );

  const filteredPodcasts = useMemo(
    () =>
      learningPodcasts.filter((p) => cefr === 'all' || p.cefrLevel === cefr),
    [cefr, learningPodcasts]
  );

  const filteredVideos = useMemo(
    () =>
      learningVideos.filter((v) => cefr === 'all' || v.cefrLevel === cefr),
    [cefr, learningVideos]
  );

  return (
    <SectionShell
      sectionId="learning"
      lang={lang}
      onBack={onBack}
      onRefresh={() => void loadAll(true)}
      refreshing={loading}
    >
      {/* Level selector */}
      <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-4 sm:p-5 mb-6 space-y-3">
        <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
          يعرض هذا القسم حصراً المصادر التعليمية والمحتوى الألماني المبسط المصنّف فعلياً للمتعلمين (مثل DW Learn German و Nachrichtenleicht و Langsam gesprochene Nachrichten و Easy German و Slow German)، دون تخمين مستويات على الصحف العامة.
        </p>

        <div className="flex flex-wrap gap-1.5">
          {CEFR_FILTERS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => setCefr(lvl.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                cefr === lvl.id
                  ? 'bg-[#0E4B4B] text-white'
                  : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#1A2421] dark:text-[#F4EFE3] hover:bg-[#EFE8D8] dark:hover:bg-[#0B3C35]'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Simplified Reading & Audio News */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#0E4B4B] dark:text-[#7FF9EB] mb-3">
          1. أخبار وقراءة بالألمانية المبسطة — استمع واقرأ واحفظ الكلمات
        </h2>
        {loading && filteredNews.length === 0 ? (
          <div className="h-32 rounded-2xl bg-white/70 dark:bg-[#072B26]/65 animate-pulse" />
        ) : filteredNews.length === 0 ? (
          <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/10 dark:border-[#3EF2DF]/24 p-6 text-xs text-[#52615D] dark:text-[#9EC5BE]">
            لا توجد نشرات مبسطة لهذا المستوى حالياً. للمستويات المتقدمة B2/C1/C2 جرّب غرفة الأخبار والصحف والبودكاست العام!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNews.slice(0, 9).map((art) => (
              <article key={art.id} className="df-card rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs text-[#52615D] dark:text-[#9EC5BE] mb-1.5">
                    <span className="font-semibold text-[#0E4B4B] dark:text-[#7FF9EB]">{art.sourceName}</span>
                    {art.cefrLevel && ` · ${art.cefrLevel}`}
                    {' · '}
                    <span className="font-mono-num">
                      {new Date(art.publishedAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>
                  <h3
                    onClick={() => onOpenArticle(art)}
                    className="text-sm font-semibold text-[#1A2421] dark:text-[#F4EFE3] cursor-pointer hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB] font-german"
                    dir="ltr"
                  >
                    {art.title}
                  </h3>
                  <p className="text-xs text-[#52615D] dark:text-[#9EC5BE] line-clamp-3 mt-1.5 font-german" dir="ltr">
                    {art.excerpt}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#0E4B4B]/8 dark:border-[#3EF2DF]/24">
                  <button
                    type="button"
                    onClick={() => onOpenArticle(art)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-[#0E4B4B] text-white text-xs font-medium inline-flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>قراءة وحفظ كلمات</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => playArticleAudio(art, false)}
                    className="px-3 py-1.5 rounded-lg bg-[#D85A40]/12 text-[#D85A40] text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    {art.audioUrl ? <Headphones className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>استماع</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* 2. Learner Podcasts */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#0E4B4B] dark:text-[#7FF9EB] mb-3">
          2. بودكاست مخصص لمتعلمي الألمانية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredPodcasts.map((show) => (
            <div key={show.id} className="df-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {show.coverUrl && (
                  <img
                    src={show.coverUrl}
                    alt={show.title}
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#1A2421] dark:text-[#F4EFE3] font-german truncate" dir="ltr">
                    {show.title}
                  </h3>
                  <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                    {show.publisher} {show.cefrLevel ? `· ${show.cefrLevel}` : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {show.episodes.slice(0, 3).map((ep) => (
                  <div
                    key={ep.id}
                    className="p-2.5 rounded-xl bg-[#FAF7F0] dark:bg-[#05231F] flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-german text-[#1A2421] dark:text-[#F4EFE3] line-clamp-1" dir="ltr">
                      {ep.title}
                    </span>
                    {ep.hasAudio && (
                      <button
                        type="button"
                        onClick={() => playPodcastEpisode(ep, show.episodes)}
                        className="p-1.5 rounded-lg bg-[#0E4B4B] text-white shrink-0 cursor-pointer"
                        title="تشغيل الحلقة"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Learner YouTube Channels */}
      <div>
        <h2 className="text-base font-semibold text-[#0E4B4B] dark:text-[#7FF9EB] mb-3">
          3. فيديوهات تعلم الألمانية (Easy German, DW Learn German, 24h Deutsch, Slow German, lingoni, Herr Antrim)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.slice(0, 18).map((video) => (
            <article key={video.id} className="df-card df-card-hover rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  onSelectVideo(
                    video,
                    filteredVideos.filter((v) => v.channelId === video.channelId)
                  )
                }
                className="relative block w-full aspect-video bg-black cursor-pointer group"
              >
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-11 h-11 rounded-full bg-[#D85A40]/95 text-white flex items-center justify-center">
                    <Play className="w-4 h-4 fill-current ms-0.5" />
                  </span>
                </div>
                <span className="absolute bottom-2 start-3 text-[11px] font-semibold text-white">
                  {video.channelName} {video.cefrLevel ? `· ${video.cefrLevel}` : ''}
                </span>
              </button>
              <div className="p-3.5">
                <h3
                  onClick={() =>
                    onSelectVideo(
                      video,
                      filteredVideos.filter((v) => v.channelId === video.channelId)
                    )
                  }
                  className="text-sm font-semibold text-[#1A2421] dark:text-[#F4EFE3] line-clamp-2 cursor-pointer font-german"
                  dir="ltr"
                >
                  {video.title}
                </h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
};
