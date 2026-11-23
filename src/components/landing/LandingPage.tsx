import React from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { MAIN_SECTIONS, getSectionSubtitle, getSectionTitle } from '../../i18n/translations';
import type { AppSectionId, UILanguage } from '../../types/media';
import { renderSectionSvgIcon } from '../icons/SectionIcons';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface LandingPageProps {
  lang: UILanguage;
  onChangeLang: (lang: UILanguage) => void;
  onContinue: (targetSection?: AppSectionId) => void;
  savedVocabCount: number;
  exposureMinutes: number;
}

const PREVIEW_SECTION_IDS: Array<Exclude<AppSectionId, 'home'>> = [
  'radio',
  'news',
  'newspapers',
  'youtube',
  'documentaries',
  'podcasts',
  'learning',
  'reading',
  'library',
];

export const LandingPage: React.FC<LandingPageProps> = ({
  lang,
  onChangeLang,
  onContinue,
  savedVocabCount,
  exposureMinutes,
}) => {
  const isRtl = lang === 'ar';
  const previewSections = MAIN_SECTIONS.filter((s) => PREVIEW_SECTION_IDS.includes(s.id));

  return (
    <div className="min-h-screen flex flex-col bg-[#052522] text-[#F7F3EA]">
      {/* Top German Tricolor Hairline */}
      <div className="h-1 w-full flex shrink-0" aria-hidden="true">
        <div className="flex-1 bg-[#111111]" />
        <div className="flex-1 bg-[#DD0000]" />
        <div className="flex-1 bg-[#FFCE00]" />
      </div>

      {/* Subtle Top Header */}
      <header className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/brand/deutschflow-logo.png"
            alt="DeutschFlow"
            className="w-10 h-10 rounded-xl border border-[#D4AF37]/70 shadow-md object-cover"
          />
          <div>
            <span className="font-editorial text-lg font-bold tracking-tight text-white">
              Deutsch<span className="text-[#E8C35A]">Flow</span>
            </span>
            <p className="text-[11px] text-[#B7CEC9] leading-none mt-0.5">
              Lernen • Informieren • Entdecken
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <PWAInstallButton lang={lang} variant="landing" />
          <div
            className="flex items-center bg-white/8 border border-white/15 rounded-xl p-0.5 text-xs backdrop-blur-sm"
            role="group"
            aria-label="Interface language"
          >
            {(['ar', 'de', 'en'] as UILanguage[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onChangeLang(code)}
                className={`px-2.5 py-1 rounded-lg font-semibold uppercase cursor-pointer transition-colors ${
                  lang === code
                    ? 'bg-[#D4AF37] text-[#052522]'
                    : 'text-[#D6E5E1] hover:text-white'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Atmospheric Hero Section */}
      <main className="flex-1 flex flex-col justify-center">
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 start-1/2 -translate-x-1/2 w-[780px] h-[420px] rounded-full bg-[#197D70]/22 blur-3xl"
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 relative">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Official Logo Showcase */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative max-w-[330px] sm:max-w-[370px] w-full">
                  <div
                    aria-hidden="true"
                    className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br from-[#E8C35A]/30 via-[#1FB8A6]/15 to-transparent blur-xl"
                  />
                  <div className="relative rounded-[2rem] p-2 bg-gradient-to-br from-[#F1D06B]/65 via-[#0E4F47] to-[#D4AF37]/40 shadow-2xl">
                    <img
                      src="/brand/deutschflow-logo.png"
                      alt="DeutschFlow — Your German Media Universe"
                      className="w-full h-auto rounded-[1.6rem] object-cover block shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Welcome Narrative & Exact CTA */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-start">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 border border-[#D4AF37]/35 text-[#F1D06B] text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Your German Media Universe</span>
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-editorial font-bold tracking-tight text-white leading-[1.1]">
                    Deutsch<span className="text-[#E8C35A]">Flow</span>
                  </h1>
                  <p className="text-lg sm:text-xl font-medium text-[#DFECE9] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    {lang === 'ar'
                      ? 'مركزك الإعلامي الألماني المتكامل لتعلم اللغة الألمانية يومياً عبر المصادر الحية: مئات الإذاعات، غرف الأخبار والصحف، German Studio، الوثائقيات، البودكاست، القراءة التفاعلية، والمعجم السياقي مع بطاقات المراجعة.'
                      : lang === 'de'
                      ? 'Dein persönliches deutsches Medien- und Lernzentrum: Hunderte Live-Radiosender, Nachrichtenredaktionen, Zeitungen, German Studio, Dokumentationen, Podcasts, Leseraum mit Kontextwörterbuch und Lernkarten.'
                      : 'Your personal German media and language immersion center: hundreds of live German radio stations, newsrooms, German Studio, documentaries, podcasts, interactive reading with contextual dictionary, and flashcards.'}
                  </p>
                </div>

                {/* Primary Continue Button — Exact Required Label */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => onContinue('home')}
                    dir="ltr"
                    className="px-7 py-4 rounded-2xl bg-gradient-to-r from-[#E8C35A] via-[#D4AF37] to-[#C8962E] text-[#052522] hover:brightness-105 active:scale-[0.99] text-base sm:text-lg font-bold shadow-[0_12px_32px_rgba(212,175,55,0.28)] inline-flex items-center gap-3 cursor-pointer transition-all"
                  >
                    <span>Continue to DeutschFlow</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>

                  {(savedVocabCount > 0 || exposureMinutes > 0) && (
                    <div className="flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-white/7 border border-white/12 text-xs text-[#CFE1DD]">
                      <span>
                        <strong className="text-[#E8C35A] font-mono-num text-sm">{savedVocabCount}</strong>{' '}
                        {lang === 'de' ? 'Vokabeln' : lang === 'en' ? 'words' : 'كلمة محفوظة'}
                      </span>
                      <span className="w-px h-4 bg-white/20" />
                      <span>
                        <strong className="text-white font-mono-num text-sm">{Math.round(exposureMinutes)}</strong>{' '}
                        {lang === 'de' ? 'Min.' : lang === 'en' ? 'min' : 'دقيقة'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cream Editorial Preview Showcase of Real Modules with 3D Icons */}
        <section className="bg-[#F7F3EA] text-[#172320] rounded-t-[2.2rem] mt-6 pt-10 pb-14 px-4 sm:px-6 lg:px-8 border-t border-[#D4AF37]/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#C8962E]">
                  {lang === 'ar'
                    ? 'الأقسام الفعلية داخل التطبيق'
                    : lang === 'de'
                    ? 'Alle Medienbereiche im Überblick'
                    : 'Inside Your DeutschFlow Workspace'}
                </p>
                <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-[#093D38] mt-1">
                  {lang === 'ar'
                    ? 'استمع، شاهد، اقرأ، واحفظ المفردات في مكان واحد'
                    : lang === 'de'
                    ? 'Hören, sehen, lesen und Vokabeln direkt sichern'
                    : 'Listen, Watch, Read & Master German Daily'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onContinue('home')}
                className="text-xs font-semibold text-[#093D38] hover:text-[#D85A40] inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span>
                  {lang === 'ar'
                    ? 'استعرض جميع الأقسام الـ 14'
                    : lang === 'de'
                    ? 'Alle 14 Bereiche öffnen'
                    : 'Explore all 14 modules'}
                </span>
                {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {previewSections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => onContinue(sec.id)}
                  className="group df-card df-card-hover rounded-2xl p-4 sm:p-5 text-start flex items-center gap-4 cursor-pointer"
                >
                  <div className="df-icon-stage w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
                    {renderSectionSvgIcon(sec.id, 'w-10 h-10')}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[#093D38] truncate">
                      {getSectionTitle(sec, lang)}
                    </h3>
                    <p className="text-xs text-[#52615D] leading-relaxed line-clamp-2 mt-0.5">
                      {getSectionSubtitle(sec, lang)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
