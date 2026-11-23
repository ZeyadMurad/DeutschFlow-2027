import React, { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, ExternalLink, Heart, AlertTriangle, X } from 'lucide-react';
import type { YouTubeVideo } from '../../types/media';
import { useUserData } from '../../context/UserDataContext';
import { useGlobalAudio } from './GlobalAudioContext';

interface YouTubeModalPlayerProps {
  video: YouTubeVideo | null;
  relatedVideos?: YouTubeVideo[];
  onSelectRelated?: (video: YouTubeVideo) => void;
  onClose: () => void;
}

export const YouTubeModalPlayer: React.FC<YouTubeModalPlayerProps> = ({
  video,
  relatedVideos = [],
  onSelectRelated,
  onClose,
}) => {
  const { isFavorite, toggleFavorite, recordHistory, addExposureSeconds } = useUserData();
  const { stopAll } = useGlobalAudio();
  const [embedBlocked, setEmbedBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!video) return;
    setEmbedBlocked(false);
    // Prevent simultaneous radio/podcast playback while watching a video
    stopAll();
    recordHistory({
      type: 'video',
      title: video.title,
      subtitle: video.channelName,
      url: video.watchUrl,
    });

    const timer = window.setInterval(() => {
      if (!embedBlocked) addExposureSeconds(30);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [video, stopAll, recordHistory, addExposureSeconds, embedBlocked]);

  // Listen to YouTube IFrame API postMessage errors (e.g., 101 / 150 embedding disabled)
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (typeof ev.origin !== 'string' || !ev.origin.includes('youtube.com')) return;
      try {
        const data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (data?.event === 'onError' && (data.info === 101 || data.info === 150 || data.info === 100)) {
          setEmbedBlocked(true);
        }
      } catch {
        // Ignore non-JSON postMessage frames
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  if (!video) return null;

  const isFav = isFavorite('videos', video.id);
  const isWatchLater = isFavorite('watchLater', video.id);

  const originParam =
    typeof window !== 'undefined' ? `&origin=${encodeURIComponent(window.location.origin)}` : '';
  const embedSrc = `https://www.youtube.com/embed/${video.videoId}?enablejsapi=1&rel=0&hl=de${originParam}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
    >
      <div className="bg-[#FAF7F0] dark:bg-[#05231F] text-[#1A2421] dark:text-[#F4EFE3] w-full max-w-5xl rounded-2xl border border-[#0E4B4B]/20 dark:border-[#3EF2DF]/24 shadow-2xl overflow-hidden my-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[#0E4B4B] text-[#F7F3EA]">
          <div className="min-w-0">
            <p className="text-xs text-[#F7F3EA]/75">{video.channelName}</p>
            <h3 className="text-sm sm:text-base font-semibold truncate font-german" dir="ltr">
              {video.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Official Embedded Player */}
          <div className="lg:col-span-2 bg-black relative">
            <div className="aspect-video w-full">
              {embedBlocked ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-white bg-[#131D1A]">
                  <AlertTriangle className="w-10 h-10 text-[#D85A40] mb-3" />
                  <h4 className="text-base font-semibold mb-1">
                    الناشر يمنع تضمين هذا الفيديو خارج YouTube
                  </h4>
                  <p className="text-xs text-white/75 max-w-md mb-4">
                    احتراماً لشروط القناة، لا يمكن تشغيل هذا المقطع داخل الإطار المضمّن. يمكنك مشاهدته مباشرة على موقع YouTube الرسمي.
                  </p>
                  <a
                    href={video.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-[#D85A40] text-white text-sm font-medium inline-flex items-center gap-2 hover:bg-[#c54d35]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    فتح الفيديو الأصلي على YouTube
                  </a>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  src={embedSrc}
                  title={video.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>

            {/* Action strip below video */}
            <div className="bg-white dark:bg-[#072B26] p-4 sm:p-5 border-t border-[#0E4B4B]/10 dark:border-[#3EF2DF]/24">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="text-xs text-[#52615D] dark:text-[#9EC5BE]">
                  <span>{video.channelName}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono-num">
                    {new Date(video.publishedAt).toLocaleDateString('de-DE')}
                  </span>
                  {video.cefrLevel && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="font-semibold text-[#0E4B4B] dark:text-[#7FF9EB]">{video.cefrLevel}</span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFavorite({ kind: 'videos', item: video })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                      isFav
                        ? 'bg-[#D85A40] text-white border-[#D85A40]'
                        : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#0E4B4B] dark:text-[#7FF9EB] border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 hover:border-[#0E4B4B]/35'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                    {isFav ? 'في المفضلة' : 'مفضلة'}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFavorite({ kind: 'watchLater', item: video })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border cursor-pointer ${
                      isWatchLater
                        ? 'bg-[#0E4B4B] text-white border-[#0E4B4B]'
                        : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#0E4B4B] dark:text-[#7FF9EB] border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 hover:border-[#0E4B4B]/35'
                    }`}
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    {isWatchLater ? 'في قائمة المشاهدة' : 'مشاهدة لاحقاً'}
                  </button>

                  <a
                    href={video.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0E4B4B]/8 dark:bg-[#3EF2DF]/12 text-[#0E4B4B] dark:text-[#7FF9EB] hover:bg-[#0E4B4B]/15 inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    فتح في YouTube
                  </a>
                </div>
              </div>

              {video.description && (
                <p
                  className="text-sm text-[#52615D] dark:text-[#9EC5BE] leading-relaxed font-german whitespace-pre-line max-h-28 overflow-y-auto"
                  dir="ltr"
                  lang="de"
                >
                  {video.description}
                </p>
              )}
            </div>
          </div>

          {/* Suggested videos from channel */}
          <div className="border-t lg:border-t-0 lg:border-s border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 bg-[#FAF7F0] dark:bg-[#05231F] p-4 max-h-[520px] overflow-y-auto">
            <h4 className="text-sm font-semibold text-[#0E4B4B] dark:text-[#7FF9EB] mb-3">
              مقاطع مقترحة من {video.channelName}
            </h4>
            {relatedVideos.length === 0 ? (
              <p className="text-xs text-[#52615D] dark:text-[#9EC5BE]">لا توجد مقاطع إضافية محمّلة من هذه القناة حالياً.</p>
            ) : (
              <div className="space-y-2.5">
                {relatedVideos
                  .filter((v) => v.videoId !== video.videoId)
                  .slice(0, 8)
                  .map((rv) => (
                    <button
                      key={rv.id}
                      type="button"
                      onClick={() => onSelectRelated?.(rv)}
                      className="w-full text-start flex gap-2.5 p-2 rounded-xl bg-white dark:bg-[#072B26] border border-[#0E4B4B]/10 dark:border-[#3EF2DF]/24 hover:border-[#0E4B4B]/30 transition-colors cursor-pointer"
                    >
                      <img
                        src={rv.thumbnailUrl}
                        alt={rv.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-24 aspect-video rounded-lg object-cover shrink-0 bg-[#EFE8D8]"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-xs font-medium text-[#1A2421] dark:text-[#F4EFE3] line-clamp-2 font-german"
                          dir="ltr"
                        >
                          {rv.title}
                        </p>
                        <p className="text-[11px] text-[#52615D] dark:text-[#9EC5BE] mt-1 font-mono-num">
                          {new Date(rv.publishedAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
