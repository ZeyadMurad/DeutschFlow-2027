import React, { useState } from 'react';
import { BookOpen, ExternalLink, Play, Radio, Trash2 } from 'lucide-react';
import type { NewsArticle, UILanguage, YouTubeVideo } from '../../types/media';
import { useUserData } from '../../context/UserDataContext';
import { useGlobalAudio } from '../players/GlobalAudioContext';
import { SectionShell } from './SectionShell';

interface FavoritesSectionProps {
  lang: UILanguage;
  onBack: () => void;
  onOpenArticle: (article: NewsArticle) => void;
  onSelectVideo: (video: YouTubeVideo, related: YouTubeVideo[]) => void;
}

type FavTab =
  | 'radio'
  | 'articles'
  | 'videos'
  | 'episodes'
  | 'movies'
  | 'readLater'
  | 'watchLater'
  | 'listenLater';

export const FavoritesSection: React.FC<FavoritesSectionProps> = ({
  lang,
  onBack,
  onOpenArticle,
  onSelectVideo,
}) => {
  const { data, toggleFavorite } = useUserData();
  const { playRadio, playPodcastEpisode } = useGlobalAudio();
  const [tab, setTab] = useState<FavTab>('radio');

  const tabs: Array<{ id: FavTab; label: string; count: number }> = [
    { id: 'radio', label: 'الإذاعات المفضلة', count: data.favorites.radio.length },
    { id: 'articles', label: 'المقالات المحفوظة', count: data.favorites.articles.length },
    { id: 'videos', label: 'الفيديوهات المفضلة', count: data.favorites.videos.length },
    { id: 'episodes', label: 'حلقات البودكاست', count: data.favorites.episodes.length },
    { id: 'movies', label: 'الأفلام والمسلسلات', count: data.favorites.movies.length },
    { id: 'readLater', label: 'اقرأ لاحقاً', count: data.favorites.readLater.length },
    { id: 'watchLater', label: 'شاهد لاحقاً', count: data.favorites.watchLater.length },
    { id: 'listenLater', label: 'استمع لاحقاً', count: data.favorites.listenLater.length },
  ];

  return (
    <SectionShell sectionId="favorites" lang={lang} onBack={onBack}>
      <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-4 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                tab === t.id
                  ? 'bg-[#0E4B4B] text-white'
                  : 'bg-[#F7F3EA] text-[#1A2421] hover:bg-[#EFE8D8]'
              }`}
            >
              {t.label} (<span className="font-mono-num">{t.count}</span>)
            </button>
          ))}
        </div>
      </div>

      {/* Radio */}
      {tab === 'radio' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.favorites.radio.length === 0 ? (
            <EmptyBox text="لم تحفظ أي محطة إذاعية بعد." />
          ) : (
            data.favorites.radio.map((st) => (
              <div key={st.id} className="df-card rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#1A2421] truncate font-german" dir="ltr">
                    {st.name}
                  </h3>
                  <p className="text-xs text-[#52615D]">{st.state || 'Deutschland'}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => playRadio(st)}
                    className="p-2 rounded-xl bg-[#0E4B4B] text-white cursor-pointer"
                  >
                    <Radio className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite({ kind: 'radio', item: st })}
                    className="p-2 rounded-xl bg-[#D85A40]/10 text-[#D85A40] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Articles & Read Later */}
      {(tab === 'articles' || tab === 'readLater') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.favorites[tab].length === 0 ? (
            <EmptyBox text="لا توجد مقالات محفوظة في هذه القائمة بعد." />
          ) : (
            data.favorites[tab].map((art) => (
              <div key={art.id} className="df-card rounded-2xl p-4 flex flex-col justify-between gap-3">
                <div>
                  <p className="text-xs text-[#0E4B4B] font-semibold">{art.sourceName}</p>
                  <h3
                    onClick={() => onOpenArticle(art)}
                    className="text-sm font-semibold text-[#1A2421] mt-1 cursor-pointer font-german"
                    dir="ltr"
                  >
                    {art.title}
                  </h3>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenArticle(art)}
                    className="px-3 py-1.5 rounded-lg bg-[#0E4B4B] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>قراءة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFavorite({ kind: tab, item: art })}
                    className="p-1.5 rounded-lg text-[#D85A40] hover:bg-[#D85A40]/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Videos & Watch Later */}
      {(tab === 'videos' || tab === 'watchLater') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.favorites[tab].length === 0 ? (
            <EmptyBox text="لا توجد فيديوهات محفوظة في هذه القائمة بعد." />
          ) : (
            data.favorites[tab].map((v) => (
              <div key={v.id} className="df-card rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => onSelectVideo(v, data.favorites[tab])}
                  className="relative block w-full aspect-video bg-black cursor-pointer"
                >
                  <img
                    src={v.thumbnailUrl}
                    alt={v.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Play className="w-9 h-9 text-white fill-current" />
                  </div>
                </button>
                <div className="p-3.5 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold line-clamp-2 font-german" dir="ltr">
                    {v.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleFavorite({ kind: tab, item: v })}
                    className="p-1.5 rounded-lg text-[#D85A40] shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Episodes & Listen Later */}
      {(tab === 'episodes' || tab === 'listenLater') && (
        <div className="space-y-3">
          {data.favorites[tab].length === 0 ? (
            <EmptyBox text="لا توجد حلقات بودكاست محفوظة هنا بعد." />
          ) : (
            data.favorites[tab].map((ep) => (
              <div key={ep.id} className="df-card rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#52615D]">{ep.showTitle}</p>
                  <h3 className="text-sm font-semibold text-[#1A2421] truncate font-german" dir="ltr">
                    {ep.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ep.hasAudio && (
                    <button
                      type="button"
                      onClick={() => playPodcastEpisode(ep, data.favorites[tab])}
                      className="px-3 py-1.5 rounded-xl bg-[#0E4B4B] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>تشغيل</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleFavorite({ kind: tab, item: ep })}
                    className="p-2 rounded-xl text-[#D85A40] hover:bg-[#D85A40]/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Movies */}
      {tab === 'movies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.favorites.movies.length === 0 ? (
            <EmptyBox text="لا توجد أفلام أو مسلسلات محفوظة بعد." />
          ) : (
            data.favorites.movies.map((m) => (
              <div key={m.id} className="df-card rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold font-german" dir="ltr">
                    {m.title}
                  </h3>
                  <p className="text-xs text-[#52615D]">{m.platformName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={m.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#0E4B4B] text-white text-xs inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>فتح</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => toggleFavorite({ kind: 'movies', item: m })}
                    className="p-2 rounded-lg text-[#D85A40] cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </SectionShell>
  );
};

const EmptyBox: React.FC<{ text: string }> = ({ text }) => (
  <div className="col-span-full bg-white rounded-2xl border border-[#0E4B4B]/12 p-8 text-center text-sm text-[#52615D]">
    {text}
  </div>
);
