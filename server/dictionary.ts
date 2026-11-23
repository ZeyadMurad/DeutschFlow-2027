import { GoogleGenAI, Type } from '@google/genai';
import { CORE_DE_AR_DICTIONARY } from './sources.js';
import type { DictionaryLookupResult } from '../src/types/media.js';

interface LexicalEntry {
  lemma: string;
  translationAr: string;
  translationEn?: string;
  pos: string;
  article?: 'der' | 'die' | 'das' | 'die (Pl.)';
  plural?: string;
  explanationAr?: string;
  alternativesAr?: string[];
}

const WIKI_USER_AGENT = 'DeutschFlowApp/1.0 (https://deutschflow.local; personal-german-learner)';

const STRUCTURED_LEXICON: Record<string, LexicalEntry> = {
  // Journalism, technology & real user article words
  repository: {
    lemma: 'Repository',
    translationAr: 'مستودع (برمجي / للبيانات)',
    translationEn: 'repository',
    pos: 'Substantiv (اسم)',
    article: 'das',
    plural: 'die Repositories',
    explanationAr: 'مستودع لتخزين الشيفرة البرمجية أو الملفات وإدارة نسخها في منصات مثل GitHub و Codeberg.',
    alternativesAr: ['مخزن رقمي', 'مستودع برمجي'],
  },
  repositories: {
    lemma: 'Repository',
    translationAr: 'مستودعات (برمجية)',
    translationEn: 'repositories',
    pos: 'Substantiv (اسم - جمع)',
    article: 'das',
    plural: 'die Repositories',
    explanationAr: 'جمع كلمة das Repository وتعني مستودعات الشيفرة البرمجية أو البيانات.',
    alternativesAr: ['مخازن برمجية', 'مستودعات كود'],
  },
  alternative: {
    lemma: 'Alternative',
    translationAr: 'بديل / خيار آخر',
    translationEn: 'alternative',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Alternativen',
    explanationAr: 'خيار أو حل يمكن استخدامه بدلاً من خيار آخر.',
  },
  gesperrt: {
    lemma: 'sperren',
    translationAr: 'محظور / مُغلق / محجوب',
    translationEn: 'blocked / locked',
    pos: 'Partizip II / Adjektiv (صفة / اسم مفعول)',
    explanationAr: 'من الفعل sperren أي أغلق أو حظر الوصول إلى حساب أو نطاق أو طريق.',
    alternativesAr: ['مقفل', 'موقوف'],
  },
  sperren: {
    lemma: 'sperren',
    translationAr: 'يحظر / يُغلق / يُجمّد',
    pos: 'Verb (فعل)',
    explanationAr: 'منع الوصول إلى شيء أو إغلاقه مثل حساب بنكي أو موقع أو شارع.',
  },
  stundenlang: {
    lemma: 'stundenlang',
    translationAr: 'لساعات طويلة',
    translationEn: 'for hours',
    pos: 'Adjektiv / Adverb (صفة / ظرف)',
    explanationAr: 'يستمر لعدة ساعات متواصلة.',
    alternativesAr: ['طوال ساعات'],
  },
  unerreichbar: {
    lemma: 'unerreichbar',
    translationAr: 'متعذر الوصول إليه / غير متاح',
    translationEn: 'unreachable',
    pos: 'Adjektiv (صفة)',
    explanationAr: 'لا يمكن الوصول إليه سواءً تقنياً (موقع/خادم) أو مكانياً أو هاتفياً.',
    alternativesAr: ['بعيد المنال', 'خارج الخدمة'],
  },
  ungewiss: {
    lemma: 'ungewiss',
    translationAr: 'غير مؤكد / غامض',
    translationEn: 'uncertain',
    pos: 'Adjektiv (صفة)',
    explanationAr: 'يفتقر إلى اليقين أو الوضوح بشأن ما سيحدث مستقبلاً.',
    alternativesAr: ['مجهول', 'مبهم'],
  },
  offenbar: {
    lemma: 'offenbar',
    translationAr: 'على ما يبدو / ظاهرياً',
    translationEn: 'apparently / obviously',
    pos: 'Adverb / Adjektiv (ظرف / صفة)',
    explanationAr: 'يُستخدم للإشارة إلى استنتاج يبدو واضحاً من المعطيات المتاحة.',
    alternativesAr: ['من الواضح'],
  },
  grund: {
    lemma: 'Grund',
    translationAr: 'سبب / أساس / أرض',
    translationEn: 'reason / ground',
    pos: 'Substantiv (اسم)',
    article: 'der',
    plural: 'die Gründe',
    explanationAr: 'الدافع أو العلة وراء حدوث أمر ما.',
  },
  zukunft: {
    lemma: 'Zukunft',
    translationAr: 'المستقبل',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: '—',
  },
  darum: {
    lemma: 'darum',
    translationAr: 'لهذا السبب / لذلك',
    pos: 'Adverb / Konjunktionaladverb (ظرف ربط)',
    explanationAr: 'يُستخدم لربط النتيجة بالسبب (بسبب ذلك).',
  },
  veröffentlicht: {
    lemma: 'veröffentlichen',
    translationAr: 'نُشر / تم نشره / أصدر',
    pos: 'Partizip II / Verb (فعل / اسم مفعول)',
    explanationAr: 'من الفعل veröffentlichen أي نشر مقالاً أو دراسة أو بياناً رسمياً للجمهور.',
  },
  veröffentlichen: {
    lemma: 'veröffentlichen',
    translationAr: 'ينشر / يُصدر',
    pos: 'Verb (فعل)',
    explanationAr: 'نشر معلومات أو كتاباً أو دراسة أو أخباراً للعامة.',
  },
  nachrichten: {
    lemma: 'Nachricht',
    translationAr: 'أخبار / رسالة',
    pos: 'Substantiv (اسم - جمع)',
    article: 'die',
    plural: 'die Nachrichten',
  },
  nachricht: {
    lemma: 'Nachricht',
    translationAr: 'خبر / رسالة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Nachrichten',
  },
  regierung: {
    lemma: 'Regierung',
    translationAr: 'حكومة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Regierungen',
  },
  bundesregierung: {
    lemma: 'Bundesregierung',
    translationAr: 'الحكومة الاتحادية',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Bundesregierungen',
  },
  gesellschaft: {
    lemma: 'Gesellschaft',
    translationAr: 'مجتمع / شركة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Gesellschaften',
  },
  wirtschaft: {
    lemma: 'Wirtschaft',
    translationAr: 'اقتصاد',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Wirtschaften',
  },
  wissenschaft: {
    lemma: 'Wissenschaft',
    translationAr: 'علم / علوم',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Wissenschaften',
  },
  forschung: {
    lemma: 'Forschung',
    translationAr: 'بحث علمي',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Forschungen',
  },
  entwicklung: {
    lemma: 'Entwicklung',
    translationAr: 'تطور / تنمية',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Entwicklungen',
  },
  veränderung: {
    lemma: 'Veränderung',
    translationAr: 'تغيير / تحوّل',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Veränderungen',
  },
  entscheidung: {
    lemma: 'Entscheidung',
    translationAr: 'قرار',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Entscheidungen',
  },
  zusammenarbeit: {
    lemma: 'Zusammenarbeit',
    translationAr: 'تعاون / عمل مشترك',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: '—',
  },
  unterstützung: {
    lemma: 'Unterstützung',
    translationAr: 'دعم / مساندة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Unterstützungen',
  },
  universität: {
    lemma: 'Universität',
    translationAr: 'جامعة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Universitäten',
  },
  straße: {
    lemma: 'Straße',
    translationAr: 'شارع / طريق',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Straßen',
  },
  sicherheit: {
    lemma: 'Sicherheit',
    translationAr: 'أمن / سلامة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Sicherheiten',
  },
  gesundheit: {
    lemma: 'Gesundheit',
    translationAr: 'صحة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: '—',
  },
  bildung: {
    lemma: 'Bildung',
    translationAr: 'تعليم / ثقافة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Bildungen',
  },
  kultur: {
    lemma: 'Kultur',
    translationAr: 'ثقافة / حضارة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Kulturen',
  },
  geschichte: {
    lemma: 'Geschichte',
    translationAr: 'تاريخ / قصة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Geschichten',
  },
  umwelt: {
    lemma: 'Umwelt',
    translationAr: 'بيئة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Umwelten',
  },
  klimawandel: {
    lemma: 'Klimawandel',
    translationAr: 'تغير المناخ',
    pos: 'Substantiv (اسم)',
    article: 'der',
    plural: '—',
  },
  gesetz: {
    lemma: 'Gesetz',
    translationAr: 'قانون',
    pos: 'Substantiv (اسم)',
    article: 'das',
    plural: 'die Gesetze',
  },
  gericht: {
    lemma: 'Gericht',
    translationAr: 'محكمة / طبق طعام',
    pos: 'Substantiv (اسم)',
    article: 'das',
    plural: 'die Gerichte',
  },
  unternehmen: {
    lemma: 'Unternehmen',
    translationAr: 'شركة / مؤسسة',
    pos: 'Substantiv (اسم)',
    article: 'das',
    plural: 'die Unternehmen',
  },
  ergebnis: {
    lemma: 'Ergebnis',
    translationAr: 'نتيجة',
    pos: 'Substantiv (اسم)',
    article: 'das',
    plural: 'die Ergebnisse',
  },
  problem: {
    lemma: 'Problem',
    translationAr: 'مشكلة',
    pos: 'Substantiv (اسم)',
    article: 'das',
    plural: 'die Probleme',
  },
  lösung: {
    lemma: 'Lösung',
    translationAr: 'حل',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Lösungen',
  },
  erfolg: {
    lemma: 'Erfolg',
    translationAr: 'نجاح',
    pos: 'Substantiv (اسم)',
    article: 'der',
    plural: 'die Erfolge',
  },
  stadt: {
    lemma: 'Stadt',
    translationAr: 'مدينة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Städte',
  },
  land: {
    lemma: 'Land',
    translationAr: 'بلد / ولاية / ريف',
    pos: 'Substantiv (اسم)',
    article: 'das',
    plural: 'die Länder',
  },
  welt: {
    lemma: 'Welt',
    translationAr: 'عالم',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Welten',
  },
  mensch: {
    lemma: 'Mensch',
    translationAr: 'إنسان / شخص',
    pos: 'Substantiv (اسم)',
    article: 'der',
    plural: 'die Menschen',
  },
  menschen: {
    lemma: 'Mensch',
    translationAr: 'الناس / البشر',
    pos: 'Substantiv (اسم - جمع)',
    article: 'der',
    plural: 'die Menschen',
  },
  kinder: {
    lemma: 'Kind',
    translationAr: 'أطفال',
    pos: 'Substantiv (اسم - جمع)',
    article: 'das',
    plural: 'die Kinder',
  },
  kind: {
    lemma: 'Kind',
    translationAr: 'طفل',
    pos: 'Substantiv (اسم)',
    article: 'das',
    plural: 'die Kinder',
  },
  arbeit: {
    lemma: 'Arbeit',
    translationAr: 'عمل / شغل',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Arbeiten',
  },
  zeit: {
    lemma: 'Zeit',
    translationAr: 'وقت / زمن',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Zeiten',
  },
  tag: {
    lemma: 'Tag',
    translationAr: 'يوم / نهار',
    pos: 'Substantiv (اسم)',
    article: 'der',
    plural: 'die Tage',
  },
  jahr: {
    lemma: 'Jahr',
    translationAr: 'سنة / عام',
    pos: 'Substantiv (اسم)',
    article: 'das',
    plural: 'die Jahre',
  },
  jahre: {
    lemma: 'Jahr',
    translationAr: 'سنوات / أعوام',
    pos: 'Substantiv (اسم - جمع)',
    article: 'das',
    plural: 'die Jahre',
  },
  jahren: {
    lemma: 'Jahr',
    translationAr: 'سنوات (حالة الجر Dativ)',
    pos: 'Substantiv (اسم - جمع)',
    article: 'das',
    plural: 'die Jahre',
  },
  studie: {
    lemma: 'Studie',
    translationAr: 'دراسة / بحث',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Studien',
  },
  krise: {
    lemma: 'Krise',
    translationAr: 'أزمة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Krisen',
  },
  politik: {
    lemma: 'Politik',
    translationAr: 'سياسة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: '—',
  },
  wahl: {
    lemma: 'Wahl',
    translationAr: 'انتخاب / اختيار',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Wahlen',
  },
  energie: {
    lemma: 'Energie',
    translationAr: 'طاقة',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Energien',
  },
  daten: {
    lemma: 'Daten',
    translationAr: 'بيانات / معلومات',
    pos: 'Substantiv (اسم - جمع)',
    article: 'die (Pl.)',
    plural: 'die Daten',
  },
  intelligenz: {
    lemma: 'Intelligenz',
    translationAr: 'ذكاء',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: '—',
  },
  bericht: {
    lemma: 'Bericht',
    translationAr: 'تقرير / بلاغ',
    pos: 'Substantiv (اسم)',
    article: 'der',
    plural: 'die Berichte',
  },
  meldung: {
    lemma: 'Meldung',
    translationAr: 'خبر عاجل / إخطار',
    pos: 'Substantiv (اسم)',
    article: 'die',
    plural: 'die Meldungen',
  },
  weg: {
    lemma: 'Weg / weg',
    translationAr: 'طريق / مفقود / بعيداً',
    pos: 'Substantiv / Adverb (اسم / ظرف)',
    article: 'der',
    plural: 'die Wege',
    explanationAr: 'كاسم (der Weg) تعني طريق، وكظرف (weg) تعني اختفى أو لم يعد موجوداً (مثل: Domain weg).',
  },
  war: {
    lemma: 'sein',
    translationAr: 'كان (الماضي من يكون)',
    pos: 'Verb (فعل - Präteritum)',
    explanationAr: 'تصريف الفعل sein في زمن الماضي البسيط.',
  },
  ist: {
    lemma: 'sein',
    translationAr: 'يكون / هو',
    pos: 'Verb (فعل - Präsens)',
  },
  sind: {
    lemma: 'sein',
    translationAr: 'يكونون / هم',
    pos: 'Verb (فعل - Präsens)',
  },
  wurde: {
    lemma: 'werden',
    translationAr: 'أصبح / تمّ',
    pos: 'Verb (فعل - Präteritum)',
  },
  wird: {
    lemma: 'werden',
    translationAr: 'سوف / يصبح',
    pos: 'Verb (فعل - Präsens)',
  },
  hat: {
    lemma: 'haben',
    translationAr: 'لديه / يمتلك / قد (فعل مساعد)',
    pos: 'Verb (فعل - Präsens)',
  },
  aus: {
    lemma: 'aus',
    translationAr: 'من / خارج',
    pos: 'Präposition (حرف جر)',
  },
  den: {
    lemma: 'der / die',
    translationAr: 'الـ (حالة المفعول للمذكر أو الجر للجمع)',
    pos: 'Artikel (أداة تعريف)',
  },
  einer: {
    lemma: 'eine',
    translationAr: 'أداة نكرة (للمؤنث في حالة الجر/الإضافة)',
    pos: 'Artikel (أداة نكرة)',
  },
  eine: {
    lemma: 'ein / eine',
    translationAr: 'أداة نكرة للمؤنث',
    pos: 'Artikel (أداة نكرة)',
  },
  usa: {
    lemma: 'USA',
    translationAr: 'الولايات المتحدة الأمريكية',
    pos: 'Substantiv (اسم علم - جمع)',
    article: 'die (Pl.)',
  },
};

