import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  Heart,
  Loader2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Search,
} from 'lucide-react';
import { fetchRadioStations } from '../../services/api';
import type { RadioCategory, RadioStation, UILanguage } from '../../types/media';
import { useGlobalAudio } from '../players/GlobalAudioContext';
import { useUserData } from '../../context/UserDataContext';
import { SectionShell } from './SectionShell';

interface RadioSectionProps {
  lang: UILanguage;
  onBack: () => void;
  defaultCategory?: RadioCategory;
}

const RADIO_CATEGORIES: Array<{ id: RadioCategory; labelAr: string; labelDe: string }> = [
  { id: 'all', labelAr: 'الكل', labelDe: 'Alle' },
  { id: 'national', labelAr: 'المحطات الوطنية', labelDe: 'Bundesweit' },
  { id: 'news_politics', labelAr: 'الأخبار والسياسة', labelDe: 'Nachrichten & Politik' },
  { id: 'culture', labelAr: 'الثقافة', labelDe: 'Kultur' },
  { id: 'music', labelAr: 'الموسيقى', labelDe: 'Musik' },
  { id: 'educational', labelAr: 'الراديو التعليمي', labelDe: 'Wissen & Bildung' },
  { id: 'regional', labelAr: 'المحطات المحلية', labelDe: 'Regional' },
  { id: 'sports', labelAr: 'الرياضة', labelDe: 'Sport' },
  { id: 'business', labelAr: 'الاقتصاد', labelDe: 'Wirtschaft' },
  { id: 'kids', labelAr: 'الأطفال', labelDe: 'Kinder' },
];

