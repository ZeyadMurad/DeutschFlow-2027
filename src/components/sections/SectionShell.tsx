import React from 'react';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import type { AppSectionId, UILanguage } from '../../types/media';
import {
  MAIN_SECTIONS,
  UI_TEXT,
  type SectionDefinition,
} from '../../i18n/translations';
import { renderSectionSvgIcon } from '../icons/SectionIcons';

interface SectionShellProps {
  sectionId: Exclude<AppSectionId, 'home'>;
  lang: UILanguage;
  onBack: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastUpdated?: string;
  offlineCache?: boolean;
  children: React.ReactNode;
}

const SETTINGS_SECTION_DEF: Omit<SectionDefinition, 'id'> = {
  titleAr: 'الإعدادات',
  titleDe: 'Einstellungen',
  titleEn: 'Settings',
  subtitleAr: 'إعدادات اللغة، المظهر، المفضلة، الخصوصية، اقتراحات التطوير، وإدارة المالك',
  subtitleDe: 'Sprache, Darstellung, Favoriten, Datenschutz, Feedback & Verwaltung',
  subtitleEn: 'Language, appearance, favorites, privacy policy, developer suggestions & owner management',
  accent: 'gold',
};

const FLOW_JOURNEY_DEF: Omit<SectionDefinition, 'id'> = {
  titleAr: 'رحلتي التعليمية — Flow Journey',
  titleDe: 'Meine Flow-Reise',
  titleEn: 'My Flow Journey',
  subtitleAr: 'مهامك اليومية، مسار المستويات A1–B2، مكتبة القواعد والجمل، بنك المفردات الذكي، والتقرير الأسبوعي',
  subtitleDe: 'Tägliche Missionen, CEFR-Lernpfad A1–B2, Grammatik, Wortschatz & Wochenbericht',
  subtitleEn: 'Daily missions, CEFR path A1–B2, grammar & sentence banks, smart vocabulary SRS, and weekly reports',
  accent: 'gold',
};

export const SectionShell: React.FC<SectionShellProps> = ({
  sectionId,
  lang,
  onBack,
  onRefresh,
  refreshing,
  lastUpdated,
  offlineCache,
  children,
}) => {
  const def =
    sectionId === 'settings'
      ? SETTINGS_SECTION_DEF
      : sectionId === 'flow-journey'
      ? FLOW_JOURNEY_DEF
      : MAIN_SECTIONS.find((s) => s.id === sectionId) || SETTINGS_SECTION_DEF;
  const ui = UI_TEXT[lang];
  const isRtl = lang === 'ar';

  const title =
    lang === 'ar' ? def.titleAr : lang === 'de' ? def.titleDe : def.titleEn;
  const subtitle =
    lang === 'ar' ? def.subtitleAr : lang === 'de' ? def.subtitleDe : def.subtitleEn;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
      {/* Top navigation row inside section */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#072B26] border border-[#0E4B4B]/18 dark:border-[#3EF2DF]/28 text-[#0E4B4B] dark:text-[#E8C35A] hover:bg-[#0E4B4B] hover:text-white dark:hover:bg-[#0C423B] transition-colors text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs"
        >
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{ui.backHome}</span>
        </button>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[#52615D] dark:text-[#9EC5BE] font-mono-num">
              {new Date(lastUpdated).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="px-3.5 py-2 rounded-xl bg-[#0E4B4B]/8 dark:bg-[#072B26] dark:border dark:border-[#3EF2DF]/25 text-[#0E4B4B] dark:text-[#7FF9EB] hover:bg-[#0E4B4B]/15 dark:hover:bg-[#0B3C35] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{ui.refreshNow}</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Title Header */}
      <div className="bg-white dark:bg-[#072B26]/90 rounded-2xl border border-[#0D4A42]/14 dark:border-[#3EF2DF]/28 shadow-xs p-5 sm:p-6 mb-6 flex items-center gap-4 sm:gap-5 backdrop-blur-md">
        <div className="df-icon-stage w-15 h-15 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0">
          {renderSectionSvgIcon(sectionId, 'w-11 h-11 sm:w-12 sm:h-12')}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-editorial font-semibold text-[#093D38] dark:text-white">
            {title}
          </h1>
          <p className="text-sm text-[#52615D] dark:text-[#A4C8C1] mt-1">
            {subtitle}
          </p>
        </div>
      </div>

      {offlineCache && (
        <div className="mb-5 px-4 py-2.5 rounded-xl bg-[#B68934]/15 border border-[#B68934]/35 text-xs sm:text-sm text-[#6E4F12] dark:text-[#FBE49D]">
          {ui.offlineNotice}
        </div>
      )}

      {children}
    </section>
  );
};
