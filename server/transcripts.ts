// Real-Content Enrichment Pipeline (server-only)
// ------------------------------------------------------------------
// Fetches the ACTUAL German content behind a media item before a lesson is
// generated, so lessons are grounded in the source material itself — not just
// its title/description:
//   • articles / reading   → full article body from the publisher's own page
//   • videos / documentaries → YouTube captions (best effort from server IPs)
//                              → official written story of the same news item
//                                (tagesschau open API) as a grounded fallback
//   • podcasts             → verbatim audio transcription via Gemini (needs
//                            GEMINI_API_KEY; returns null without it)
// Everything is best-effort: any failure returns null and the engine keeps its
// previous honest title/description path with the transparency note.
import type { GoogleGenAI } from '@google/genai';
import type { LearningContentType } from '../src/types/media.js';

export interface TranscriptSegment {
  tSec: number;
  textDe: string;
}

export interface ContentEnrichment {
  textDe: string;
  segments?: TranscriptSegment[];
  /** Honest Arabic description of what was actually retrieved. */
  sourceKindAr: string;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MIN_CHARS = 400;
const MAX_ARTICLE_CHARS = 16000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 60;

function fetchT(url: string, timeoutMs: number, extraHeaders?: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    signal: controller.signal,
    headers: { 'User-Agent': UA, 'Accept-Language': 'de-DE,de;q=0.9,en;q=0.5', ...(extraHeaders || {}) },
  }).finally(() => clearTimeout(timer));
}

function makeTtlCache<V>() {
  const store = new Map<string, { data: V; expiresAt: number }>();
  return (key: string, produce: () => Promise<V>): Promise<V> => {
    const hit = store.get(key);
    if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.data);
    return produce().then((data) => {
      if (store.size >= CACHE_MAX) {
        const oldest = store.keys().next().value;
        if (oldest) store.delete(oldest);
      }
      store.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    });
  };
}

const articleCache = makeTtlCache<string | null>();
const transcriptCache = makeTtlCache<{ textDe: string; segments: TranscriptSegment[] } | null>();
const storyCache = makeTtlCache<string | null>();

function collapseWs(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&auml;/gi, 'ä')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&Auml;/gi, 'Ä')
    .replace(/&Ouml;/gi, 'Ö')
    .replace(/&Uuml;/gi, 'Ü')
    .replace(/&szlig;/gi, 'ß');
}

/**
 * Generic main-text extraction from a publisher's article page: strips
 * scripts/styles/navigation, keeps substantial <p> paragraphs, joins them.
 * Works for tagesschau.de, dw.com, zeit.de, spiegel.de and similar sites.
 */
export async function fetchArticleBody(sourceUrl: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(sourceUrl)) return null;
  return articleCache(sourceUrl, async () => {
    try {
      const res = await fetchT(sourceUrl, 10000);
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('html')) return null;
      const raw = (await res.text()).slice(0, 1_500_000);
      const cleaned = raw
        .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ');
      const paragraphs = [
        ...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi),
      ]
        .map((m) => collapseWs(decodeEntities(m[1].replace(/<[^>]+>/g, ' '))))
        .filter((p) => p.length >= 80 && /[a-zA-ZäöüÄÖÜß]/.test(p));
      const body = paragraphs.join(' ').slice(0, MAX_ARTICLE_CHARS);
      return body.length >= MIN_CHARS ? body : null;
    } catch {
      return null;
    }
  });
}

