import React, { useRef, useState } from 'react';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { BiometricCeremonyError, isPlatformAuthenticatorAvailable, useAuth } from '../../context/AuthContext';
import { BiometricApiError } from '../../services/api';
import type { UILanguage } from '../../types/media';
import {
  FingerprintScanOverlay,
  failureText,
  type ScanFailure,
  type ScanPhase,
} from './FingerprintScanOverlay';

const TEXT = {
  ar: {
    title: 'الدخول بالبصمة',
    subtitle: 'المس بصمتك للدخول — تماماً كما تفتح هاتفك',
    enrollTitle: 'تفعيل الدخول بالبصمة',
    enrollDesc:
      'اضغط زر البصمة مرة واحدة لتفعيلها على هذا الجهاز، ثم أكمل طلب البصمة الذي يظهر من جهازك بالإصبع الذي تفتح به هاتفك. بعد التفعيل لا يُقبل إلا إصبع مسجّل في هذا الجهاز؛ أي إصبع آخر يرفضه جهازك نفسه.',
    enrollBtn: 'اضغط لتفعيل بصمتك',
    loginBtn: 'اضغط للدخول بالبصمة',
    working: 'جارٍ التحقق…',
    onlyWay: 'الدخول إلى واجهة المستخدم يتم بالبصمة فقط.',
    unsupported:
      'متصفحك أو جهازك لا يدعم الدخول بالبصمة، ولا يمكن فتح الواجهة منه. افتح التطبيق في Chrome على أندرويد أو Safari على iPhone، مباشرة وليس من داخل تطبيق آخر، وعلى عنوان يبدأ بـ https.',
    noPlatform: 'لا يوجد قارئ بصمة متاح على هذا الجهاز.',
    privacy:
      'خصوصيتك: لا تُخزَّن صورة البصمة إطلاقاً — جهازك نفسه يتحقق منها كما يفعل عند فتح الشاشة، والخادم يحفظ مفتاحاً تشفيرياً عاماً فقط.',
  },
  de: {
    title: 'Anmeldung per Fingerabdruck',
    subtitle: 'Tippe auf deinen Fingerabdruck — wie beim Entsperren deines Handys',
    enrollTitle: 'Fingerabdruck-Anmeldung aktivieren',
    enrollDesc:
      'Tippe einmal auf die Schaltfläche und bestätige die Abfrage deines Geräts mit dem Finger, mit dem du dein Handy entsperrenst. Danach wird nur ein auf diesem Gerät registrierter Finger akzeptiert — jeden anderen lehnt dein Gerät selbst ab.',
    enrollBtn: 'Zum Aktivieren tippen',
    loginBtn: 'Zum Anmelden tippen',
    working: 'Wird geprüft…',
    onlyWay: 'Der Arbeitsbereich lässt sich nur per Fingerabdruck öffnen.',
    unsupported:
      'Dein Browser/Gerät unterstützt keine Fingerabdruck-Anmeldung, die Oberfläche lässt sich daraus nicht öffnen. Nutze Chrome (Android) oder Safari (iPhone) direkt — nicht innerhalb einer anderen App — und eine https-Adresse.',
    noPlatform: 'Kein Fingerabdruckleser auf diesem Gerät verfügbar.',
    privacy:
      'Privatsphäre: Das Fingerabdruck-Bild wird nie gespeichert — dein Gerät prüft es lokal wie beim Entsperren, der Server speichert nur einen öffentlichen Schlüssel.',
  },
  en: {
    title: 'Fingerprint Sign-In',
    subtitle: 'Tap your fingerprint to sign in — just like unlocking your phone',
    enrollTitle: 'Enable fingerprint sign-in',
    enrollDesc:
      'Tap the button once and approve your device\'s prompt with the finger you unlock your phone with. From then on only a finger enrolled on this device is accepted — your device itself rejects any other finger.',
    enrollBtn: 'Tap to enable your fingerprint',
    loginBtn: 'Tap to sign in with fingerprint',
    working: 'Verifying…',
    onlyWay: 'The workspace opens by fingerprint only.',
    unsupported:
      'Your browser/device does not support fingerprint sign-in, so the workspace cannot be opened from it. Use Chrome (Android) or Safari (iPhone) directly — not inside another app — on an https address.',
    noPlatform: 'No fingerprint reader available on this device.',
    privacy:
      'Privacy: the fingerprint image is never stored — your device verifies it locally like screen unlock, and the server keeps only a public key.',
  },
} as const;

