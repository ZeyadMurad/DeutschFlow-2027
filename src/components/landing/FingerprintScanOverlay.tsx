import React from 'react';
import { Fingerprint } from 'lucide-react';
import type { UILanguage } from '../../types/media';

export type ScanPhase = 'scanning' | 'success' | 'error';

const TEXT = {
  ar: {
    scanning: 'ضع إصبعك على المستشعر',
    scanningSub: 'المس البصمة كما تفتح هاتفك',
    success: 'تم التعرف على بصمتك',
    successSub: 'جارٍ فتح واجهة المستخدم…',
    error: 'لم يتم التعرف على الإصبع',
    errorSub: 'أعد المحاولة بإصبع البصمة المسجّلة',
    retry: 'إعادة المحاولة',
  },
  de: {
    scanning: 'Finger auf den Sensor legen',
    scanningSub: 'Wie beim Entsperren deines Handys',
    success: 'Fingerabdruck erkannt',
    successSub: 'Arbeitsbereich wird geöffnet…',
    error: 'Finger nicht erkannt',
    errorSub: 'Erneut mit dem registrierten Finger versuchen',
    retry: 'Erneut versuchen',
  },
  en: {
    scanning: 'Place your finger on the sensor',
    scanningSub: 'Touch the fingerprint like you unlock your phone',
    success: 'Fingerprint recognised',
    successSub: 'Opening your workspace…',
    error: 'Finger not recognised',
    errorSub: 'Try again with the enrolled finger',
    retry: 'Try again',
  },
} as const;

interface FingerprintScanOverlayProps {
  open: boolean;
  phase: ScanPhase;
  lang: UILanguage;
  /** one-shot burst animation key; bump to replay the success ring burst */
  burstKey: number;
  onRetry?: () => void;
}

/**
 * Full-screen biometric scan dialog: a fingerprint icon with a scanning
 * line, a green check on success (then auto-enter), and an error state with
 * retry. Mirrors the native phone-unlock fingerprint experience.
 */
export const FingerprintScanOverlay: React.FC<FingerprintScanOverlayProps> = ({
  open,
  phase,
  lang,
  burstKey,
  onRetry,
}) => {
  if (!open) return null;
  const t = TEXT[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const scanning = phase === 'scanning';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.scanning}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Dimmed backdrop */}
      <div className="absolute inset-0 bg-[#031512]/80 backdrop-blur-[3px]" />

      {/* Scan card */}
      <div
        dir={dir}
        className={`df-overlay-card relative w-full max-w-[340px] rounded-[1.75rem] p-6 sm:p-7 text-center bg-gradient-to-b from-[#0A463E] via-[#06231F] to-[#041B18] border border-[#3EF2DF]/30 shadow-[0_24px_70px_rgba(0,0,0,0.55)] ${
          phase === 'error' ? 'df-shake' : ''
        }`}
      >
        {/* Fingerprint stage */}
        <div className="relative mx-auto w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
          {/* Pulse rings */}
          {scanning && (
            <>
              <span className="df-pulse-ring absolute inset-0 rounded-full border-2 border-[#3EF2DF]/45" />
              <span
                className="df-pulse-ring absolute inset-0 rounded-full border-2 border-[#3EF2DF]/30"
                style={{ animationDelay: '0.6s' }}
              />
            </>
          )}

          {/* Success burst ring */}
          {phase === 'success' && (
            <span key={`burst-${burstKey}`} className="df-ring-burst absolute inset-0 rounded-full border-2 border-[#3EF2DF]/70" />
          )}

          {/* Circular sensor pad */}
          <div
            className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
              phase === 'success'
                ? 'border-[#3EF2DF] bg-[#0B4F45]/60 shadow-[0_0_34px_rgba(62,242,223,0.4)]'
                : phase === 'error'
                ? 'border-[#E86A4A] bg-[#2A1512]/70'
                : 'border-[#3EF2DF]/55 bg-[#0B4038]/45'
            } ${scanning ? 'df-scan-active' : ''}`}
          >
            {phase === 'success' ? (
              /* Green check badge */
              <span className="df-check-badge w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#3EF2DF] to-[#1FB8A6] flex items-center justify-center shadow-[0_0_26px_rgba(62,242,223,0.55)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="df-check-svg w-8 h-8 sm:w-9 sm:h-9"
                  aria-hidden="true"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#041B18"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : phase === 'error' ? (
              <Fingerprint className="w-12 h-12 sm:w-14 sm:h-14 text-[#E86A4A]" strokeWidth={1.6} />
            ) : (
              <>
                {/* Scanning fingerprint icon */}
                <Fingerprint className="df-fp-icon w-14 h-14 sm:w-16 sm:h-16 text-[#3EF2DF]" strokeWidth={1.4} />
                {/* Horizontal scan line travelling across the icon */}
                <span className="df-scanline absolute left-[14%] right-[14%] h-[3px] rounded-full bg-gradient-to-r from-transparent via-[#7FF9EB] to-transparent shadow-[0_0_12px_rgba(62,242,223,0.9)]" />
              </>
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="mt-5 space-y-1.5">
          <h2
            className={`text-lg sm:text-xl font-bold ${
              phase === 'success' ? 'text-[#7FF9EB]' : phase === 'error' ? 'text-[#FFB4A6]' : 'text-white'
            }`}
          >
            {phase === 'success' ? t.success : phase === 'error' ? t.error : t.scanning}
          </h2>
          <p className="text-xs sm:text-sm text-[#B7CEC9] leading-relaxed">
            {phase === 'success' ? t.successSub : phase === 'error' ? t.errorSub : t.scanningSub}
          </p>
        </div>

        {/* Retry (error only) */}
        {phase === 'error' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-[#E8C35A] via-[#D4AF37] to-[#C8962E] text-[#052522] text-sm font-bold cursor-pointer transition-all hover:brightness-105 active:scale-[0.99]"
          >
            {t.retry}
          </button>
        )}

        {/* Scanning progress dots */}
        {scanning && (
          <div className="mt-5 flex items-center justify-center gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#3EF2DF]/70"
                style={{
                  animation: `df-fp-breathe 1.2s ease-in-out ${i * 0.25}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
