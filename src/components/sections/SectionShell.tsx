import React from 'react';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import type { AppSectionId, UILanguage } from '../../types/media';
import { MAIN_SECTIONS, UI_TEXT, getSectionSubtitle, getSectionTitle } from '../../i18n/translations';
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
  const def = MAIN_SECTIONS.find((s) => s.id === sectionId)!;
  const ui = UI_TEXT[lang];
  const isRtl = lang === 'ar';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
      {/* Top navigation row inside section */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl bg-white border border-[#0E4B4B]/18 text-[#0E4B4B] hover:bg-[#0E4B4B] hover:text-white transition-colors text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs"
        >
          {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>{ui.backHome}</span>
        </button>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[#52615D] font-mono-num">
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
              className="px-3.5 py-2 rounded-xl bg-[#0E4B4B]/8 text-[#0E4B4B] hover:bg-[#0E4B4B]/15 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{ui.refreshNow}</span>
            </button>
          )}
        </div>
      </div>

      {/* Section Title Header */}
      <div className="bg-white rounded-2xl border border-[#0D4A42]/14 shadow-xs p-5 sm:p-6 mb-6 flex items-center gap-4 sm:gap-5">
        <div className="df-icon-stage w-15 h-15 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0">
          {renderSectionSvgIcon(sectionId, 'w-11 h-11 sm:w-12 sm:h-12')}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-editorial font-semibold text-[#093D38]">
            {getSectionTitle(def, lang)}
          </h1>
          <p className="text-sm text-[#52615D] mt-1">{getSectionSubtitle(def, lang)}</p>
        </div>
      </div>

      {offlineCache && (
        <div className="mb-5 px-4 py-2.5 rounded-xl bg-[#B68934]/15 border border-[#B68934]/35 text-xs sm:text-sm text-[#6E4F12]">
          {ui.offlineNotice}
        </div>
      )}

      {children}
    </section>
  );
};
