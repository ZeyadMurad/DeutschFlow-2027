import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { lookupGermanDictionary } from './dictionary.js';
import { buildLocalLesson, evaluateWritingLocally } from './localLessonEngine.js';
import { enrichLearningContent } from './transcripts.js';
import type {
  CEFRLevel,
  LearningContentInput,
  LearningDifficulty,
  LearningLesson,
  LessonVocabularyItem,
  SentenceAnalysisResult,
  WordCategory,
  WritingEvaluationResult,
} from '../src/types/media.js';

const LESSON_CACHE = new Map<string, LearningLesson>();
const SENTENCE_CACHE = new Map<string, SentenceAnalysisResult>();
const RATE_LIMIT_BUCKETS = new Map<string, { count: number; windowStart: number }>();

// Gemini model is env-configurable so the deployment can switch/upgrade the
// model without a code change (falls back to the original default).
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-4-hydrogen';

const ENGINE_TELEMETRY = {
  totalLessonsGenerated: 0,
  aiRequestsCount: 0,
  aiCacheHitsCount: 0,
  aiErrorsCount: 0,
};

export function getLearningEngineTelemetry() {
  return { ...ENGINE_TELEMETRY };
}

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function checkRateLimit(bucketKey: string, limit = 30, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const prev = RATE_LIMIT_BUCKETS.get(bucketKey);
  if (!prev || now - prev.windowStart > windowMs) {
    RATE_LIMIT_BUCKETS.set(bucketKey, { count: 1, windowStart: now });
    return true;
  }
  if (prev.count >= limit) return false;
  prev.count += 1;
  return true;
}

function makeContentHash(input: LearningContentInput): string {
  const normalized = `${input.sourceId}|${input.contentType}|${input.difficulty}|${input.targetCefr || ''}|${input.title.trim()}|${input.text.trim().slice(0, 1800)}`;
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

function normalizeCefr(val: unknown, fallback: CEFRLevel = 'B1'): CEFRLevel {
  const s = String(val || '').trim().toUpperCase();
  if (s === 'A1' || s === 'A2' || s === 'B1' || s === 'B2' || s === 'C1' || s === 'C2') return s;
  return fallback;
}

function normalizeWordCategory(val: unknown): WordCategory {
  const s = String(val || '').trim().toLowerCase();
  if (s === 'noun' || s === 'verb' || s === 'adjective' || s === 'expression') return s;
  return 'other';
}

function extractCandidateSentences(title: string, text: string): string[] {
  const raw = `${title}. ${text}`.replace(/\s+/g, ' ').trim();
  const split = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 16 && /[a-zA-ZäöüÄÖÜß]/.test(s));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of split) {
    const k = s.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
    if (out.length >= 8) break;
  }
  return out;
}

function difficultyInstruction(diff: LearningDifficulty, targetCefr?: CEFRLevel): string {
  if (diff === 'simplified') {
    return `Adapt explanations, German summary, reading questions, and practice tasks to a simplified learner level (${targetCefr || 'A2'}), while staying strictly faithful to the facts present in the source.`;
  }
  if (diff === 'advanced') {
    return `Adapt explanations, German summary, grammar depth, and expressions to an advanced learner level (${targetCefr || 'B2'}), while staying strictly faithful to the source text.`;
  }
  return `Keep the original source difficulty and natural journalism/media register (${targetCefr || 'B1'}), explaining nuances clearly for Arabic-speaking learners.`;
}

// Thrown when the Gemini client is not configured — caught by the caller to
// fall back to the deterministic local lesson engine instead of failing.
class GeminiUnavailableError extends Error {
  constructor() {
    super('GEMINI_API_KEY غير مضبوط على الخادم');
    this.name = 'GeminiUnavailableError';
  }
}

