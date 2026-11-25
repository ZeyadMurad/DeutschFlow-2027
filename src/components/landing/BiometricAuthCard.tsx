import React, { useState } from 'react';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { isPlatformAuthenticatorAvailable, useAuth } from '../../context/AuthContext';
import type { UILanguage } from '../../types/media';
import { FingerprintScanOverlay, type ScanPhase } from './FingerprintScanOverlay';

const TEXT = {
  ar: {
    title: 'الدخول بالبصمة',
    subtitle: 'المس بصمتك للدخول — تماماً كما تفتح هاتفك',
    enrollTitle: 'تفعيل الدخول بالبصمة',
    enrollDesc:
      'اضغط زر البصمة مرة واحدة لتفعيلها على هذا الجهاز. المس إصبعك المسجّل في هاتفك — نفس البصمة التي تفتح بها الشاشة. لاحقاً، أي إصبع غير مسجّل في هاتفك سيُرفض تلقائياً.',
    enrollBtn: 'اضغط لتفعيل بصمتك',
    loginBtn: 'اضغط للدخول بالبصمة',
    working: 'جارٍ التهيئة…',
    unsupported: 'متصفحك أو جهازك لا يدعم الدخول بالبصمة. استخدم Chrome على أندرويد أو Safari على iPhone/Mac.',
    noPlatform: 'لا يوجد قارئ بصمة متاح على هذا الجهاز.',
    privacy: 'خصوصيتك: لا تُخزَّن صورة البصمة إطلاقاً — جهازك نفسه يتحقق منها كما يفعل عند فتح الشاشة، والخادم يحفظ مفتاحاً تشفيرياً عاماً فقط.',
  },
  de: {
    title: 'Anmeldung per Fingerabdruck',
    subtitle: 'Tippe auf deinen Fingerabdruck — wie beim Entsperren deines Handys',
    enrollTitle: 'Fingerabdruck-Anmeldung aktivieren',
    enrollDesc:
      'Tippe einmal auf die Schaltfläche, um sie auf diesem Gerät zu aktivieren. Benutze denselben Finger, mit dem du dein Handy entsperrst — nicht registrierte Finger werden automatisch abgelehnt.',
    enrollBtn: 'Zum Aktivieren tippen',
    loginBtn: 'Zum Anmelden tippen',
    working: 'Wird eingerichtet…',
    unsupported: 'Dein Browser/Gerät unterstützt keine biometrische Anmeldung. Nutze Chrome (Android) oder Safari (iPhone/Mac).',
    noPlatform: 'Kein Fingerabdruckleser auf diesem Gerät verfügbar.',
    privacy: 'Privatsphäre: Das Fingerabdruck-Bild wird nie gespeichert — dein Gerät prüft es lokal wie beim Entsperren, der Server speichert nur einen öffentlichen Schlüssel.',
  },
  en: {
    title: 'Fingerprint Sign-In',
    subtitle: 'Tap your fingerprint to sign in — just like unlocking your phone',
    enrollTitle: 'Enable fingerprint sign-in',
    enrollDesc:
      'Tap the button once to enable it on this device. Use the same finger you unlock your phone with — any finger not enrolled on your phone will be rejected automatically.',
    enrollBtn: 'Tap to enable your fingerprint',
    loginBtn: 'Tap to sign in with fingerprint',
    working: 'Setting up…',
    unsupported: 'Your browser/device does not support biometric sign-in. Use Chrome on Android or Safari on iPhone/Mac.',
    noPlatform: 'No fingerprint reader available on this device.',
    privacy: 'Privacy: the fingerprint image is never stored — your device verifies it locally like screen unlock, and the server keeps only a public key.',
  },
} as const;

interface BiometricAuthCardProps {
  lang: UILanguage;
  /** called after a successful fingerprint register/login to enter the app UI */
  onAuthenticated: () => void;
}

export const BiometricAuthCard: React.FC<BiometricAuthCardProps> = ({ lang, onAuthenticated }) => {
  const t = TEXT[lang];
  const { session, biometricSupported, hasLocalHint, registerFingerprint, loginWithFingerprint } = useAuth();
  const [platformReady, setPlatformReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Scan overlay: null = closed; phases drive the icon/check/error visuals
  const [scan, setScan] = useState<{ phase: ScanPhase; burstKey: number } | null>(null);

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
          <p>{t.unsupported}</p>
        </div>
      </div>
    );
  }

  const runScan = async (action: 'enroll' | 'login') => {
    setBusy(true);
    setError('');
    setScan({ phase: 'scanning', burstKey: 0 });
    try {
      if (action === 'enroll') {
        await registerFingerprint('', '');
      } else {
        await loginWithFingerprint();
      }
      // Success: show the green check, then enter the workspace
      setScan((prev) => (prev ? { phase: 'success', burstKey: Date.now() } : prev));
      await new Promise((resolve) => setTimeout(resolve, 900));
      onAuthenticated();
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'حدث خطأ غير متوقع.';
      // Map silent failures to the "finger not recognised" retry experience
      const msg = /أُلغيت|تعذّر قراءة|not allowed|NotAllowedError|aborted/i.test(raw)
        ? lang === 'ar'
          ? 'لم يتم التعرف على الإصبع. أعد المحاولة بإصبع البصمة المسجّلة.'
          : lang === 'de'
          ? 'Finger nicht erkannt. Erneut mit dem registrierten Finger versuchen.'
          : 'Finger not recognised. Try again with the enrolled finger.'
        : raw;
      setError(msg);
      setScan({ phase: 'error', burstKey: 0 });
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setScan(null);
    void runScan(hasLocalHint || session ? 'login' : 'enroll');
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const enrolled = hasLocalHint || Boolean(session);
  const scanPhase = scan?.phase ?? 'scanning';

  return (
    <>
      <FingerprintScanOverlay
        open={scan !== null}
        phase={scanPhase}
        lang={lang}
        burstKey={scan?.burstKey ?? 0}
        onRetry={handleRetry}
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

          {error && (
            <div className="text-xs text-[#B3261E] dark:text-[#FFB4AB] bg-[#B3261E]/8 rounded-lg px-3 py-2 leading-relaxed">
              {error}
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