interface DictCacheEntry {
  result: DictionaryLookupResult;
  expiresAt: number;
}
const DICT_CACHE_MAX = 1500;
const DICT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const dictionaryCache = new Map<string, DictCacheEntry>();

function getCached(key: string): DictionaryLookupResult | null {
  const hit = dictionaryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    dictionaryCache.delete(key);
    return null;
  }
  return { ...hit.result, cached: true };
}

function setCached(key: string, result: DictionaryLookupResult): void {
  if (dictionaryCache.size >= DICT_CACHE_MAX) {
    const oldestKey = dictionaryCache.keys().next().value;
    if (oldestKey) dictionaryCache.delete(oldestKey);
  }
  dictionaryCache.set(key, { result, expiresAt: Date.now() + DICT_CACHE_TTL_MS });
}

export function normalizeGermanToken(raw: string): string {
  return raw
    .trim()
    .replace(/^[„"«(\[\s']+|[.,!?;:»"')\]…\s']+$/g, '')
    .trim();
}

function normalizeUmlautFold(s: string): string {
  return s
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

function buildStemCandidates(clean: string): string[] {
  const lower = clean.toLowerCase();
  const baseForms = [lower, normalizeUmlautFold(lower)];
  const stems = new Set<string>(baseForms);
  for (const base of baseForms) {
    if (base.length > 4) {
      for (const suffix of ['en', 'er', 'es', 'em', 'e', 'n', 's', 't', 'st', 'te', 'ten']) {
        if (base.endsWith(suffix) && base.length - suffix.length >= 3) {
          const stripped = base.slice(0, -suffix.length);
          stems.add(stripped);
          stems.add(`${stripped}en`);
          stems.add(`${stripped}e`);
        }
      }
      if (base.startsWith('ge') && (base.endsWith('t') || base.endsWith('en')) && base.length > 6) {
        const inner = base.slice(2, base.endsWith('en') ? -2 : -1);
        stems.add(`${inner}en`);
        stems.add(inner);
      }
    }
  }
  return Array.from(stems);
}

function lookupLocalStructured(word: string, target: 'ar' | 'en'): DictionaryLookupResult | null {
  const clean = normalizeGermanToken(word);
  if (!clean) return null;
  const stems = buildStemCandidates(clean);

  for (const key of stems) {
    const rich = STRUCTURED_LEXICON[key];
    if (rich) {
      const tr = target === 'en' && rich.translationEn ? rich.translationEn : rich.translationAr;
      return {
        word: clean,
        lemma: rich.lemma,
        translation: tr,
        partOfSpeech: rich.pos,
        article: rich.article || '',
        plural: rich.plural || '',
        explanation: rich.explanationAr,
        alternatives: rich.alternativesAr,
        provider: 'local_lexicon',
      };
    }
  }

  if (target === 'ar') {
    for (const key of stems) {
      if (CORE_DE_AR_DICTIONARY[key]) {
        const isCap = /^[A-ZÄÖÜ]/.test(clean);
        return {
          word: clean,
          lemma: key === clean.toLowerCase() ? clean : key,
          translation: CORE_DE_AR_DICTIONARY[key],
          partOfSpeech: isCap ? 'Substantiv / Wort (كلمة)' : 'Wort (كلمة)',
          provider: 'local_glossary',
        };
      }
    }
  }

  return null;
}

function inferPosFallback(word: string): string {
  const clean = normalizeGermanToken(word);
  if (/(ung|heit|keit|schaft|tät|tion|ment)$/i.test(clean)) {
    return 'Substantiv (اسم مؤنث غالباً)';
  }
  if (/^[A-ZÄÖÜ]/.test(clean)) return 'Substantiv / Eigenname (اسم)';
  if (/(en|ern|eln)$/.test(clean)) return 'Verb / Infinitiv (فعل أو مصدر)';
  if (/(lich|ig|isch|bar|sam|los|lang)$/.test(clean)) return 'Adjektiv / Adverb (صفة / ظرف)';
  return 'Wort / Phrase (كلمة / عبارة)';
}

function mapPosToBilingual(pos?: string): string {
  if (!pos) return 'Wort (كلمة)';
  const p = pos.toLowerCase();
  if (p.includes('noun') || p.includes('substantiv')) return 'Substantiv (اسم)';
  if (p.includes('participle')) return 'Partizip / Verb (اسم مفعول / فعل)';
  if (p.includes('verb')) return 'Verb (فعل)';
  if (p.includes('adjective') || p.includes('adjektiv')) return 'Adjektiv (صفة)';
  if (p.includes('adverb')) return 'Adverb (ظرف)';
  if (p.includes('preposition')) return 'Präposition (حرف جر)';
  if (p.includes('conjunction')) return 'Konjunktion (أداة ربط)';
  return pos;
}

async function safeFetchJson<T>(url: string, timeoutMs = 4500): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': WIKI_USER_AGENT,
        'Api-User-Agent': WIKI_USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('application/json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface WiktionaryEnResult {
  lemma: string;
  partOfSpeech: string;
  definitionsEn: string[];
}

async function queryEnWiktionary(word: string): Promise<WiktionaryEnResult | null> {
  const variants = Array.from(new Set([word, word.toLowerCase()]));
  for (const w of variants) {
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(w)}`;
    const data = await safeFetchJson<
      Record<string, Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string }> }>>
    >(url, 4000);
    if (!data || !Array.isArray(data.de) || data.de.length === 0) continue;

    const first = data.de[0];
    const defsHtml = (first.definitions || []).map((d) => d.definition || '').filter(Boolean);
    const cleanDefs = defsHtml
      .map((html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    // Detect "past participle of X" / "plural of X" / "inflection of X"
    let lemma = w;
    for (const def of cleanDefs) {
      const m = def.match(/(?:participle|plural|form|inflection|tense|genitive|dative)\s+of\s+([A-Za-zÄÖÜäöüß-]+)/i);
      if (m?.[1]) {
        lemma = m[1];
        break;
      }
    }

    // If we extracted a distinct lemma, also fetch lemma's actual meaning!
    let finalDefs = cleanDefs;
    if (lemma.toLowerCase() !== w.toLowerCase()) {
      const lemmaData = await safeFetchJson<
        Record<string, Array<{ partOfSpeech?: string; definitions?: Array<{ definition?: string }> }>>
      >(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(lemma)}`, 3500);
      const lemmaDefs = (lemmaData?.de?.[0]?.definitions || [])
        .map((d) => (d.definition || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (lemmaDefs.length > 0) finalDefs = lemmaDefs;
    }

    return {
      lemma,
      partOfSpeech: mapPosToBilingual(first.partOfSpeech),
      definitionsEn: finalDefs.slice(0, 3),
    };
  }
  return null;
}

