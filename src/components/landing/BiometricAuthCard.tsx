import React, { useState } from 'react';
import { Fingerprint, Loader2, LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { isPlatformAuthenticatorAvailable, useAuth } from '../../context/AuthContext';
import type { UILanguage } from '../../types/media';

const TEXT = {
  ar: {
    title: 'الدخول بالبصمة',
    subtitle: 'مسجّل بصمتك؟ المستخدم التعرف عليك ودخول التطبيق مباشرة',
    registerTitle: 'أنشئ ملف بصمتك',
    registerDesc: 'سجّل بصمة إصبعك مرة واحدة على هذا الجهاز — في كل زيارة قادمة سنتعرف عليك تلقائياً وندخلك إلى واجهة التطبيق مباشرة.',
    userIdLabel: 'اسم مستخدم (اختياري)',
    userIdPlaceholder: 'مثال: zeyad (أو اتركه فارغاً)',
    deviceLabel: 'اسم هذا الجهاز (اختياري)',
    devicePlaceholder: 'مثال: هاتفي الشخصي',
    registerBtn: 'تسجيل بصمة الإصبع',
    loginBtn: 'تسجيل الدخول بالبصمة',
    signedInAs: 'مسجّل الدخول',
    enterApp: 'دخول واجهة المستخدم',
    logout: 'خروج',
    working: 'جارٍ...',
    verifying: 'جارٍ التحقق من بصمتك...',
    unsupported: 'متصفحك أو جهازك لا يدعم الدخول بالبصمة. استخدم متصفحاً حديثاً (Chrome / Safari) على جهاز به قارئ بصمة، أو ادخل بالزر العادي.',
    noPlatform: 'لا يوجد قارئ بصمة متاح على هذا الجهاز — يمكن استخدام مفتاح مرور من هاتفك أو Windows Hello.',
    errorRetry: 'أعد المحاولة',
    privacy: 'خصوصيتك: لا تُخزَّن صورة البصمة إطلاقاً — الجهاز نفسه يتحقق منها ويوقّع مفتاحاً تشفيرياً فريداً، والخادم يحفظ المفتاح العام فقط.',
  },
  de: {
    title: 'Anmeldung per Fingerabdruck',
    subtitle: 'Bereits registriert? Wir erkennen dich wieder und öffnen den Arbeitsbereich',
    registerTitle: 'Fingerabdruck einrichten',
    registerDesc: 'Registriere deinen Fingerabdruck einmal auf diesem Gerät — bei jedem weiteren Besuch erkennen wir dich automatisch wieder.',
    userIdLabel: 'Benutzername (optional)',
    userIdPlaceholder: 'z. B. zeyad (oder leer lassen)',
    deviceLabel: 'Gerätename (optional)',
    devicePlaceholder: 'z. B. Mein Handy',
    registerBtn: 'Fingerabdruck registrieren',
    loginBtn: 'Mit Fingerabdruck anmelden',
    signedInAs: 'Angemeldet als',
    enterApp: 'Zum Arbeitsbereich',
    logout: 'Abmelden',
    working: 'Läuft...',
    verifying: 'Fingerabdruck wird geprüft...',
    unsupported: 'Dein Browser/Gerät unterstützt keine biometrische Anmeldung. Nutze einen modernen Browser auf einem Gerät mit Fingerabdruckleser.',
    noPlatform: 'Kein Fingerabdruckleser verfügbar — Passkey vom Telefon oder Windows Hello kann genutzt werden.',
    errorRetry: 'Erneut versuchen',
    privacy: 'Privatsphäre: Das Fingerabdruck-Bild wird nie gespeichert — dein Gerät prüft es lokal und signiert einen einzigartigen Schlüssel.',
  },
  en: {
    title: 'Fingerprint Sign-In',
    subtitle: 'Already enrolled? We recognise you and open your workspace',
    registerTitle: 'Set up your fingerprint',
    registerDesc: 'Enrol your fingerprint once on this device — every future visit is auto-recognised and takes you straight into the app.',
    userIdLabel: 'Username (optional)',
    userIdPlaceholder: 'e.g. zeyad (or leave empty)',
    deviceLabel: 'Device name (optional)',
    devicePlaceholder: 'e.g. My Phone',
    registerBtn: 'Enrol fingerprint',
    loginBtn: 'Sign in with fingerprint',
    signedInAs: 'Signed in as',
    enterApp: 'Enter workspace',
    logout: 'Sign out',
    working: 'Working...',
    verifying: 'Verifying your fingerprint...',
    unsupported: 'Your browser/device does not support biometric sign-in. Use a modern browser on a device with a fingerprint reader.',
    noPlatform: 'No fingerprint reader available — a phone passkey or Windows Hello can be used.',
    errorRetry: 'Try again',
    privacy: 'Privacy: the fingerprint image is never stored — your device verifies it locally and signs a unique cryptographic key.',
  },
} as const;

interface BiometricAuthCardProps {
  lang: UILanguage;
  /** called after a successful fingerprint register/login to enter the app UI */
  onAuthenticated: () => void;
}

export const BiometricAuthCard: React.FC<BiometricAuthCardProps> = ({ lang, onAuthenticated }) => {
  const t = TEXT[lang];
  const { session, biometricSupported, hasLocalHint, registerFingerprint, loginWithFingerprint, signOut } = useAuth();
  const [platformReady, setPlatformReady] = useState<boolean | null>(null);
  const [userId, setUserId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'idle' | 'prompt'>('idle');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!biometricSupported) return;
    void isPlatformAuthenticatorAvailable().then(setPlatformReady);
  }, [biometricSupported]);

  if (!biometricSupported) {
    return (
      <div className="df-card rounded-2xl p-4 border border-[#C8962E]/25 bg-[#FFF9E8]/70 dark:bg-[#03201D]/70 text-xs leading-relaxed text-[#6E4F12] dark:text-[#FBE8A6]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{t.unsupported}</p>
        </div>
      </div>
    );
  }

  const handleRegister = async () => {
    setBusy(true);
    setError('');
    setStage('prompt');
    try {
      await registerFingerprint(userId.trim(), deviceName.trim());
      onAuthenticated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
      setStage('idle');
    }
  };

  const handleLogin = async () => {
    setBusy(true);
    setError('');
    setStage('prompt');
    try {
      await loginWithFingerprint();
      onAuthenticated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
      setStage('idle');
    }
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <div
      dir={dir}
      className="df-card rounded-2xl p-4 sm:p-5 border border-[#3EF2DF]/28 dark:border-[#3EF2DF]/28 border-[#0D4A42]/18 bg-white/92 dark:bg-[#062924]/92 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0E4F47] to-[#052522] border border-[#3EF2DF]/30 flex items-center justify-center shrink-0">
            <Fingerprint className="w-5 h-5 text-[#E8C35A]" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#093D38] dark:text-white truncate">{t.title}</h3>
            <p className="text-[11px] text-[#52615D] dark:text-[#A4C8C1] truncate">{t.subtitle}</p>
          </div>
        </div>
        {session && (
          <button
            type="button"
            onClick={signOut}
            title={t.logout}
            className="w-8 h-8 rounded-lg bg-[#0D4A42]/10 dark:bg-white/8 border border-[#0D4A42]/15 dark:border-white/15 text-[#52615D] dark:text-[#A4C8C1] hover:text-[#DD0000] flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {session ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-[#093D38] dark:text-[#CFE5E0]">
              <ShieldCheck className="w-4 h-4 text-[#1FB8A6]" />
              <span>
                {t.signedInAs} <strong className="font-mono-num">{session.userId}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={onAuthenticated}
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E8C35A] via-[#D4AF37] to-[#C8962E] text-[#052522] text-sm font-bold inline-flex items-center gap-2 cursor-pointer transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {t.enterApp}
            </button>
          </div>
        ) : hasLocalHint ? (
          <button
            type="button"
            onClick={handleLogin}
            disabled={busy}
            className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#0E4F47] to-[#052522] text-white text-sm font-bold inline-flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 shadow-md"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-5 h-5 text-[#E8C35A]" />}
            {busy ? (stage === 'prompt' ? t.verifying : t.working) : t.loginBtn}
          </button>
        ) : (
          <>
            <div className="rounded-xl bg-[#0E4F47]/8 dark:bg-white/6 border border-[#0D4A42]/12 dark:border-white/10 px-3.5 py-3">
              <p className="text-xs font-semibold text-[#093D38] dark:text-white">{t.registerTitle}</p>
              <p className="text-[11px] text-[#52615D] dark:text-[#A4C8C1] leading-relaxed mt-1">{t.registerDesc}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label className="block">
                <span className="text-[11px] font-medium text-[#52615D] dark:text-[#A4C8C1]">{t.userIdLabel}</span>
                <input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder={t.userIdPlaceholder}
                  dir="ltr"
                  maxLength={40}
                  className="mt-1 w-full rounded-lg bg-white dark:bg-[#041B18] border border-[#0D4A42]/18 dark:border-[#3EF2DF]/25 px-3 py-2 text-xs text-[#093D38] dark:text-white placeholder:text-[#98BDB6] focus:outline-none focus:border-[#C8962E] transition-colors"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-[#52615D] dark:text-[#A4C8C1]">{t.deviceLabel}</span>
                <input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder={t.devicePlaceholder}
                  maxLength={60}
                  className="mt-1 w-full rounded-lg bg-white dark:bg-[#041B18] border border-[#0D4A42]/18 dark:border-[#3EF2DF]/25 px-3 py-2 text-xs text-[#093D38] dark:text-white placeholder:text-[#98BDB6] focus:outline-none focus:border-[#C8962E] transition-colors"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleRegister}
              disabled={busy}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#E8C35A] via-[#D4AF37] to-[#C8962E] text-[#052522] text-sm font-bold inline-flex items-center justify-center gap-2.5 cursor-pointer transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60 shadow-[0_8px_24px_rgba(212,175,55,0.25)]"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
              {busy ? (stage === 'prompt' ? t.verifying : t.working) : t.registerBtn}
            </button>
            {platformReady === false && (
              <p className="text-[11px] text-[#C8962E] dark:text-[#E8C35A] leading-relaxed">{t.noPlatform}</p>
            )}
          </>
        )}

        {error && (
          <div className="flex items-center justify-between gap-2 text-xs text-[#B3261E] dark:text-[#FFB4AB] bg-[#B3261E]/8 rounded-lg px-3 py-2">
            <span className="leading-relaxed">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="text-[10px] font-semibold underline underline-offset-2 cursor-pointer shrink-0"
            >
              {t.errorRetry}
            </button>
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-[#52615D]/80 dark:text-[#A4C8C1]/75 border-t border-[#0D4A42]/10 dark:border-white/8 pt-2.5">
          {t.privacy}
        </p>
      </div>
    </div>
  );
};