export const RadioSection: React.FC<RadioSectionProps> = ({
  lang,
  onBack,
  defaultCategory = 'all',
}) => {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [statesList, setStatesList] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [poolTotal, setPoolTotal] = useState(0);
  const [category, setCategory] = useState<RadioCategory>(defaultCategory);
  const [selectedState, setSelectedState] = useState('');
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [offlineCache, setOfflineCache] = useState(false);

  const { mode, status, activeStation, playRadio, togglePlayPause, retryCurrentRadio } =
    useGlobalAudio();
  const { data, isFavorite, toggleFavorite } = useUserData();

  const loadStations = useCallback(
    async (opts: { nextOffset?: number; append?: boolean; force?: boolean } = {}) => {
      const targetOffset = opts.nextOffset ?? 0;
      if (opts.append) setLoadingMore(true);
      else setLoading(true);
      setError('');

      try {
        const res = await fetchRadioStations({
          q: query,
          category,
          state: selectedState,
          offset: targetOffset,
          limit: 48,
          force: opts.force,
        });
        setStations((prev) => (opts.append ? [...prev, ...res.stations] : res.stations));
        setTotal(res.total);
        setPoolTotal(res.poolTotal);
        if (res.states?.length) setStatesList(res.states);
        setOffset(targetOffset);
        setOfflineCache(Boolean(res.fromOfflineCache));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'تعذّر الاتصال بدليل الإذاعات الألمانية');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, query, selectedState]
  );

  useEffect(() => {
    void loadStations({ nextOffset: 0, append: false });
  }, [loadStations]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput.trim());
  };

  return (
    <SectionShell
      sectionId="radio"
      lang={lang}
      onBack={onBack}
      onRefresh={() => void loadStations({ nextOffset: 0, append: false, force: true })}
      refreshing={loading}
      offlineCache={offlineCache}
    >
      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-4 sm:p-5 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#52615D] absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث باسم المحطة أو المدينة أو النوع (مثال: Deutschlandfunk, WDR, Berlin, Jazz)..."
                className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#0E4B4B] text-white text-sm font-medium hover:bg-[#093535] cursor-pointer shrink-0"
            >
              بحث
            </button>
          </form>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            aria-label="Filter by German State"
            className="px-3 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm min-w-[180px]"
          >
            <option value="">كل الولايات الألمانية</option>
            {statesList.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1.5">
          {RADIO_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                category === cat.id
                  ? 'bg-[#0E4B4B] text-white'
                  : 'bg-[#F7F3EA] text-[#1A2421] hover:bg-[#EFE8D8]'
              }`}
            >
              {lang === 'de' ? cat.labelDe : cat.labelAr}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#52615D]">
          <span>
            إجمالي المحطات المتاحة في الدليل الألماني:{' '}
            <strong className="font-mono-num text-[#0E4B4B]">{poolTotal}</strong> محطة · المطابق حالياً:{' '}
            <strong className="font-mono-num text-[#0E4B4B]">{total}</strong>
          </span>
          {query && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setQuery('');
              }}
              className="text-[#D85A40] underline cursor-pointer"
            >
              مسح البحث
            </button>
          )}
        </div>
      </div>

      {/* Recent Stations strip */}
      {data.recentStations.length > 0 && !query && category === 'all' && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#0E4B4B] mb-2.5">المحطات التي استمعت إليها مؤخراً</h2>
          <div className="flex gap-2.5 overflow-x-auto pb-2">
            {data.recentStations.slice(0, 8).map((rs) => {
              const isCurr = mode === 'radio' && activeStation?.id === rs.id;
              return (
                <button
                  key={rs.id}
                  type="button"
                  onClick={() => (isCurr ? togglePlayPause() : playRadio(rs))}
                  className={`px-3 py-2 rounded-xl border text-xs font-medium inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    isCurr
                      ? 'bg-[#0E4B4B] text-white border-[#0E4B4B]'
                      : 'bg-white text-[#1A2421] border-[#0E4B4B]/12 hover:border-[#0E4B4B]/35'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-german" dir="ltr">
                    {rs.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-white rounded-2xl border border-[#D85A40]/40 p-6 text-center mb-6">
          <AlertCircle className="w-8 h-8 text-[#D85A40] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#1A2421] mb-1">{error}</p>
          <button
            type="button"
            onClick={() => void loadStations({ nextOffset: 0, force: true })}
            className="mt-2 px-4 py-2 rounded-xl bg-[#0E4B4B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="h-28 rounded-2xl bg-white/70 border border-[#0E4B4B]/8 animate-pulse" />
          ))}
        </div>
      ) : stations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-10 text-center text-sm text-[#52615D]">
          لا توجد محطات مطابقة للبحث الحالي.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.map((st) => {
              const isCurrent = mode === 'radio' && activeStation?.id === st.id;
              const isPlaying = isCurrent && status === 'playing';
              const isLoading = isCurrent && status === 'loading';
              const isError = isCurrent && status === 'error';
              const fav = isFavorite('radio', st.id);

              return (
                <article
                  key={st.id}
                  className={`df-card rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                    isCurrent ? 'border-[#0E4B4B] ring-1 ring-[#0E4B4B]/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {st.favicon ? (
                      <img
                        src={st.favicon}
                        alt={st.name}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className="w-12 h-12 rounded-xl object-cover bg-[#F7F3EA] border border-[#0E4B4B]/10 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/10 flex items-center justify-center shrink-0 text-[#0E4B4B] font-semibold text-xs">
                        FM
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-[#1A2421] truncate font-german" dir="ltr">
                        {st.name}
                      </h3>
                      <p className="text-xs text-[#52615D] truncate mt-0.5">
                        {st.state || 'Deutschland'}
                        {st.codec ? ` · ${st.codec}` : ''}
                        {st.bitrate ? ` ${st.bitrate} kbps` : ''}
                      </p>
                      <div className="text-[11px] text-[#52615D] mt-1 flex items-center gap-1.5">
                        {st.isLiveVerified && (
                          <span className="font-semibold text-[#0E4B4B]">LIVE</span>
                        )}
                        {st.tags.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate font-german" dir="ltr">
                              {st.tags.slice(0, 3).join(' · ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFavorite({ kind: 'radio', item: st })}
                      aria-label="Favorite station"
                      className={`p-1.5 rounded-lg cursor-pointer shrink-0 ${
                        fav ? 'text-[#D85A40]' : 'text-[#52615D] hover:text-[#0E4B4B]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#0E4B4B]/8">
                    <button
                      type="button"
                      onClick={() => (isCurrent ? togglePlayPause() : playRadio(st))}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        isPlaying
                          ? 'bg-[#D85A40] text-white'
                          : 'bg-[#0E4B4B] text-white hover:bg-[#093535]'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>جاري الاتصال...</span>
                        </>
                      ) : isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>إيقاف مؤقت</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>تشغيل البث المباشر</span>
                        </>
                      )}
                    </button>

                    {isError && (
                      <button
                        type="button"
                        onClick={retryCurrentRadio}
                        className="p-2 rounded-xl bg-[#D85A40]/12 text-[#D85A40] hover:bg-[#D85A40]/20 cursor-pointer"
                        title="إعادة المحاولة"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}

                    {st.homepage && (
                      <a
                        href={st.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-[#F7F3EA] text-[#0E4B4B] hover:bg-[#EFE8D8]"
                        title="الموقع الرسمي للمحطة"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {stations.length < total && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => void loadStations({ nextOffset: offset + 48, append: true })}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-[#0E4B4B] text-white text-sm font-semibold hover:bg-[#093535] disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>تحميل المزيد من المحطات ({total - stations.length} متبقية)</span>
              </button>
            </div>
          )}
        </>
      )}
    </SectionShell>
  );
};