interface BiometricAuthCardProps {
  lang: UILanguage;
  /** called after a successful fingerprint register/login to enter the app UI */
  onAuthenticated: () => void;
}

/** how long the green check stays visible before the workspace opens */
const SUCCESS_HOLD_MS = 900;

const ARABIC_LETTERS = /[\u0600-\u06FF]/;

/** The server no longer knows this device's fingerprint → create it again. */
function isUnknownFingerprint(err: unknown): boolean {
  if (!(err instanceof BiometricApiError)) return false;
  return (
    err.code === 'NOT_ENROLLED' ||
    err.code === 'UNKNOWN_CREDENTIAL' ||
    (err.code === undefined && err.status === 404)
  );
}

function describeFailure(err: unknown, lang: UILanguage): ScanFailure {
  if (err instanceof BiometricCeremonyError) {
    return { kind: err.reason };
  }
  if (err instanceof BiometricApiError) {
    if (err.code === 'CHALLENGE_EXPIRED') return { kind: 'expired' };
    if (err.code === 'RATE_LIMITED') return { kind: 'rateLimited' };
    // The server checked the fingerprint and did not accept it
    if (err.status === 401) return { kind: 'rejected' };
    return { kind: 'server', message: lang === 'ar' ? err.message : undefined };
  }
  // Network failure or an unexpected error: show its text only when it is Arabic
  const message = err instanceof Error ? err.message : '';
  return { kind: 'server', message: lang === 'ar' && ARABIC_LETTERS.test(message) ? message : undefined };
}