async function queryGermanWikipediaArabic(term: string): Promise<{
  arabicLabel?: string;
  wikipediaDeTitle?: string;
} | null> {
  const cap = term.charAt(0).toUpperCase() + term.slice(1);
  const url = `https://de.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    cap
  )}&prop=langlinks&lllang=ar&redirects=1&format=json`;
  const data = await safeFetchJson<{
    query?: {
      pages?: Record<string, { title?: string; missing?: string; langlinks?: Array<{ '*': string }> }>;
    };
  }>(url, 3800);
  const pages = Object.values(data?.query?.pages || {});
  const page = pages.find((p) => !p.missing && p.langlinks && p.langlinks.length > 0);
  if (!page) return null;
  return {
    arabicLabel: page.langlinks?.[0]?.['*'],
    wikipediaDeTitle: page.title,
  };
}

async function queryWikidataArabic(
  query: string,
  searchLang: 'de' | 'en'
): Promise<{ arabicLabel?: string; arabicDesc?: string } | null> {
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
    query
  )}&language=${searchLang}&format=json&limit=2`;
  const searchData = await safeFetchJson<{ search?: Array<{ id?: string }> }>(searchUrl, 3600);
  const ids = (searchData?.search || []).map((x) => x.id).filter(Boolean).slice(0, 2);
  if (!ids.length) return null;

  const getUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join(
    '|'
  )}&languages=ar|de|en&props=labels|descriptions&format=json`;
  const entitiesData = await safeFetchJson<{
    entities?: Record<
      string,
      {
        labels?: { ar?: { value?: string } };
        descriptions?: { ar?: { value?: string } };
      }
    >;
  }>(getUrl, 3600);

  for (const id of ids) {
    const ent = entitiesData?.entities?.[id!];
    const ar = ent?.labels?.ar?.value?.trim();
    if (ar) {
      return {
        arabicLabel: ar,
        arabicDesc: ent?.descriptions?.ar?.value?.trim(),
      };
    }
  }
  return null;
}