export async function generateLearningLesson(
  input: LearningContentInput,
  rateKey: string
): Promise<{ ok: true; lesson: LearningLesson } | { ok: false; status: number; error: string }> {
  const cleanTitle = (input.title || '').trim().slice(0, 260);
  const cleanText = (input.text || '').trim().slice(0, 5000);
  const combinedText = `${cleanTitle}\n${cleanText}`.trim();

  if (combinedText.length < 20 || !/[a-zA-ZäöüÄÖÜß]{3,}/.test(combinedText)) {
    return {
      ok: false,
      status: 400,
      error:
        'لا يتوفر نص ألماني أو وصف كافٍ لهذا المحتوى لتحويله إلى درس متكامل (قد يفتقر الفيديو أو البودكاست إلى نص تفريغي أو وصف مفصّل).',
    };
  }

  const hash = makeContentHash(input);
  const cached = LESSON_CACHE.get(hash);
  if (cached) {
    ENGINE_TELEMETRY.aiCacheHitsCount += 1;
    return { ok: true, lesson: { ...cached, cached: true } };
  }

  if (!checkRateLimit(`lesson:${rateKey}`, 25)) {
    return {
      ok: false,
      status: 429,
      error: 'تم بلوغ الحد المؤقت لإنشاء الدروس الذكية. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.',
    };
  }

  const ai = getGeminiClient();

  // إثراء المحتوى الحقيقي: جلب النص الفعلي للمصدر (المقال الكامل من صفحة الناشر /
  // تفريغ التعليقات / النص الرسمي الكامل للخبر / تفريغ صوتي عبر Gemini) قبل بناء
  // الدرس — أي فشل يعيد بهدوء المسار الشفاف القديم (العنوان + الوصف).
  const enrichment = await enrichLearningContent({
    contentType: input.contentType,
    title: cleanTitle,
    currentText: cleanText,
    sourceUrl: input.sourceUrl,
    videoId: input.videoId,
    audioUrl: input.audioUrl,
    sourceName: input.sourceName,
    ai,
    model: GEMINI_MODEL,
  });
  const effectiveText = (enrichment?.textDe || cleanText).slice(0, 9000);

  const isSparseSource = effectiveText.length < 140;
  const isAudioVideoWithoutTranscript =
    (input.contentType === 'video' || input.contentType === 'podcast' || input.contentType === 'documentary') &&
    effectiveText.length < 240;

  const sourceLimitationNoteAr = isAudioVideoWithoutTranscript
    ? 'ملاحظة شفافية المصدر: يعتمد هذا الدرس على العنوان والوصف الرسمي المتاح من الناشر لأن النص التفريغي الكامل (Transcript) غير متاح برمجياً.'
    : isSparseSource
    ? 'ملاحظة: يعتمد هذا الدرس على المقتطف المتاح من المصدر الرسمي فقط.'
    : undefined;

  const sourceLimitationNoteEn = isAudioVideoWithoutTranscript
    ? 'Source transparency: this lesson is grounded in the official title and publisher description because a full spoken transcript is not exposed.'
    : isSparseSource
    ? 'Note: this lesson is grounded strictly in the available publisher excerpt.'
    : undefined;

  // مؤشر التغطية الصادق: هل بُني الدرس على المحتوى الفعلي الكامل أم على المتاح فقط؟
  const coverage: LearningLesson['coverage'] = enrichment ? 'full' : 'partial';
  const coverageNoteAr = enrichment ? enrichment.sourceKindAr : sourceLimitationNoteAr;

  const prompt = `You are DeutschFlow Learning Engine, an expert German-to-Arabic & English pedagogical designer.
Transform ONLY the provided real German source content into a structured interactive German lesson.

CRITICAL GROUNDING RULES:
- Base EVERY summary, vocabulary item, grammar structure, expression, sentence breakdown, and comprehension question strictly on the supplied source title and text.
- NEVER invent quotes, facts, statistics, or spoken transcript lines that are not in the supplied text.
- ${difficultyInstruction(input.difficulty, input.targetCefr)}
- If the source text is only a title and brief description, keep the lesson focused on those authentic German expressions and structures without fabricating extra story details.
- Output crisp, natural Arabic pedagogical explanations (and concise English labels where requested).

SOURCE METADATA:
- Content Type: ${input.contentType}
- Source Name: ${input.sourceName}
- Title: ${cleanTitle}
- Available Text:
${effectiveText || cleanTitle}

Produce JSON matching the schema with:
1. overview: topicAr, topicEn, cefrLevel (A1..C2), summaryDe (faithful German summary adapted to requested difficulty), summaryAr (clear Arabic explanation), estimatedMinutes (integer 5..25).
2. importantVocabulary: 6 to 8 real German words directly from or central to this text, with lemma, article (der/die/das/die (Pl.) or empty string), plural, wordCategory (noun/verb/adjective/expression/other), meaningAr, meaningEn, phoneticHint, exampleDe, exampleAr, cefrLevel, contextualMeaningAr.
3. grammarInContext: 2 to 3 grammar structures genuinely appearing in this text, each with titleDe, titleAr, explanationAr, structureFormula, reasonUsedAr, examples (2 pairs of de/ar), and a practiceQuestion (prompt, 4 options, correctIndex 0..3, explanationAr).
4. importantExpressions: 3 to 4 idiomatic phrases, collocations, or formal/informal expressions relevant to the text.
5. sentenceAnalysisBank: 3 to 5 actual sentences from the source text, with translationAr, grammarNoteAr, verbIdentified, caseAnalysisAr, wordOrderNoteAr, and wordByWord array (token, lemma, role, meaningAr).
6. readingComprehension: 3 questions (2 mcq with 4 options + 1 true_false with options ["Richtig","Falsch"]), correctAnswer matching exact option string, explanationAr.
7. listeningComprehension: short transcriptExcerptDe (strictly from the supplied text, never fabricated!), noteAr, and 2 comprehension questions.
8. writingPractice: promptDe, promptAr, targetWords (3-5 words from importantVocabulary), minWords (integer 25..60), modelExampleDe.
9. finalQuiz: 5 mixed review questions covering vocabulary, grammar, comprehension, and expressions.`;

  ENGINE_TELEMETRY.aiRequestsCount += 1;

  try {
    if (!ai) throw new GeminiUnavailableError();
    const response = await Promise.race([
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overview: {
                type: Type.OBJECT,
                properties: {
                  topicAr: { type: Type.STRING },
                  topicEn: { type: Type.STRING },
                  cefrLevel: { type: Type.STRING },
                  summaryDe: { type: Type.STRING },
                  summaryAr: { type: Type.STRING },
                  estimatedMinutes: { type: Type.INTEGER },
                },
                required: ['topicAr', 'topicEn', 'cefrLevel', 'summaryDe', 'summaryAr', 'estimatedMinutes'],
              },
              importantVocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    lemma: { type: Type.STRING },
                    article: { type: Type.STRING },
                    plural: { type: Type.STRING },
                    wordCategory: { type: Type.STRING },
                    meaningAr: { type: Type.STRING },
                    meaningEn: { type: Type.STRING },
                    phoneticHint: { type: Type.STRING },
                    exampleDe: { type: Type.STRING },
                    exampleAr: { type: Type.STRING },
                    cefrLevel: { type: Type.STRING },
                    contextualMeaningAr: { type: Type.STRING },
                  },
                  required: ['word', 'wordCategory', 'meaningAr', 'exampleDe', 'exampleAr', 'cefrLevel', 'contextualMeaningAr'],
                },
              },
              grammarInContext: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    titleDe: { type: Type.STRING },
                    titleAr: { type: Type.STRING },
                    explanationAr: { type: Type.STRING },
                    structureFormula: { type: Type.STRING },
                    reasonUsedAr: { type: Type.STRING },
                    examples: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: { de: { type: Type.STRING }, ar: { type: Type.STRING } },
                        required: ['de', 'ar'],
                      },
                    },
                    practiceQuestion: {
                      type: Type.OBJECT,
                      properties: {
                        prompt: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctIndex: { type: Type.INTEGER },
                        explanationAr: { type: Type.STRING },
                      },
                      required: ['prompt', 'options', 'correctIndex', 'explanationAr'],
                    },
                  },
                  required: ['titleDe', 'titleAr', 'explanationAr', 'structureFormula', 'reasonUsedAr', 'examples', 'practiceQuestion'],
                },
              },
              importantExpressions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    expressionDe: { type: Type.STRING },
                    register: { type: Type.STRING },
                    meaningAr: { type: Type.STRING },
                    usageNoteAr: { type: Type.STRING },
                    exampleDe: { type: Type.STRING },
                  },
                  required: ['expressionDe', 'register', 'meaningAr', 'usageNoteAr', 'exampleDe'],
                },
              },
              sentenceAnalysisBank: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sentenceDe: { type: Type.STRING },
                    translationAr: { type: Type.STRING },
                    grammarNoteAr: { type: Type.STRING },
                    verbIdentified: { type: Type.STRING },
                    caseAnalysisAr: { type: Type.STRING },
                    wordOrderNoteAr: { type: Type.STRING },
                    wordByWord: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          token: { type: Type.STRING },
                          lemma: { type: Type.STRING },
                          role: { type: Type.STRING },
                          meaningAr: { type: Type.STRING },
                        },
                        required: ['token', 'lemma', 'role', 'meaningAr'],
                      },
                    },
                  },
                  required: ['sentenceDe', 'translationAr', 'grammarNoteAr', 'verbIdentified', 'caseAnalysisAr', 'wordOrderNoteAr', 'wordByWord'],
                },
              },
              readingComprehension: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING },
                    questionDe: { type: Type.STRING },
                    questionAr: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    explanationAr: { type: Type.STRING },
                  },
                  required: ['id', 'type', 'questionDe', 'questionAr', 'correctAnswer', 'explanationAr'],
                },
              },
              listeningComprehension: {
                type: Type.OBJECT,
                properties: {
                  transcriptExcerptDe: { type: Type.STRING },
                  noteAr: { type: Type.STRING },
                  questions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        type: { type: Type.STRING },
                        questionDe: { type: Type.STRING },
                        questionAr: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                        explanationAr: { type: Type.STRING },
                      },
                      required: ['id', 'type', 'questionDe', 'questionAr', 'correctAnswer', 'explanationAr'],
                    },
                  },
                },
                required: ['transcriptExcerptDe', 'noteAr', 'questions'],
              },
              writingPractice: {
                type: Type.OBJECT,
                properties: {
                  promptDe: { type: Type.STRING },
                  promptAr: { type: Type.STRING },
                  targetWords: { type: Type.ARRAY, items: { type: Type.STRING } },
                  minWords: { type: Type.INTEGER },
                  modelExampleDe: { type: Type.STRING },
                },
                required: ['promptDe', 'promptAr', 'targetWords', 'minWords', 'modelExampleDe'],
              },
              finalQuiz: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    skill: { type: Type.STRING },
                    promptDe: { type: Type.STRING },
                    promptAr: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                    explanationAr: { type: Type.STRING },
                  },
                  required: ['id', 'skill', 'promptDe', 'promptAr', 'options', 'correctIndex', 'explanationAr'],
                },
              },
            },
            required: [
              'overview',
              'importantVocabulary',
              'grammarInContext',
              'importantExpressions',
              'sentenceAnalysisBank',
              'readingComprehension',
              'listeningComprehension',
              'writingPractice',
              'finalQuiz',
            ],
          },
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini lesson generation timed out')), 28000)),
    ]);

    const raw = response.text?.trim();
    if (!raw) throw new Error('Empty AI lesson payload');
    const parsed = JSON.parse(raw) as Record<string, any>;

    const cefr = normalizeCefr(parsed.overview?.cefrLevel, input.targetCefr || 'B1');
    const vocabList: LessonVocabularyItem[] = Array.isArray(parsed.importantVocabulary)
      ? parsed.importantVocabulary.slice(0, 10).map((v: any) => ({
          word: String(v.word || '').trim(),
          lemma: String(v.lemma || v.word || '').trim(),
          article: v.article ? String(v.article).trim() : undefined,
          plural: v.plural ? String(v.plural).trim() : undefined,
          wordCategory: normalizeWordCategory(v.wordCategory),
          meaningAr: String(v.meaningAr || '').trim(),
          meaningEn: v.meaningEn ? String(v.meaningEn).trim() : undefined,
          phoneticHint: v.phoneticHint ? String(v.phoneticHint).trim() : undefined,
          exampleDe: String(v.exampleDe || '').trim(),
          exampleAr: String(v.exampleAr || '').trim(),
          cefrLevel: normalizeCefr(v.cefrLevel, cefr),
          contextualMeaningAr: String(v.contextualMeaningAr || v.meaningAr || '').trim(),
        })).filter((v) => v.word && v.meaningAr)
      : [];

    const sentences = extractCandidateSentences(cleanTitle, effectiveText);
    const lesson: LearningLesson = {
      lessonId: `eng_${hash}`,
      sourceId: input.sourceId,
      contentType: input.contentType,
      difficulty: input.difficulty,
      provider: 'gemini',
      cached: false,
      createdAt: new Date().toISOString(),
      sourceLimitationNoteAr,
      sourceLimitationNoteEn,
      coverage,
      coverageNoteAr,
      transcriptSegments: enrichment?.segments?.slice(0, 60),
      overview: {
        titleDe: cleanTitle,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        topicAr: String(parsed.overview?.topicAr || 'الصحافة والإعلام الألماني'),
        topicEn: String(parsed.overview?.topicEn || 'German Media'),
        cefrLevel: cefr,
        summaryDe: String(parsed.overview?.summaryDe || cleanText || cleanTitle),
        summaryAr: String(parsed.overview?.summaryAr || ''),
        estimatedMinutes: Math.max(5, Math.min(30, Number(parsed.overview?.estimatedMinutes || 12))),
        audioAvailable: Boolean(input.audioUrl || cleanText.length >= 25),
        audioUrl: input.audioUrl,
        videoId: input.videoId,
      },
      importantVocabulary: vocabList,
      grammarInContext: Array.isArray(parsed.grammarInContext) ? parsed.grammarInContext.slice(0, 4) : [],
      importantExpressions: Array.isArray(parsed.importantExpressions) ? parsed.importantExpressions.slice(0, 6) : [],
      sentenceAnalysisBank:
        Array.isArray(parsed.sentenceAnalysisBank) && parsed.sentenceAnalysisBank.length > 0
          ? parsed.sentenceAnalysisBank.slice(0, 6)
          : sentences.slice(0, 3).map((s) => ({
              sentenceDe: s,
              translationAr: '',
              grammarNoteAr: '',
              verbIdentified: '',
              caseAnalysisAr: '',
              wordOrderNoteAr: '',
              wordByWord: [],
            })),
      readingComprehension: Array.isArray(parsed.readingComprehension)
        ? parsed.readingComprehension.slice(0, 5).map((q: any, idx: number) => ({
            id: String(q.id || `rc_${idx}`),
            type: q.type === 'true_false' ? 'true_false' : q.type === 'short_answer' ? 'short_answer' : 'mcq',
            questionDe: String(q.questionDe || ''),
            questionAr: String(q.questionAr || ''),
            options: Array.isArray(q.options) ? q.options.map(String) : undefined,
            correctAnswer: String(q.correctAnswer || ''),
            explanationAr: String(q.explanationAr || ''),
          }))
        : [],
      listeningComprehension: {
        available: Boolean(input.audioUrl || (cleanText || cleanTitle).length > 30),
        transcriptExcerptDe: String(parsed.listeningComprehension?.transcriptExcerptDe || cleanText.slice(0, 400) || cleanTitle),
        noteAr: String(
          parsed.listeningComprehension?.noteAr ||
            (input.audioUrl
              ? 'استمع إلى التسجيل الأصلي أو النطق الألماني ثم أجب عن الأسئلة.'
              : 'تم تفعيل الاستماع عبر النطق الألماني الواضح (de-DE) للنص المتاح من المصدر.')
        ),
        questions: Array.isArray(parsed.listeningComprehension?.questions)
          ? parsed.listeningComprehension.questions.slice(0, 3).map((q: any, idx: number) => ({
              id: String(q.id || `lc_${idx}`),
              type: q.type === 'true_false' ? 'true_false' : 'mcq',
              questionDe: String(q.questionDe || ''),
              questionAr: String(q.questionAr || ''),
              options: Array.isArray(q.options) ? q.options.map(String) : undefined,
              correctAnswer: String(q.correctAnswer || ''),
              explanationAr: String(q.explanationAr || ''),
            }))
          : [],
      },
      writingPractice: {
        promptDe: String(parsed.writingPractice?.promptDe || `Schreiben Sie 3–4 Sätze über „${cleanTitle}“.`),
        promptAr: String(parsed.writingPractice?.promptAr || 'اكتب 3 إلى 4 جمل بالألمانية تلخص رأيك في هذا المحتوى باستخدام الكلمات المقترحة.'),
        targetWords: Array.isArray(parsed.writingPractice?.targetWords)
          ? parsed.writingPractice.targetWords.map(String).slice(0, 6)
          : vocabList.slice(0, 4).map((v) => v.word),
        minWords: Math.max(15, Math.min(80, Number(parsed.writingPractice?.minWords || 25))),
        modelExampleDe: String(parsed.writingPractice?.modelExampleDe || ''),
      },
      finalQuiz: Array.isArray(parsed.finalQuiz)
        ? parsed.finalQuiz.slice(0, 6).map((q: any, idx: number) => ({
            id: String(q.id || `fq_${idx}`),
            skill:
              q.skill === 'grammar' || q.skill === 'comprehension' || q.skill === 'expressions'
                ? q.skill
                : 'vocabulary',
            promptDe: String(q.promptDe || ''),
            promptAr: String(q.promptAr || ''),
            options: Array.isArray(q.options) ? q.options.map(String) : [],
            correctIndex: Math.max(0, Math.min(3, Number(q.correctIndex || 0))),
            explanationAr: String(q.explanationAr || ''),
          }))
        : [],
    };

    if (LESSON_CACHE.size >= 120) {
      const oldestKey = LESSON_CACHE.keys().next().value;
      if (oldestKey) LESSON_CACHE.delete(oldestKey);
    }
    LESSON_CACHE.set(hash, lesson);
    ENGINE_TELEMETRY.totalLessonsGenerated += 1;

    return { ok: true, lesson };
  } catch (err) {
    if (!(err instanceof GeminiUnavailableError)) {
      ENGINE_TELEMETRY.aiErrorsCount += 1;
    }

    // Gemini غير مفعّل أو فشل → الدرس المدمج الحتمي بنفس المخطط، مبنياً حصراً
    // على النص الأصلي — لا ردود فارغة ولا اختراع حقائق.
    const localLesson = await buildLocalLesson({ ...input, text: effectiveText }, hash);
    if (localLesson) {
      localLesson.coverage = coverage;
      localLesson.coverageNoteAr = coverageNoteAr;
      if (enrichment?.segments?.length) {
        localLesson.transcriptSegments = enrichment.segments.slice(0, 60);
      }
      if (LESSON_CACHE.size >= 120) {
        const oldestKey = LESSON_CACHE.keys().next().value;
        if (oldestKey) LESSON_CACHE.delete(oldestKey);
      }
      LESSON_CACHE.set(hash, localLesson);
      ENGINE_TELEMETRY.totalLessonsGenerated += 1;
      return { ok: true, lesson: localLesson };
    }

    return {
      ok: false,
      status: 503,
      error:
        'تعذر توليد الدرس التعليمي حالياً. يمكنك قراءة المحتوى والنقر على الكلمات للترجمة والحفظ في المعجم.',
    };
  }
}

