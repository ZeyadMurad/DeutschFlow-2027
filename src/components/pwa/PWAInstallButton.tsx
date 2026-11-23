import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../../hooks/usePWAInstall';
import type { UILanguage } from '../../types/media';

interface PWAInstallButtonProps {
  lang?: UILanguage;
  variant?: 'header' | 'landing';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang = 'ar',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  const installLabel =
    lang === 'de' ? 'App installieren' : lang === 'en' ? 'Install App' : 'تثبيت التطبيق';
  const iosLabel =
    lang === 'de' ? 'Auf iOS installieren' : lang === 'en' ? 'Install on iOS' : 'تثبيت على iOS';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'landing'
            ? 'px-4 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 text-[#F7F3EA] border border-[#D4AF37]/45 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors backdrop-blur-sm'
            : 'px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FAF7F0] hover:bg-[#EFE8D8] text-[#093D38] border border-[#C8962E]/35 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0'
        }
      >
        <Download className="w-3.5 h-3.5 text-[#C8962E]" />
        <span className={variant === 'header' ? 'hidden md:inline' : ''}>{installLabel}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            variant === 'landing'
              ? 'px-4 py-2.5 rounded-xl bg-white/12 hover:bg-white/20 text-[#F7F3EA] border border-[#D4AF37]/45 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors backdrop-blur-sm'
              : 'px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FAF7F0] hover:bg-[#EFE8D8] text-[#093D38] border border-[#C8962E]/35 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0'
          }
        >
          <Smartphone className="w-3.5 h-3.5 text-[#C8962E]" />
          <span className={variant === 'header' ? 'hidden md:inline' : ''}>{iosLabel}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#FAF7F0] border border-[#0E4B4B]/20 p-6 shadow-2xl text-[#1A2421] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-editorial font-bold text-[#093D38]">
                  {lang === 'ar'
                    ? 'تثبيت DeutschFlow على iPhone / iPad'
                    : 'Install DeutschFlow on iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-lg hover:bg-[#EFE8D8] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#52615D] leading-relaxed">
                {lang === 'ar' ? (
                  <>
                    1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط Safari.
                    <br />
                    2. مرر للأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                  </>
                ) : (
                  <>
                    1. Tap the <strong>Share</strong> button in Safari.
                    <br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-[#093D38] py-2.5 text-xs font-semibold text-white hover:bg-[#062B26] cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC<{ lang?: UILanguage }> = ({ lang = 'ar' }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 start-4 z-40 flex items-center gap-2 rounded-xl bg-[#C8962E] px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      <span>
        {lang === 'de'
          ? 'Offline-Modus — Zwischengespeicherte Daten aktiv'
          : lang === 'en'
          ? 'Offline Mode — Cached data active'
          : 'وضع عدم الاتصال — استخدام النسخة المخزنة محلياً'}
      </span>
    </div>
  );
};
