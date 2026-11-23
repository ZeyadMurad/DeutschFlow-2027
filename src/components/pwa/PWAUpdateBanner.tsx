import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { usePWAUpdate } from '../../hooks/usePWAUpdate';
import type { UILanguage } from '../../types/media';

export const PWAUpdateBanner: React.FC<{ lang: UILanguage }> = ({ lang }) => {
  const { needRefresh, applyUpdate, dismissUpdate } = usePWAUpdate();

  if (!needRefresh) return null;

  const title =
    lang === 'de'
      ? 'Neue Version von DeutschFlow verfügbar'
      : lang === 'en'
      ? 'A new version of DeutschFlow is ready'
      : 'يتوفر تحديث جديد لتطبيق DeutschFlow';
  const desc =
    lang === 'de'
      ? 'Aktualisieren, um die neuesten Verbesserungen sicher zu laden.'
      : lang === 'en'
      ? 'Refresh safely when ready — your saved words and favorites remain untouched.'
      : 'اضغط للتحديث الآمن دون فقدان مفرداتك أو مفضلتك أو جلستك الحالية.';
  const btnText = lang === 'de' ? 'Jetzt aktualisieren' : lang === 'en' ? 'Refresh' : 'تحديث الآن';

  return (
    <div
      role="status"
      className="fixed top-18 inset-x-3 sm:inset-x-auto sm:end-5 z-50 max-w-md rounded-2xl border border-[#D4AF37]/55 bg-[#062C27]/96 text-[#F7F3EA] p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-[#E8C35A]">{title}</p>
        <p className="text-[11px] text-[#CFE1DD] mt-0.5 leading-snug">{desc}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={applyUpdate}
          className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#E8C35A] to-[#D4AF37] text-[#052522] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:brightness-105"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{btnText}</span>
        </button>
        <button
          type="button"
          onClick={dismissUpdate}
          aria-label="Dismiss update"
          className="p-2 rounded-lg text-[#CFE1DD] hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