export async function analyzeGermanSentence(
  sentenceDe: string,
  rateKey: string
): Promise<{ ok: true; analysis: SentenceAnalysisResult } | { ok: false; status: number; error: string }> {
  const clean = sentenceDe.trim().slice(0, 600);
  if (clean.length < 4) {
    return { ok: false, status: 400, error: 'يرجى اختيار جملة ألمانية صالحة للتحليل.' };
  }

  const cacheKey = crypto.createHash('sha256').update(clean.toLowerCase()).digest('hex').slice(0, 16);
  const hit = SENTENCE_CACHE.get(cacheKey);
  if (hit) return { ok: true, analysis: hit };

  if (!checkRateLimit(`sent:${rateKey}`, 45)) {
    return { ok: false, status: 429, error: 'تم تجاوز الحد المؤقت لتحليل الجمل.' };
  }

  const ai = getGeminiClient();
  if (ai) {
    ENGINE_TELEMETRY.aiRequestsCount += 1;
    try {
      const response = await Promise.race([
        ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Analyze this German sentence pedagogically for an Arabic learner:\n"${clean}"\nProvide: natural Arabic translation, grammar structure in Arabic, main verb(s) identified, German grammatical cases present (Nominativ/Akkusativ/Dativ/Genitiv), word order explanation (V2 / Nebensatz / Klammer), and wordByWord breakdown.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                translationAr: { type: Type.STRING },
                grammarStructureAr: { type: Type.STRING },
                verbIdentified: { type: Type.STRING },
                caseAnalysisAr: { type: Type.STRING },
                wordOrderNoteAr: { type: Type.STRING },
                wordByWord: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      token: { type: Type.STRING },
                      lemma: { type: Type.STRING },
                      role: { type: Type.STRING },
                      meaningAr: { type: Type.STRING },
                    },
                    required: ['token', 'lemma', 'role', 'meaningAr'],
                  },
                },
              },
              required: ['translationAr', 'grammarStructureAr', 'verbIdentified', 'caseAnalysisAr', 'wordOrderNoteAr', 'wordByWord'],
            },
          },
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Sentence analysis timeout')), 12000)),
      ]);

      const raw = response.text?.trim();
      if (raw) {
        const parsed = JSON.parse(raw) as Omit<SentenceAnalysisResult, 'sentenceDe' | 'provider'>;
        const result: SentenceAnalysisResult = {
          sentenceDe: clean,
          translationAr: parsed.translationAr || '',
          grammarStructureAr: parsed.grammarStructureAr || '',
          verbIdentified: parsed.verbIdentified || '',
          caseAnalysisAr: parsed.caseAnalysisAr || '',
          wordOrderNoteAr: parsed.wordOrderNoteAr || '',
          wordByWord: Array.isArray(parsed.wordByWord) ? parsed.wordByWord : [],
          provider: 'gemini',
        };
        SENTENCE_CACHE.set(cacheKey, result);
        return { ok: true, analysis: result };
      }
    } catch {
      ENGINE_TELEMETRY.aiErrorsCount += 1;
    }
  }

  // Honest lexical word-by-word lookup fallback without fabricating grammar claims
  const tokens = clean.split(/\s+/).map((t) => t.replace(/^[„"«(\[\s']+|[.,!?;:»"')\]…\s']+$/g, '')).filter(Boolean).slice(0, 18);
  const wordByWord = await Promise.all(
    tokens.map(async (tok) => {
      const looked = await lookupGermanDictionary({ text: tok, sentence: clean, target: 'ar' }).catch(() => null);
      return {
        token: tok,
        lemma: looked?.lemma || tok,
        role: looked?.partOfSpeech || 'كلمة',
        meaningAr: looked?.translation || '—',
      };
    })
  );

  const fallback: SentenceAnalysisResult = {
    sentenceDe: clean,
    translationAr: wordByWord.map((w) => (w.meaningAr !== '—' ? w.meaningAr : w.token)).join(' '),
    grammarStructureAr: 'تحليل معجمي كلمة بكلمة (التحليل النحوي العميق يتطلب تفعيل خدمة الذكاء الاصطناعي على الخادم).',
    verbIdentified: wordByWord.find((w) => w.role.toLowerCase().includes('verb'))?.token || '—',
    caseAnalysisAr: 'راجع الحالات الإعرابية لكل أداة واسم حسب السياق.',
    wordOrderNoteAr: 'ترتيب الكلمات محفوظ كما في الجملة الأصلية.',
    wordByWord,
    provider: 'heuristic',
  };
  return { ok: true, analysis: fallback };
}

