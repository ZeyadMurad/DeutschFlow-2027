import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';
import {
  authenticateAdminLogin,
  bootstrapAdminOwner,
  extractBearerToken,
  getAdminBootStatus,
  getPublicAppConfig,
  readSuggestions,
  requireAdminAuth,
  submitDeveloperSuggestion,
  updatePublicAppConfig,
  verifyAdminToken,
} from './server/admin.js';
import { lookupGermanDictionary } from './server/dictionary.js';
import {
  CEFR_CURRICULUM_UNITS,
  GRAMMAR_LIBRARY,
  IMPORTANT_SENTENCES_LIBRARY,
  PLACEMENT_QUESTIONS,
} from './server/cefrCurriculum.js';
import {
  analyzeGermanSentence,
  evaluateWritingPractice,
  generateLearningLesson,
} from './server/learningEngine.js';
import {
  addLearningErrorReport,
  buildWeeklyReport,
  completeCurriculumLessonOrUnit,
  completeDailyVocabMission,
  completeLearningEngineCourse,
  getLearningTelemetryStats,
  getOrCreateProfile,
  loadErrorReports,
  recordLearnerActivity,
  recordMistakesBatch,
  resolveLearningErrorReport,
  resolveProfileBySyncCode,
  reviewVocabWithSM2,
  submitPlacementAssessment,
  updateProfilePreferences,
  upsertVocabularyItems,
  validateProfileId,
} from './server/learningStore.js';
import {
  CURATED_GERMAN_TITLES,
  NEWS_SOURCES,
  PODCAST_SOURCES,
  RADIO_FLAGSHIP_STATIONS,
  STREAMING_PLATFORMS,
  YOUTUBE_CHANNELS,
} from './server/sources.js';
import type {
  CEFRLevel,
  LearningActivityType,
  LearningContentInput,
  NewsArticle,
  NewsCategory,
  PodcastEpisode,
  PodcastShowMeta,
  PodcastShowWithEpisodes,
  RadioCategory,
  RadioStation,
  SourceHealthStatus,
  UserMistake,
  VocabItem,
  VocabReviewRating,
  YouTubeVideo,
} from './src/types/media.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const USER_AGENT = 'DeutschFlowUltimate/1.0 (+personal-german-learning-hub)';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
  ignorePiTags: true,
});

// ---------------------------------------------------------------------------
// Security Helpers (URL validation & HTML sanitization)
// ---------------------------------------------------------------------------

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }
  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) {
    return true;
  }
  return false;
}

