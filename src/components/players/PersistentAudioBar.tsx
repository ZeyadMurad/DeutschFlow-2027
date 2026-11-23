import React from 'react';
import {
  ExternalLink,
  Heart,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useGlobalAudio } from './GlobalAudioContext';
import { useUserData } from '../../context/UserDataContext';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const PersistentAudioBar: React.FC = () => {
  const {
    mode,
    status,
    errorMessage,
    volume,
    muted,
    playbackRate,
    currentTime,
    duration,
    activeStation,
    activeEpisode,
    activeArticle,
    podcastQueue,
    retryCurrentRadio,
    togglePlayPause,
    stopAll,
    setVolume,
    toggleMute,
    setPlaybackRate,
    seekTo,
  } = useGlobalAudio();

  const { isFavorite, toggleFavorite } = useUserData();

  if (mode === 'none') return null;

  const title =
    mode === 'radio'
      ? activeStation?.name || ''
      : mode === 'podcast'
      ? activeEpisode?.title || ''
      : activeArticle?.title || '';

  const subtitle =
    mode === 'radio'
      ? `${activeStation?.state || 'Deutschland'} · ${
          status === 'playing'
            ? 'LIVE'
            : status === 'loading'
            ? 'جاري الاتصال...'
            : status === 'error'
            ? 'خطأ في البث'
            : 'متوقف'
        }`
      : mode === 'podcast'
      ? `${activeEpisode?.showTitle || ''} · ملف صوتي أصلي`
      : mode === 'article_original'
      ? `${activeArticle?.sourceName || ''} · تسجيل صوتي أصلي`
      : `${activeArticle?.sourceName || ''} · نطق آلي (de-DE TTS)`;

  const officialHref =
    mode === 'radio'
      ? activeStation?.homepage || activeStation?.streamUrl
      : mode === 'podcast'
      ? activeEpisode?.link
      : activeArticle?.link;

  const isFav =
    mode === 'radio' && activeStation
      ? isFavorite('radio', activeStation.id)
      : mode === 'podcast' && activeEpisode
      ? isFavorite('episodes', activeEpisode.id)
      : mode === 'article_original' || mode === 'article_tts'
      ? activeArticle
        ? isFavorite('articles', activeArticle.id)
        : false
      : false;

  const handleToggleFav = () => {
    if (mode === 'radio' && activeStation) {
      toggleFavorite({ kind: 'radio', item: activeStation });
    } else if (mode === 'podcast' && activeEpisode) {
      toggleFavorite({ kind: 'episodes', item: activeEpisode });
    } else if (activeArticle) {
      toggleFavorite({ kind: 'articles', item: activeArticle });
    }
  };

  return (
    <aside
      aria-label="Audio Player"
      className="fixed bottom-0 inset-x-0 z-40 bg-[#0E4B4B] text-[#F7F3EA] border-t border-[#B68934]/35 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col gap-1.5">
        {mode === 'podcast' && duration > 0 && (
          <div className="flex items-center gap-2 text-[11px] font-mono-num text-[#F7F3EA]/80">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration}
              value={Math.min(currentTime, duration)}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Seek episode"
              className="flex-1 h-1 accent-[#D85A40] cursor-pointer"
            />
            <span>{formatTime(duration)}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {mode === 'radio' && activeStation?.favicon ? (
              <img
                src={activeStation.favicon}
                alt={activeStation.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-lg object-cover bg-white/10 shrink-0"
              />
            ) : mode === 'podcast' && activeEpisode?.imageUrl ? (
              <img
                src={activeEpisode.imageUrl}
                alt={activeEpisode.showTitle}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-lg object-cover bg-white/10 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#B68934]/25 border border-[#B68934]/50 flex items-center justify-center shrink-0 text-xs font-bold">
                DE
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate font-german" dir="ltr">
                {title}
              </p>
              <p className="text-xs text-[#F7F3EA]/75 truncate">
                {subtitle}
                {podcastQueue.length > 0 && ` · +${podcastQueue.length} في القائمة`}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {status === 'error' && (
              <button
                type="button"
                onClick={retryCurrentRadio}
                className="px-2.5 py-1.5 rounded-lg bg-[#D85A40] text-white text-xs font-medium flex items-center gap-1 hover:opacity-90 cursor-pointer"
                title="إعادة المحاولة"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">إعادة</span>
              </button>
            )}

            <button
              type="button"
              onClick={togglePlayPause}
              disabled={status === 'loading'}
              aria-label={status === 'playing' ? 'Pause' : 'Play'}
              className="w-9 h-9 rounded-full bg-[#D85A40] text-white flex items-center justify-center hover:bg-[#c54d35] transition-colors cursor-pointer disabled:opacity-60"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : status === 'playing' ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={stopAll}
              aria-label="Stop"
              title="إيقاف"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            {(mode === 'podcast' || mode === 'article_original' || mode === 'article_tts') && (
              <button
                type="button"
                onClick={() => {
                  const rates = [0.75, 1, 1.25, 1.5, 1.75];
                  const idx = rates.indexOf(playbackRate);
                  setPlaybackRate(rates[(idx + 1) % rates.length]);
                }}
                className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-mono-num cursor-pointer"
                title="سرعة التشغيل"
              >
                {playbackRate}x
              </button>
            )}

            <div className="hidden md:flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMute}
                aria-label="Mute"
                className="p-1.5 rounded-md hover:bg-white/10 cursor-pointer"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Volume"
                className="w-16 h-1 accent-[#B68934] cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleToggleFav}
              aria-label="Favorite"
              className={`p-1.5 rounded-md hover:bg-white/10 cursor-pointer ${
                isFav ? 'text-[#D85A40]' : 'text-[#F7F3EA]/80'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
            </button>

            {officialHref && (
              <a
                href={officialHref}
                target="_blank"
                rel="noopener noreferrer"
                title="المصدر الرسمي"
                className="p-1.5 rounded-md hover:bg-white/10 text-[#F7F3EA]/80"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {status === 'error' && errorMessage && (
          <div className="text-xs text-[#FFD7CE] flex items-center justify-between gap-2 bg-black/20 rounded-md px-2.5 py-1">
            <span>{errorMessage}</span>
            {officialHref && (
              <a
                href={officialHref}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium shrink-0"
              >
                فتح المصدر الرسمي
              </a>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