async function queryGeminiDictionary(
  cleanWord: string,
  sentence: string,
  target: 'ar' | 'en'
): Promise<DictionaryLookupResult | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === 'MY_GEMINI_API_KEY') return null;

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const targetLang = target === 'en' ? 'English' : 'Arabic';
    const contextSnippet = sentence ? `\nContext sentence: "${sentence.slice(0, 360)}"` : '';
    const prompt = `Analyze and translate the German word or short phrase "${cleanWord}" into concise, natural ${targetLang} for an Arabic/German language learner.${contextSnippet}

Rules:
- lemma: base dictionary form (infinitive for verbs, nominative singular for nouns, base form for adjectives).
- translation: accurate contextual meaning in ${targetLang}.
- partOfSpeech: German & ${targetLang} grammatical label (e.g. "Substantiv (اسم)", "Verb (فعل)", "Adjektiv (صفة)").
- article: for nouns give "der", "die", "das", or "die (Pl.)"; empty string otherwise.
- plural: for nouns give plural with article (e.g. "die Repositories"); empty string otherwise.
- explanation: 1 concise helpful sentence in ${targetLang} explaining usage or nuance in this context.
- alternatives: up to 2 short alternative meanings in ${targetLang}.`;

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lemma: { type: Type.STRING },
              translation: { type: Type.STRING },
              partOfSpeech: { type: Type.STRING },
              article: { type: Type.STRING },
              plural: { type: Type.STRING },
              explanation: { type: Type.STRING },
              alternatives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['lemma', 'translation', 'partOfSpeech'],
          },
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 7000)),
    ]);

    const raw = response.text?.trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      lemma?: string;
      translation?: string;
      partOfSpeech?: string;
      article?: string;
      plural?: string;
      explanation?: string;
      alternatives?: string[];
    };
    if (!parsed.translation) return null;

    return {
      word: cleanWord,
      lemma: parsed.lemma?.trim() || cleanWord,
      translation: parsed.translation.trim(),
      partOfSpeech: parsed.partOfSpeech?.trim() || inferPosFallback(cleanWord),
      article: parsed.article?.trim() || '',
      plural: parsed.plural?.trim() || '',
      explanation: parsed.explanation?.trim() || undefined,
      alternatives: Array.isArray(parsed.alternatives)
        ? parsed.alternatives.map((x) => x.trim()).filter(Boolean).slice(0, 3)
        : undefined,
      provider: 'gemini',
    };
  } catch {
    return null;
  }
}