function validateExternalUrl(raw: string, requireHttps = false): URL | null {
  try {
    const parsed = new URL(raw);
    if (requireHttps && parsed.protocol !== 'https:') return null;
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    if (isPrivateHost(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    });
}

function stripHtml(raw: unknown): string {
  if (!raw) return '';
  const text =
    typeof raw === 'string'
      ? raw
      : typeof raw === 'object' && raw !== null && '#text' in raw
      ? String((raw as Record<string, unknown>)['#text'])
      : String(raw);
  return decodeHtmlEntities(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function asArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function safeIsoDate(raw: unknown): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ---------------------------------------------------------------------------
// In-Memory Cache & Source Health Registry
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();
const sourceHealthMap = new Map<string, SourceHealthStatus>();

function updateHealth(status: SourceHealthStatus) {
  sourceHealthMap.set(status.id, status);
}

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/rss+xml, application/atom+xml, application/xml, application/json, text/xml, */*',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.7',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

// ---------------------------------------------------------------------------
// Radio Browser Integration
// ---------------------------------------------------------------------------

const RADIO_MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
];

function classifyRadioStation(name: string, tagsStr: string): {
  category: RadioCategory;
  isNational: boolean;
  officialUrl?: string;
} {
  const lowerName = name.toLowerCase();
  const lowerTags = tagsStr.toLowerCase();

  for (const flagship of RADIO_FLAGSHIP_STATIONS) {
    if (flagship.matchNames.some((m) => lowerName.includes(m))) {
      return {
        category: flagship.category,
        isNational: flagship.isNational,
        officialUrl: flagship.officialUrl,
      };
    }
  }

  if (lowerTags.includes('kinder') || lowerTags.includes('children') || lowerName.includes('kika') || lowerName.includes('toggo')) {
    return { category: 'kids', isNational: false };
  }
  if (lowerTags.includes('news') || lowerTags.includes('nachrichten') || lowerTags.includes('info') || lowerTags.includes('talk') || lowerTags.includes('politik')) {
    return { category: 'news_politics', isNational: false };
  }
  if (lowerTags.includes('kultur') || lowerTags.includes('culture') || lowerTags.includes('klassik') || lowerTags.includes('classic')) {
    return { category: 'culture', isNational: false };
  }
  if (lowerTags.includes('sport') || lowerTags.includes('fußball') || lowerTags.includes('bundesliga')) {
    return { category: 'sports', isNational: false };
  }
  if (lowerTags.includes('wirtschaft') || lowerTags.includes('business') || lowerTags.includes('finance')) {
    return { category: 'business', isNational: false };
  }
  if (lowerTags.includes('bildung') || lowerTags.includes('campus') || lowerTags.includes('university') || lowerTags.includes('wissen') || lowerTags.includes('deutsch')) {
    return { category: 'educational', isNational: false };
  }
  if (
    lowerTags.includes('pop') ||
    lowerTags.includes('rock') ||
    lowerTags.includes('electronic') ||
    lowerTags.includes('dance') ||
    lowerTags.includes('jazz') ||
    lowerTags.includes('schlager') ||
    lowerTags.includes('hiphop') ||
    lowerTags.includes('music')
  ) {
    return { category: 'music', isNational: false };
  }
  return { category: 'regional', isNational: false };
}

function getFlagshipPriority(name: string): number {
  const lower = name.toLowerCase();
  const idx = RADIO_FLAGSHIP_STATIONS.findIndex((f) => f.matchNames.some((m) => lower.includes(m)));
  return idx === -1 ? 999 : idx;
}

interface RadioBrowserRaw {
  stationuuid?: string;
  name?: string;
  url_resolved?: string;
  url?: string;
  homepage?: string;
  favicon?: string;
  country?: string;
  state?: string;
  tags?: string;
  codec?: string;
  bitrate?: number;
  votes?: number;
  lastcheckok?: number;
}

async function fetchGermanRadioPool(force = false): Promise<RadioStation[]> {
  const cacheKey = 'radio_de_pool';
  const now = Date.now();
  const existing = cacheStore.get(cacheKey) as CacheEntry<RadioStation[]> | undefined;
  if (!force && existing && existing.expiresAt > now) {
    return existing.data;
  }

  let lastErr = '';
  for (const mirror of RADIO_MIRRORS) {
    try {
      const apiUrl = `${mirror}/json/stations/search?countrycode=DE&hidebroken=true&order=votes&reverse=true&limit=450`;
      const res = await fetchWithTimeout(apiUrl, 9000);
      if (!res.ok) {
        lastErr = `HTTP ${res.status}`;
        continue;
      }
      const rawList = (await res.json()) as RadioBrowserRaw[];
      const seenStream = new Set<string>();
      const seenName = new Set<string>();
      const stations: RadioStation[] = [];

      for (const item of rawList) {
        const name = (item.name || '').trim();
        const streamRaw = (item.url_resolved || item.url || '').trim();
        if (!name || !streamRaw) continue;
        const validStream = validateExternalUrl(streamRaw);
        if (!validStream) continue;

        const normUrl = validStream.toString().toLowerCase();
        const normName = name.toLowerCase();
        if (seenStream.has(normUrl) || seenName.has(normName)) continue;
        seenStream.add(normUrl);
        seenName.add(normName);

        const tagsStr = item.tags || '';
        const tags = tagsStr
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 6);
        const cls = classifyRadioStation(name, tagsStr);
        const homepageValid = item.homepage ? validateExternalUrl(item.homepage)?.toString() : undefined;
        const faviconValid = item.favicon ? validateExternalUrl(item.favicon, true)?.toString() : undefined;

        stations.push({
          id: item.stationuuid || `rb_${stations.length}`,
          name,
          streamUrl: validStream.toString(),
          homepage: homepageValid || cls.officialUrl,
          favicon: faviconValid,
          country: item.country || 'Germany',
          state: item.state?.trim() || undefined,
          tags,
          codec: item.codec || undefined,
          bitrate: item.bitrate || undefined,
          votes: item.votes || 0,
          category: cls.category,
          isNational: cls.isNational,
          isLiveVerified: Boolean(validStream.toString()) && (item.lastcheckok === undefined || item.lastcheckok === 1),
        });
      }

      stations.sort((a, b) => {
        const pa = getFlagshipPriority(a.name);
        const pb = getFlagshipPriority(b.name);
        if (pa !== pb) return pa - pb;
        return (b.votes || 0) - (a.votes || 0);
      });

      cacheStore.set(cacheKey, {
        data: stations,
        fetchedAt: now,
        expiresAt: now + 10 * 60 * 1000,
      });

      updateHealth({
        id: 'radio_browser_de',
        name: 'Radio Browser Directory (DE)',
        type: 'radio',
        websiteUrl: 'https://www.radio-browser.info',
        feedUrl: `${mirror}/json/stations/search?countrycode=DE`,
        category: 'radio',
        status: 'ok',
        lastUpdated: new Date().toISOString(),
        itemCount: stations.length,
        enabled: true,
      });

      return stations;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : 'Network error';
    }
  }

  updateHealth({
    id: 'radio_browser_de',
    name: 'Radio Browser Directory (DE)',
    type: 'radio',
    websiteUrl: 'https://www.radio-browser.info',
    feedUrl: 'https://de1.api.radio-browser.info',
    category: 'radio',
    status: existing ? 'cached' : 'error',
    lastUpdated: existing ? new Date(existing.fetchedAt).toISOString() : undefined,
    lastError: lastErr || 'Radio directory unreachable',
    itemCount: existing?.data.length || 0,
    enabled: true,
  });

  if (existing) return existing.data;
  throw new Error(lastErr || 'Failed to fetch German radio stations');
}

// ---------------------------------------------------------------------------
// RSS / Atom Feed Parser for German News & Custom Feeds
// ---------------------------------------------------------------------------

function asRecordArray(val: unknown): Record<string, unknown>[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === 'object'));
  if (typeof val === 'object') return [val as Record<string, unknown>];
  return [];
}

function extractLinkFromEntry(entry: Record<string, unknown>): string {
  const rawLink = entry.link;
  if (typeof rawLink === 'string') return rawLink.trim();
  if (Array.isArray(rawLink)) {
    for (const l of rawLink) {
      if (typeof l === 'string') return l.trim();
      if (l && typeof l === 'object') {
        const rec = l as Record<string, unknown>;
        const rel = String(rec['@_rel'] || 'alternate');
        const href = String(rec['@_href'] || rec['#text'] || '').trim();
        if (href && (rel === 'alternate' || !rec['@_rel'])) return href;
      }
    }
  } else if (rawLink && typeof rawLink === 'object') {
    const rec = rawLink as Record<string, unknown>;
    return String(rec['@_href'] || rec['#text'] || '').trim();
  }
  return '';
}

function extractImageFromEntry(entry: Record<string, unknown>): string | undefined {
  const mediaContent = asRecordArray(entry['media:content']);
  for (const m of mediaContent) {
    const url = m['@_url'] ? String(m['@_url']) : '';
    const type = String(m['@_type'] || m['@_medium'] || '');
    if (url && (!type || type.includes('image'))) {
      const valid = validateExternalUrl(url, true);
      if (valid) return valid.toString();
    }
  }
  const mediaThumb = asRecordArray(entry['media:thumbnail']);
  for (const m of mediaThumb) {
    const url = m['@_url'] ? String(m['@_url']) : '';
    if (url) {
      const valid = validateExternalUrl(url, true);
      if (valid) return valid.toString();
    }
  }
  const enclosure = asRecordArray(entry.enclosure);
  for (const enc of enclosure) {
    const url = enc['@_url'] ? String(enc['@_url']) : '';
    const type = String(enc['@_type'] || '');
    if (url && type.startsWith('image/')) {
      const valid = validateExternalUrl(url, true);
      if (valid) return valid.toString();
    }
  }
  const descRaw = String(entry['content:encoded'] || entry.description || entry.summary || '');
  const imgMatch = descRaw.match(/<img[^>]+src=["'](https:\/\/[^"']+)["']/i);
  if (imgMatch?.[1]) {
    const valid = validateExternalUrl(imgMatch[1], true);
    if (valid) return valid.toString();
  }
  return undefined;
}

function extractAudioFromEntry(entry: Record<string, unknown>): string | undefined {
  const enclosures = asRecordArray(entry.enclosure);
  for (const enc of enclosures) {
    const url = enc['@_url'] ? String(enc['@_url']) : '';
    const type = String(enc['@_type'] || '');
    if (url && (type.startsWith('audio/') || /\.(mp3|m4a|ogg|aac)(\?|$)/i.test(url))) {
      const valid = validateExternalUrl(url);
      if (valid) return valid.toString();
    }
  }
  const links = asRecordArray(entry.link);
  for (const l of links) {
    if (l['@_rel'] === 'enclosure') {
      const url = String(l['@_href'] || '');
      const type = String(l['@_type'] || '');
      if (url && (type.startsWith('audio/') || /\.(mp3|m4a|ogg|aac)(\?|$)/i.test(url))) {
        const valid = validateExternalUrl(url);
        if (valid) return valid.toString();
      }
    }
  }
  return undefined;
}

async function fetchSingleNewsFeed(
  source: {
    id: string;
    name: string;
    rssUrl: string;
    websiteUrl: string;
    category: NewsCategory;
    accessType: 'free_rss' | 'excerpt_only' | 'simplified';
    cefrLevel?: NewsArticle['cefrLevel'];
  },
  force = false
): Promise<NewsArticle[]> {
  const cacheKey = `news_${source.id}`;
  const now = Date.now();
  const cached = cacheStore.get(cacheKey) as CacheEntry<NewsArticle[]> | undefined;
  if (!force && cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const res = await fetchWithTimeout(source.rssUrl, 7500);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = xmlParser.parse(xml) as Record<string, unknown>;

    let rawItems: Record<string, unknown>[] = [];
    if (parsed.rss && typeof parsed.rss === 'object') {
      const channel = (parsed.rss as Record<string, unknown>).channel as Record<string, unknown> | undefined;
      rawItems = asArray(channel?.item as Record<string, unknown>[]);
    } else if (parsed['rdf:RDF'] && typeof parsed['rdf:RDF'] === 'object') {
      rawItems = asArray((parsed['rdf:RDF'] as Record<string, unknown>).item as Record<string, unknown>[]);
    } else if (parsed.feed && typeof parsed.feed === 'object') {
      rawItems = asArray((parsed.feed as Record<string, unknown>).entry as Record<string, unknown>[]);
    }

    const articles: NewsArticle[] = [];
    for (const item of rawItems.slice(0, 20)) {
      const title = stripHtml(item.title);
      const linkRaw = extractLinkFromEntry(item);
      const validLink = validateExternalUrl(linkRaw);
      if (!title || !validLink) continue;

      const rawSummary =
        item.description || item.summary || item['content:encoded'] || item.content || '';
      const cleanSummary = stripHtml(rawSummary).slice(0, 460);
      const pubRaw = item.pubDate || item.published || item.updated || item['dc:date'];

      articles.push({
        id: `${source.id}_${Buffer.from(validLink.toString()).toString('base64url').slice(0, 20)}`,
        title,
        excerpt: cleanSummary || title,
        link: validLink.toString(),
        sourceId: source.id,
        sourceName: source.name,
        category: source.category,
        publishedAt: safeIsoDate(pubRaw),
        imageUrl: extractImageFromEntry(item),
        audioUrl: extractAudioFromEntry(item),
        isExcerpt: source.accessType === 'excerpt_only' || cleanSummary.length < 400,
        cefrLevel: source.cefrLevel,
      });
    }

    cacheStore.set(cacheKey, {
      data: articles,
      fetchedAt: now,
      expiresAt: now + 10 * 60 * 1000,
    });

    updateHealth({
      id: source.id,
      name: source.name,
      type: 'news',
      websiteUrl: source.websiteUrl,
      feedUrl: source.rssUrl,
      category: source.category,
      status: 'ok',
      lastUpdated: new Date().toISOString(),
      itemCount: articles.length,
      enabled: true,
    });

    return articles;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Feed fetch failed';
    updateHealth({
      id: source.id,
      name: source.name,
      type: 'news',
      websiteUrl: source.websiteUrl,
      feedUrl: source.rssUrl,
      category: source.category,
      status: cached ? 'cached' : 'error',
      lastUpdated: cached ? new Date(cached.fetchedAt).toISOString() : undefined,
      lastError: msg,
      itemCount: cached?.data.length || 0,
      enabled: true,
    });
    return cached?.data || [];
  }
}

async function fetchAllNews(force = false): Promise<NewsArticle[]> {
  const results = await Promise.all(NEWS_SOURCES.map((s) => fetchSingleNewsFeed(s, force)));
  const combined = results.flat();
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const deduped: NewsArticle[] = [];

  combined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  for (const art of combined) {
    const normLink = art.link.split('?')[0].toLowerCase();
    const normTitle = art.title.toLowerCase().trim();
    if (seenLinks.has(normLink) || seenTitles.has(normTitle)) continue;
    seenLinks.add(normLink);
    seenTitles.add(normTitle);
    deduped.push(art);
  }
  return deduped;
}

// ---------------------------------------------------------------------------
// YouTube Channel Feeds (Atom RSS + Optional Server YOUTUBE_API_KEY)
// ---------------------------------------------------------------------------

async function fetchYouTubeChannelVideos(
  channel: (typeof YOUTUBE_CHANNELS)[number],
  force = false
): Promise<YouTubeVideo[]> {
  const cacheKey = `yt_${channel.channelId}`;
  const now = Date.now();
  const cached = cacheStore.get(cacheKey) as CacheEntry<YouTubeVideo[]> | undefined;
  if (!force && cached && cached.expiresAt > now) {
    return cached.data;
  }

  const ytApiKey = process.env.YOUTUBE_API_KEY;
  try {
    if (ytApiKey && ytApiKey !== 'MY_YOUTUBE_API_KEY') {
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(
        channel.channelId
      )}&maxResults=8&order=date&type=video&key=${encodeURIComponent(ytApiKey)}`;
      const res = await fetchWithTimeout(apiUrl, 7000);
      if (res.ok) {
        const json = (await res.json()) as {
          items?: Array<{
            id?: { videoId?: string };
            snippet?: {
              title?: string;
              description?: string;
              publishedAt?: string;
              thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
            };
          }>;
        };
        const videos: YouTubeVideo[] = [];
        for (const item of json.items || []) {
          const videoId = item.id?.videoId;
          if (!videoId) continue;
          videos.push({
            id: `yt_${videoId}`,
            videoId,
            title: decodeHtmlEntities(item.snippet?.title || ''),
            description: decodeHtmlEntities(item.snippet?.description || ''),
            channelId: channel.channelId,
            channelName: channel.name,
            category: channel.category,
            publishedAt: safeIsoDate(item.snippet?.publishedAt),
            thumbnailUrl:
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
            embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`,
            cefrLevel: channel.cefrLevel,
          });
        }
        cacheStore.set(cacheKey, { data: videos, fetchedAt: now, expiresAt: now + 15 * 60 * 1000 });
        updateHealth({
          id: channel.id,
          name: channel.name,
          type: 'youtube',
          websiteUrl: channel.channelUrl,
          feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`,
          category: channel.category,
          status: 'ok',
          lastUpdated: new Date().toISOString(),
          itemCount: videos.length,
          enabled: true,
        });
        return videos;
      }
    }

    // Standard official public YouTube Atom feed (with 1 retry on transient burst 5xx/404)
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel.channelId)}`;
    let res = await fetchWithTimeout(feedUrl, 9000);
    if (!res.ok) {
      await new Promise((r) => setTimeout(r, 250));
      res = await fetchWithTimeout(feedUrl, 9000);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = xmlParser.parse(xml) as { feed?: { entry?: Record<string, unknown>[] } };
    const entries = asArray(parsed.feed?.entry);

    const videos: YouTubeVideo[] = [];
    for (const entry of entries.slice(0, 10)) {
      const videoId = String(entry['yt:videoId'] || '').trim();
      if (!videoId) continue;
      const mediaGroup = entry['media:group'] as Record<string, unknown> | undefined;
      const thumb = (mediaGroup?.['media:thumbnail'] as Record<string, unknown> | undefined)?.['@_url'];
      const desc = stripHtml(mediaGroup?.['media:description'] || '').slice(0, 320);

      videos.push({
        id: `yt_${videoId}`,
        videoId,
        title: stripHtml(entry.title),
        description: desc,
        channelId: channel.channelId,
        channelName: channel.name,
        category: channel.category,
        publishedAt: safeIsoDate(entry.published || entry.updated),
        thumbnailUrl: typeof thumb === 'string' && thumb ? thumb : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`,
        cefrLevel: channel.cefrLevel,
      });
    }

    cacheStore.set(cacheKey, {
      data: videos,
      fetchedAt: now,
      expiresAt: now + 15 * 60 * 1000,
    });
    updateHealth({
      id: channel.id,
      name: channel.name,
      type: 'youtube',
      websiteUrl: channel.channelUrl,
      feedUrl,
      category: channel.category,
      status: 'ok',
      lastUpdated: new Date().toISOString(),
      itemCount: videos.length,
      enabled: true,
    });
    return videos;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'YouTube feed failed';
    updateHealth({
      id: channel.id,
      name: channel.name,
      type: 'youtube',
      websiteUrl: channel.channelUrl,
      feedUrl: `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`,
      category: channel.category,
      status: cached ? 'cached' : 'error',
      lastUpdated: cached ? new Date(cached.fetchedAt).toISOString() : undefined,
      lastError: msg,
      itemCount: cached?.data.length || 0,
      enabled: true,
    });
    return cached?.data || [];
  }
}

async function runBatched<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkRes = await Promise.all(chunk.map(fn));
    results.push(...chunkRes);
  }
  return results;
}

async function fetchAllYouTubeVideos(force = false): Promise<YouTubeVideo[]> {
  const results = await runBatched(YOUTUBE_CHANNELS, 6, (c) => fetchYouTubeChannelVideos(c, force));
  const all = results.flat();
  all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return all;
}

// ---------------------------------------------------------------------------
// Podcast RSS Integration
// ---------------------------------------------------------------------------

function extractPodcastImage(channel: Record<string, unknown>): string | undefined {
  const itunesImg = channel['itunes:image'] as Record<string, unknown> | undefined;
  if (itunesImg?.['@_href']) {
    const valid = validateExternalUrl(String(itunesImg['@_href']), true);
    if (valid) return valid.toString();
  }
  const imgObj = channel.image as Record<string, unknown> | undefined;
  if (imgObj?.url) {
    const valid = validateExternalUrl(String(imgObj.url), true);
    if (valid) return valid.toString();
  }
  return undefined;
}

async function fetchPodcastShow(show: PodcastShowMeta, force = false): Promise<PodcastShowWithEpisodes> {
  const cacheKey = `pod_${show.id}`;
  const now = Date.now();
  const cached = cacheStore.get(cacheKey) as CacheEntry<PodcastShowWithEpisodes> | undefined;
  if (!force && cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    let res: Response;
    try {
      res = await fetchWithTimeout(show.rssUrl, 16000);
    } catch {
      await new Promise((r) => setTimeout(r, 250));
      res = await fetchWithTimeout(show.rssUrl, 16000);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawXml = await res.text();
    const cleanXml = rawXml.replace(/<\?[\s\S]*?\?>/g, '').trim();
    const parsed = xmlParser.parse(cleanXml) as { rss?: { channel?: Record<string, unknown> } };
    const channel = parsed.rss?.channel;
    if (!channel) throw new Error('Invalid podcast RSS structure');

    const coverUrl = extractPodcastImage(channel) || show.coverUrl;
    const rawItems = asArray(channel.item as Record<string, unknown>[]);
    const episodes: PodcastEpisode[] = [];

    for (const item of rawItems.slice(0, 18)) {
      const title = stripHtml(item.title);
      if (!title) continue;
      const audioUrl = extractAudioFromEntry(item);
      const linkRaw = extractLinkFromEntry(item) || show.websiteUrl;
      const validLink = validateExternalUrl(linkRaw)?.toString() || show.websiteUrl;
      const itemImg =
        ((item['itunes:image'] as Record<string, unknown> | undefined)?.['@_href'] as string | undefined) ||
        coverUrl;

      episodes.push({
        id: `${show.id}_${Buffer.from(audioUrl || validLink || title).toString('base64url').slice(0, 18)}`,
        showId: show.id,
        showTitle: show.title,
        title,
        description: stripHtml(item.description || item['itunes:summary'] || '').slice(0, 420),
        publishedAt: safeIsoDate(item.pubDate),
        duration: item['itunes:duration'] ? String(item['itunes:duration']) : undefined,
        audioUrl,
        hasAudio: Boolean(audioUrl),
        link: validLink,
        imageUrl: itemImg && validateExternalUrl(itemImg, true) ? itemImg : coverUrl,
      });
    }

    const result: PodcastShowWithEpisodes = {
      ...show,
      coverUrl,
      episodes,
      status: 'ok',
      lastUpdated: new Date().toISOString(),
    };

    cacheStore.set(cacheKey, {
      data: result,
      fetchedAt: now,
      expiresAt: now + 15 * 60 * 1000,
    });

    updateHealth({
      id: show.id,
      name: show.title,
      type: 'podcast',
      websiteUrl: show.websiteUrl,
      feedUrl: show.rssUrl,
      category: show.category,
      status: 'ok',
      lastUpdated: result.lastUpdated,
      itemCount: episodes.length,
      enabled: true,
    });

    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Podcast RSS failed';
    updateHealth({
      id: show.id,
      name: show.title,
      type: 'podcast',
      websiteUrl: show.websiteUrl,
      feedUrl: show.rssUrl,
      category: show.category,
      status: cached ? 'cached' : 'error',
      lastUpdated: cached ? new Date(cached.fetchedAt).toISOString() : undefined,
      lastError: msg,
      itemCount: cached?.data.episodes.length || 0,
      enabled: true,
    });
    if (cached) {
      return { ...cached.data, status: 'cached', lastError: msg };
    }
    return {
      ...show,
      episodes: [],
      status: 'error',
      lastError: msg,
    };
  }
}

// ---------------------------------------------------------------------------
// Express App & Routes
// ---------------------------------------------------------------------------

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  const SERVER_BUILD_ID = new Date().toISOString();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/version', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ name: 'DeutschFlow', buildId: SERVER_BUILD_ID });
  });

  app.get('/api/app-config', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ config: getPublicAppConfig() });
  });

  app.post('/api/suggestions', async (req, res) => {
    const body = (req.body || {}) as {
      title?: string;
      category?: string;
      message?: string;
      senderEmail?: string;
    };
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const senderEmail = typeof body.senderEmail === 'string' ? body.senderEmail.trim() : '';

    if (title.length < 3) {
      res.status(400).json({ error: 'يرجى إدخال عنوان واضح للاقتراح (3 أحرف على الأقل).' });
      return;
    }
    if (message.length < 10) {
      res.status(400).json({ error: 'يرجى كتابة وصف مفصل للاقتراح (10 أحرف على الأقل).' });
      return;
    }
    if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      res.status(400).json({ error: 'صيغة البريد الإلكتروني للرد غير صالحة.' });
      return;
    }

    const result = await submitDeveloperSuggestion({
      title,
      category: category || 'General',
      message,
      senderEmail: senderEmail || undefined,
    });
    res.json({
      ok: true,
      id: result.record.id,
      deliveredViaEmail: result.record.deliveredViaEmail,
      mailtoUrl: result.mailtoUrl,
      createdAt: result.record.createdAt,
    });
  });

  // Administrator Ownership & Protected Management Routes (strictly server-authorized)
  app.get('/api/admin/session', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const boot = getAdminBootStatus();
    const token = extractBearerToken(req);
    const verified = verifyAdminToken(token);
    if (!verified) {
      res.json({
        authenticated: false,
        isBootstrapped: boot.isBootstrapped,
        envPasscodeActive: boot.envPasscodeActive,
      });
      return;
    }
    res.json({
      authenticated: true,
      role: verified.role,
      email: verified.sub,
      isBootstrapped: boot.isBootstrapped,
      envPasscodeActive: boot.envPasscodeActive,
    });
  });

  app.post('/api/admin/bootstrap', (req, res) => {
    const body = (req.body || {}) as { email?: string; password?: string };
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const out = bootstrapAdminOwner(email, password);
    if (!out.ok) {
      res.status(out.status).json({ error: out.error });
      return;
    }
    res.json({ ok: true, role: 'admin', email: email.trim().toLowerCase(), token: out.token });
  });

  app.post('/api/admin/login', (req, res) => {
    const body = (req.body || {}) as { email?: string; password?: string };
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const out = authenticateAdminLogin(email, password);
    if (!out.ok) {
      res.status(out.status).json({ error: out.error });
      return;
    }
    res.json({ ok: true, role: 'admin', email: email.trim().toLowerCase(), token: out.token });
  });

  app.post('/api/admin/logout', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/admin/overview', requireAdminAuth, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      config: getPublicAppConfig(),
      suggestions: readSuggestions(),
      sourceHealth: Array.from(sourceHealthMap.values()),
      learningTelemetry: getLearningTelemetryStats(),
      errorReports: loadErrorReports(),
    });
  });

  app.post('/api/admin/learning-reports/:id/resolve', requireAdminAuth, (req, res) => {
    const updated = resolveLearningErrorReport(String(req.params.id || ''));
    if (!updated) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json({ ok: true, report: updated });
  });

  app.put('/api/admin/config', requireAdminAuth, (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const updated = updatePublicAppConfig(body);
    res.json({ ok: true, config: updated });
  });

  app.get('/api/sources', (_req, res) => {
    res.json({
      news: NEWS_SOURCES,
      youtube: YOUTUBE_CHANNELS,
      podcasts: PODCAST_SOURCES,
      platforms: STREAMING_PLATFORMS,
      health: Array.from(sourceHealthMap.values()),
    });
  });

  // Validate and fetch a personal custom RSS source added by the user
  app.post('/api/sources/validate', async (req, res) => {
    const { rssUrl, name } = (req.body || {}) as { rssUrl?: string; name?: string };
    if (!rssUrl || typeof rssUrl !== 'string') {
      res.status(400).json({ error: 'RSS URL is required' });
      return;
    }
    const valid = validateExternalUrl(rssUrl.trim(), true);
    if (!valid) {
      res.status(400).json({ error: 'Only public HTTPS feed URLs are allowed' });
      return;
    }
    try {
      const r = await fetchWithTimeout(valid.toString(), 6000);
      if (!r.ok) {
        res.status(400).json({ error: `Feed responded with HTTP ${r.status}` });
        return;
      }
      const xml = await r.text();
      const parsed = xmlParser.parse(xml) as Record<string, unknown>;
      const isRss = Boolean(parsed.rss || parsed.feed || parsed['rdf:RDF']);
      if (!isRss) {
        res.status(400).json({ error: 'URL did not return valid RSS/Atom XML' });
        return;
      }
      res.json({
        valid: true,
        name: name?.trim() || valid.hostname,
        rssUrl: valid.toString(),
      });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Could not reach RSS URL' });
    }
  });

  // Dynamic German Radio Browser Directory
  app.get('/api/radio/stations', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim().toLowerCase();
      const category = String(req.query.category || 'all') as RadioCategory;
      const state = String(req.query.state || '').trim().toLowerCase();
      const offset = Math.max(0, Number(req.query.offset || 0));
      const limit = Math.min(100, Math.max(12, Number(req.query.limit || 48)));
      const force = req.query.force === '1';

      const pool = await fetchGermanRadioPool(force);
      const statesSet = new Set<string>();
      for (const s of pool) {
        if (s.state) statesSet.add(s.state);
      }

      const filtered = pool.filter((s) => {
        if (category && category !== 'all') {
          if (category === 'national') {
            if (!s.isNational) return false;
          } else if (s.category !== category) {
            return false;
          }
        }
        if (state && (s.state || '').toLowerCase() !== state) {
          return false;
        }
        if (q) {
          const hay = `${s.name} ${s.state || ''} ${s.tags.join(' ')}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      const items = filtered.slice(offset, offset + limit);
      res.json({
        total: filtered.length,
        poolTotal: pool.length,
        offset,
        limit,
        states: Array.from(statesSet).sort(),
        stations: items,
        health: sourceHealthMap.get('radio_browser_de'),
      });
    } catch (e) {
      res.status(502).json({
        error: e instanceof Error ? e.message : 'Radio directory unavailable',
        stations: [],
      });
    }
  });

  // Newsroom & Newspapers RSS Aggregator
  app.get('/api/news', async (req, res) => {
    try {
      const force = req.query.force === '1';
      const category = String(req.query.category || 'all') as NewsCategory;
      const sourceId = String(req.query.source || '').trim();
      const q = String(req.query.q || '').trim().toLowerCase();

      const all = await fetchAllNews(force);
      const filtered = all.filter((a) => {
        if (category && category !== 'all' && a.category !== category) return false;
        if (sourceId && a.sourceId !== sourceId) return false;
        if (q) {
          const hay = `${a.title} ${a.excerpt} ${a.sourceName}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      res.json({
        total: filtered.length,
        articles: filtered,
        sources: NEWS_SOURCES,
        health: Array.from(sourceHealthMap.values()).filter((h) => h.type === 'news'),
        lastUpdated: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'News aggregation failed' });
    }
  });

  // Fetch custom RSS source articles safely
  app.post('/api/news/custom', async (req, res) => {
    const { sources } = (req.body || {}) as {
      sources?: Array<{ id: string; name: string; rssUrl: string; websiteUrl: string; category: NewsCategory }>;
    };
    if (!Array.isArray(sources)) {
      res.json({ articles: [] });
      return;
    }
    const validSources = sources
      .filter((s) => validateExternalUrl(s.rssUrl, true))
      .slice(0, 10);
    const results = await Promise.all(
      validSources.map((s) =>
        fetchSingleNewsFeed({ ...s, accessType: 'free_rss' }, false)
      )
    );
    res.json({ articles: results.flat() });
  });

  // YouTube Channels & Videos
  app.get('/api/youtube', async (req, res) => {
    try {
      const force = req.query.force === '1';
      const category = String(req.query.category || 'all');
      const channelId = String(req.query.channelId || '').trim();
      const q = String(req.query.q || '').trim().toLowerCase();

      const all = await fetchAllYouTubeVideos(force);
      const filtered = all.filter((v) => {
        if (category && category !== 'all' && v.category !== category) return false;
        if (channelId && v.channelId !== channelId) return false;
        if (q) {
          const hay = `${v.title} ${v.description} ${v.channelName}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      res.json({
        total: filtered.length,
        videos: filtered,
        channels: YOUTUBE_CHANNELS,
        usingYouTubeApi: Boolean(process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_API_KEY !== 'MY_YOUTUBE_API_KEY'),
        health: Array.from(sourceHealthMap.values()).filter((h) => h.type === 'youtube'),
        lastUpdated: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'YouTube feed aggregation failed' });
    }
  });

  // German Podcasts
  app.get('/api/podcasts', async (req, res) => {
    try {
      const force = req.query.force === '1';
      const category = String(req.query.category || 'all');
      const showId = String(req.query.showId || '').trim();

      const targetShows = PODCAST_SOURCES.filter((s) => {
        if (showId && s.id !== showId) return false;
        if (category && category !== 'all' && s.category !== category) return false;
        return true;
      });

      const shows = await runBatched(targetShows, 6, (s) => fetchPodcastShow(s, force));
      res.json({
        shows,
        catalog: PODCAST_SOURCES,
        health: Array.from(sourceHealthMap.values()).filter((h) => h.type === 'podcast'),
        lastUpdated: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : 'Podcast aggregation failed' });
    }
  });

  // Discover additional German podcasts from iTunes DE directory
  app.get('/api/podcasts/discover', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ results: [] });
      return;
    }
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&country=DE&media=podcast&limit=12`;
      const r = await fetchWithTimeout(url, 6000);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = (await r.json()) as {
        results?: Array<{
          collectionId?: number;
          collectionName?: string;
          artistName?: string;
          feedUrl?: string;
          collectionViewUrl?: string;
          artworkUrl600?: string;
          primaryGenreName?: string;
        }>;
      };
      const items = (json.results || [])
        .filter((x) => x.feedUrl && validateExternalUrl(x.feedUrl, true))
        .map((x) => ({
          id: `itunes_${x.collectionId}`,
          title: x.collectionName || 'Podcast',
          publisher: x.artistName || '',
          rssUrl: x.feedUrl!,
          websiteUrl: x.collectionViewUrl || x.feedUrl!,
          coverUrl: x.artworkUrl600,
          genre: x.primaryGenreName || 'Podcast',
        }));
      res.json({ results: items });
    } catch (e) {
      res.status(502).json({ error: e instanceof Error ? e.message : 'Podcast search unavailable', results: [] });
    }
  });

  // Load episodes for an arbitrary validated podcast RSS URL (from discovery)
  app.post('/api/podcasts/episodes', async (req, res) => {
    const { show } = (req.body || {}) as { show?: PodcastShowMeta };
    if (!show?.rssUrl || !validateExternalUrl(show.rssUrl, true)) {
      res.status(400).json({ error: 'Valid HTTPS podcast RSS URL required' });
      return;
    }
    const result = await fetchPodcastShow(show, false);
    res.json({ show: result });
  });

  // Movies & Series & Platforms directory
  app.get('/api/movies', (_req, res) => {
    res.json({
      platforms: STREAMING_PLATFORMS,
      titles: CURATED_GERMAN_TITLES,
    });
  });

  // Unified Search across Radio, News, YouTube, Podcasts, Movies & Platforms
  app.get('/api/search', async (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    if (!q) {
      res.json({ radio: [], news: [], videos: [], podcasts: [], episodes: [], movies: [], platforms: [] });
      return;
    }

    const [radioPool, newsPool, ytPool] = await Promise.all([
      fetchGermanRadioPool(false).catch(() => [] as RadioStation[]),
      fetchAllNews(false).catch(() => [] as NewsArticle[]),
      fetchAllYouTubeVideos(false).catch(() => [] as YouTubeVideo[]),
    ]);

    const radio = radioPool
      .filter((s) => `${s.name} ${s.state || ''} ${s.tags.join(' ')}`.toLowerCase().includes(q))
      .slice(0, 18);
    const news = newsPool
      .filter((a) => `${a.title} ${a.excerpt} ${a.sourceName}`.toLowerCase().includes(q))
      .slice(0, 20);
    const videos = ytPool
      .filter((v) => `${v.title} ${v.description} ${v.channelName}`.toLowerCase().includes(q))
      .slice(0, 20);

    const podcasts = PODCAST_SOURCES.filter((p) =>
      `${p.title} ${p.publisher} ${p.descriptionDe} ${p.descriptionAr}`.toLowerCase().includes(q)
    );

    const cachedEpisodes: PodcastEpisode[] = [];
    for (const p of PODCAST_SOURCES) {
      const cached = cacheStore.get(`pod_${p.id}`) as CacheEntry<PodcastShowWithEpisodes> | undefined;
      if (cached?.data?.episodes) {
        for (const ep of cached.data.episodes) {
          if (`${ep.title} ${ep.description} ${ep.showTitle}`.toLowerCase().includes(q)) {
            cachedEpisodes.push(ep);
          }
        }
      }
    }

    const movies = CURATED_GERMAN_TITLES.filter((m) =>
      `${m.title} ${m.genre} ${m.descriptionDe} ${m.descriptionAr} ${m.platformName}`.toLowerCase().includes(q)
    );
    const platforms = STREAMING_PLATFORMS.filter((pl) =>
      `${pl.name} ${pl.descriptionDe} ${pl.descriptionAr} ${pl.highlights.join(' ')}`.toLowerCase().includes(q)
    );

    res.json({
      radio,
      news,
      videos,
      podcasts,
      episodes: cachedEpisodes.slice(0, 15),
      movies,
      platforms,
    });
  });

  // On-demand multi-source German -> Arabic/English dictionary (context-aware, always JSON)
  const handleDictionaryLookup = async (req: express.Request, res: express.Response) => {
    try {
      const body = (req.body || {}) as { text?: string; sentence?: string; target?: string };
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      const sentence = typeof body.sentence === 'string' ? body.sentence.trim() : '';
      const target: 'ar' | 'en' = body.target === 'en' ? 'en' : 'ar';

      if (!text) {
        res.status(400).json({ error: 'يرجى تحديد كلمة ألمانية للبحث عنها في المعجم.' });
        return;
      }

      const result = await lookupGermanDictionary({ text, sentence, target });
      if (result) {
        res.json(result);
        return;
      }

      res.status(404).json({
        error: 'تعذر العثور على ترجمة فورية لهذه الكلمة حالياً. يمكنك كتابة الترجمة يدوياً وحفظها.',
      });
    } catch {
      res.status(500).json({
        error: 'حدث خطأ غير متوقع في المعجم. يمكنك كتابة الترجمة يدوياً وحفظها.',
      });
    }
  };

  app.post('/api/translate', handleDictionaryLookup);
  app.post('/api/dictionary', handleDictionaryLookup);

  // -------------------------------------------------------------------------
  // DeutschFlow 2.0 — Learner Profile, Missions, Vocabulary SRS, CEFR & Engine
  // -------------------------------------------------------------------------
  const getValidatedProfileId = (req: express.Request): string | null => {
    const fromHeader = req.headers['x-deutschflow-profile'];
    const raw = Array.isArray(fromHeader) ? fromHeader[0] : fromHeader;
    return validateProfileId(raw || (req.query.profileId ? String(req.query.profileId) : null));
  };

  app.get('/api/learning/profile', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const tz = req.query.tz ? String(req.query.tz) : undefined;
    const weekKey = req.query.weekKey ? String(req.query.weekKey) : undefined;
    const profile = getOrCreateProfile(profileId, tz);
    const weekly = buildWeeklyReport(profile, weekKey);
    res.json({ profile, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.patch('/api/learning/profile', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const body = (req.body || {}) as {
      dailyGoalMinutes?: number;
      weeklyGoalMinutes?: number;
      cefrLevel?: CEFRLevel;
      timezone?: string;
      vocabCollectionUpdate?: { vocabId: string; collections: string[]; note?: string };
      deleteVocabId?: string;
    };
    const profile = updateProfilePreferences(profileId, body);
    const weekly = buildWeeklyReport(profile);
    res.json({ profile, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.post('/api/learning/sync-restore', (req, res) => {
    const body = (req.body || {}) as { syncCode?: string };
    const code = typeof body.syncCode === 'string' ? body.syncCode.trim() : '';
    if (!code || code.length < 6) {
      res.status(400).json({ error: 'يرجى إدخال رمز المزامنة الصحيح (مثال: DF-XXXX-XXXX).' });
      return;
    }
    const profile = resolveProfileBySyncCode(code);
    if (!profile) {
      res.status(404).json({ error: 'لم يتم العثور على ملف متعلّم مطابق لرمز المزامنة هذا.' });
      return;
    }
    const weekly = buildWeeklyReport(profile);
    res.json({ profile, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.post('/api/learning/activity', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const body = (req.body || {}) as {
      type?: LearningActivityType;
      timezone?: string;
      durationSeconds?: number;
      scorePct?: number;
      cefrLevel?: CEFRLevel;
      skill?: 'reading' | 'listening' | 'vocabulary' | 'grammar' | 'writing';
      sourceId?: string;
      sourceTitle?: string;
      articleCompleted?: boolean;
    };
    if (!body.type) {
      res.status(400).json({ error: 'Activity type is required.' });
      return;
    }
    const out = recordLearnerActivity(profileId, { ...body, type: body.type });
    const weekly = buildWeeklyReport(out.profile);
    res.json({ ...out, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.post('/api/learning/missions/vocab-complete', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const body = (req.body || {}) as {
      timezone?: string;
      savedWordsCount?: number;
      quizPassed?: boolean;
    };
    const out = completeDailyVocabMission(profileId, {
      timezone: body.timezone,
      savedWordsCount: Number(body.savedWordsCount || 0),
      quizPassed: Boolean(body.quizPassed),
    });
    const weekly = buildWeeklyReport(out.profile);
    res.json({ ...out, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.post('/api/learning/vocabulary/upsert', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const body = (req.body || {}) as {
      items?: Array<Partial<VocabItem> & { word: string }>;
      timezone?: string;
    };
    if (!Array.isArray(body.items) || body.items.length === 0) {
      res.status(400).json({ error: 'Vocabulary items array is required.' });
      return;
    }
    const out = upsertVocabularyItems(profileId, body.items.slice(0, 200), body.timezone);
    const weekly = buildWeeklyReport(out.profile);
    res.json({ ...out, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.post('/api/learning/vocabulary/review', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const body = (req.body || {}) as { vocabId?: string; rating?: VocabReviewRating; timezone?: string };
    const rating = body.rating;
    if (!body.vocabId || !rating || !['again', 'hard', 'good', 'easy'].includes(rating)) {
      res.status(400).json({ error: 'Valid vocabId and rating (again|hard|good|easy) are required.' });
      return;
    }
    const out = reviewVocabWithSM2(profileId, body.vocabId, rating, body.timezone);
    if (!out.updatedItem) {
      res.status(404).json({ error: 'Vocabulary entry not found in profile.' });
      return;
    }
    const weekly = buildWeeklyReport(out.profile);
    res.json({ ...out, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.post('/api/learning/mistakes', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const body = (req.body || {}) as {
      mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
      timezone?: string;
    };
    const profile = recordMistakesBatch(profileId, Array.isArray(body.mistakes) ? body.mistakes : [], body.timezone);
    const weekly = buildWeeklyReport(profile);
    res.json({ profile, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.get('/api/learning/curriculum', (_req, res) => {
    res.json({
      units: CEFR_CURRICULUM_UNITS,
      grammarLibrary: GRAMMAR_LIBRARY,
      importantSentences: IMPORTANT_SENTENCES_LIBRARY,
      placementQuestions: PLACEMENT_QUESTIONS,
    });
  });

  app.post('/api/learning/curriculum/complete', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const body = (req.body || {}) as {
      kind?: 'lesson' | 'unit';
      targetId?: string;
      scorePct?: number;
      cefrLevel?: CEFRLevel;
      mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
      timezone?: string;
    };
    if (!body.kind || !body.targetId || typeof body.scorePct !== 'number' || !body.cefrLevel) {
      res.status(400).json({ error: 'kind, targetId, scorePct, and cefrLevel are required.' });
      return;
    }
    const out = completeCurriculumLessonOrUnit(profileId, {
      kind: body.kind,
      targetId: body.targetId,
      scorePct: Math.max(0, Math.min(100, Math.round(body.scorePct))),
      cefrLevel: body.cefrLevel,
      mistakes: body.mistakes,
      timezone: body.timezone,
    });
    const weekly = buildWeeklyReport(out.profile);
    res.json({ ...out, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.post('/api/learning/placement/submit', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const body = (req.body || {}) as {
      answers?: Array<{ questionId: string; selectedIndex: number }>;
      timezone?: string;
    };
    if (!Array.isArray(body.answers) || body.answers.length === 0) {
      res.status(400).json({ error: 'Answers array is required.' });
      return;
    }
    const out = submitPlacementAssessment(profileId, body.answers, body.timezone);
    const weekly = buildWeeklyReport(out.profile);
    res.json({ ...out, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.get('/api/learning/weekly-report', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const tz = req.query.tz ? String(req.query.tz) : undefined;
    const weekKey = req.query.weekKey ? String(req.query.weekKey) : undefined;
    const profile = getOrCreateProfile(profileId, tz);
    const out = buildWeeklyReport(profile, weekKey);
    res.json(out);
  });

  app.post('/api/learning-engine/generate', async (req, res) => {
    const rateKey = getValidatedProfileId(req) || req.ip || 'anon';
    const body = (req.body || {}) as Partial<LearningContentInput>;
    if (!body.title && !body.text) {
      res.status(400).json({ error: 'يرجى تحديد عنوان أو نص المحتوى لتحويله إلى درس.' });
      return;
    }
    const input: LearningContentInput = {
      sourceId: String(body.sourceId || `manual_${Date.now()}`),
      contentType: body.contentType || 'article',
      title: String(body.title || ''),
      text: String(body.text || ''),
      sourceName: String(body.sourceName || 'DeutschFlow'),
      sourceUrl: body.sourceUrl ? String(body.sourceUrl) : undefined,
      audioUrl: body.audioUrl ? String(body.audioUrl) : undefined,
      videoId: body.videoId ? String(body.videoId) : undefined,
      difficulty:
        body.difficulty === 'simplified' || body.difficulty === 'advanced'
          ? body.difficulty
          : 'original',
      targetCefr: body.targetCefr,
    };
    const result = await generateLearningLesson(input, rateKey);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ lesson: result.lesson });
  });

  app.post('/api/learning-engine/analyze-sentence', async (req, res) => {
    const rateKey = getValidatedProfileId(req) || req.ip || 'anon';
    const body = (req.body || {}) as { sentenceDe?: string };
    const result = await analyzeGermanSentence(String(body.sentenceDe || ''), rateKey);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ analysis: result.analysis });
  });

  app.post('/api/learning-engine/evaluate-writing', async (req, res) => {
    const rateKey = getValidatedProfileId(req) || req.ip || 'anon';
    const body = (req.body || {}) as {
      promptDe?: string;
      userText?: string;
      targetWords?: string[];
      cefrLevel?: CEFRLevel;
    };
    const result = await evaluateWritingPractice({
      promptDe: String(body.promptDe || ''),
      userText: String(body.userText || ''),
      targetWords: Array.isArray(body.targetWords) ? body.targetWords.map(String) : [],
      cefrLevel: body.cefrLevel || 'B1',
      rateKey,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({ evaluation: result.evaluation });
  });

  app.post('/api/learning-engine/complete', (req, res) => {
    const profileId = getValidatedProfileId(req);
    if (!profileId) {
      res.status(400).json({ error: 'Valid X-DeutschFlow-Profile ID header is required.' });
      return;
    }
    const body = (req.body || {}) as {
      lessonId?: string;
      sourceTitle?: string;
      cefrLevel?: CEFRLevel;
      quizScorePct?: number;
      mistakes?: Array<Omit<UserMistake, 'id' | 'count' | 'lastSeenAt'>>;
      timezone?: string;
    };
    if (!body.lessonId || !body.sourceTitle) {
      res.status(400).json({ error: 'lessonId and sourceTitle are required.' });
      return;
    }
    const out = completeLearningEngineCourse(profileId, {
      lessonId: body.lessonId,
      sourceTitle: body.sourceTitle,
      cefrLevel: body.cefrLevel,
      quizScorePct: Number(body.quizScorePct || 0),
      mistakes: body.mistakes,
      timezone: body.timezone,
    });
    const weekly = buildWeeklyReport(out.profile);
    res.json({ ...out, weeklyReport: weekly.report, availableWeeks: weekly.availableWeeks });
  });

  app.post('/api/learning-engine/report-error', (req, res) => {
    const body = (req.body || {}) as {
      lessonId?: string;
      sourceTitle?: string;
      section?: string;
      message?: string;
    };
    if (!body.message || body.message.trim().length < 4) {
      res.status(400).json({ error: 'يرجى كتابة وصف واضح للخطأ التعليمي.' });
      return;
    }
    const report = addLearningErrorReport({
      lessonId: String(body.lessonId || 'unknown'),
      sourceTitle: String(body.sourceTitle || 'DeutschFlow Lesson'),
      section: String(body.section || 'general'),
      message: String(body.message),
    });
    res.json({ ok: true, report });
  });

  // Guarantee /api/* requests NEVER fall through to Vite or SPA HTML index fallback
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  // Express error middleware returning strict JSON for API routes
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      res.status(500).json({ error: msg });
      return;
    }
    next(err);
  });

  // Vite dev middleware vs static production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DeutschFlow server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DeutschFlow server:', err);
  process.exit(1);
});
