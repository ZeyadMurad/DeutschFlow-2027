import React, { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, Newspaper } from 'lucide-react';
import { fetchNewsFeed } from '../../services/api';
import type { NewsArticle, NewsSourceMeta, SourceHealthStatus, UILanguage } from '../../types/media';
import { SectionShell } from './SectionShell';
import { NewsSection } from './NewsSection';

interface NewspapersSectionProps {
  lang: UILanguage;
  onBack: () => void;
  onOpenArticle: (article: NewsArticle) => void;
}

const EXTERNAL_PRESS_CATALOG = [
  {
    name: 'GEO',
    url: 'https://www.geo.de',
    topicAr: 'العلوم والطبيعة والتاريخ والاستكشاف',
    noteAr: 'يتطلب التصفح على الموقع الرسمي (لا يوفر خلاصة RSS مفتوحة).',
  },
  {
    name: 'National Geographic Deutschland',
    url: 'https://www.nationalgeographic.de',
    topicAr: 'الجغرافيا والحياة البرية والعلوم',
    noteAr: 'تصفح خارجي في الموقع الرسمي.',
  },
  {
    name: 'FOCUS Online',
    url: 'https://www.focus.de',
    topicAr: 'أخبار ألمانيا، الاقتصاد والمجتمع',
    noteAr: 'تصفح خارجي في الموقع الرسمي.',
  },
  {
    name: 'Apotheken Umschau',
    url: 'https://www.apotheken-umschau.de',
    topicAr: 'الصحة والطب المبسط بلغة ألمانية واضحة',
    noteAr: 'تصفح خارجي في الموقع الرسمي.',
  },
];

export const NewspapersSection: React.FC<NewspapersSectionProps> = ({
  lang,
  onBack,
  onOpenArticle,
}) => {
  const [sources, setSources] = useState<NewsSourceMeta[]>([]);
  const [health, setHealth] = useState<SourceHealthStatus[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchNewsFeed()
      .then((res) => {
        setSources(res.sources);
        setHealth(res.health);
      })
      .finally(() => setLoading(false));
  }, []);

  if (selectedSourceId) {
    return (
      <NewsSection
        sectionId="newspapers"
        lang={lang}
        onBack={() => setSelectedSourceId(null)}
        initialSourceId={selectedSourceId}
        onOpenArticle={onOpenArticle}
      />
    );
  }

  return (
    <SectionShell sectionId="newspapers" lang={lang} onBack={onBack} refreshing={loading}>
      <div className="mb-8">
        <h2 className="text-base font-semibold text-[#0E4B4B] mb-4">
          الصحف والمجلات المرتبطة بخلاصات RSS مباشرة ({sources.length})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-white/70 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((src) => {
              const h = health.find((x) => x.id === src.id);
              return (
                <article
                  key={src.id}
                  className="df-card df-card-hover rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-[#F7F3EA] border border-[#0E4B4B]/12 flex items-center justify-center text-[#0E4B4B] font-bold text-xs shrink-0">
                          <Newspaper className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-[#1A2421] font-german" dir="ltr">
                            {src.name}
                          </h3>
                          <p className="text-xs text-[#52615D]">
                            {src.accessType === 'simplified'
                              ? 'محتوى مبسط للمتعلمين'
                              : src.accessType === 'excerpt_only'
                              ? 'مقتطف RSS · قراءة كاملة عند الناشر'
                              : 'خلاصة RSS رسمية'}
                            {h?.itemCount ? ` · ${h.itemCount} عنوان` : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[#52615D] leading-relaxed">
                      {lang === 'de' ? src.descriptionDe : src.descriptionAr}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#0E4B4B]/8">
                    <button
                      type="button"
                      onClick={() => setSelectedSourceId(src.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#0E4B4B] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#093535] cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>استعراض العناوين</span>
                    </button>
                    <a
                      href={src.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-[#F7F3EA] text-[#0E4B4B] text-xs font-medium inline-flex items-center gap-1 hover:bg-[#EFE8D8]"
                    >
                      <span>الموقع</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Additional major magazines (external official links) */}
      <div>
        <h2 className="text-base font-semibold text-[#0E4B4B] mb-3">
          مجلات ألمانية إضافية (تصفح مباشر عبر الموقع الرسمي)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXTERNAL_PRESS_CATALOG.map((item) => (
            <div key={item.name} className="df-card rounded-2xl p-4 flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#1A2421] font-german" dir="ltr">
                  {item.name}
                </h3>
                <p className="text-xs text-[#0E4B4B] mt-1">{item.topicAr}</p>
                <p className="text-[11px] text-[#52615D] mt-1">{item.noteAr}</p>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-[#F7F3EA] text-[#0E4B4B] hover:bg-[#EFE8D8] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>فتح الموقع الرسمي</span>
              </a>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
};
