import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useUserData } from '../../context/UserDataContext';
import type { NewsArticle, PodcastEpisode, RadioStation } from '../../types/media';

export type ActiveAudioMode = 'none' | 'radio' | 'podcast' | 'article_original' | 'article_tts';
export type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface GlobalAudioContextValue {
  mode: ActiveAudioMode;
  status: AudioStatus;
  errorMessage: string | null;
  volume: number;
  muted: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  activeStation: RadioStation | null;
  activeEpisode: PodcastEpisode | null;
  activeArticle: NewsArticle | null;
  podcastQueue: PodcastEpisode[];
  germanVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (uri: string) => void;
  playRadio: (station: RadioStation) => void;
  retryCurrentRadio: () => void;
  playPodcastEpisode: (episode: PodcastEpisode, queue?: PodcastEpisode[]) => void;
  enqueuePodcastEpisode: (episode: PodcastEpisode) => void;
  playArticleAudio: (article: NewsArticle, preferTts?: boolean) => void;
  togglePlayPause: () => void;
  stopAll: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (r: number) => void;
  seekTo: (seconds: number) => void;
}

const GlobalAudioContext = createContext<GlobalAudioContextValue | null>(null);

export const GlobalAudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data, recordHistory, recordRecentStation, savePodcastPosition, addExposureSeconds } =
    useUserData();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const ttsActiveRef = useRef<boolean>(false);
  const exposureTickRef = useRef<number | null>(null);

  const [mode, setMode] = useState<ActiveAudioMode>('none');
  const [status, setStatus] = useState<AudioStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volume, setVolumeState] = useState<number>(0.85);
  const [muted, setMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const [activeStation, setActiveStation] = useState<RadioStation | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<PodcastEpisode | null>(null);
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);
  const [podcastQueue, setPodcastQueue] = useState<PodcastEpisode[]>([]);

  const [germanVoices, setGermanVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');

  // Load de-DE voices for Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const deVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('de'));
      setGermanVoices(deVoices);
      if (deVoices.length > 0 && !selectedVoiceURI) {
        const preferred = deVoices.find((v) => v.lang.toLowerCase() === 'de-de') || deVoices[0];
        setSelectedVoiceURI(preferred.voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceURI]);

  // Exposure tracker (counts active playback seconds every 15s)
  useEffect(() => {
    if (exposureTickRef.current) {
      window.clearInterval(exposureTickRef.current);
      exposureTickRef.current = null;
    }
    if (status === 'playing') {
      exposureTickRef.current = window.setInterval(() => {
        addExposureSeconds(15);
      }, 15000);
    }
    return () => {
      if (exposureTickRef.current) {
        window.clearInterval(exposureTickRef.current);
      }
    };
  }, [status, addExposureSeconds]);

  const teardownAudioElement = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      ttsActiveRef.current = false;
      window.speechSynthesis.cancel();
    }
  }, []);

  const stopAll = useCallback(() => {
    teardownAudioElement();
    setMode('none');
    setStatus('idle');
    setErrorMessage(null);
    setCurrentTime(0);
    setDuration(0);
    setActiveStation(null);
    setActiveEpisode(null);
    setActiveArticle(null);
  }, [teardownAudioElement]);

  // Initialize single shared <audio> element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    return () => {
      teardownAudioElement();
    };
  }, [teardownAudioElement]);

  // Sync audio element listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlaying = () => {
      setStatus('playing');
      setErrorMessage(null);
    };
    const onWaiting = () => setStatus('loading');
    const onPause = () => {
      if (mode === 'podcast' || mode === 'article_original' || mode === 'radio') {
        setStatus((prev) => (prev === 'error' || prev === 'idle' ? prev : 'paused'));
      }
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      if (mode === 'podcast' && activeEpisode && Math.floor(audio.currentTime) % 5 === 0) {
        savePodcastPosition(activeEpisode.id, audio.currentTime);
      }
    };
    const onEnded = () => {
      if (mode === 'podcast' && podcastQueue.length > 0) {
        const [next, ...rest] = podcastQueue;
        setPodcastQueue(rest);
        if (next) {
          playPodcastInternal(next);
          return;
        }
      }
      setStatus('paused');
    };
    const onError = () => {
      setStatus('error');
      setErrorMessage('تعذّر تشغيل البث الصوتي في المتصفح (قد يمنع المصدر التشغيل المباشر أو CORS).');
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  });

  const playStreamUrl = useCallback(
    (url: string, startSeconds = 0, rate = 1) => {
      const audio = audioRef.current;
      if (!audio) return;

      teardownAudioElement();
      setStatus('loading');
      setErrorMessage(null);
      audio.volume = muted ? 0 : volume;

      const isHls = /\.m3u8(\?|$)/i.test(url);
      if (isHls && Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(audio);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.playbackRate = rate;
          audio.play().catch(() => {
            setStatus('error');
            setErrorMessage('تعذّر بدء البث المباشر. جرّب إعادة المحاولة أو افتح المصدر الرسمي.');
          });
        });
        hls.on(Hls.Events.ERROR, (_ev, errData) => {
          if (errData.fatal) {
            setStatus('error');
            setErrorMessage('انقطع البث أو تعذّر الوصول إلى رابط HLS.');
          }
        });
      } else {
        audio.src = url;
        if (startSeconds > 0) {
          audio.currentTime = startSeconds;
        }
        audio.playbackRate = rate;
        audio.play().catch(() => {
          // Retry without crossOrigin attribute in case stream server rejects CORS header
          audio.crossOrigin = null;
          audio.src = url;
          audio.play().catch(() => {
            setStatus('error');
            setErrorMessage('رابط البث غير متاح حالياً داخل المتصفح. افتح المصدر الرسمي.');
          });
        });
      }
    },
    [muted, volume, teardownAudioElement]
  );

  const playRadio = useCallback(
    (station: RadioStation) => {
      setActiveEpisode(null);
      setActiveArticle(null);
      setActiveStation(station);
      setMode('radio');
      setCurrentTime(0);
      setDuration(0);
      recordRecentStation(station);
      recordHistory({
        type: 'radio',
        title: station.name,
        subtitle: station.state || 'Deutsches Radio',
        url: station.homepage || station.streamUrl,
      });
      playStreamUrl(station.streamUrl, 0, 1);
    },
    [playStreamUrl, recordHistory, recordRecentStation]
  );

  const retryCurrentRadio = useCallback(() => {
    if (activeStation) {
      playRadio(activeStation);
    }
  }, [activeStation, playRadio]);

  const playPodcastInternal = useCallback(
    (episode: PodcastEpisode) => {
      if (!episode.audioUrl) {
        setStatus('error');
        setErrorMessage('لا يتوفر ملف صوتي مباشر لهذه الحلقة.');
        return;
      }
      setActiveStation(null);
      setActiveArticle(null);
      setActiveEpisode(episode);
      setMode('podcast');
      const savedPos = data.podcastPositions[episode.id] || 0;
      recordHistory({
        type: 'podcast',
        title: episode.title,
        subtitle: episode.showTitle,
        url: episode.link,
      });
      playStreamUrl(episode.audioUrl, savedPos, playbackRate);
    },
    [data.podcastPositions, playbackRate, playStreamUrl, recordHistory]
  );

  const playPodcastEpisode = useCallback(
    (episode: PodcastEpisode, queue: PodcastEpisode[] = []) => {
      setPodcastQueue(queue.filter((q) => q.id !== episode.id && q.hasAudio));
      playPodcastInternal(episode);
    },
    [playPodcastInternal]
  );

  const enqueuePodcastEpisode = useCallback((episode: PodcastEpisode) => {
    if (!episode.hasAudio) return;
    setPodcastQueue((prev) =>
      prev.some((p) => p.id === episode.id) ? prev : [...prev, episode]
    );
  }, []);

  const startTts = useCallback(
    (article: NewsArticle, rate: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setStatus('error');
        setErrorMessage('المتصفح الحالي لا يدعم ميزة النطق الصوتي Web Speech API.');
        return;
      }
      teardownAudioElement();
      setActiveStation(null);
      setActiveEpisode(null);
      setActiveArticle(article);
      setMode('article_tts');
      setStatus('loading');
      setErrorMessage(null);

      const textToSpeak = `${article.title}. ${article.excerpt}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'de-DE';
      utterance.rate = rate;
      utterance.volume = muted ? 0 : volume;
      const chosen = germanVoices.find((v) => v.voiceURI === selectedVoiceURI) || germanVoices[0];
      if (chosen) utterance.voice = chosen;

      ttsActiveRef.current = true;
      utterance.onstart = () => {
        if (ttsActiveRef.current) setStatus('playing');
      };
      utterance.onend = () => {
        if (ttsActiveRef.current) {
          ttsActiveRef.current = false;
          setStatus('paused');
        }
      };
      utterance.onerror = () => {
        if (ttsActiveRef.current) {
          ttsActiveRef.current = false;
          setStatus('error');
          setErrorMessage('تعذّر تشغيل النطق الألماني (de-DE) على هذا الجهاز.');
        }
      };

      window.speechSynthesis.speak(utterance);
      // Fallback status if onstart fires slowly
      setTimeout(() => {
        if (ttsActiveRef.current && window.speechSynthesis.speaking) {
          setStatus('playing');
        }
      }, 250);
    },
    [germanVoices, muted, selectedVoiceURI, teardownAudioElement, volume]
  );

  const playArticleAudio = useCallback(
    (article: NewsArticle, preferTts = false) => {
      recordHistory({
        type: 'news',
        title: article.title,
        subtitle: article.sourceName,
        url: article.link,
      });

      if (article.audioUrl && !preferTts) {
        setActiveStation(null);
        setActiveEpisode(null);
        setActiveArticle(article);
        setMode('article_original');
        playStreamUrl(article.audioUrl, 0, playbackRate);
      } else {
        startTts(article, playbackRate);
      }
    },
    [playbackRate, playStreamUrl, recordHistory, startTts]
  );

  const togglePlayPause = useCallback(() => {
    if (mode === 'article_tts') {
      if (!('speechSynthesis' in window)) return;
      if (status === 'playing') {
        window.speechSynthesis.pause();
        setStatus('paused');
      } else if (status === 'paused') {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setStatus('playing');
        } else if (activeArticle) {
          startTts(activeArticle, playbackRate);
        }
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (status === 'playing') {
      audio.pause();
      setStatus('paused');
    } else if (status === 'paused' || status === 'error') {
      audio.play().catch(() => {
        if (mode === 'radio' && activeStation) playRadio(activeStation);
      });
    }
  }, [activeArticle, activeStation, mode, playbackRate, playRadio, startTts, status]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    setMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.volume = next ? 0 : volume;
      }
      return next;
    });
  }, [volume]);

  const setPlaybackRate = useCallback(
    (r: number) => {
      setPlaybackRateState(r);
      if (audioRef.current) {
        audioRef.current.playbackRate = r;
      }
      if (mode === 'article_tts' && activeArticle && status === 'playing') {
        startTts(activeArticle, r);
      }
    },
    [activeArticle, mode, startTts, status]
  );

  const seekTo = useCallback((seconds: number) => {
    if (audioRef.current && Number.isFinite(seconds)) {
      audioRef.current.currentTime = Math.max(0, seconds);
      setCurrentTime(seconds);
    }
  }, []);

  return (
    <GlobalAudioContext.Provider
      value={{
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
        germanVoices,
        selectedVoiceURI,
        setSelectedVoiceURI,
        playRadio,
        retryCurrentRadio,
        playPodcastEpisode,
        enqueuePodcastEpisode,
        playArticleAudio,
        togglePlayPause,
        stopAll,
        setVolume,
        toggleMute,
        setPlaybackRate,
        seekTo,
      }}
    >
      {children}
    </GlobalAudioContext.Provider>
  );
};

export function useGlobalAudio(): GlobalAudioContextValue {
  const ctx = useContext(GlobalAudioContext);
  if (!ctx) throw new Error('useGlobalAudio must be used inside GlobalAudioProvider');
  return ctx;
}
