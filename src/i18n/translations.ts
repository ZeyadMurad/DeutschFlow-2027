import type { AppSectionId, UILanguage } from '../types/media';

export type CoreSectionId = Exclude<AppSectionId, 'home' | 'settings'>;

export interface SectionDefinition {
  id: CoreSectionId;
  titleAr: string;
  titleDe: string;
  titleEn: string;
  subtitleAr: string;
  subtitleDe: string;
  subtitleEn: string;
  accent: 'petrol' | 'coral' | 'gold';
}

export const HOME_SECTION_ORDER: CoreSectionId[] = [
  'newspapers',
  'news',
  'radio',
  'youtube',
  'movies',
  'podcasts',
  'reading',
  'learning',
  'documentaries',
  'culture',
  'science',
  'kids',
  'favorites',
  'library',
];

export const MAIN_SECTIONS: SectionDefinition[] = [
  {
    id: 'radio',
    titleAr: 'الإذاعات الألمانية',
    titleDe: 'Deutsches Radio',
    titleEn: 'German Radio',
    subtitleAr: 'مئات المحطات الحية عبر Radio Browser مع مشغل مباشر',
    subtitleDe: 'Hunderte Live-Sender aus ganz Deutschland',
    subtitleEn: 'Hundreds of live German stations with instant player',
    accent: 'petrol',
  },
  {
    id: 'news',
    titleAr: 'الأخبار الألمانية',
    titleDe: 'Deutsche Nachrichten',
    titleEn: 'German Newsroom',
    subtitleAr: 'غرفة أخبار موحدة ومحدّثة تلقائياً من المصادر الرسمية',
    subtitleDe: 'Aktuelle Schlagzeilen aus verlässlichen RSS-Quellen',
    subtitleEn: 'Live unified newsroom from official German feeds',
    accent: 'coral',
  },
  {
    id: 'newspapers',
    titleAr: 'الصحف والمجلات',
    titleDe: 'Zeitungen & Magazine',
    titleEn: 'Newspapers & Magazines',
    subtitleAr: 'أشهر الصحف الألمانية والمجلات المتخصصة في مكان واحد',
    subtitleDe: 'Tagesschau, Spiegel, ZEIT, FAZ, SZ, Heise & mehr',
    subtitleEn: 'Leading German dailies and specialist magazines',
    accent: 'gold',
  },
  {
    id: 'youtube',
    titleAr: 'German Studio',
    titleDe: 'German Studio',
    titleEn: 'German Studio',
    subtitleAr: 'قنوات وبرامج الفيديو الألمانية المختارة وتشغيل رسمي داخل التطبيق',
    subtitleDe: 'Kuratierte deutsche Videokanäle & integrierter Player',
    subtitleEn: 'Curated German video channels with embedded official player',
    accent: 'coral',
  },
  {
    id: 'documentaries',
    titleAr: 'الوثائقيات والتحقيقات',
    titleDe: 'Dokus & Reportagen',
    titleEn: 'Documentaries',
    subtitleAr: 'ARTE و DW و Terra X و ZDFinfo و STRG_F و Y-Kollektiv',
    subtitleDe: 'Geschichte, Wissenschaft, Gesellschaft & Recherche',
    subtitleEn: 'In-depth documentaries and investigative journalism',
    accent: 'petrol',
  },
  {
    id: 'podcasts',
    titleAr: 'البودكاست الألماني',
    titleDe: 'Deutsche Podcasts',
    titleEn: 'German Podcasts',
    subtitleAr: 'حلقات أصلية كاملة مع حفظ موضع الاستماع وسرعة النطق',
    subtitleDe: 'Original-Audiofeeds mit Fortschrittsspeicherung',
    subtitleEn: 'Full German podcast episodes with resume & speed',
    accent: 'gold',
  },
  {
    id: 'movies',
    titleAr: 'الأفلام والمسلسلات',
    titleDe: 'Filme & Serien',
    titleEn: 'Movies & Series',
    subtitleAr: 'دليل المنصات المجانية والمدفوعة والأعمال الألمانية البارزة',
    subtitleDe: 'Mediatheken, Streaming-Dienste & deutsche Klassiker',
    subtitleEn: 'Mediatheken, streaming platforms & German cinema',
    accent: 'coral',
  },
  {
    id: 'learning',
    titleAr: 'تعلم الألمانية',
    titleDe: 'Deutsch lernen',
    titleEn: 'German Learning',
    subtitleAr: 'محتوى مبسط ومتدرج حسب A1–C2 من DW و Easy German',
    subtitleDe: 'Verständliche Formate von A1 bis C2',
    subtitleEn: 'Learner-friendly German media across A1–C2',
    accent: 'petrol',
  },
  {
    id: 'reading',
    titleAr: 'القراءة الألمانية',
    titleDe: 'Leseraum',
    titleEn: 'German Reading',
    subtitleAr: 'شاشة قراءة هادئة مع نطق ألماني وحفظ الكلمات والجمل',
    subtitleDe: 'Ruhig lesen, anhören & Vokabeln direkt speichern',
    subtitleEn: 'Focused reading with German TTS & word saving',
    accent: 'gold',
  },
  {
    id: 'culture',
    titleAr: 'الثقافة والتاريخ',
    titleDe: 'Kultur & Geschichte',
    titleEn: 'Culture & History',
    subtitleAr: 'برامج ومقالات ووثائقيات عن الثقافة والتاريخ الألماني',
    subtitleDe: 'Feuilleton, Geschichte & europäische Kultur',
    subtitleEn: 'German history, arts, and cultural programming',
    accent: 'coral',
  },
  {
    id: 'science',
    titleAr: 'العلوم والتكنولوجيا',
    titleDe: 'Wissenschaft & Technik',
    titleEn: 'Science & Tech',
    subtitleAr: 'Spektrum و Heise و Ärzteblatt و Quarks و Das Wissen',
    subtitleDe: 'Forschung, IT, Medizin & Naturwissenschaften',
    subtitleEn: 'Research, medicine, and technology in German',
    accent: 'petrol',
  },
  {
    id: 'kids',
    titleAr: 'محتوى الأطفال',
    titleDe: 'Kinder & Familie',
    titleEn: 'German Kids Media',
    subtitleAr: 'KiKA و logo! و Die Sendung mit der Maus وإذاعات الأطفال',
    subtitleDe: 'Klar gesprochenes Deutsch für Einsteiger & Kinder',
    subtitleEn: 'Clear, accessible German media for kids & learners',
    accent: 'gold',
  },
  {
    id: 'favorites',
    titleAr: 'المفضلة وقوائمي',
    titleDe: 'Favoriten & Listen',
    titleEn: 'My Favorites',
    subtitleAr: 'المحطات والمقالات والفيديوهات وقوائم الاستماع والمشاهدة لاحقاً',
    subtitleDe: 'Gespeicherte Sender, Artikel, Videos & Merklisten',
    subtitleEn: 'Saved stations, articles, videos & later queues',
    accent: 'coral',
  },
  {
    id: 'library',
    titleAr: 'مكتبتي التعليمية',
    titleDe: 'Meine Lernbibliothek',
    titleEn: 'My Learning Library',
    subtitleAr: 'بنك المفردات، الجمل، بطاقات المراجعة، السجل، والنسخ الاحتياطي',
    subtitleDe: 'Wortschatz, Sätze, Lernkarten, Verlauf & Backup',
    subtitleEn: 'Vocabulary bank, flashcards, history & local backup',
    accent: 'petrol',
  },
];