export async function lookupGermanDictionary(params: {
  text: string;
  sentence?: string;
  target?: 'ar' | 'en';
}): Promise<DictionaryLookupResult | null> {
  const cleanWord = normalizeGermanToken(params.text).slice(0, 220);
  if (!cleanWord) return null;
  const target: 'ar' | 'en' = params.target === 'en' ? 'en' : 'ar';
  const sentence = (params.sentence || '').trim().slice(0, 420);

  const cacheKey = `${target}::${cleanWord.toLowerCase()}::${sentence.slice(0, 80).toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // 1. Exact local structured lexicon hit (instant)
  const exactLocal = lookupLocalStructured(cleanWord, target);
  if (exactLocal && exactLocal.provider === 'local_lexicon') {
    setCached(cacheKey, exactLocal);
    return exactLocal;
  }

  // 2. Context-aware Gemini lookup (if GEMINI_API_KEY configured)
  const geminiResult = await queryGeminiDictionary(cleanWord, sentence, target);
  if (geminiResult) {
    setCached(cacheKey, geminiResult);
    return geminiResult;
  }

  // 3. Local glossary hit if available
  if (exactLocal) {
    setCached(cacheKey, exactLocal);
    return exactLocal;
  }

  // 4. Multi-source parallel free dictionary lookup (Wiktionary REST + Wikipedia Arabic + Wikidata)
  const isSingleWord = !cleanWord.includes(' ');
  const [wiktInfo, wikiAr, wdDe] = await Promise.all([
    isSingleWord ? queryEnWiktionary(cleanWord) : Promise.resolve(null),
    isSingleWord && target === 'ar' ? queryGermanWikipediaArabic(cleanWord) : Promise.resolve(null),
    target === 'ar' ? queryWikidataArabic(cleanWord, 'de') : Promise.resolve(null),
  ]);

  // If Wiktionary resolved a different lemma (e.g. inflected verb/noun), check local lexicon & Wikidata on lemma
  const lemma = wiktInfo?.lemma || cleanWord;
  if (lemma.toLowerCase() !== cleanWord.toLowerCase()) {
    const lemmaLocal = lookupLocalStructured(lemma, target);
    if (lemmaLocal) {
      const enriched: DictionaryLookupResult = {
        ...lemmaLocal,
        word: cleanWord,
        partOfSpeech: wiktInfo?.partOfSpeech || lemmaLocal.partOfSpeech,
      };
      setCached(cacheKey, enriched);
      return enriched;
    }
  }

  let arabicMeaning = wikiAr?.arabicLabel || wdDe?.arabicLabel;
  let arabicDesc = wdDe?.arabicDesc;

  // If still no Arabic label yet, translate the primary English gloss via Wikidata EN->AR
  if (!arabicMeaning && target === 'ar' && wiktInfo?.definitionsEn?.[0]) {
    const firstGloss = wiktInfo.definitionsEn[0].split(/[.;,(]/)[0].trim();
    if (firstGloss && firstGloss.length <= 45) {
      const wdEn = await queryWikidataArabic(firstGloss, 'en');
      if (wdEn?.arabicLabel) {
        arabicMeaning = wdEn.arabicLabel;
        arabicDesc = arabicDesc || wdEn.arabicDesc;
      }
    }
  }

  if (arabicMeaning || (wiktInfo && wiktInfo.definitionsEn.length > 0)) {
    const enSummary = wiktInfo?.definitionsEn?.join(' · ');
    const result: DictionaryLookupResult = {
      word: cleanWord,
      lemma,
      translation:
        target === 'en'
          ? enSummary || cleanWord
          : arabicMeaning || enSummary || cleanWord,
      partOfSpeech: wiktInfo?.partOfSpeech || inferPosFallback(cleanWord),
      explanation:
        arabicDesc ||
        (arabicMeaning && enSummary ? `المعنى الإنجليزي المرادف: ${enSummary}` : enSummary),
      provider: wikiAr?.arabicLabel
        ? 'wikipedia+wiktionary'
        : wdDe?.arabicLabel
        ? 'wikidata+wiktionary'
        : 'wiktionary',
    };
    setCached(cacheKey, result);
    return result;
  }

  // 5. Hyphenated German compound fallback (e.g. GitHub-Alternative)
  if (cleanWord.includes('-')) {
    const parts = cleanWord.split('-').map((p) => normalizeGermanToken(p)).filter(Boolean);
    const subHits = parts.map((p) => lookupLocalStructured(p, target)).filter(Boolean) as DictionaryLookupResult[];
    if (subHits.length > 0) {
      const result: DictionaryLookupResult = {
        word: cleanWord,
        lemma: cleanWord,
        translation: subHits.map((s) => s.translation).join(' · '),
        partOfSpeech: subHits[subHits.length - 1].partOfSpeech,
        article: subHits[subHits.length - 1].article,
        plural: subHits[subHits.length - 1].plural,
        explanation: 'كلمة مركبة بالألمانية — تم تحليل أجزائها من المعجم المدمج.',
        provider: 'local_compound',
      };
      setCached(cacheKey, result);
      return result;
    }
  }

  return null;
}