/** Official tagesschau written story of the same news item, via the open API. */
export async function fetchTagesschauStoryByTitle(title: string): Promise<string | null> {
  const cleaned = collapseWs(
    title
      .split('|')[0] // drop suffixes like "| tagesschau24 14:00 Uhr"
      .replace(/[„“"'«»[\]()—–]/g, ' ')
  );
  if (cleaned.length < 12) return null;
  // The search API returns nothing for long queries — try progressively shorter
  // and topic-focused candidates (German video titles are often "Kicker: „Story“ | Show").
  const words = cleaned.split(' ').filter(Boolean);
  const afterColon = collapseWs(cleaned.split(':').slice(1).join(':'));
  const afterColonWords = afterColon.split(' ').filter(Boolean);
  const candidates = [
    cleaned,
    afterColon,
    words.slice(0, 6).join(' '),
    words.slice(0, 4).join(' '),
    afterColonWords.slice(0, 4).join(' '),
  ]
    .filter((q) => q.length >= 12)
    .filter((q, i, arr) => arr.indexOf(q) === i);
  return storyCache(cleaned, async () => {
    for (const query of candidates) {
      try {
        const res = await fetchT(
          `https://www.tagesschau.de/api2u/search/?searchText=${encodeURIComponent(query)}`,
          10000
        );
        if (!res.ok) continue;
        const json = (await res.json()) as {
          searchResults?: Array<{ content?: Array<{ type?: string; value?: string }> }>;
        };
        for (const item of json.searchResults || []) {
          const text = (item.content || [])
            .filter((c) => c.type === 'text' && c.value)
            .map((c) => collapseWs(c.value as string))
            .join(' ');
          if (text.length >= MIN_CHARS) return text.slice(0, MAX_ARTICLE_CHARS);
        }
      } catch {
        /* try next candidate */
      }
    }
    return null;
  });
}

function extractJsonAfterMarker(html: string, marker: string): Record<string, unknown> | null {
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const start = html.indexOf('{', idx);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < html.length && i - start < 3_000_000; i++) {
    const ch = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

interface CaptionTrack {
  baseUrl?: string;
  languageCode?: string;
  kind?: string;
}

async function captionsFromPlayerResponse(player: Record<string, unknown> | null) {
  if (!player) return null;
  const tracks = (
    (player.captions as Record<string, unknown> | undefined)?.playerCaptionsTracklistRenderer as
      | { captionTracks?: CaptionTrack[] }
      | undefined
  )?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  const deTracks = tracks.filter((t) => (t.languageCode || '').toLowerCase().startsWith('de'));
  const track = deTracks.find((t) => t.kind !== 'asr' && t.baseUrl) || deTracks.find((t) => t.baseUrl);
  if (!track?.baseUrl) return null;
  const res = await fetchT(`${track.baseUrl}&fmt=json3`, 12000);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    events?: Array<{ tStartMs?: number; segs?: Array<{ utf8?: string }> }>;
  };
  const segments: TranscriptSegment[] = [];
  for (const ev of json.events || []) {
    const text = collapseWs((ev.segs || []).map((s) => s.utf8 || '').join(' '));
    if (!text || text.length < 2) continue;
    segments.push({ tSec: Math.round((ev.tStartMs || 0) / 1000), textDe: text });
  }
  const textDe = segments
    .map((s) => s.textDe)
    .join(' ')
    .slice(0, MAX_ARTICLE_CHARS);
  return textDe.length >= MIN_CHARS ? { textDe, segments } : null;
}

/**
 * Verbatim German captions for a YouTube video. Best effort: YouTube blocks
 * caption access from many datacenter IPs — failure is normal and expected,
 * callers fall back to the official story text.
 */
export async function fetchYouTubeTranscript(
  videoId: string
): Promise<{ textDe: string; segments: TranscriptSegment[] } | null> {
  if (!/^[\w-]{6,16}$/.test(videoId)) return null;
  return transcriptCache(videoId, async () => {
    // Path 1: public watch page → ytInitialPlayerResponse → caption tracks
    try {
      const res = await fetchT(
        `https://www.youtube.com/watch?v=${videoId}&hl=de&bpctr=9999999999&has_verified=1`,
        12000
      );
      if (res.ok) {
        const html = (await res.text()).slice(0, 2_500_000);
        const player =
          extractJsonAfterMarker(html, 'ytInitialPlayerResponse') ||
          extractJsonAfterMarker(html, 'var ytInitialPlayerResponse');
        const fromPage = await captionsFromPlayerResponse(player);
        if (fromPage) return fromPage;
      }
    } catch {
      /* fall through */
    }
    // Path 2: InnerTube ANDROID player (often rejected from datacenter IPs)
    try {
      const res = await fetchT(
        'https://www.youtube.com/youtubei/v1/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_xky39c',
        12000,
        {
          'Content-Type': 'application/json',
          'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip',
        }
      );
      if (res.ok) {
        const player = (await res.json()) as Record<string, unknown>;
        const fromApi = await captionsFromPlayerResponse(player);
        if (fromApi) return fromApi;
      }
    } catch {
      /* fall through */
    }
    return { textDe: '', segments: [] };
  }).then((r) => (r && r.textDe.length >= MIN_CHARS ? r : null));
}

/**
 * Verbatim transcription of podcast (or video) audio via Gemini multimodal.
 * Requires a configured Gemini client — callers without a key skip this path.
 */
export async function transcribeAudioWithGemini(
  ai: InstanceType<typeof GoogleGenAI>,
  model: string,
  audioUrl: string
): Promise<string | null> {
  try {
    const res = await fetchT(audioUrl, 30000);
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || 'audio/mpeg').split(';')[0];
    if (!ct.startsWith('audio') && !ct.includes('octet-stream')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Inline request cap: keep well under Gemini's ~20 MB request limit
    if (buf.length < 20000 || buf.length > 15 * 1024 * 1024) return null;
    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Transcribe the spoken German audio VERBATIM. German only, original wording, '
                  + 'sentence boundaries preserved, speaker changes marked as "Sprecher 1:" / "Sprecher 2:" '
                  + 'when identifiable. No summary, no commentary — the transcript text only.',
              },
              { inlineData: { mimeType: ct, data: buf.toString('base64') } },
            ],
          },
        ],
        config: { temperature: 0 },
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('transcription timeout')), 240000)),
    ]);
    const text = (response as { text?: string }).text?.trim();
    return text && text.length >= MIN_CHARS ? text.slice(0, MAX_ARTICLE_CHARS) : null;
  } catch {
    return null;
  }
}

