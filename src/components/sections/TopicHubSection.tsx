import React, { useEffect, useState } from 'react';
import { BookOpen, Play, Radio } from 'lucide-react';
import {
  fetchNewsFeed,
  fetchPodcasts,
  fetchRadioStations,
  fetchYouTubeVideos,
} from '../../services/api';
import type {
  NewsArticle,
  PodcastShowWithEpisodes,
  RadioStation,
  UILanguage,
  YouTubeVideo,
} from '../../types/media';
import { useGlobalAudio } from '../players/GlobalAudioContext';
import { SectionShell } from './SectionShell';

interface TopicHubSectionProps {
  sectionId: 'culture' | 'science' | 'kids';
  lang: UILanguage;
  onBack: () => void;
  onOpenArticle: (article: NewsArticle) => void;
  onSelectVideo: (video: YouTubeVideo, related: YouTubeVideo[]) => void;
}

export const TopicHubSection: React.FC<TopicHubSectionProps> = ({
  sectionId,
  lang,
  onBack,
  onOpenArticle,
  onSelectVideo,
}) => {
  const { playRadio, playPodcastEpisode } = useGlobalAudio();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastShowWithEpisodes[]>([]);
  const [radios, setRadios] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTopic = async (force = false) => {
    setLoading(true);
    try {
      if (sectionId === 'culture') {
        const [newsRes, ytRes, podRes, radRes] = await Promise.all([
          fetchNewsFeed({ force }),
          fetchYouTubeVideos({ force }),
          fetchPodcasts({ force }),
          fetchRadioStations({ category: 'culture', limit: 12, force }),
        ]);
        setArticles(
          newsRes.articles.filter((a) =>
            ['zeit', 'faz', 'sz', 'taz'].includes(a.sourceId)
          )
        );
        setVideos(
          ytRes.videos.filter((v) =>
            ['ARTEde', 'Terra X (ZDF)', 'MrWissen2go', 'ZDFinfo Dokus & Reportagen'].includes(
              v.channelName
            )
          )
        );
        setPodcasts(
          podRes.shows.filter((p) => ['history', 'society_culture'].includes(p.category))
        );
        setRadios(radRes.stations);
      } else if (sectionId === 'science') {
        const [newsRes, ytRes, podRes, radRes] = await Promise.all([
          fetchNewsFeed({ force }),
          fetchYouTubeVideos({ force }),
          fetchPodcasts({ category: 'knowledge_science', force }),
          fetchRadioStations({ category: 'educational', limit: 12, force }),
        ]);
        setArticles(
          newsRes.articles.filter((a) =>
            ['science', 'tech', 'health'].includes(a.category)
          )
        );
        setVideos(
          ytRes.videos.filter((v) =>
            ['Quarks (WDR)', 'Terra X (ZDF)', 'Simplicissimus'].includes(v.channelName)
          )
        );
        setPodcasts(podRes.shows);
        setRadios(radRes.stations);
      } else {
        // kids
        const [ytRes, podRes, radRes, newsRes] = await Promise.all([
          fetchYouTubeVideos({ category: 'kids', force }),
          fetchPodcasts({ category: 'learning', force }),
          fetchRadioStations({ category: 'kids', limit: 18, force }),
          fetchNewsFeed({ category: 'simplified', force }),
        ]);
        setVideos(ytRes.videos);
        setPodcasts(podRes.shows);
        setRadios(radRes.stations);
        setArticles(newsRes.articles);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTopic(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  return (
    <SectionShell
      sectionId={sectionId}
      lang={lang}
      onBack={onBack}
      onRefresh={() => void loadTopic(true)}
      refreshing={loading}
    >
      {/* Radio for this topic */}
      {radios.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-[#0E4B4B] mb-3">
            إذاعات ألمانية متخصصة ({radios.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {radios.slice(0, 8).map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => playRadio(st)}
                className="df-card df-card-hover rounded-xl p-3.5 flex items-center justify-between gap-3 text-start cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1A2421] truncate font-german" dir="ltr">
                    {st.name}
                  </p>
                  <p className="text-[11px] text-[#52615D] truncate">{st.state || 'Deutschland'}</p>
                </div>
                <span className="w-8 h-8 rounded-full bg-[#0E4B4B] text-white flex items-center justify-center shrink-0">
                  <Radio className="w-4 h-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Videos for this topic */}
      {videos.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-[#0E4B4B] mb-3">
            مقاطع مرئية ووثائقيات مختارة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.slice(0, 12).map((v) => (
              <article key={v.id} className="df-card df-card-hover rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    onSelectVideo(
                      v,
                      videos.filter((x) => x.channelId === v.channelId)
                    )
                  }
                  className="relative block w-full aspect-video bg-black cursor-pointer"
                >
                  <img
                    src={v.thumbnailUrl}
                    alt={v.title}
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
                    {v.channelName}
                  </span>
                </button>
                <div className="p-3.5">
                  <h3
                    onClick={() =>
                      onSelectVideo(
                        v,
                        videos.filter((x) => x.channelId === v.channelId)
                      )
                    }
                    className="text-sm font-semibold text-[#1A2421] line-clamp-2 cursor-pointer font-german"
                    dir="ltr"
                  >
                    {v.title}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Podcasts */}
      {podcasts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-[#0E4B4B] mb-3">برامج بودكاست</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {podcasts.map((show) => (
              <div key={show.id} className="df-card rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-3">
                  {show.coverUrl && (
                    <img
                      src={show.coverUrl}
                      alt={show.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-[#1A2421] font-german" dir="ltr">
                      {show.title}
                    </h3>
                    <p className="text-xs text-[#52615D]">{show.publisher}</p>
                  </div>
                </div>
                {show.episodes.slice(0, 2).map((ep) => (
                  <div
                    key={ep.id}
                    className="p-2.5 rounded-xl bg-[#FAF7F0] flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-german line-clamp-1" dir="ltr">
                      {ep.title}
                    </span>
                    {ep.hasAudio && (
                      <button
                        type="button"
                        onClick={() => playPodcastEpisode(ep, show.episodes)}
                        className="p-1.5 rounded-lg bg-[#0E4B4B] text-white shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Articles */}
      {articles.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-[#0E4B4B] mb-3">مقالات وتقارير</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.slice(0, 12).map((art) => (
              <article key={art.id} className="df-card rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-xs text-[#0E4B4B] font-semibold mb-1">{art.sourceName}</p>
                  <h3
                    onClick={() => onOpenArticle(art)}
                    className="text-sm font-semibold text-[#1A2421] cursor-pointer hover:text-[#0E4B4B] font-german"
                    dir="ltr"
                  >
                    {art.title}
                  </h3>
                  <p className="text-xs text-[#52615D] line-clamp-2 mt-1 font-german" dir="ltr">
                    {art.excerpt}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenArticle(art)}
                  className="py-1.5 px-3 rounded-lg bg-[#0E4B4B] text-white text-xs font-medium inline-flex items-center justify-center gap-1 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>فتح للقراءة والاستماع</span>
                </button>
              </article>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  );
};
