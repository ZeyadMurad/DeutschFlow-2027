import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookmarkPlus,
  BookOpen,
  ExternalLink,
  Headphones,
  Heart,
  Search,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { fetchCustomNewsFeeds, fetchNewsFeed } from '../../services/api';
import type {
  AppSectionId,
  NewsArticle,
  NewsCategory,
  NewsSourceMeta,
  SourceHealthStatus,
  UILanguage,
} from '../../types/media';
import { useUserData } from '../../context/UserDataContext';
import { useGlobalAudio } from '../players/GlobalAudioContext';
import { SectionShell } from './SectionShell';

interface NewsSectionProps {
  sectionId?: Exclude<AppSectionId, 'home'>;
  lang: UILanguage;
  onBack: () => void;
  defaultCategory?: NewsCategory;
  initialSourceId?: string;
  onOpenArticle: (article: NewsArticle) => void;
}

const NEWS_CATEGORIES: Array<{ id: NewsCategory; labelAr: string; labelDe: string }> = [
  { id: 'all', labelAr: 'الكل', labelDe: 'Alle' },
  { id: 'politics', labelAr: 'السياسة', labelDe: 'Politik' },
  { id: 'business', labelAr: 'الاقتصاد', labelDe: 'Wirtschaft' },
  { id: 'society', labelAr: 'المجتمع', labelDe: 'Gesellschaft' },
  { id: 'science', labelAr: 'العلوم', labelDe: 'Wissenschaft' },
  { id: 'health', labelAr: 'الطب والصحة', labelDe: 'Medizin' },
  { id: 'tech', labelAr: 'التكنولوجيا', labelDe: 'Technik' },
  { id: 'culture', labelAr: 'الثقافة', labelDe: 'Kultur' },
  { id: 'sports', labelAr: 'الرياضة', labelDe: 'Sport' },
  { id: 'international', labelAr: 'الدولية', labelDe: 'International' },
  { id: 'simplified', labelAr: 'ألمانية مبسطة', labelDe: 'Einfache Sprache' },
];