export const BiometricAuthCard: React.FC<BiometricAuthCardProps> = ({ lang, onAuthenticated }) => {
  const t = TEXT[lang];
  const { session, biometricSupported, hasLocalHint, registerFingerprint, loginWithFingerprint } = useAuth();
  const [platformReady, setPlatformReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  /** last failed attempt; shown in the dialog, then under the button once it is closed */
  const [failure, setFailure] = useState<ScanFailure | null>(null);
  const [failureCount, setFailureCount] = useState(0);

  // Scan overlay: null = closed; phases drive the icon/check/error visuals
  const [scan, setScan] = useState<{ phase: ScanPhase; burstKey: number } | null>(null);

  // Bumped on every attempt and on close: a result that arrives for an older
  // attempt (e.g. a prompt completed after the dialog was closed) is ignored.
  const attemptRef = useRef(0);
  // The action a plain "retry" repeats (login when enrolled, otherwise setup)
  const lastActionRef = useRef<'enroll' | 'login'>('enroll');

  React.useEffect(() => {
    if (!biometricSupported) return;
    void isPlatformAuthenticatorAvailable().then(setPlatformReady);
  }, [biometricSupported]);

  if (!biometricSupported) {
    return (
      <div
        className="df-card rounded-2xl p-4 border border-[#C8962E]/25 bg-[#FFF9E8]/70 dark:bg-[#03201D]/70 text-xs leading-relaxed text-[#6E4F12] dark:text-[#FBE8A6]"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-1.5">
            <p>{t.unsupported}</p>
            <p className="font-semibold">{t.onlyWay}</p>
          </div>
        </div>
      </div>
    );
  }

  const runScan = async (action: 'enroll' | 'login') => {
    // No usable fingerprint reader on this device: say so at once instead of
    // waiting for a device prompt that will never appear.
    if (platformReady === false) {
      setFailure({ kind: 'no-sensor' });
      setFailureCount((count) => count + 1);
      setScan({ phase: 'error', burstKey: 0 });
      return;
    }

    const attempt = ++attemptRef.current;
    const isCurrent = () => attemptRef.current === attempt;
    lastActionRef.current = action;

    setBusy(true);
    setFailure(null);
    setScan({ phase: 'scanning', burstKey: 0 });
    try {
      if (action === 'login') {
        try {
          await loginWithFingerprint();
        } catch (err) {
          // The server lost its data (or never saw this device): set the
          // fingerprint up again right away — the device still asks for it.
          if (!isUnknownFingerprint(err)) throw err;
          lastActionRef.current = 'enroll';
          await registerFingerprint('', '');
        }
      } else {
        await registerFingerprint('', '');
      }
      if (!isCurrent()) return;
      setFailureCount(0);
      // Success: show the green check, then enter the workspace
      setScan({ phase: 'success', burstKey: Date.now() });
      await new Promise((resolve) => setTimeout(resolve, SUCCESS_HOLD_MS));
      if (!isCurrent()) return;
      onAuthenticated();
    } catch (err) {
      if (!isCurrent()) return;
      setFailure(describeFailure(err, lang));
      setFailureCount((count) => count + 1);
      setScan({ phase: 'error', burstKey: 0 });
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };

  const handleRetry = () => void runScan(lastActionRef.current);
  const handleReenroll = () => void runScan('enroll');
  const handleClose = () => {
    // Invalidate the running attempt so its late result cannot reopen the dialog
    attemptRef.current += 1;
    setBusy(false);
    setScan(null);
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const enrolled = hasLocalHint || Boolean(session);
  const closedFailure = scan === null && failure ? failureText(failure, lang) : null;

  return (
    <>
      <FingerprintScanOverlay
        open={scan !== null}
        phase={scan?.phase ?? 'scanning'}
        lang={lang}
        burstKey={scan?.burstKey ?? 0}
        failure={failure}
        failureCount={failureCount}
        onRetry={handleRetry}
        onReenroll={handleReenroll}
        onClose={handleClose}
      />

      <div
        dir={dir}
        className="df-card rounded-2xl p-4 sm:p-5 border border-[#0D4A42]/18 dark:border-[#3EF2DF]/28 bg-white/92 dark:bg-[#062924]/92 shadow-lg backdrop-blur-sm"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0E4F47] to-[#052522] border border-[#3EF2DF]/30 flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5 text-[#E8C35A]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#093D38] dark:text-white truncate">{t.title}</h3>
            <p className="text-[11px] text-[#52615D] dark:text-[#A4C8C1] truncate">{t.subtitle}</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {!enrolled && (
            <div className="rounded-xl bg-[#0E4F47]/8 dark:bg-white/6 border border-[#0D4A42]/12 dark:border-white/10 px-3.5 py-3">
              <p className="text-xs font-semibold text-[#093D38] dark:text-white">{t.enrollTitle}</p>
              <p className="text-[11px] text-[#52615D] dark:text-[#A4C8C1] leading-relaxed mt-1">{t.enrollDesc}</p>
            </div>
          )}

          {/* Big fingerprint tap button — the only entry to the workspace */}
          <button
            type="button"
            onClick={() => void runScan(enrolled ? 'login' : 'enroll')}
            disabled={busy}
            className="group w-full rounded-2xl p-4 flex flex-col items-center gap-2.5 cursor-pointer transition-all border-2 border-[#0D4A42]/16 dark:border-[#3EF2DF]/30 bg-gradient-to-b from-[#0E4F47]/10 to-[#052522]/12 hover:border-[#E8C35A] hover:shadow-[0_10px_30px_rgba(212,175,55,0.25)] active:scale-[0.98] disabled:opacity-60"
          >
            <span className="relative w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-[#0E4F47] to-[#041B18] border-2 border-[#3EF2DF]/40 group-hover:border-[#E8C35A] transition-colors">
              <Fingerprint
                className={`w-11 h-11 ${
                  busy ? 'text-[#E8C35A] animate-pulse' : 'text-[#7FF9EB] group-hover:text-[#E8C35A] transition-colors'
                }`}
                strokeWidth={1.4}
              />
            </span>
            <span className="text-sm font-bold text-[#093D38] dark:text-white">
              {busy ? t.working : enrolled ? t.loginBtn : t.enrollBtn}
            </span>
          </button>

          {closedFailure && (
            <div
              role="alert"
              className="text-xs text-[#B3261E] dark:text-[#FFB4AB] bg-[#B3261E]/8 rounded-lg px-3 py-2 leading-relaxed"
            >
              <span className="font-semibold">{closedFailure.title}.</span> {closedFailure.sub}
            </div>
          )}

          {platformReady === false && (
            <p className="text-[11px] text-[#C8962E] dark:text-[#E8C35A] leading-relaxed">{t.noPlatform}</p>
          )}

          <p className="text-[10px] leading-relaxed text-[#52615D]/80 dark:text-[#A4C8C1]/75 border-t border-[#0D4A42]/10 dark:border-white/8 pt-2.5">
            {t.privacy}
          </p>
        </div>
      </div>
    </>
  );
};
