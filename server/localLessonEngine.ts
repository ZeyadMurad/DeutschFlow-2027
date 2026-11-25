// ---------------------------------------------------------------------------
// Local (offline) learning engine — same lesson schema as the Gemini path.
//
// Purpose: the intelligent content-analysis feature must never dead-end when
// GEMINI_API_KEY is not configured on the server (Render free plan). This
// engine builds a real, grounded, interactive lesson from the actual German
// source text using the built-in lexicon and rule-based grammar detection.
// Everything it reports comes from the source text itself — no fabricated
// facts, no fake AI scores. When a key IS configured, learningEngine.ts uses
// Gemini first and falls back to this engine only if Gemini fails.
// ---------------------------------------------------------------------------
import { lookupGermanDictionary } from './dictionary.js';
import type {
  CEFRLevel,
  LearningContentInput,
  LearningLesson,
  LessonExpressionItem,
  LessonGrammarPoint,
  LessonQuizQuestion,
  LessonSentenceItem,
  LessonVocabularyItem,
  WritingEvaluationResult,
} from '../src/types/media.js';

// ---------------------------------------------------------------------------
// German function words — instant roles + Arabic glosses (no network needed)
// ---------------------------------------------------------------------------

const FUNCTION_WORDS: Record<string, { role: string; ar: string }> = {
  der: { role: 'أداة تعريف', ar: 'الأداة التعريفية (مذكر/مفرد)' },
  die: { role: 'أداة تعريف', ar: 'الأداة التعريفية (مؤنث/جمع)' },
  das: { role: 'أداة تعريف', ar: 'الأداة التعريفية (محايد)' },
  den: { role: 'أداة تعريف', ar: 'أداة تعريف بحالة النصب/الجر' },
  dem: { role: 'أداة تعريف', ar: 'أداة تعريف بحالة الجر (Dativ)' },
  des: { role: 'أداة تعريف', ar: 'أداة تعريف بحالة الإضافة (Genitiv)' },
  ein: { role: 'أداة تنكير', ar: 'أداة تنكير' },
  eine: { role: 'أداة تنكير', ar: 'أداة تنكير (مؤنث)' },
  einen: { role: 'أداة تنكير', ar: 'أداة تنكير بحالة النصب' },
  einem: { role: 'أداة تنكير', ar: 'أداة تنكير بحالة الجر' },
  einer: { role: 'أداة تنكير', ar: 'أداة تنكير (مؤنث/جر)' },
  eines: { role: 'أداة تنكير', ar: 'أداة تنكير بحالة الإضافة' },
  und: { role: 'أداة ربط', ar: 'و' },
  oder: { role: 'أداة ربط', ar: 'أو' },
  aber: { role: 'أداة ربط', ar: 'لكن' },
  denn: { role: 'أداة ربط', ar: 'لأنّ' },
  sondern: { role: 'أداة ربط', ar: 'بل' },
  sowie: { role: 'أداة ربط', ar: 'كذلك/بالإضافة إلى' },
  weil: { role: 'رابط سببي', ar: 'لأنّ' },
  dass: { role: 'رابط تكميلي', ar: 'أنّ' },
  obwohl: { role: 'رابط تنازي', ar: 'رغم أنّ' },
  damit: { role: 'رابط غائي', ar: 'كي/لكي' },
  während: { role: 'رابط زمني', ar: 'بينما/أثناء' },
  nachdem: { role: 'رابط زمني', ar: 'بعد أن' },
  bevor: { role: 'رابط زمني', ar: 'قبل أن' },
  seitdem: { role: 'رابط زمني', ar: 'منذ أن' },
  falls: { role: 'رابط شرطي', ar: 'في حال' },
  in: { role: 'حرف جر', ar: 'في' },
  im: { role: 'حرف جر', ar: 'في الـ' },
  am: { role: 'حرف جر', ar: 'عند الـ/في الـ' },
  auf: { role: 'حرف جر', ar: 'على' },
  mit: { role: 'حرف جر', ar: 'مع' },
  von: { role: 'حرف جر', ar: 'من/عن' },
  zu: { role: 'حرف جر', ar: 'إلى' },
  zum: { role: 'حرف جر', ar: 'إلى الـ' },
  zur: { role: 'حرف جر', ar: 'إلى الـ (مؤنث)' },
  bei: { role: 'حرف جر', ar: 'عند/لدى' },
  nach: { role: 'حرف جر', ar: 'بعد/وفقاً لـ' },
  aus: { role: 'حرف جر', ar: 'من' },
  für: { role: 'حرف جر', ar: 'من أجل/لصالح' },
  um: { role: 'حرف جر', ar: 'حول/من أجل' },
  über: { role: 'حرف جر', ar: 'حول/فوق' },
  unter: { role: 'حرف جر', ar: 'تحت/بين' },
  zwischen: { role: 'حرف جر', ar: 'بين' },
  seit: { role: 'حرف جر', ar: 'منذ' },
  trotz: { role: 'حرف جر', ar: 'رغم' },
  gegen: { role: 'حرف جر', ar: 'ضد/نحو' },
  ohne: { role: 'حرف جر', ar: 'بدون' },
  aufgrund: { role: 'حرف جر', ar: 'بناءً على/بسبب' },
  laut: { role: 'حرف جر', ar: 'وفقاً لـ' },
  als: { role: 'أداة مقارنة', ar: 'كـ/عندما' },
  wie: { role: 'أداة مقارنة', ar: 'مثل/كيف' },
  ich: { role: 'ضمير', ar: 'أنا' },
  du: { role: 'ضمير', ar: 'أنت' },
  er: { role: 'ضمير', ar: 'هو' },
  sie: { role: 'ضمير', ar: 'هي/هم/أنتم (رسمي)' },
  es: { role: 'ضمير', ar: 'هو/هي (محايد)' },
  wir: { role: 'ضمير', ar: 'نحن' },
  ihr: { role: 'ضمير', ar: 'أنتم (غير رسمي)' },
  man: { role: 'ضمير', ar: 'المرء (الضمير المحايد)' },
  sich: { role: 'ضمير انعكاسي', ar: 'نفسه/نفسها' },
  nicht: { role: 'أداة نفي', ar: 'ليس/لا' },
  auch: { role: 'ظرف', ar: 'أيضاً' },
  noch: { role: 'ظرف', ar: 'ما زال/إضافي' },
  nur: { role: 'ظرف', ar: 'فقط' },
  schon: { role: 'ظرف', ar: 'مسبقاً' },
  mehr: { role: 'ظرف', ar: 'أكثر' },
  sehr: { role: 'ظرف', ar: 'جداً' },
  heute: { role: 'ظرف زمان', ar: 'اليوم' },
  jetzt: { role: 'ظرف زمان', ar: 'الآن' },
  hier: { role: 'ظرف مكان', ar: 'هنا' },
  es_geht_um: { role: '', ar: '' },
  ist: { role: 'فعل مساعد', ar: 'هو/يكون' },
  sind: { role: 'فعل مساعد', ar: 'هم/يكونون' },
  war: { role: 'فعل مساعد', ar: 'كان' },
  waren: { role: 'فعل مساعد', ar: 'كانوا' },
  hat: { role: 'فعل مساعد', ar: 'يملك/فعل مساعد للـ Perfekt' },
  haben: { role: 'فعل مساعد', ar: 'يملكون/فعل مساعد' },
  hatte: { role: 'فعل مساعد', ar: 'كان يملك' },
  hatten: { role: 'فعل مساعد', ar: 'كانوا يملكون' },
  wird: { role: 'فعل مساعد', ar: 'يصبح/فعل مساعد للمبني للمجهول' },
  werden: { role: 'فعل مساعد', ar: 'يصبحون/فعل مساعد' },
  wurde: { role: 'فعل مساعد', ar: 'صار (مجهول - ماضٍ)' },
  wurden: { role: 'فعل مساعد', ar: 'صاروا (مجهول - ماضٍ)' },
  kann: { role: 'فعل ناقص', ar: 'يستطيع' },
  können: { role: 'فعل ناقص', ar: 'يستطيعون' },
  konnte: { role: 'فعل ناقص', ar: 'استطاع' },
  muss: { role: 'فعل ناقص', ar: 'يجب أن' },
  müssen: { role: 'فعل ناقص', ar: 'يجب عليهم' },
  musste: { role: 'فعل ناقص', ar: 'اضطرّ' },
  soll: { role: 'فعل ناقص', ar: 'ينبغي أن' },
  sollten: { role: 'فعل ناقص', ar: 'ينبغي أن (جمع)' },
  will: { role: 'فعل ناقص', ar: 'يريد' },
  wollen: { role: 'فعل ناقص', ar: 'يريدون' },
  wollte: { role: 'فعل ناقص', ar: 'أراد' },
  darf: { role: 'فعل ناقص', ar: 'يُسمح له' },
  dürfen: { role: 'فعل ناقص', ar: 'يُسمح لهم' },
  möchte: { role: 'فعل ناقص', ar: 'يرغب' },
  wäre: { role: 'فعل ناقص', ar: 'سيكون (تمنٍّ)' },
  hätten: { role: 'فعل ناقص', ar: 'كانوا سيملكون (تمنٍّ)' },
  hätte: { role: 'فعل ناقص', ar: 'كان سيملك (تمنٍّ)' },
  könnte: { role: 'فعل ناقص', ar: 'قد يستطيع' },
  würde: { role: 'فعل ناقص', ar: 'سيـ (صيغة التمني)' },
  würden: { role: 'فعل ناقص', ar: 'سيـ (جمع)' },
  müsste: { role: 'فعل ناقص', ar: 'كان يجب' },
};