export const UI_TEXT: Record<
  UILanguage,
  {
    tagline: string;
    backHome: string;
    searchPlaceholder: string;
    unifiedSearch: string;
    refreshNow: string;
    loading: string;
    offlineNotice: string;
    emptyState: string;
    openOriginal: string;
    saveFavorite: string;
    saved: string;
    play: string;
    pause: string;
    stop: string;
    retry: string;
    live: string;
    minutesExposure: string;
    vocabSavedCount: string;
    recentTitle: string;
  }
> = {
  ar: {
    tagline: 'عالمك الإعلامي الألماني الشخصي',
    backHome: 'العودة إلى الرئيسية',
    searchPlaceholder: 'ابحث في الإذاعات، الأخبار، يوتيوب، البودكاست والأفلام...',
    unifiedSearch: 'بحث شامل',
    refreshNow: 'تحديث الآن',
    loading: 'جارٍ التحميل من المصادر الرسمية...',
    offlineNotice: 'وضع عدم الاتصال — يتم عرض آخر بيانات محفوظة محلياً',
    emptyState: 'لا توجد عناصر مطابقة حالياً.',
    openOriginal: 'فتح المصدر الأصلي',
    saveFavorite: 'حفظ في المفضلة',
    saved: 'محفوظ',
    play: 'تشغيل',
    pause: 'إيقاف مؤقت',
    stop: 'إيقاف',
    retry: 'إعادة المحاولة',
    live: 'مباشر LIVE',
    minutesExposure: 'دقيقة استماع/قراءة',
    vocabSavedCount: 'كلمة محفوظة',
    recentTitle: 'متابعة سريعة',
  },
  de: {
    tagline: 'Dein persönliches deutsches Medienuniversum',
    backHome: 'Zurück zur Startseite',
    searchPlaceholder: 'Suche nach Radio, Nachrichten, Videos, Podcasts & Filmen...',
    unifiedSearch: 'Globale Suche',
    refreshNow: 'Jetzt aktualisieren',
    loading: 'Lade aktuelle Inhalte aus offiziellen Quellen...',
    offlineNotice: 'Offline-Modus — zeige zuletzt gespeicherte Daten',
    emptyState: 'Keine passenden Einträge gefunden.',
    openOriginal: 'Originalquelle öffnen',
    saveFavorite: 'Merken',
    saved: 'Gespeichert',
    play: 'Abspielen',
    pause: 'Pause',
    stop: 'Stopp',
    retry: 'Erneut versuchen',
    live: 'LIVE',
    minutesExposure: 'Min. Lernzeit',
    vocabSavedCount: 'Vokabeln',
    recentTitle: 'Schnell fortsetzen',
  },
  en: {
    tagline: 'Your German Media Universe',
    backHome: 'Back to Home',
    searchPlaceholder: 'Search radio, news, YouTube, podcasts & films...',
    unifiedSearch: 'Global Search',
    refreshNow: 'Refresh Now',
    loading: 'Fetching live content from official sources...',
    offlineNotice: 'Offline mode — showing last locally cached content',
    emptyState: 'No matching items found.',
    openOriginal: 'Open Original Source',
    saveFavorite: 'Save',
    saved: 'Saved',
    play: 'Play',
    pause: 'Pause',
    stop: 'Stop',
    retry: 'Retry',
    live: 'LIVE',
    minutesExposure: 'min exposure',
    vocabSavedCount: 'saved words',
    recentTitle: 'Quick Resume',
  },
};

export function getSectionTitle(s: SectionDefinition, lang: UILanguage): string {
  return lang === 'ar' ? s.titleAr : lang === 'de' ? s.titleDe : s.titleEn;
}

export function getSectionSubtitle(s: SectionDefinition, lang: UILanguage): string {
  return lang === 'ar' ? s.subtitleAr : lang === 'de' ? s.subtitleDe : s.subtitleEn;
}