export async function evaluateWritingPractice(params: {
  promptDe: string;
  userText: string;
  targetWords: string[];
  cefrLevel: CEFRLevel;
  rateKey: string;
}): Promise<{ ok: true; evaluation: WritingEvaluationResult } | { ok: false; status: number; error: string }> {
  const userText = (params.userText || '').trim().slice(0, 2000);
  if (userText.length < 10) {
    return { ok: false, status: 400, error: 'يرجى كتابة إجابة ألمانية لا تقل عن جملة كاملة قبل التقييم.' };
  }

  if (!checkRateLimit(`write:${params.rateKey}`, 20)) {
    return { ok: false, status: 429, error: 'تم الوصول للحد المؤقت لتقييم الكتابة.' };
  }

  const ai = getGeminiClient();

  if (!ai) {
    // لا مفتاح على الخادم → تقييم محلي صادق (مقاييس حتمية) بدل رفض الميزة
    return {
      ok: true,
      evaluation: evaluateWritingLocally({
        promptDe: params.promptDe,
        userText,
        targetWords: params.targetWords,
        minWords: 30,
      }),
    };
  }

  ENGINE_TELEMETRY.aiRequestsCount += 1;
  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Evaluate this German learner's writing response honestly and constructively.
Prompt: "${params.promptDe.slice(0, 300)}"
Target vocabulary words: ${params.targetWords.join(', ')}
Target CEFR: ${params.cefrLevel}
Learner text: "${userText}"

Provide:
- scorePct (0..100 fair rubric score)
- correctedGerman (natural corrected German version keeping learner's intended meaning)
- feedbackAr (2-3 clear sentences in Arabic explaining what worked and what to improve)
- strengthsAr (2 short bullet points in Arabic)
- grammarNotesAr (up to 3 specific grammar/spelling fixes explained in Arabic)
- vocabularyTipAr (1 helpful tip in Arabic about word choice/collocation)`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scorePct: { type: Type.INTEGER },
              correctedGerman: { type: Type.STRING },
              feedbackAr: { type: Type.STRING },
              strengthsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
              grammarNotesAr: { type: Type.ARRAY, items: { type: Type.STRING } },
              vocabularyTipAr: { type: Type.STRING },
            },
            required: ['scorePct', 'correctedGerman', 'feedbackAr', 'strengthsAr', 'grammarNotesAr', 'vocabularyTipAr'],
          },
        },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Writing evaluation timeout')), 15000)),
    ]);

    const raw = response.text?.trim();
    if (!raw) throw new Error('Empty evaluation');
    const parsed = JSON.parse(raw) as Omit<WritingEvaluationResult, 'provider'>;
    return {
      ok: true,
      evaluation: {
        scorePct: Math.max(0, Math.min(100, Number(parsed.scorePct || 70))),
        correctedGerman: String(parsed.correctedGerman || userText),
        feedbackAr: String(parsed.feedbackAr || ''),
        strengthsAr: Array.isArray(parsed.strengthsAr) ? parsed.strengthsAr.map(String) : [],
        grammarNotesAr: Array.isArray(parsed.grammarNotesAr) ? parsed.grammarNotesAr.map(String) : [],
        vocabularyTipAr: String(parsed.vocabularyTipAr || ''),
        provider: 'gemini',
      },
    };
  } catch {
    ENGINE_TELEMETRY.aiErrorsCount += 1;
    // فشل مؤقت من Gemini → التقييم المحلي الصادق بدل رد فاشل
    return {
      ok: true,
      evaluation: evaluateWritingLocally({
        promptDe: params.promptDe,
        userText,
        targetWords: params.targetWords,
        minWords: 30,
      }),
    };
  }
}
