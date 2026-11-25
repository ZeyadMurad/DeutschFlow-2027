import React, { useEffect } from 'react';
import { Fingerprint, X } from 'lucide-react';
import type { UILanguage } from '../../types/media';

export type ScanPhase = 'scanning' | 'success' | 'error';

/**
 * Why an attempt failed.
 * - rejected: the device's biometric prompt did not complete (unrecognised
 *   finger, cancelled prompt, the device's own timeout, or no matching passkey
 *   on the device). The browser reports these as the same NotAllowedError.
 * - unavailable: this browser/origin may not use WebAuthn at all.
 * - timeout: the device never answered the prompt (90 s upper bound).
 * - no-sensor: the device has no usable fingerprint reader, so no prompt exists.
 * - expired / rateLimited / server: reported by the server.
 */
export type ScanErrorKind =
  | 'rejected'
  | 'unavailable'
  | 'timeout'
  | 'no-sensor'
  | 'expired'
  | 'rateLimited'
  | 'server';

export interface ScanFailure {
  kind: ScanErrorKind;
  /** detail from the server (Arabic UI only — the server answers in Arabic) */
  message?: string;
}

/** consecutive failures after which "set the fingerprint up again" is offered */
export const REENROLL_AFTER_FAILURES = 2;

const TEXT = {
  ar: {
    scanning: 'ضع إصبعك على المستشعر',
    scanningSub: 'سيطلب منك جهازك البصمة — أكملها كما تفتح هاتفك',
    success: 'تم التحقق من بصمتك',
    successSub: 'جارٍ فتح واجهة المستخدم…',
    retry: 'إعادة المحاولة',
    reenroll: 'إعادة تفعيل البصمة',
    reenrollHint: 'استخدمها إذا حذفت بصمة التطبيق من جهازك أو تكرر الرفض',
    close: 'إغلاق',
    errors: {
      rejected: {
        title: 'لم يتم التحقق من البصمة',
        sub: 'لم يتعرف جهازك على الإصبع أو تم إلغاء الطلب. الدخول لا يتم إلا بإصبع مسجّل في هذا الجهاز.',
      },
      unavailable: {
        title: 'البصمة غير متاحة هنا',
        sub: 'هذا المتصفح أو الجهاز لا يسمح باستخدام البصمة. افتح التطبيق في Chrome أو Safari مباشرة وعلى عنوان آمن (https).',
      },
      timeout: {
        title: 'لم يكتمل التحقق في الوقت المحدد',
        sub: 'لم يُجب جهازك خلال 90 ثانية. أعد المحاولة، وتأكد من أن قفل الشاشة مفعّل على جهازك.',
      },
      'no-sensor': {
        title: 'لا يوجد قارئ بصمة على هذا الجهاز',
        sub: 'التحقق يتم بمستشعر البصمة في الجهاز نفسه، وهذا الجهاز لا يملك مستشعراً صالحاً أو لا يسمح باستخدامه. افتح التطبيق على الهاتف الذي تفتحه ببصمتك.',
      },
      expired: {
        title: 'انتهت صلاحية المحاولة',
        sub: 'استغرق الطلب وقتاً طويلاً. أعد المحاولة وأكمل البصمة خلال ثلاث دقائق.',
      },
      rateLimited: {
        title: 'محاولات كثيرة',
        sub: 'انتظر دقيقة واحدة ثم أعد المحاولة.',
      },
      server: {
        title: 'تعذر إكمال الدخول',
        sub: 'حدث خطأ في الاتصال بالخادم. تحقق من اتصالك بالإنترنت وأعد المحاولة.',
      },
    },
  },
  de: {
    scanning: 'Finger auf den Sensor legen',
    scanningSub: 'Dein Gerät fragt nach dem Fingerabdruck — wie beim Entsperren deines Handys',
    success: 'Fingerabdruck bestätigt',
    successSub: 'Arbeitsbereich wird geöffnet…',
    retry: 'Erneut versuchen',
    reenroll: 'Fingerabdruck neu einrichten',
    reenrollHint: 'Nutze dies, wenn der Schlüssel vom Gerät gelöscht wurde oder die Prüfung wiederholt scheitert',
    close: 'Schließen',
    errors: {
      rejected: {
        title: 'Fingerabdruck nicht bestätigt',
        sub: 'Dein Gerät hat den Finger nicht erkannt oder die Anfrage wurde abgebrochen. Der Zugang erfolgt nur mit einem auf diesem Gerät registrierten Finger.',
      },
      unavailable: {
        title: 'Fingerabdruck hier nicht verfügbar',
        sub: 'Dieser Browser oder dieses Gerät erlaubt keine Fingerabdruck-Prüfung. Öffne die App direkt in Chrome oder Safari unter einer sicheren Adresse (https).',
      },
      timeout: {
        title: 'Prüfung nicht rechtzeitig abgeschlossen',
        sub: 'Dein Gerät hat innerhalb von 90 Sekunden nicht geantwortet. Versuche es erneut und prüfe, ob die Displaysperre aktiviert ist.',
      },
      'no-sensor': {
        title: 'Kein Fingerabdruckleser auf diesem Gerät',
        sub: 'Die Prüfung erfolgt über den Fingerabdruckleser des Geräts selbst; dieses Gerät hat keinen nutzbaren Leser. Öffne die App auf dem Handy, das du mit deinem Fingerabdruck entsperrst.',
      },
      expired: {
        title: 'Anfrage abgelaufen',
        sub: 'Die Anfrage hat zu lange gedauert. Versuche es erneut und schließe den Fingerabdruck innerhalb von drei Minuten ab.',
      },
      rateLimited: {
        title: 'Zu viele Versuche',
        sub: 'Warte eine Minute und versuche es erneut.',
      },
      server: {
        title: 'Anmeldung nicht abgeschlossen',
        sub: 'Beim Kontakt zum Server ist ein Fehler aufgetreten. Prüfe deine Internetverbindung und versuche es erneut.',
      },
    },
  },
  en: {
    scanning: 'Place your finger on the sensor',
    scanningSub: 'Your device will ask for your fingerprint — complete it like unlocking your phone',
    success: 'Fingerprint verified',
    successSub: 'Opening your workspace…',
    retry: 'Try again',
    reenroll: 'Set the fingerprint up again',
    reenrollHint: 'Use this if you removed the app passkey from your device or the check keeps failing',
    close: 'Close',
    errors: {
      rejected: {
        title: 'Fingerprint not verified',
        sub: 'Your device did not recognise the finger or the prompt was cancelled. Entry only works with a finger enrolled on this device.',
      },
      unavailable: {
        title: 'Fingerprint unavailable here',
        sub: 'This browser or device does not allow the fingerprint check. Open the app directly in Chrome or Safari on a secure (https) address.',
      },
      timeout: {
        title: 'Verification did not finish in time',
        sub: 'Your device did not answer within 90 seconds. Try again and check that a screen lock is set up on your device.',
      },
      'no-sensor': {
        title: 'No fingerprint reader on this device',
        sub: 'Verification uses the fingerprint reader of the device itself, and this device has no usable reader. Open the app on the phone you unlock with your fingerprint.',
      },
      expired: {
        title: 'Request expired',
        sub: 'The request took too long. Try again and complete the fingerprint within three minutes.',
      },
      rateLimited: {
        title: 'Too many attempts',
        sub: 'Wait one minute, then try again.',
      },
      server: {
        title: 'Could not complete sign-in',
        sub: 'An error occurred while contacting the server. Check your connection and try again.',
      },
    },
  },
} as const;