// Common finite verbs in journalistic German (for verb detection)
const FINITE_VERBS = new Set([
  'sagt', 'sagte', 'sagen', 'berichtet', 'berichtete', 'berichten', 'erklärt',
  'erklärte', 'erklären', 'betont', 'betonte', 'betonen', 'fordert', 'forderte',
  'fordern', 'warnt', 'warnte', 'warnen', 'zeigt', 'zeigte', 'zeigen', 'gibt',
  'gab', 'geben', 'geht', 'ging', 'gehen', 'kommt', 'kam', 'kommen', 'bleibt',
  'blieb', 'bleiben', 'liegt', 'lag', 'liegen', 'setzt', 'setzte', 'setzen',
  'steht', 'stand', 'stehen', 'macht', 'machte', 'machen', 'nimmt', 'nahm',
  'nehmen', 'findet', 'fand', 'finden', 'steigt', 'stieg', 'steigen', 'sinkt',
  'sank', 'sinken', 'wächst', 'wuchs', 'wachsen', 'fällt', 'fiel', 'fallen',
  'führt', 'führte', 'führen', 'plant', 'plante', 'planen', 'kündigt',
  'kündigte', 'kündigen', 'diskutiert', 'diskutieren', 'untersucht',
  'untersuchte', 'untersuchen', 'beschließt', 'beschloss', 'beschließen',
  'entscheidet', 'entschied', 'entscheiden', 'beginnt', 'begann', 'beginnen',
  'erwartet', 'erwartete', 'erwarten', 'entwicklung', 'entwickelt',
  'entwickelte', 'entwickeln', 'verstärkt', 'verstärkte', 'verstärken',
  'senkt', 'senkte', 'senken', 'erhöht', 'erhöhte', 'erhöhen', 'trifft',
  'traf', 'treffen', 'schreibt', 'schrieb', 'schreiben', 'nennt', 'nannte',
  'nennen', 'gilt', 'galt', 'gelten', 'dürfte', 'scheint', 'schien',
  'scheinen', 'droht', 'drohte', 'drohen', 'hilft', 'half', 'helfen',
  'arbeitet', 'arbeitete', 'arbeiten', 'wohnt', 'wohnte', 'wohnen',
]);

const STOPWORDS = new Set([
  'und', 'oder', 'aber', 'denn', 'sondern', 'sowie', 'weil', 'dass', 'obwohl',
  'damit', 'während', 'nachdem', 'bevor', 'seitdem', 'falls', 'in', 'im', 'am',
  'auf', 'mit', 'von', 'zu', 'zum', 'zur', 'bei', 'nach', 'aus', 'für', 'um',
  'über', 'unter', 'zwischen', 'seit', 'trotz', 'gegen', 'ohne', 'aufgrund',
  'laut', 'als', 'wie', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'man',
  'sich', 'nicht', 'auch', 'noch', 'nur', 'schon', 'mehr', 'sehr', 'heute',
  'jetzt', 'hier', 'ist', 'sind', 'war', 'waren', 'hat', 'haben', 'hatte',
  'hatten', 'wird', 'werden', 'wurde', 'wurden', 'kann', 'können', 'konnte',
  'muss', 'müssen', 'musste', 'soll', 'sollte', 'will', 'wollen', 'wollte',
  'darf', 'dürfen', 'durfe', 'möchte', 'wäre', 'hätte', 'könnte', 'würde',
  'würden', 'müsste', 'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine',
  'einen', 'einem', 'einer', 'eines', 'so', 'dann', 'doch', 'aber', 'sehr',
  'ganz', 'viel', 'viele', 'alle', 'jede', 'dies', 'diese', 'dieser',
  'dieses', 'dazu', 'dafür', 'dagegen', 'dabei', 'daran', 'auf', 'auch',
  'etwa', 'immer', 'wieder', 'bereits', 'jedoch', 'dennoch', 'trotzdem',
  'hingegen', 'meanwhile', 'zudem', 'ferner', 'weiter', 'welche', 'welcher',
  'welches', 'ihre', 'sein', 'ihre', 'unser', 'euer', 'hierbei', 'dorthin',
]);

