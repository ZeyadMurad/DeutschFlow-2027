import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Film, Heart, Search, ShieldCheck } from 'lucide-react';
import { fetchMoviesDirectory } from '../../services/api';
import type {
  MovieSeriesTitle,
  PlatformAccessType,
  StreamingPlatform,
  UILanguage,
} from '../../types/media';
import { useUserData } from '../../context/UserDataContext';
import { SectionShell } from './SectionShell';

interface MoviesSectionProps {
  lang: UILanguage;
  onBack: () => void;
}

function getAccessLabel(access: PlatformAccessType): { label: string; colorClass: string } {
  switch (access) {
    case 'free':
      return { label: 'مجاني بالكامل', colorClass: 'text-[#0E4B4B]' };
    case 'free_restricted':
      return { label: 'مجاني (قد يخضع لقيود جغرافية لبعض الأعمال)', colorClass: 'text-[#B68934]' };
    case 'account_required':
      return { label: 'يحتاج حساباً (مجاني جزئياً / اشتراك)', colorClass: 'text-[#D85A40]' };
    case 'subscription':
      return { label: 'اشتراك مدفوع / تأجير', colorClass: 'text-[#52615D]' };
  }
}

export const MoviesSection: React.FC<MoviesSectionProps> = ({ lang, onBack }) => {
  const { isFavorite, toggleFavorite, recordHistory } = useUserData();
  const [platforms, setPlatforms] = useState<StreamingPlatform[]>([]);
  const [titles, setTitles] = useState<MovieSeriesTitle[]>([]);
  const [filterAccess, setFilterAccess] = useState<'all' | 'free_only' | 'paid_only'>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchMoviesDirectory()
      .then((res) => {
        setPlatforms(res.platforms);
        setTitles(res.titles);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredPlatforms = useMemo(() => {
    return platforms.filter((p) => {
      if (filterAccess === 'free_only' && p.accessType !== 'free' && p.accessType !== 'free_restricted')
        return false;
      if (
        filterAccess === 'paid_only' &&
        p.accessType !== 'subscription' &&
        p.accessType !== 'account_required'
      )
        return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${p.name} ${p.descriptionAr} ${p.descriptionDe} ${p.highlights.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filterAccess, platforms, query]);

  const filteredTitles = useMemo(() => {
    return titles.filter((t) => {
      if (filterAccess === 'free_only' && t.accessType !== 'free' && t.accessType !== 'free_restricted')
        return false;
      if (
        filterAccess === 'paid_only' &&
        t.accessType !== 'subscription' &&
        t.accessType !== 'account_required'
      )
        return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${t.title} ${t.genre} ${t.platformName} ${t.descriptionAr} ${t.descriptionDe}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [filterAccess, query, titles]);

  return (
    <SectionShell sectionId="movies" lang={lang} onBack={onBack} refreshing={loading}>
      {/* Transparency & Filters */}
      <div className="bg-white rounded-2xl border border-[#0E4B4B]/12 p-4 sm:p-5 mb-6 space-y-4">
        <div className="flex items-start gap-2.5 text-xs text-[#52615D] bg-[#F7F3EA] p-3 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-[#0E4B4B] shrink-0 mt-0.5" />
          <span>
            توضيح الشفافية: منصات البث الألمانية تحمي حقوق البث عبر سياسات DRM ومنع التضمين؛ لذلك نعرض هنا التصنيف الدقيق لكل منصة وعمل مع روابط المشاهدة الرسمية المباشرة دون تجاوز القيود.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#52615D] absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن مسلسل، فيلم، أو منصة بث ألمانية (ARD, ZDF, Dark, Tatort, Babylon Berlin)..."
              className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/15 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'free_only', label: 'مجاني / ميدياتيك' },
              { id: 'paid_only', label: 'اشتراك / حساب' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterAccess(f.id as 'all' | 'free_only' | 'paid_only')}
                className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  filterAccess === f.id
                    ? 'bg-[#0E4B4B] text-white'
                    : 'bg-[#F7F3EA] text-[#1A2421] hover:bg-[#EFE8D8]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Curated German Series & Films */}
      <div className="mb-10">
        <h2 className="text-base font-semibold text-[#0E4B4B] mb-4">
          أعمال ألمانية مختارة لتطوير اللغة والثقافة ({filteredTitles.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTitles.map((item) => {
            const access = getAccessLabel(item.accessType);
            const fav = isFavorite('movies', item.id);

            return (
              <article
                key={item.id}
                className="df-card df-card-hover rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/10 flex items-center justify-center text-[#D85A40] shrink-0">
                        <Film className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-[#1A2421] font-german" dir="ltr">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[#52615D]">
                          {item.genre} · {item.year}
                          {item.cefrHint ? ` · ${item.cefrHint}` : ''}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFavorite({ kind: 'movies', item })}
                      aria-label="Favorite movie"
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        fav ? 'text-[#D85A40]' : 'text-[#52615D] hover:text-[#0E4B4B]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <p className="text-xs text-[#52615D] leading-relaxed mb-2">
                    {lang === 'de' ? item.descriptionDe : item.descriptionAr}
                  </p>

                  <div className="text-[11px] flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-[#0E4B4B]">{item.platformName}</span>
                    <span aria-hidden="true">·</span>
                    <span className={`font-medium ${access.colorClass}`}>{access.label}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#52615D]">مشاهدة خارجية رسمية</span>
                  </div>
                </div>

                <a
                  href={item.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    recordHistory({
                      type: 'movie',
                      title: item.title,
                      subtitle: item.platformName,
                      url: item.watchUrl,
                    })
                  }
                  className="py-2 px-3 rounded-xl bg-[#0E4B4B] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#093535]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في {item.platformName}</span>
                </a>
              </article>
            );
          })}
        </div>
      </div>

      {/* Platforms Directory */}
      <div>
        <h2 className="text-base font-semibold text-[#0E4B4B] mb-4">
          دليل منصات البث الألمانية ({filteredPlatforms.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPlatforms.map((pl) => {
            const access = getAccessLabel(pl.accessType);
            return (
              <article key={pl.id} className="df-card rounded-2xl p-5 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <h3 className="text-base font-semibold text-[#1A2421] font-german" dir="ltr">
                      {pl.name}
                    </h3>
                    <span className={`text-xs font-semibold ${access.colorClass}`}>
                      {access.label}
                    </span>
                  </div>
                  <p className="text-xs text-[#52615D] leading-relaxed mb-2">
                    {lang === 'de' ? pl.descriptionDe : pl.descriptionAr}
                  </p>
                  <p className="text-[11px] text-[#52615D]">
                    {lang === 'de' ? pl.regionNoteDe : pl.regionNoteAr}
                  </p>
                  <p className="text-[11px] text-[#0E4B4B] mt-2 font-german" dir="ltr">
                    Highlights: {pl.highlights.join(' · ')}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#0E4B4B]/8">
                  <span className="text-[11px] text-[#52615D]">مشاهدة خارجية (الموقع الرسمي)</span>
                  <a
                    href={pl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#F7F3EA] text-[#0E4B4B] hover:bg-[#EFE8D8] text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>زيارة المنصة</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </SectionShell>
  );
};