/** Title + subtitle for a failure, shared by the dialog and the card below it. */
export function failureText(failure: ScanFailure, lang: UILanguage): { title: string; sub: string } {
  const base = TEXT[lang].errors[failure.kind];
  return failure.message ? { title: base.title, sub: failure.message } : base;
}

interface FingerprintScanOverlayProps {
  open: boolean;
  phase: ScanPhase;
  lang: UILanguage;
  /** one-shot burst animation key; bump to replay the success ring burst */
  burstKey: number;
  /** why the attempt failed (error phase) */
  failure?: ScanFailure | null;
  /** consecutive failures so far on this device */
  failureCount?: number;
  onRetry?: () => void;
  /** create the fingerprint again (server lost it / it was removed from the device) */
  onReenroll?: () => void;
  /** close the dialog and go back to the fingerprint button */
  onClose?: () => void;
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
  failure,
  failureCount = 0,
  onRetry,
  onReenroll,
  onClose,
}) => {
  // Escape closes the dialog like the × button (never unlocks anything)
  useEffect(() => {
    if (!open || phase === 'success' || !onClose) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, phase, onClose]);

  if (!open) return null;
  const t = TEXT[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const scanning = phase === 'scanning';
  const error = failure ? failureText(failure, lang) : t.errors.rejected;
  const title = phase === 'success' ? t.success : phase === 'error' ? error.title : t.scanning;
  const subtitle = phase === 'success' ? t.successSub : phase === 'error' ? error.sub : t.scanningSub;
  const showReenroll =
    phase === 'error' &&
    (failure?.kind === 'rejected' || failure?.kind === 'timeout') &&
    failureCount >= REENROLL_AFTER_FAILURES &&
    Boolean(onReenroll);
  const canClose = phase !== 'success' && Boolean(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
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
        {/* Close — returns to the locked landing page */}
        {canClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            title={t.close}
            className="absolute top-3 start-3 w-9 h-9 rounded-full flex items-center justify-center text-[#B7CEC9] hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

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
            aria-live="polite"
          >
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-[#B7CEC9] leading-relaxed">{subtitle}</p>
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

        {/* Set up again — only after repeated rejection */}
        {showReenroll && (
          <div className="mt-3">
            <button
              type="button"
              onClick={onReenroll}
              className="w-full px-4 py-2.5 rounded-2xl border border-[#3EF2DF]/40 text-[#7FF9EB] text-sm font-semibold cursor-pointer transition-colors hover:bg-[#3EF2DF]/10 active:scale-[0.99]"
            >
              {t.reenroll}
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-[#8FB3AC]">{t.reenrollHint}</p>
          </div>
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