const TOPIC_MAP: Array<{ keywords: RegExp; topicAr: string; topicEn: string; topicDe: string }> = [
  { keywords: /verkehr|autobahn|stra(?:ss|ß)e|fahrer|lkw|lasten|polizei|unfall|tempo|stau/i, topicAr: 'المرور وسلامة الطرق', topicEn: 'Traffic & Road Safety', topicDe: 'Verkehr und Straßenverkehr' },
  { keywords: /klima|wetter|erwärmung|erwaermung|co2|umwelt|emission/i, topicAr: 'المناخ والبيئة', topicEn: 'Climate & Environment', topicDe: 'Klima und Umwelt' },
  { keywords: /wirtschaft|börse|boerse|inflation|unternehmen|arbeitsmarkt|steuern/i, topicAr: 'الاقتصاد وسوق العمل', topicEn: 'Economy & Labour', topicDe: 'Wirtschaft und Arbeit' },
  { keywords: /gesundheit|krankheit|medizin|krankenhaus|arzt|impfung/i, topicAr: 'الصحة والطب', topicEn: 'Health & Medicine', topicDe: 'Gesundheit und Medizin' },
  { keywords: /technik|digital|internet|computer|künstliche|kuenstliche|software|handy/i, topicAr: 'التقنية والرقمنة', topicEn: 'Technology & Digital Life', topicDe: 'Technik und Digitalisierung' },
  { keywords: /kultur|kino|musik|kunst|buch|film|theater/i, topicAr: 'الثقافة والفنون', topicEn: 'Culture & Arts', topicDe: 'Kultur und Kunst' },
  { keywords: /sport|fu(?:ss|ß)ball|spiel|liga|turnier|saison/i, topicAr: 'الرياضة', topicEn: 'Sports', topicDe: 'Sport' },
  { keywords: /politik|regierung|bundestag|wahl|kanzler|minister|partei|parlament/i, topicAr: 'السياسة والحكومة', topicEn: 'Politics & Government', topicDe: 'Politik und Regierung' },
  { keywords: /europa|eu-|international|weltweit|global|ukraine|usa/i, topicAr: 'الشؤون الأوروبية والدولية', topicEn: 'European & World Affairs', topicDe: 'Europa und Internationales' },
  { keywords: /bildung|schule|universität|universitaet|schüler|schueler|studium/i, topicAr: 'التعليم والمدارس', topicEn: 'Education', topicDe: 'Bildung und Schule' },
  { keywords: /essen|ernaehrung|ernährung|lebensmittel|restaurant/i, topicAr: 'الغذاء والتغذية', topicEn: 'Food & Nutrition', topicDe: 'Essen und Ernährung' },
  { keywords: /reise|tourismus|urlaub|flug|hotel/i, topicAr: 'السفر والسياحة', topicEn: 'Travel & Tourism', topicDe: 'Reise und Tourismus' },
  { keywords: /wohnen|miete|stadt|bau|immobilien/i, topicAr: 'السكن والمدن', topicEn: 'Housing & Cities', topicDe: 'Wohnen und Städte' },
];

const DISTRACTOR_TOPICS_DE = [
  'Wirtschaft und Finanzen',
  'Sport und Wettbewerbe',
  'Kultur und Veranstaltungen',
  'Technologie und Innovation',
  'Wetter und Klimazonen',
  'Reise und Tourismus',
  'Gesundheit und Medizin',
  'Bildung und Schulen',
];

const DISTRACTOR_NOUNS_DE = [
  'Wochenmarkt', 'Rakete', 'Orchester', 'Niederschlag', 'Steuerreform',
  'Bibliothek', 'Küstenstadt', 'Turnhalle', 'Zoo', 'Wasserfall',
];