export const NewsSection: React.FC<NewsSectionProps> = ({
  sectionId = 'news',
  lang,
  onBack,
  defaultCategory = 'all',
  initialSourceId = '',
  onOpenArticle,
}) => {
  const { data, isFavorite, toggleFavorite, openLearningEngine } = useUserData();
  const { playArticleAudio } = useGlobalAudio();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [sources, setSources] = useState<NewsSourceMeta[]>([]);
  const [health, setHealth] = useState<SourceHealthStatus[]>([]);
  const [category, setCategory] = useState<NewsCategory>(defaultCategory);
  const [sourceFilter, setSourceFilter] = useState(initialSourceId);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week'>('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [offlineCache, setOfflineCache] = useState(false);

  const loadNews = useCallback(
    async (force = false) => {
      setLoading(true);
      try {
        const [mainRes, customArticles] = await Promise.all([
          fetchNewsFeed({ force }),
          fetchCustomNewsFeeds(data.customSources),
        ]);
        const merged = [...customArticles, ...mainRes.articles].sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        setArticles(merged);
        setSources(mainRes.sources);
        setHealth(mainRes.health);
        setLastUpdated(mainRes.lastUpdated);
        setOfflineCache(Boolean(mainRes.fromOfflineCache));
      } catch {
        setOfflineCache(true);
      } finally {
        setLoading(false);
      }
    },
    [data.customSources]
  );

  useEffect(() => {
    void loadNews(false);
    // Periodic auto-refresh every 5 minutes
    const interval = window.setInterval(() => {
      void loadNews(true);
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loadNews]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return articles.filter((a) => {
      if (data.disabledSourceIds.includes(a.sourceId)) return false;
      if (category !== 'all' && a.category !== category) return false;
      if (sourceFilter && a.sourceId !== sourceFilter) return false;
      if (dateFilter === 'today') {
        if (now - new Date(a.publishedAt).getTime() > 24 * 60 * 60 * 1000) return false;
      } else if (dateFilter === 'week') {
        if (now - new Date(a.publishedAt).getTime() > 7 * 24 * 60 * 60 * 1000) return false;
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${a.title} ${a.excerpt} ${a.sourceName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [articles, category, data.disabledSourceIds, dateFilter, query, sourceFilter]);

  const errorSourcesCount = health.filter((h) => h.status === 'error').length;

  return (
    <SectionShell
      sectionId={sectionId}
      lang={lang}
      onBack={onBack}
      onRefresh={() => void loadNews(true)}
      refreshing={loading}
      lastUpdated={lastUpdated}
      offlineCache={offlineCache}
    >
      {/* Filters */}
      <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-4 sm:p-5 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#52615D] dark:text-[#9EC5BE] absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث بالكلمات الألمانية أو اسم الصحيفة..."
              className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 text-sm"
            />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter by source"
            className="px-3 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 text-sm min-w-[180px]"
          >
            <option value="">كل المصادر ({sources.length})</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week')}
            aria-label="Filter by date"
            className="px-3 py-2.5 rounded-xl bg-[#F7F3EA] dark:bg-[#041B18] border border-[#0E4B4B]/15 dark:border-[#3EF2DF]/24 text-sm"
          >
            <option value="all">كل التواريخ</option>
            <option value="today">آخر 24 ساعة</option>
            <option value="week">آخر 7 أيام</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {NEWS_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                category === c.id
                  ? 'bg-[#0E4B4B] text-white'
                  : 'bg-[#F7F3EA] dark:bg-[#041B18] text-[#1A2421] dark:text-[#F4EFE3] hover:bg-[#EFE8D8] dark:hover:bg-[#0B3C35]'
              }`}
            >
              {lang === 'de' ? c.labelDe : c.labelAr}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-[#52615D] dark:text-[#9EC5BE]">
          <span>
            العناوين المستوردة: <strong className="font-mono-num text-[#0E4B4B] dark:text-[#7FF9EB]">{filtered.length}</strong>
          </span>
          {errorSourcesCount > 0 && (
            <span className="text-[#B68934]">
              تعذّر تحديث {errorSourcesCount} مصدر حالياً — بقية المصادر تعمل بصورة طبيعية.
            </span>
          )}
        </div>
      </div>

      {/* Articles */}
      {loading && articles.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="h-60 rounded-2xl bg-white/70 dark:bg-[#072B26]/65 border border-[#0E4B4B]/8 dark:border-[#3EF2DF]/24 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#072B26] rounded-2xl border border-[#0E4B4B]/12 dark:border-[#3EF2DF]/24 p-10 text-center text-sm text-[#52615D] dark:text-[#9EC5BE]">
          لا توجد أخبار مطابقة للتصفية الحالية.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.slice(0, 60).map((art) => {
            const fav = isFavorite('articles', art.id);
            const readLater = isFavorite('readLater', art.id);

            return (
              <article
                key={art.id}
                className="df-card df-card-hover rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {art.imageUrl && (
                    <div className="aspect-[16/9] bg-[#EFE8D8] overflow-hidden">
                      <img
                        src={art.imageUrl}
                        alt={art.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-4 sm:p-5">
                    <div className="text-xs text-[#52615D] dark:text-[#9EC5BE] flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="font-semibold text-[#0E4B4B] dark:text-[#7FF9EB]">{art.sourceName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-num">
                        {new Date(art.publishedAt).toLocaleDateString('de-DE')}
                      </span>
                      {art.cefrLevel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#D85A40]">{art.cefrLevel}</span>
                        </>
                      )}
                    </div>

                    <h3
                      onClick={() => onOpenArticle(art)}
                      className="text-base font-semibold text-[#1A2421] dark:text-[#F4EFE3] leading-snug mb-2 cursor-pointer hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB] font-german"
                      dir="ltr"
                      lang="de"
                    >
                      {art.title}
                    </h3>

                    <p
                      className="text-xs text-[#52615D] dark:text-[#9EC5BE] leading-relaxed line-clamp-3 font-german"
                      dir="ltr"
                      lang="de"
                    >
                      {art.excerpt}
                    </p>
                  </div>
                </div>

                <div className="px-4 sm:px-5 py-3 bg-[#FAF7F0] dark:bg-[#05231F] border-t border-[#0E4B4B]/8 dark:border-[#3EF2DF]/24 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenArticle(art)}
                      className="px-3 py-1.5 rounded-lg bg-[#0E4B4B] text-white text-xs font-medium inline-flex items-center gap-1 hover:bg-[#093535] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>قراءة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => playArticleAudio(art, false)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#D85A40]/12 text-[#D85A40] text-xs font-medium inline-flex items-center gap-1 hover:bg-[#D85A40]/20 cursor-pointer whitespace-nowrap shrink-0"
                      title={art.audioUrl ? 'تشغيل الصوت الأصلي' : 'استماع بالنطق الألماني TTS'}
                    >
                      {art.audioUrl ? (
                        <Headphones className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      <span>{art.audioUrl ? 'صوت أصلي' : 'استماع'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openLearningEngine({
                          sourceId: art.id,
                          contentType: sectionId === 'reading' ? 'reading' : 'article',
                          title: art.title,
                          text: `${art.title}. ${art.excerpt}`.trim(),
                          sourceName: art.sourceName,
                          sourceUrl: art.link,
                          audioUrl: art.audioUrl,
                          difficulty: 'original',
                          targetCefr: art.cefrLevel,
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
                      onClick={() => toggleFavorite({ kind: 'articles', item: art })}
                      aria-label="Favorite article"
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        fav ? 'text-[#D85A40]' : 'text-[#52615D] dark:text-[#9EC5BE] hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite({ kind: 'readLater', item: art })}
                      aria-label="Read later"
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        readLater ? 'text-[#0E4B4B] dark:text-[#7FF9EB]' : 'text-[#52615D] dark:text-[#9EC5BE] hover:text-[#0E4B4B] dark:hover:text-[#E8C35A] dark:text-[#7FF9EB]'
                      }`}
                    >
                      <BookmarkPlus className="w-4 h-4" />
                    </button>
                    <a
                      href={art.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="المقال الأصلي"
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
