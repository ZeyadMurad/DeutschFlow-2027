import React, { useState } from 'react';
import { ArrowRight, Moon, Sparkles, Sun } from 'lucide-react';
import {
  HOME_SECTION_ORDER,
  MAIN_SECTIONS,
  getSectionSubtitle,
  getSectionTitle,
} from '../../i18n/translations';
import type { PublicAppConfig } from '../../services/api';
import type { AppSectionId, UILanguage, UITheme } from '../../types/media';
import { renderSectionSvgIcon } from '../icons/SectionIcons';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface LandingPageProps {
  lang: UILanguage;
  onChangeLang: (lang: UILanguage) => void;
  theme: UITheme;
  onToggleTheme: () => void;
  onContinue: (targetSection?: AppSectionId) => void;
  savedVocabCount: number;
  exposureMinutes: number;
  appConfig?: PublicAppConfig | null;
}

const PREVIEW_SECTION_IDS = HOME_SECTION_ORDER.slice(0, 9);

const StaticIllustrationThumb: React.FC<{
  sectionId: Exclude<AppSectionId, 'home' | 'settings'>;
  title: string;
}> = ({ sectionId, title }) => {
  const [imgFailed, setImgFailed] = useState(false);
  if (imgFailed) {
    return (
      <div className="df-icon-stage w-14 h-14 rounded-2xl flex items-center justify-center shrink-0">
        {renderSectionSvgIcon(sectionId, 'w-10 h-10')}
      </div>
    );
  }
  return (
    <div className="w-16 h-14 rounded-2xl overflow-hidden border border-[#0D4A42]/18 dark:border-[#3EF2DF]/30 bg-[#052522] shrink-0 shadow-sm">
      <img
        src={`/assets/illustrations/${sectionId}.webp`}
        alt={title}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({
  lang,
  onChangeLang,
  theme,
  onToggleTheme,
  onContinue,
  savedVocabCount,
  exposureMinutes,
  appConfig,
}) => {
  const hiddenSet = new Set(appConfig?.hiddenModuleIds || []);
  const previewSections = PREVIEW_SECTION_IDS
    .map((id) => MAIN_SECTIONS.find((s) => s.id === id))
    .filter((s): s is (typeof MAIN_SECTIONS)[number] => Boolean(s && !hiddenSet.has(s.id)));

  const customHeadline =
    lang === 'ar'
      ? appConfig?.landingHeadlineAr
      : lang === 'de'
      ? appConfig?.landingHeadlineDe
      : appConfig?.landingHeadlineEn;

  const announcement =
    lang === 'ar'
      ? appConfig?.announcementAr
      : lang === 'de'
      ? appConfig?.announcementDe
      : appConfig?.announcementEn;

  const defaultNarrative =
    lang === 'ar'
      ? 'مركزك الإعلامي الألماني المتكامل لتعلم اللغة الألمانية يومياً عبر المصادر الحية: مئات الإذاعات، غرف الأخبار والصحف، German Studio، الوثائقيات، البودكاست، القراءة التفاعلية، والمعجم السياقي مع بطاقات المراجعة.'
      : lang === 'de'
      ? 'Dein persönliches deutsches Medien- und Lernzentrum: Hunderte Live-Radiosender, Nachrichtenredaktionen, Zeitungen, German Studio, Dokumentationen, Podcasts, Leseraum mit Kontextwörterbuch und Lernkarten.'
      : 'Your personal German media and language immersion center: hundreds of live German radio stations, newsrooms, German Studio, documentaries, podcasts, interactive reading with contextual dictionary, and flashcards.';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F3EA] text-[#172320] dark:bg-[#041B18] dark:text-[#F7F3EA]">
      {/* Top German Tricolor Hairline */}
      <div className="h-1 w-full flex shrink-0" aria-hidden="true">
        <div className="flex-1 bg-[#111111]" />
        <div className="flex-1 bg-[#DD0000]" />
        <div className="flex-1 bg-[#FFCE00]" />
      </div>

      {/* Atmospheric Dark Emerald Hero Shell */}
      <div className="relative bg-gradient-to-b from-[#062C27] via-[#05231F] to-[#041B18] text-[#F7F3EA] overflow-hidden border-b border-[#3EF2DF]/20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 start-1/2 -translate-x-1/2 w-[820px] h-[440px] rounded-full bg-[#198F80]/22 blur-3xl"
        />

        {/* Subtle Top Header */}
        <header className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/brand/deutschflow-logo.png"
              alt="DeutschFlow"
              className="w-10 h-10 rounded-xl border border-[#D4AF37]/70 shadow-md object-cover shrink-0"
            />
            <div className="min-w-0">
              <span className="font-editorial text-lg font-bold tracking-tight text-white">
                Deutsch<span className="text-[#E8C35A]">Flow</span>
              </span>
              <p className="text-[11px] text-[#B7CEC9] leading-none mt-0.5 truncate">
                Lernen • Informieren • Entdecken
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <PWAInstallButton lang={lang} variant="landing" />

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={
                theme === 'dark'
                  ? lang === 'ar'
                    ? 'الوضع الفاتح'
                    : 'Light Mode'
                  : lang === 'ar'
                  ? 'الوضع الداكن'
                  : 'Dark Mode'
              }
              className="w-9 h-9 rounded-xl bg-white/8 border border-white/15 text-[#E8C35A] hover:bg-white/15 flex items-center justify-center cursor-pointer transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

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

        {/* Optional Announcement Strip from Owner Management */}
        {announcement && announcement.trim() && (
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-1">
            <div className="rounded-xl bg-[#D4AF37]/15 border border-[#E8C35A]/35 px-4 py-2 text-xs text-[#FBE8A6] text-center">
              {announcement}
            </div>
          </div>
        )}

        {/* Hero Narrative & Exclusive CTA */}
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Official Logo Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative max-w-[320px] sm:max-w-[360px] w-full">
                <div
                  aria-hidden="true"
                  className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br from-[#E8C35A]/30 via-[#1FB8A6]/18 to-transparent blur-xl"
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

            {/* Welcome Narrative & Single Exclusive CTA */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-start">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/8 border border-[#D4AF37]/35 text-[#F1D06B] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Your German Media Universe</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-editorial font-bold tracking-tight text-white leading-[1.1]">
                  Deutsch<span className="text-[#E8C35A]">Flow</span>
                </h1>
                <p className="text-base sm:text-xl font-medium text-[#DFECE9] leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  {customHeadline && customHeadline.trim() ? customHeadline : defaultNarrative}
                </p>
              </div>

              {/* Primary & ONLY Navigation Button Into Workspace */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => onContinue('home')}
                  dir="ltr"
                  className="px-7 py-4 rounded-2xl bg-gradient-to-r from-[#E8C35A] via-[#D4AF37] to-[#C8962E] text-[#052522] hover:brightness-105 active:scale-[0.99] text-base sm:text-lg font-bold shadow-[0_12px_32px_rgba(212,175,55,0.3)] inline-flex items-center gap-3 cursor-pointer transition-all"
                >
                  <span>Continue to DeutschFlow</span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                {(savedVocabCount > 0 || exposureMinutes > 0) && (
                  <div className="flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-white/8 border border-white/14 text-xs text-[#CFE1DD]">
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
        </section>
      </div>

      {/* Informational Non-Clickable Module Overview Showcase */}
      <main className="flex-1">
        <section className="pt-10 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-7 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C8962E] dark:text-[#E8C35A]">
                {lang === 'ar'
                  ? 'نظرة تعريفية على عالم DeutschFlow'
                  : lang === 'de'
                  ? 'Übersicht der Medienbereiche'
                  : 'Overview of Available Modules'}
              </p>
              <h2 className="text-2xl sm:text-3xl font-editorial font-bold text-[#093D38] dark:text-white">
                {lang === 'ar'
                  ? 'استمع، شاهد، اقرأ، واحفظ المفردات في مكان واحد'
                  : lang === 'de'
                  ? 'Hören, sehen, lesen und Vokabeln direkt sichern'
                  : 'Listen, Watch, Read & Master German Daily'}
              </h2>
            </div>

            {/* Informational Cards ONLY — Non-clickable <article> elements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 select-none">
              {previewSections.map((sec) => {
                const title = getSectionTitle(sec, lang);
                return (
                  <article
                    key={sec.id}
                    className="df-card rounded-2xl p-4 sm:p-5 text-start flex items-center gap-4"
                  >
                    <StaticIllustrationThumb sectionId={sec.id} title={title} />
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-[#093D38] dark:text-white truncate">
                        {title}
                      </h3>
                      <p className="text-xs text-[#52615D] dark:text-[#A4C8C1] leading-relaxed line-clamp-2 mt-0.5">
                        {getSectionSubtitle(sec, lang)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Official Copyright Footer */}
      <footer className="border-t border-[#0D4A42]/12 dark:border-[#3EF2DF]/18 bg-[#EFE8D8]/60 dark:bg-[#031512] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#52615D] dark:text-[#98BDB6]">
          <p className="font-semibold text-[#093D38] dark:text-[#E8C35A]" dir="ltr">
            © 2026 DeutschFlow. All Rights Reserved.
          </p>
          <p className="text-center sm:text-end">
            {lang === 'ar'
              ? 'منصة تعليمية وإعلامية مستقلة لتعلم اللغة الألمانية عبر المحتوى الألماني الأصلي.'
              : lang === 'de'
              ? 'Unabhängige Lern- und Medienplattform für authentische deutsche Inhalte.'
              : 'An independently developed German media & language learning platform.'}
          </p>
        </div>
      </footer>
    </div>
  );
};