const COLLOCATIONS: Array<{ pattern: RegExp; de: string; ar: string; note: string; register: LessonExpressionItem['register'] }> = [
  { pattern: /\bes geht um\b/i, de: 'es geht um + Akkusativ', ar: 'يتعلق الأمر بـ/الموضوع هو', note: 'تعبير شائع جداً لفتح الموضوع في النصوص الصحفية.', register: 'collocation' },
  { pattern: /\bin den letzten (Jahren|Monaten|Wochen|Tagen)\b/i, de: 'in den letzten Jahren/Monaten', ar: 'خلال السنوات/الأشهر الأخيرة', note: 'صيغة زمنية متكررة للتعبير عن تطور تدريجي.', register: 'collocation' },
  { pattern: /\blaut\s+\S+/i, de: 'laut + Dativ', ar: 'وفقاً لـ/بحسب', note: 'تُستخدم لنقل أقوال المصادر دون خطاب مباشر.', register: 'formal' },
  { pattern: /\b(immer mehr|zunehmend)\b/i, de: 'immer mehr / zunehmend', ar: 'بشكل متزايد', note: 'تعبير صحفي شائع لوصف اتجاه متصاعد.', register: 'collocation' },
  { pattern: /\bim Vergleich zu\b/i, de: 'im Vergleich zu + Dativ', ar: 'مقارنةً بـ', note: 'صيغة موازنة إحصائية شائعة في التقارير.', register: 'formal' },
  { pattern: /\baufgrund\b/i, de: 'aufgrund + Genitiv', ar: 'بناءً على/بسبب', note: 'حرف سبب رسمي يسبق اسماً.', register: 'formal' },
  { pattern: /\b(dennoch|trotzdem)\b/i, de: 'dennoch / trotzdem', ar: 'مع ذلك/رغم ذلك', note: 'أداة تنازٍ تدل على التناقض مع ما سبق.', register: 'collocation' },
  { pattern: /\bsowohl\b[\s\S]{0,60}?\bals auch\b/i, de: 'sowohl … als auch', ar: 'كل من … و …', note: 'ربط إيجابي بين عنصرين.', register: 'idiomatic' },
  { pattern: /\bnicht nur\b[\s\S]{0,60}?\bsondern auch\b/i, de: 'nicht nur … sondern auch', ar: 'ليس فقط … بل أيضاً', note: 'صيغة تأكيد مزدوج شائعة في الخطاب الصحفي.', register: 'idiomatic' },
  { pattern: /\bin Zukunft\b/i, de: 'in Zukunft', ar: 'في المستقبل', note: 'صيغة زمنية للمستقبل.', register: 'collocation' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitSentences(title: string, text: string): string[] {
  const raw = `${title}. ${text}`.replace(/\s+/g, ' ').trim();
  return raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 16 && /[a-zA-ZäöüÄÖÜß]{3,}/.test(s));
}

function tokenize(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((t) => t.replace(/^[„"«(\[\s']+|[.,!?;:»"')\]…\s']+$/g, ''))
    .filter(Boolean);
}

function wordCount(sentence: string): number {
  return tokenize(sentence).length;
}

function stripVerbPrefix(tok: string): string {
  return tok.toLowerCase();
}

function isLikelyParticiple(tok: string): boolean {
  const t = tok.toLowerCase();
  return /^ge\w+(t|en|cht|st|bt|lt|nt|mt|kt)$/.test(t) || /\w+iert$/.test(t);
}

function isLikelyNoun(tok: string, isSentenceStart: boolean): boolean {
  if (!tok) return false;
  const t = tok.toLowerCase();
  if (isSentenceStart && !/^[A-ZÄÖÜ]/.test(tok)) return false;
  if (/(ung|heit|keit|schaft|tion|ität|itaet|tum|ismus)$/.test(t)) return true;
  if (/^[A-ZÄÖÜ]/.test(tok) && t.length >= 4) return true;
  return false;
}

function detectVerbInSentence(tokens: string[]): string {
  for (const tok of tokens) {
    const lower = stripVerbPrefix(tok);
    if (FINITE_VERBS.has(lower)) return tok;
    if (isLikelyParticiple(tok)) return tok;
  }
  // Pronoun/auxiliary at position 2 is still a valid identified finite verb
  if (tokens.length >= 2 && /^(ist|sind|war|waren|hat|haben|wird|werden|kann|muss|soll|will|darf|wurde)$/i.test(tokens[1])) {
    return tokens[1];
  }
  return '';
}

function estimateCefr(sentences: string[]): CEFRLevel {
  if (sentences.length === 0) return 'B1';
  const avgLen = sentences.reduce((acc, s) => acc + wordCount(s), 0) / sentences.length;
  const longWordRatio =
    sentences.join(' ').split(/\s+/).filter((w) => w.length >= 13).length /
    Math.max(1, sentences.join(' ').split(/\s+/).length);
  if (avgLen <= 12 && longWordRatio < 0.06) return 'A2';
  if (avgLen <= 16 && longWordRatio < 0.10) return 'B1';
  if (avgLen <= 21 || longWordRatio < 0.16) return 'B2';
  return 'C1';
}

function rotate<T>(items: T[], seed: number): T[] {
  const n = Math.max(0, seed % Math.max(1, items.length));
  return [...items.slice(n), ...items.slice(0, n)];
}

function syllableHint(word: string): string {
  return word
    .replace(/([aeiouäöüy]{1,2}[^aeiouäöüy])/gi, '$1·')
    .replace(/·+$/, '');
}

function detectTopic(title: string, text: string) {
  const haystack = `${title} ${text.slice(0, 1200)}`;
  for (const t of TOPIC_MAP) {
    if (t.keywords.test(haystack)) return t;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Grammar detection — every example is an actual source sentence
// ---------------------------------------------------------------------------

interface GrammarPattern {
  key: string;
  titleDe: string;
  titleAr: string;
  explanationAr: string;
  structureFormula: string;
  reasonUsedAr: string;
  pattern: RegExp;
  quizPrompt: string;
  quizCorrect: string;
  quizDistractors: string[];
}

const GRAMMAR_PATTERNS: GrammarPattern[] = [
  {
    key: 'passiv',
    titleDe: 'Passiv (Zustands-/Vorgangspassiv)',
    titleAr: 'المبني للمجهول',
    explanationAr:
      'المبني للمجهول يُركّز على الحدث نفسه لا على الفاعل: نستخدم wird/wurde مع اسم المفعول (Partizip II) في نهاية الجملة. الفاعل الحقيقي إن ذُكر جاء بعد von أو durch.',
    structureFormula: 'wird/wurde + … + Partizip II (+ von/durch + الفاعل)',
    reasonUsedAr:
      'يُستخدم كثيراً في الصحافة لوصف إجراءات وقرارات دون التركيز على من نفّذها — أسلوب موضوعي محايد.',
    pattern: /\b(?:wird|wurde(?:n)?)\s+\S*(?:ge\w+(?:t|en)|iert|[^e]\w+t)\b/i,
    quizPrompt: 'أي صيغة تعبّر عن المبني للمجهول بشكل صحيح؟',
    quizCorrect: 'Der Verstoß wird kontrolliert.',
    quizDistractors: [
      'Der Verstoß kontrolliert wird aktiv.',
      'Der Verstoß hat kontrolliert.',
      'Der Verstoß ist kontrolliert gewesen war.',
    ],
  },
  {
    key: 'perfekt',
    titleDe: 'Perfekt (Vergangenheit der Umgangssprache)',
    titleAr: 'الماضي التام (Perfekt)',
    explanationAr:
      'للتعبير عن الماضي في الكلام اليومي والنصوص نصف الرسمية: haben أو sein مصرّف في الموضع الثاني + اسم المفعول في نهاية الجملة. sein تُستخدم مع الحركة وتغيير الحالة.',
    structureFormula: 'haben/sein (مصرّف) + … + Partizip II',
    reasonUsedAr: 'أكثر صيغة ماضية شائعة في الألمانية الحديثة للتحدث عن أحداث مكتملة.',
    pattern: /\b(?:habe|hat|haben|bin|ist|sind)\s+\S*(?:ge\w+(?:t|en)|iert)\b/i,
    quizPrompt: 'أي جملة تستخدم الـ Perfekt بشكل صحيح؟',
    quizCorrect: 'Die Polizei hat den Fahrer kontrolliert.',
    quizDistractors: [
      'Die Polizei kontrolliert den Fahrer gehabt.',
      'Die Polizei ist den Fahrer kontrolliert.',
      'Die Polizei wird den Fahrer kontrolliert.',
    ],
  },
  {
    key: 'praeteritum',
    titleDe: 'Präteritum (schriftliche Vergangenheit)',
    titleAr: 'الماضي البسيط (Präteritum)',
    explanationAr:
      'صيغة الماضي المكتوبة: war/waren/hatte/wurde والأفعال القوية (kam, ging …). في النصوص الصحفية تحل غالباً محل الـ Perfekt لأنها أقصر.',
    structureFormula: 'الفعل في صيغة الماضي البسيط (war, hatte, kam …)',
    reasonUsedAr: 'لغة الصحافة المكتوبة تفضّل الـ Präteritum لاختصاره وإيجازه.',
    pattern: /\b(?:war|waren|hatte|hatten|kam|kamen|ging|gingen|sagte|sagten|wurde|wurden|musste|konnte|sollte|wollte|durftte)\b/i,
    quizPrompt: 'أي فعل يقع في صيغة الـ Präteritum؟',
    quizCorrect: 'war',
    quizDistractors: ['ist', 'wird', 'hat'],
  },
  {
    key: 'konjunktiv2',
    titleDe: 'Konjunktiv II',
    titleAr: 'صيغة التمني والاحتمال (Konjunktiv II)',
    explanationAr:
      'wäre/hätte/könnte/würde تعبّر عن التمني أو الاحتمال أو التخفيف المهذب. في الصحافة تُستخدم لنقل توقعات وتخمينات غير مؤكدة.',
    structureFormula: 'wäre/hätte/könnte/würde + (Infinitiv / Partizip II)',
    reasonUsedAr: 'لنقل احتمالات ومخاوف دون تقديمها كحقائق مؤكدة.',
    pattern: /\b(?:wäre|wären|hätte|hätten|könnte|würde|würden|müsste)\b/i,
    quizPrompt: 'أي جملة تعبّر عن احتمال بصيغة التمني؟',
    quizCorrect: 'Das könnte gefährlich sein.',
    quizDistractors: [
      'Das ist sicher gefährlich.',
      'Das wird gefährlich sein morgen.',
      'Das war gefährlich gewesen.',
    ],
  },
  {
    key: 'nebensatz',
    titleDe: 'Nebensatz mit Konnektor',
    titleAr: 'الجملة الثانوية والفعل في النهاية',
    explanationAr:
      'بعد روابط مثل weil/obwohl/dass/während يقف الفعل المصرّف في نهاية الجملة الثانوية — قاعدة ذهبية في بناء الجملة الألمانية.',
    structureFormula: '…, Konnektor + Subject + … + Verb (end)',
    reasonUsedAr: 'لتفصيل السبب أو التناقض أو التوضيح داخل جملة واحدة مركبة.',
    pattern: /,?\s*\b(?:weil|obwohl|dass|damit|während|nachdem|bevor|seitdem|falls)\b/i,
    quizPrompt: 'أين يقع الفعل المصرّف في الجملة الثانوية؟',
    quizCorrect: 'في نهاية الجملة الثانوية',
    quizDistractors: ['في الموضع الثاني من الجملة', 'في بداية الجملة', 'قبل أداة الربط مباشرة'],
  },
  {
    key: 'relativsatz',
    titleDe: 'Relativsatz',
    titleAr: 'جملة الوصل (الجملة الموصولة)',
    explanationAr:
      'ضمائر الوصل der/die/das تربط وصفاً لاسم سابق؛ الفعل يذهب إلى نهاية جملة الوصل، وجنس الضمير يتبع الاسم الذي يشير إليه.',
    structureFormula: 'Das Nomen …, (der/die/das) + … + Verb (end)',
    reasonUsedAr: 'لتكثيف الوصف دون جمل قصيرة متتابعة — أسلوب صحفي معياري.',
    pattern: /,\s*(?:der|die|das|den|dem|dessen|deren)\b/i,
    quizPrompt: 'على أي شيء يتبع جنس ضمير الوصل der/die/das؟',
    quizCorrect: 'على الاسم الذي يشير إليه',
    quizDistractors: ['على الفاعل المتكلم', 'على نهاية الجملة', 'على زمن الفعل'],
  },
  {
    key: 'modalverb',
    titleDe: 'Modalverben',
    titleAr: 'الأفعال الناقصة',
    explanationAr:
      'muss/kann/darf/soll/will/möchte تصرّف في الموضع الثاني ويأتي الفعل الأصلي مصدراً في النهاية. تضيف معنى الإلزام أو الإمكان أو الرغبة.',
    structureFormula: 'Modalverb (مصرّف) + … + Infinitiv (end)',
    reasonUsedAr: 'لوصف القواعد والواجبات والإمكانات — قلب المتن الصحفي التوضيحي.',
    pattern: /\b(?:muss|müssen|muss|kann|können|darf|dürfen|will|wollen|möchte|soll|sollen)\b/i,
    quizPrompt: 'أي جملة تضع الفعل الناقص والفعل الأصلي في المواضع الصحيحة؟',
    quizCorrect: 'Lkw-Fahrer müssen die Lasten prüfen.',
    quizDistractors: [
      'Lkw-Fahrer prüfen müssen die Lasten.',
      'Lkw-Fahrer müssen prüfend die Lasten.',
      'Lkw-Fahrer die Lasten müssen prüfen.',
    ],
  },
];

interface DetectedGrammar {
  meta: GrammarPattern;
  matchedSentences: string[];
}

function detectGrammar(sentences: string[]): DetectedGrammar[] {
  const detected: DetectedGrammar[] = [];
  for (const meta of GRAMMAR_PATTERNS) {
    const matched = sentences.filter((s) => meta.pattern.test(s));
    if (matched.length > 0) detected.push({ meta, matchedSentences: matched });
  }
  return detected;
}

// ---------------------------------------------------------------------------
// Lesson builder
// ---------------------------------------------------------------------------

export async function buildLocalLesson(
  input: LearningContentInput,
  hash: string
): Promise<LearningLesson | null> {
  const cleanTitle = (input.title || '').trim().slice(0, 260);
  const cleanText = (input.text || '').trim().slice(0, 5000);
  if (!cleanTitle && !cleanText) return null;

  const allSentences = splitSentences(cleanTitle, cleanText);
  const topic = detectTopic(cleanTitle, cleanText);
  const cefr = estimateCefr(allSentences);
  const isSimplified = input.difficulty === 'simplified';
  const isAdvanced = input.difficulty === 'advanced';

  // ---- Vocabulary ------------------------------------------------------
  const freq = new Map<string, number>();
  const tokenSentence = new Map<string, string>();
  for (const sentence of allSentences) {
    const tokens = tokenize(sentence);
    tokens.forEach((tok, idx) => {
      const key = tok.toLowerCase();
      if (key.length < 4 || STOPWORDS.has(key) || FUNCTION_WORDS[key]) return;
      if (!/^[A-Za-zÄÖÜäöüß-]+$/.test(tok)) return;
      freq.set(key, (freq.get(key) || 0) + 1);
      if (!tokenSentence.has(key)) {
        // Prefer a sentence where the word is not at position 0 (clearer case)
        tokenSentence.set(key, sentence);
      }
    });
  }

  const candidates = [...freq.entries()]
    .filter(([w]) => !isSentenceStartOnlyWord(w))
    .sort((a, b) => scoreCandidate(b, allSentences) - scoreCandidate(a, allSentences))
    .slice(0, 14);

  function isSentenceStartOnlyWord(word: string): boolean {
    // words that only ever appear capitalized as sentence starts are less reliable
    return false;
  }

  function scoreCandidate(entry: [string, number], sentences: string[]): number {
    const [word, count] = entry;
    let score = count * 2;
    if (isLikelyNoun(word, false)) score += 3;
    if (/(ung|heit|keit|schaft|tion|ität|itaet)$/.test(word)) score += 2;
    if (word.length >= 9) score += 1;
    return score;
  }

  const vocabLookups = await Promise.all(
    candidates.map(async ([word]) => {
      const sentence = tokenSentence.get(word) || cleanText.slice(0, 200);
      try {
        const looked = await lookupGermanDictionary({ text: word, sentence, target: 'ar' });
        return { word, looked, sentence };
      } catch {
        return { word, looked: null, sentence };
      }
    })
  );

  const vocabItems: LessonVocabularyItem[] = vocabLookups
    .filter((v) => v.looked && v.looked.translation && v.looked.translation.length > 1)
    .slice(0, 8)
    .map(({ word, looked, sentence }) => {
      const pos = looked?.partOfSpeech?.toLowerCase() || '';
      const category: LessonVocabularyItem['wordCategory'] = pos.includes('subst')
        ? 'noun'
        : pos.includes('verb')
        ? 'verb'
        : pos.includes('adj')
        ? 'adjective'
        : isLikelyNoun(word, false)
        ? 'noun'
        : 'other';
      const itemCefr: CEFRLevel =
        word.length <= 6 ? 'A2' : word.length <= 9 ? 'B1' : word.length <= 12 ? 'B2' : 'C1';
      return {
        word: looked?.word || word,
        lemma: looked?.lemma || word.toLowerCase(),
        article: looked?.article || undefined,
        plural: looked?.plural || undefined,
        wordCategory: category,
        meaningAr: looked!.translation,
        meaningEn: undefined,
        phoneticHint: syllableHint(word),
        exampleDe: sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence,
        exampleAr: `مثال من النص الأصلي — اضغط كلمات الجملة داخل القارئ لترى ترجمة كل كلمة.`,
        cefrLevel: itemCefr,
        contextualMeaningAr: `في سياق هذا المحتوى (${topic?.topicAr || 'النص العام'}) تُفهم الكلمة كما وردت في الجملة المعروضة.`,
      };
    });

  // ---- Grammar ---------------------------------------------------------
  const detected = detectGrammar(allSentences).slice(0, isAdvanced ? 6 : isSimplified ? 3 : 4);
  const grammarPoints: LessonGrammarPoint[] = detected.map(({ meta, matchedSentences }, gi) => {
    const examples = matchedSentences.slice(0, 2).map((s) => ({
      de: s.length > 180 ? `${s.slice(0, 177)}…` : s,
      ar: `${meta.titleAr}: ${meta.structureFormula}`,
    }));
    const seed = parseInt(hash.slice(gi * 2, gi * 2 + 2), 16) || gi + 1;
    const options = rotate([meta.quizCorrect, ...meta.quizDistractors], seed);
    return {
      titleDe: meta.titleDe,
      titleAr: meta.titleAr,
      explanationAr: meta.explanationAr,
      structureFormula: meta.structureFormula,
      reasonUsedAr: `${meta.reasonUsedAr}${matchedSentences.length > 1 ? ` تكرّر في ${matchedSentences.length} جمل من النص.` : ' ظهر في نص هذا المحتوى.'}`,
      examples,
      practiceQuestion: {
        prompt: meta.quizPrompt,
        options,
        correctIndex: options.indexOf(meta.quizCorrect),
        explanationAr: `الصيغة الصحيحة: ${meta.quizCorrect}`,
      },
    };
  });

  // ---- Expressions -----------------------------------------------------
  const expressionItems: LessonExpressionItem[] = [];
  for (const collocation of COLLOCATIONS) {
    const match = allSentences.find((s) => collocation.pattern.test(s));
    if (match) {
      expressionItems.push({
        expressionDe: collocation.de,
        register: collocation.register,
        meaningAr: collocation.ar,
        usageNoteAr: collocation.note,
        exampleDe: match.length > 170 ? `${match.slice(0, 167)}…` : match,
      });
      if (expressionItems.length >= 4) break;
    }
  }
  if (expressionItems.length < 3) {
    // Frequent content-word bigrams as honest collocation candidates
    const bigramFreq = new Map<string, number>();
    for (const sentence of allSentences) {
      const tokens = tokenize(sentence).map((t) => t.toLowerCase());
      for (let i = 0; i < tokens.length - 1; i++) {
        const [a, b] = [tokens[i], tokens[i + 1]];
        if (a.length < 4 || b.length < 4) continue;
        if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
        const key = `${a} ${b}`;
        bigramFreq.set(key, (bigramFreq.get(key) || 0) + 1);
      }
    }
    const topBigrams = [...bigramFreq.entries()]
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3 - expressionItems.length);
    for (const [bigram] of topBigrams) {
      const example = allSentences.find((s) => s.toLowerCase().includes(bigram));
      expressionItems.push({
        expressionDe: bigram,
        register: 'collocation',
        meaningAr: 'تعبير متكرر في النص — اضغط كلمتيه في القارئ للحصول على المعنى الدقيق في هذا السياق.',
        usageNoteAr: 'اقتران لفظي متكرر؛ حفظه ككتلة واحدة يسرّع الفهم.',
        exampleDe: example ? (example.length > 170 ? `${example.slice(0, 167)}…` : example) : cleanTitle,
      });
    }
  }

  // ---- Sentence analysis bank ------------------------------------------
  const bankCandidates = [...allSentences]
    .filter((s) => s !== cleanTitle && s.length > 30)
    .sort((a, b) => {
      const sa = (wordCount(a) >= 9 && wordCount(a) <= 26 ? 2 : 0) + detectGrammar([a]).length * 2;
      const sb = (wordCount(b) >= 9 && wordCount(b) <= 26 ? 2 : 0) + detectGrammar([b]).length * 2;
      return sb - sa;
    })
    .slice(0, isSimplified ? 3 : 5);

  const sentenceBank: LessonSentenceItem[] = await Promise.all(
    bankCandidates.map(async (sentence) => {
      const tokens = tokenize(sentence);
      const sentenceStartWord = tokens[0]?.toLowerCase();
      const wordByWord = await Promise.all(
        tokens.slice(0, 14).map(async (tok) => {
          const lower = tok.toLowerCase();
          const fn = FUNCTION_WORDS[lower] || FUNCTION_WORDS[tok];
          if (fn && fn.ar) {
            return { token: tok, lemma: lower, role: fn.role, meaningAr: fn.ar };
          }
          try {
            const looked = await lookupGermanDictionary({ text: tok, sentence, target: 'ar' });
            return {
              token: tok,
              lemma: looked?.lemma || lower,
              role: looked?.partOfSpeech || guessRole(tok, tokens.indexOf(tok) === 0, sentenceStartWord),
              meaningAr: looked?.translation || '—',
            };
          } catch {
            return { token: tok, lemma: lower, role: guessRole(tok, tokens.indexOf(tok) === 0, sentenceStartWord), meaningAr: '—' };
          }
        })
      );

      const connector = /,?\s*\b(weil|obwohl|dass|damit|während|nachdem|bevor|seitdem|falls)\b/i.test(sentence);
      const caseMarkers = {
        akk: /\b(den|einen|eine[n]?)\b/.test(sentence),
        dat: /\b(dem|einem|der)\b/.test(sentence),
        gen: /\b(des|eines)\b/.test(sentence),
      };
      const caseParts: string[] = [];
      if (caseMarkers.akk) caseParts.push('مؤشرات حالة النصب (Akkusativ) مثل den/einen');
      if (caseMarkers.dat) caseParts.push('مؤشرات حالة الجر (Dativ) مثل dem/einem');
      if (caseMarkers.gen) caseParts.push('مؤشرات حالة الإضافة (Genitiv) مثل des/eines');
      const caseAnalysisAr = caseParts.length
        ? `تظهر في الجملة ${caseParts.join(' و')} — الإعراب النهائي يتحدد بالسياق الكامل والفعل.`
        : 'لا توجد مؤشرات حالات صريحة في هذه الجملة؛ حُرّر الإعراب من سياق الفعل والأدوات.';

      return {
        sentenceDe: sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence,
        translationAr: wordByWord
          .map((w) => (w.meaningAr !== '—' ? w.meaningAr : w.token))
          .join(' '),
        grammarNoteAr: connector
          ? 'جملة مركبة تحتوي جملة ثانوية؛ راقب نزول الفعل المصرّف إلى النهاية داخل القسم الثانوي.'
          : `تحتوي الجملة على ${detectGrammar([sentence]).map((d) => d.meta.titleAr).join(' + ') || 'تراكيب أساسية'}.`,
        verbIdentified: detectVerbInSentence(tokens) || '—',
        caseAnalysisAr,
        wordOrderNoteAr: connector
          ? 'نمط Nebensatz: الفعل المصرّف في نهاية الجملة الثانوية.'
          : 'نمط الجملة الخبرية V2: الفعل المصرّف في الموضع الثاني، والمكوّنات بعده.',
        wordByWord,
      };
    })
  );

  // ---- Reading comprehension ------------------------------------------
  const topicOptionsBase = topic ? [topic.topicDe] : [];
  const distractorTopics = DISTRACTOR_TOPICS_DE.filter((t) => !topicOptionsBase.some((b) => t.includes(b.split(' ')[0]))).slice(0, 3);
  const topicOptions = rotate([...topicOptionsBase, ...distractorTopics], parseInt(hash.slice(0, 2), 16) || 1);
  const topicCorrectDe = topic?.topicDe || 'Allgemeine Nachrichten';

  const readingComprehension: LearningLesson['readingComprehension'] = [
    {
      id: 'rc_0',
      type: 'mcq',
      questionDe: 'Worum geht es in diesem Inhalt?',
      questionAr: 'ما موضوع هذا المحتوى؟',
      options: topicOptions,
      correctAnswer: topicCorrectDe,
      explanationAr: `العنوان والمصطلحات المفتاحية («${cleanTitle.slice(0, 60)}») تدل على موضوع ${topic?.topicAr || 'أخبار عامة'}.`,
    },
  ];

  if (vocabItems.length >= 2) {
    const target = vocabItems[0];
    const distractors = vocabItems.slice(1, 4).map((v) => v.meaningAr);
    const vocabOptions = rotate([target.meaningAr, ...distractors], parseInt(hash.slice(2, 4), 16) || 2);
    readingComprehension.push({
      id: 'rc_1',
      type: 'mcq',
      questionDe: `Was bedeutet „${target.word}“ in diesem Kontext?`,
      questionAr: `ما معنى «${target.word}» كما ورد في النص؟`,
      options: vocabOptions,
      correctAnswer: target.meaningAr,
      explanationAr: `وردت الكلمة في: «${(tokenSentence.get(target.word.toLowerCase()) || '').slice(0, 100)}» — ومعناها المعجمي: ${target.meaningAr}.`,
    });
  }

  // True/false grounded in an exact source sentence, with a deterministic
  // noun swap for the "Falsch" variant — no invented facts.
  const factSentence = bankCandidates[0] || allSentences[0];
  if (factSentence) {
    const factTokens = tokenize(factSentence);
    const swapIdx = factTokens.findIndex((t, i) => isLikelyNoun(t, i === 0) && i > 0 && !/^[A-ZÄÖÜ]/.test(factTokens[i - 1] || ''));
    const swapped =
      swapIdx > 0
        ? factTokens
            .map((t, i) => (i === swapIdx ? DISTRACTOR_NOUNS_DE[parseInt(hash.slice(4, 6), 16) % DISTRACTOR_NOUNS_DE.length] : t))
            .join(' ')
            .replace(/\s+([.,!?;:])/g, '$1')
        : '';
    if (swapped && swapped.toLowerCase() !== factSentence.toLowerCase()) {
      readingComprehension.push({
        id: 'rc_2',
        type: 'true_false',
        questionDe: 'Stimmt es, dass der Text Folgendes sagt?',
        questionAr: 'هل يقول النص فعلاً ما يلي؟',
        options: ['Richtig', 'Falsch'],
        correctAnswer: 'Falsch',
        explanationAr: `النص الأصلي يقول: «${factSentence.slice(0, 140)}» — البيان المعروض يستبدل أحد المفردات ولا يطابق النص.`,
      });
    }
    readingComprehension.push({
      id: 'rc_3',
      type: 'true_false',
      questionDe: `Kommt dieser Satz im Text vor? „${factSentence.slice(0, 120)}${factSentence.length > 120 ? '…' : ''}“`,
      questionAr: 'هل ترد هذه الجملة حرفياً في النص؟',
      options: ['Richtig', 'Falsch'],
      correctAnswer: 'Richtig',
      explanationAr: 'الجملة منقولة من النص الأصلي كما وردت — ابحث عنها في فقرة المحتوى الأصلي.',
    });
  }

  // ---- Listening -------------------------------------------------------
  const excerptSentences = allSentences.slice(0, 2);
  const excerpt = excerptSentences.join(' ');
  const listeningKeywords = vocabItems.slice(0, 4).map((v) => v.word);
  const listeningOptions = [...listeningKeywords, ...DISTRACTOR_NOUNS_DE]
    .slice(0, 4);
  const listeningQuestions: LearningLesson['listeningComprehension']['questions'] = [];
  if (listeningKeywords.length >= 2 && excerpt) {
    const correctKeyword = listeningKeywords[0];
    const options = rotate(listeningOptions, parseInt(hash.slice(6, 8), 16) || 3);
    listeningQuestions.push({
      id: 'lc_0',
      type: 'mcq',
      questionDe: 'Welches Wort hören Sie im Auszug?',
      questionAr: 'أي كلمة ترد في المقتطف المقروء؟',
      options,
      correctAnswer: correctKeyword,
      explanationAr: `الكلمة «${correctKeyword}» وردت حرفياً في المقتطف المأخوذ من بداية النص.`,
    });
    listeningQuestions.push({
      id: 'lc_1',
      type: 'true_false',
      questionDe: `Beginnt der Auszug mit dem Thema „${topic?.topicDe || 'Nachrichten'}“?`,
      questionAr: 'هل يبدأ المقتطف بهذا الموضوع؟',
      options: ['Richtig', 'Falsch'],
      correctAnswer: 'Richtig',
      explanationAr: 'المقتطف مأخوذ من بداية النص ويغطي موضوعه الرئيسي.',
    });
  }

  // ---- Writing practice ------------------------------------------------
  const writingTargets = vocabItems.slice(0, 4).map((v) => v.word);
  const writingPractice: LearningLesson['writingPractice'] = {
    promptDe: `Schreiben Sie 3–4 Sätze mit Ihrer Meinung zum Thema „${cleanTitle.slice(0, 90)}“. Benutzen Sie dabei möglichst diese Wörter: ${writingTargets.join(', ')}.`,
    promptAr: 'اكتب ٣–٤ جمل تعبّر عن رأيك في موضوع هذا المحتوى مستخدماً الكلمات المقترحة أعلاه. سيقيّم المحلّل المدمج طول النص واستخدامك للكلمات وبنية الجمل بشكل صادق وواضح.',
    targetWords: writingTargets,
    minWords: isSimplified ? 25 : 35,
    modelExampleDe: `Ich finde das Thema „${cleanTitle.slice(0, 60)}“ sehr wichtig, weil … ${writingTargets[0] ? `Dabei spielt „${writingTargets[0]}“ eine große Rolle, denn …` : ''} Meiner Meinung nach sollte man …`,
  };

  // ---- Final quiz ------------------------------------------------------
  const finalQuiz: LessonQuizQuestion[] = [];
  vocabItems.slice(0, 2).forEach((v, i) => {
    const others = vocabItems.filter((o) => o.word !== v.word).slice(0, 3).map((o) => o.meaningAr);
    if (others.length < 3) return;
    const options = rotate([v.meaningAr, ...others], parseInt(hash.slice(8 + i * 2, 10 + i * 2), 16) || i + 1);
    finalQuiz.push({
      id: `fq_${finalQuiz.length}`,
      skill: 'vocabulary',
      promptDe: `Was passt zu „${v.word}“?`,
      promptAr: `ما المعنى الصحيح للكلمة «${v.word}»؟`,
      options,
      correctIndex: options.indexOf(v.meaningAr),
      explanationAr: `${v.meaningAr} — كما وردت في النص.`,
    });
  });
  if (grammarPoints.length > 0) {
    const gp = grammarPoints[0];
    finalQuiz.push({
      id: `fq_${finalQuiz.length}`,
      skill: 'grammar',
      promptDe: gp.practiceQuestion.prompt,
      promptAr: 'اختر الإجابة الصحيحة حول التركيب النحوي المشروح في الدرس.',
      options: gp.practiceQuestion.options,
      correctIndex: gp.practiceQuestion.correctIndex,
      explanationAr: gp.practiceQuestion.explanationAr,
    });
  }
  if (expressionItems.length > 0) {
    const expr = expressionItems[0];
    const distractors = expressionItems.slice(1).map((e) => e.meaningAr);
    if (distractors.length >= 2) {
      const options = rotate([expr.meaningAr, ...distractors], parseInt(hash.slice(12, 14), 16) || 2);
      finalQuiz.push({
        id: `fq_${finalQuiz.length}`,
        skill: 'expressions',
        promptDe: `Was bedeutet „${expr.expressionDe}“?`,
        promptAr: `ما معنى التعبير «${expr.expressionDe}»؟`,
        options,
        correctIndex: options.indexOf(expr.meaningAr),
        explanationAr: expr.usageNoteAr,
      });
    }
  }
  if (readingComprehension.length > 1) {
    const rc = readingComprehension[readingComprehension.length - 1];
    finalQuiz.push({
      id: `fq_${finalQuiz.length}`,
      skill: 'comprehension',
      promptDe: rc.questionDe,
      promptAr: rc.questionAr,
      options: rc.options || ['Richtig', 'Falsch'],
      correctIndex: Math.max(0, (rc.options || ['Richtig', 'Falsch']).indexOf(rc.correctAnswer)),
      explanationAr: rc.explanationAr,
    });
  }

  // ---- Overview & summary (extractive, honest) --------------------------
  const summarySentenceCount = isSimplified ? 2 : isAdvanced ? 3 : 2;
  const summaryDe = (allSentences.slice(0, summarySentenceCount).join(' ') || cleanTitle).slice(0, 700);
  const estimatedMinutes = Math.max(5, Math.min(25, Math.round(5 + cleanText.length / 700)));

  const lesson: LearningLesson = {
    lessonId: `eng_${hash}`,
    sourceId: input.sourceId,
    contentType: input.contentType,
    difficulty: input.difficulty,
    provider: 'structured_fallback',
    cached: false,
    createdAt: new Date().toISOString(),
    overview: {
      titleDe: cleanTitle,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
      topicAr: topic?.topicAr || 'موضوعات الصحافة العامة',
      topicEn: topic?.topicEn || 'General German Media',
      cefrLevel: cefr,
      summaryDe,
      summaryAr: `تحليل مدمج يعمل دون اتصال: هذا الدرس مبني حصراً على النص الألماني الأصلي للمحتوى (${topic ? `مجال: ${topic.topicAr}` : 'أخبار عامة'}؛ مستوى تقديري ${cefr}). يتضمن المفردات المستخرجة من المعجم المدمج، والتراكيب النحوية المرصودة فعلياً في النص، وتحليلاً كلمة بكلمة لجُمل مختارة، وأسئلة فهم مبنية على النص. ${isSimplified ? 'جرى تبسيط العرض لمستوى المتعلم المبتدئ.' : isAdvanced ? 'عرض موسّع لكل التراكيب المتقدمة المرصودة.' : ''}`,
      estimatedMinutes,
      audioAvailable: Boolean(input.audioUrl || cleanText.length >= 25),
      audioUrl: input.audioUrl,
      videoId: input.videoId,
    },
    importantVocabulary: vocabItems,
    grammarInContext: grammarPoints,
    importantExpressions: expressionItems,
    sentenceAnalysisBank: sentenceBank,
    readingComprehension,
    listeningComprehension: {
      available: Boolean(input.audioUrl || excerpt),
      transcriptExcerptDe: excerpt || cleanTitle,
      noteAr: input.audioUrl
        ? 'استمع إلى التسجيل الأصلي ثم أجب عن الأسئلة المبنية على المقتطف.'
        : 'الاستماع مفعّل عبر النطق الألماني الواضح (de-DE) للمقتطف النصي المتاح.',
      questions: listeningQuestions,
    },
    writingPractice,
    finalQuiz,
  };

  return lesson;
}

function guessRole(tok: string, isSentenceStart: boolean, _sentenceStartWord: string): string {
  const lower = tok.toLowerCase();
  if (isLikelyParticiple(tok)) return 'اسم مفعول/صيغة ماضية';
  if (isLikelyNoun(tok, isSentenceStart)) return 'اسم';
  if (/(?:en|ern)$/.test(lower) && lower.length >= 6) return 'فعل/اسم مصدر';
  if (/(?:ig|lich|isch|bar|sam)$/.test(lower)) return 'صفة';
  return 'كلمة';
}

// ---------------------------------------------------------------------------
// Local writing evaluation — honest, deterministic, no fake AI claims
// ---------------------------------------------------------------------------

export function evaluateWritingLocally(params: {
  promptDe: string;
  userText: string;
  targetWords: string[];
  minWords: number;
}): WritingEvaluationResult {
  const userText = params.userText.trim();
  const words = userText.split(/\s+/).filter(Boolean);
  const sentences = userText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const usedTargets = params.targetWords.filter((w) =>
    new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w{0,4}\\b`, 'i').test(userText)
  );

  const meetsMinWords = words.length >= params.minWords;
  const sentenceCountOk = sentences.length >= 2;
  const startsCapitalized = /^[A-ZÄÖÜ]/.test(userText);
  const allSentencesCapitalized = sentences.every((s) => /^[A-ZÄÖÜ«„]/.test(s));
  const endsWithPunctuation = /[.!?]$/.test(userText);
  const longRunOn = sentences.some((s) => wordCount(s) > 35);

  let score = 0;
  score += meetsMinWords ? 25 : Math.round(25 * Math.max(0, words.length / Math.max(1, params.minWords)));
  score += params.targetWords.length ? Math.round(30 * (usedTargets.length / params.targetWords.length)) : 25;
  score += sentenceCountOk ? 15 : Math.round(7.5 * Math.max(1, sentences.length));
  score += allSentencesCapitalized ? 10 : startsCapitalized ? 6 : 0;
  score += endsWithPunctuation ? 10 : 0;
  score += !longRunOn ? 10 : 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const correctedGerman = userText
    .split(/(?<=[.!?])\s+/)
    .map((s) => (s.trim() ? s.trim().charAt(0).toUpperCase() + s.trim().slice(1) : s))
    .join(' ')
    .concat(endsWithPunctuation ? '' : '.');

  const strengthsAr: string[] = [];
  if (meetsMinWords) strengthsAr.push(`الطول مناسب: ${words.length} كلمة (الحد الأدنى ${params.minWords}).`);
  if (usedTargets.length) strengthsAr.push(`استخدمت ${usedTargets.length} من الكلمات المقترحة: ${usedTargets.join('، ')}.`);
  if (sentenceCountOk) strengthsAr.push(`عدد الجمل كافٍ للبناء المطلوب (${sentences.length} جملة).`);
  if (allSentencesCapitalized) strengthsAr.push('القاعدة الألمانية لكتابة أول حرف من كل جملة كبيرة محفوظة.');
  if (!strengthsAr.length) strengthsAr.push('أكملت النص وإرساله — هذه خطوة أولى جيدة، وسنقوّي البنية معاً.');

  const grammarNotesAr: string[] = [];
  if (!startsCapitalized) grammarNotesAr.push('أول حرف من الجملة الأولى يجب أن يكون كبيراً في الألمانية (Groß-/Kleinschreibung).');
  if (!allSentencesCapitalized) grammarNotesAr.push('بعض الجمل لا تبدأ بحرف كبير — قاعدة أساسية في الكتابة الألمانية.');
  if (!endsWithPunctuation) grammarNotesAr.push('النص لا ينتهي بعلامة ترقيم — أضف نقطة أو علامة استفهام في النهاية.');
  if (longRunOn) grammarNotesAr.push('توجد جملة طويلة جداً (أكثر من ٣٥ كلمة) — قسّمها إلى جملتين أو أع، فهذا يسهّل القراءة والتقييم.');
  const unused = params.targetWords.filter((w) => !usedTargets.includes(w));
  if (unused.length) grammarNotesAr.push(`لم تستخدم الكلمات المقترحة: ${unused.join('، ')} — جرّب إدخال واحدة منها في جملة.`);

  const feedbackAr = `تقييم محلي إحصائي صادق (بدون ذكاء اصطناعي): ${words.length} كلمة و${sentences.length} جملة، واستخدمت ${usedTargets.length} من أصل ${params.targetWords.length} كلمة مقترحة. ${meetsMinWords ? 'الطول مغطٍ للمطلوب.' : `النص أقصر من المطلوب (${params.minWords} كلمة) — أضف جملة أو جملتين.`} ${usedTargets.length ? 'جيد أنك وظّفت مفردات الدرس داخل سياقك الخاص.' : 'حاول دمج مفردات الدرس في إجابتك لتثبيتها.'}`;

  const vocabularyTipAr = unused.length
    ? `جرّب تركيب جملة واحدة بكل كلمة غير مستخدمة: ${unused.slice(0, 3).join('، ')} — مثل: «…, weil …» لربط السبب.`
    : 'استخدمت كل الكلمات المقترحة — لتثبيت أعمق اكتب جملة إضافية بأزمنة مختلفة (Perfekt ثم Präteritum).';

  return {
    scorePct: score,
    correctedGerman,
    feedbackAr,
    strengthsAr,
    grammarNotesAr,
    vocabularyTipAr,
    provider: 'heuristic',
  };
}