/** Orchestrator used by the learning engine before building a lesson. */
export async function enrichLearningContent(args: {
  contentType: LearningContentType;
  title: string;
  currentText: string;
  sourceUrl?: string;
  videoId?: string;
  audioUrl?: string;
  sourceName?: string;
  ai: InstanceType<typeof GoogleGenAI> | null;
  model: string;
}): Promise<ContentEnrichment | null> {
  const { contentType, title, currentText, sourceUrl, videoId, audioUrl, sourceName, ai, model } = args;
  if (currentText.length >= 400) return null; // substantive text already supplied
  try {
    if (contentType === 'article' || contentType === 'reading') {
      if (!sourceUrl) return null;
      const body = await fetchArticleBody(sourceUrl);
      if (!body) return null;
      return {
        textDe: body,
        sourceKindAr:
          'الدرس مبني على النص الكامل للمقال الأصلي، المستخرج مباشرة من صفحة الناشر الرسمية (وليس من العنوان والوصف فقط).',
      };
    }

    if (contentType === 'video' || contentType === 'documentary') {
      // 1) Verbatim captions when accessible (ideal: the spoken content itself)
      if (videoId) {
        const tr = await fetchYouTubeTranscript(videoId);
        if (tr) {
          return {
            textDe: tr.textDe,
            segments: tr.segments,
            sourceKindAr:
              'الدرس مبني على التفريغ الرسمي للتعليقات الألمانية للفيديو — المحتوى المنطوق نفسه.',
          };
        }
      }
      // 2) Official written story of the same news item (tagesschau / ARD)
      const officialText = /tagesschau|ard\b|daily/i.test(sourceName || '')
        ? await fetchTagesschauStoryByTitle(title)
        : null;
      if (officialText) {
        return {
          textDe: officialText,
          sourceKindAr:
            'تعذر جلب التعليقات النصية للفيديو من هذا الخادم، فبُني الدرس على النص الكامل الرسمي لهذا الخبر من tagesschau.de — نفس الخبر المصوَّر بصيغته المكتوبة الكاملة (ليس تفريغاً حرفياً للصوت).',
        };
      }
      // 3) Documentary page itself often carries the full description/transcript
      if (contentType === 'documentary' && sourceUrl) {
        const body = await fetchArticleBody(sourceUrl);
        if (body) {
          return {
            textDe: body,
            sourceKindAr:
              'الدرس مبني على النص الكامل المنشور على صفحة الوثائقي الرسمية لدى الناشر.',
          };
        }
      }
      return null;
    }

    if (contentType === 'podcast' && audioUrl && ai) {
      const transcript = await transcribeAudioWithGemini(ai, model, audioUrl);
      if (!transcript) return null;
      return {
        textDe: transcript,
        sourceKindAr:
          'الدرس مبني على تفريغ صوتي حرفي كامل للحلقة عبر Gemini — المحتوى المنطوق نفسه بترتيبه الأصلي.',
      };
    }
  } catch {
    return null;
  }
  return null;
}
