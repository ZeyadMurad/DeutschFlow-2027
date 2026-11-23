import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type express from 'express';

const DESIGNATED_OWNER_EMAIL = 'zeadmorud2030@gmail.com';
const DEVELOPER_SUGGESTIONS_EMAIL = 'zeyad.ali.murad2@gmail.com';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const ADMIN_STORE_PATH = path.join(DATA_DIR, 'deutschflow-admin.json');
const SUGGESTIONS_STORE_PATH = path.join(DATA_DIR, 'suggestions.json');

// Ephemeral fallback signing key when ADMIN_SESSION_SECRET env is unset
const EPHEMERAL_SIGNING_KEY = crypto.randomBytes(32).toString('hex');

export interface PublicAppConfig {
  heroTitleAr: string;
  heroTitleDe: string;
  heroTitleEn: string;
  heroSubtitleAr: string;
  heroSubtitleDe: string;
  heroSubtitleEn: string;
  landingHeadlineAr: string;
  landingHeadlineDe: string;
  landingHeadlineEn: string;
  announcementAr: string;
  announcementDe: string;
  announcementEn: string;
  hiddenModuleIds: string[];
  updatedAt: string;
}

export const DEFAULT_PUBLIC_APP_CONFIG: PublicAppConfig = {
  heroTitleAr: 'عالمك الألماني الشخصي',
  heroTitleDe: 'Dein persönliches deutsches Medienuniversum',
  heroTitleEn: 'Your German Media Universe',
  heroSubtitleAr: 'اكتشف، تعلم واستمتع بمحتوى مميز لتطوير لغتك الألمانية',
  heroSubtitleDe: 'Entdecke Live-Radio, Nachrichten, Videos, Podcasts & interaktives Lesen',
  heroSubtitleEn: 'Discover, listen, watch, read, and master German daily in one hub',
  landingHeadlineAr:
    'مركزك الإعلامي الألماني المتكامل لتعلم اللغة الألمانية يومياً عبر المصادر الحية: مئات الإذاعات، غرف الأخبار والصحف، German Studio، الوثائقيات، البودكاست، القراءة التفاعلية، والمعجم السياقي مع بطاقات المراجعة.',
  landingHeadlineDe:
    'Dein persönliches deutsches Medien- und Lernzentrum: Hunderte Live-Radiosender, Nachrichtenredaktionen, Zeitungen, German Studio, Dokumentationen, Podcasts, Leseraum mit Kontextwörterbuch und Lernkarten.',
  landingHeadlineEn:
    'Your personal German media and language immersion center: hundreds of live German radio stations, newsrooms, German Studio, documentaries, podcasts, interactive reading with contextual dictionary, and flashcards.',
  announcementAr: '',
  announcementDe: '',
  announcementEn: '',
  hiddenModuleIds: [],
  updatedAt: new Date(0).toISOString(),
};

interface AdminPersistedStore {
  ownerEmail: string;
  passwordHash?: string;
  passwordSalt?: string;
  config: PublicAppConfig;
}

export interface SuggestionRecord {
  id: string;
  title: string;
  category: string;
  message: string;
  senderEmail?: string;
  deliveredViaEmail: boolean;
  createdAt: string;
}

let inMemoryAdminStore: AdminPersistedStore | null = null;
let inMemorySuggestions: SuggestionRecord[] = [];

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function readAdminStore(): AdminPersistedStore {
  if (inMemoryAdminStore) return inMemoryAdminStore;
  try {
    if (fs.existsSync(ADMIN_STORE_PATH)) {
      const raw = fs.readFileSync(ADMIN_STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AdminPersistedStore>;
      inMemoryAdminStore = {
        ownerEmail: DESIGNATED_OWNER_EMAIL,
        passwordHash: typeof parsed.passwordHash === 'string' ? parsed.passwordHash : undefined,
        passwordSalt: typeof parsed.passwordSalt === 'string' ? parsed.passwordSalt : undefined,
        config: {
          ...DEFAULT_PUBLIC_APP_CONFIG,
          ...(parsed.config || {}),
          hiddenModuleIds: Array.isArray(parsed.config?.hiddenModuleIds)
            ? parsed.config.hiddenModuleIds.filter((x): x is string => typeof x === 'string')
            : [],
        },
      };
      return inMemoryAdminStore;
    }
  } catch {
    // Fall back to defaults cleanly
  }
  inMemoryAdminStore = {
    ownerEmail: DESIGNATED_OWNER_EMAIL,
    config: { ...DEFAULT_PUBLIC_APP_CONFIG },
  };
  return inMemoryAdminStore;
}

function writeAdminStore(store: AdminPersistedStore): void {
  inMemoryAdminStore = store;
  try {
    ensureDataDir();
    fs.writeFileSync(ADMIN_STORE_PATH, JSON.stringify(store, null, 2), { mode: 0o600 });
  } catch {
    // Keep operating cleanly via in-memory store if FS is read-only
  }
}

function hashPassword(password: string, saltHex: string): string {
  return crypto.scryptSync(password, saltHex, 64).toString('hex');
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const aBuf = Buffer.from(aHex, 'hex');
  const bBuf = Buffer.from(bHex, 'hex');
  if (aBuf.length === 0 || aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function getSigningSecret(): string {
  const envSecret = process.env.ADMIN_SESSION_SECRET;
  if (envSecret && envSecret.trim().length >= 16) return envSecret.trim();
  return EPHEMERAL_SIGNING_KEY;
}

interface AdminTokenPayload {
  sub: string;
  role: 'admin';
  iat: number;
  exp: number;
}

export function signAdminToken(email: string): string {
  const payload: AdminTokenPayload = {
    sub: email.toLowerCase(),
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

export function verifyAdminToken(token: string | undefined | null): AdminTokenPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSigB64 = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadB64)
    .digest('base64url');

  const sigBuf = Buffer.from(sigB64);
  const expBuf = Buffer.from(expectedSigB64);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as AdminTokenPayload;
    if (
      parsed.role !== 'admin' ||
      parsed.sub !== DESIGNATED_OWNER_EMAIL ||
      typeof parsed.exp !== 'number' ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function extractBearerToken(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string') return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function requireAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const token = extractBearerToken(req);
  const verified = verifyAdminToken(token);
  if (!verified) {
    res.status(401).json({
      error: 'Administrator authorization required. Only the verified application owner may access this endpoint.',
    });
    return;
  }
  next();
}

export function getAdminBootStatus(): {
  isBootstrapped: boolean;
  envPasscodeActive: boolean;
} {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  const store = readAdminStore();
  return {
    isBootstrapped: Boolean(envPass) || Boolean(store.passwordHash && store.passwordSalt),
    envPasscodeActive: Boolean(envPass),
  };
}

export function bootstrapAdminOwner(email: string, password: string): {
  ok: boolean;
  status: number;
  error?: string;
  token?: string;
} {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== DESIGNATED_OWNER_EMAIL) {
    return {
      ok: false,
      status: 403,
      error: 'Only the designated DeutschFlow owner account may be provisioned as administrator.',
    };
  }
  const boot = getAdminBootStatus();
  if (boot.isBootstrapped) {
    return {
      ok: false,
      status: 403,
      error: 'Owner administrator account is already provisioned. Please sign in with your password.',
    };
  }
  if (typeof password !== 'string' || password.length < 8) {
    return {
      ok: false,
      status: 400,
      error: 'Administrator password must be at least 8 characters long.',
    };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);
  const store = readAdminStore();
  writeAdminStore({
    ...store,
    ownerEmail: DESIGNATED_OWNER_EMAIL,
    passwordSalt: salt,
    passwordHash: hash,
  });

  return {
    ok: true,
    status: 200,
    token: signAdminToken(DESIGNATED_OWNER_EMAIL),
  };
}

export function authenticateAdminLogin(email: string, password: string): {
  ok: boolean;
  status: number;
  error?: string;
  token?: string;
} {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail !== DESIGNATED_OWNER_EMAIL) {
    return {
      ok: false,
      status: 403,
      error: 'Access denied: this account does not hold administrator privileges.',
    };
  }
  if (!password || typeof password !== 'string') {
    return { ok: false, status: 400, error: 'Password is required.' };
  }

  // Server-side env ADMIN_PASSCODE always takes precedence when configured
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (envPass) {
    const salt = 'df-env-check';
    const submittedHash = hashPassword(password, salt);
    const expectedHash = hashPassword(envPass, salt);
    if (!timingSafeEqualHex(submittedHash, expectedHash)) {
      return { ok: false, status: 401, error: 'Invalid administrator credentials.' };
    }
    return { ok: true, status: 200, token: signAdminToken(DESIGNATED_OWNER_EMAIL) };
  }

  const store = readAdminStore();
  if (!store.passwordHash || !store.passwordSalt) {
    return {
      ok: false,
      status: 409,
      error: 'Owner administrator account has not been claimed yet. Complete first-run owner setup.',
    };
  }

  const candidateHash = hashPassword(password, store.passwordSalt);
  if (!timingSafeEqualHex(candidateHash, store.passwordHash)) {
    return { ok: false, status: 401, error: 'Invalid administrator credentials.' };
  }

  return { ok: true, status: 200, token: signAdminToken(DESIGNATED_OWNER_EMAIL) };
}

export function getPublicAppConfig(): PublicAppConfig {
  return readAdminStore().config;
}

export function updatePublicAppConfig(patch: Partial<PublicAppConfig>): PublicAppConfig {
  const store = readAdminStore();
  const cleanStr = (val: unknown, fallback: string, maxLen = 500) =>
    typeof val === 'string' ? val.trim().slice(0, maxLen) : fallback;

  const allowedSectionIds = new Set([
    'radio',
    'news',
    'newspapers',
    'youtube',
    'documentaries',
    'podcasts',
    'movies',
    'learning',
    'reading',
    'culture',
    'science',
    'kids',
    'favorites',
    'library',
  ]);

  const nextHidden = Array.isArray(patch.hiddenModuleIds)
    ? patch.hiddenModuleIds.filter((id): id is string => typeof id === 'string' && allowedSectionIds.has(id))
    : store.config.hiddenModuleIds;

  const nextConfig: PublicAppConfig = {
    heroTitleAr: cleanStr(patch.heroTitleAr, store.config.heroTitleAr, 140) || DEFAULT_PUBLIC_APP_CONFIG.heroTitleAr,
    heroTitleDe: cleanStr(patch.heroTitleDe, store.config.heroTitleDe, 140) || DEFAULT_PUBLIC_APP_CONFIG.heroTitleDe,
    heroTitleEn: cleanStr(patch.heroTitleEn, store.config.heroTitleEn, 140) || DEFAULT_PUBLIC_APP_CONFIG.heroTitleEn,
    heroSubtitleAr: cleanStr(patch.heroSubtitleAr, store.config.heroSubtitleAr, 240) || DEFAULT_PUBLIC_APP_CONFIG.heroSubtitleAr,
    heroSubtitleDe: cleanStr(patch.heroSubtitleDe, store.config.heroSubtitleDe, 240) || DEFAULT_PUBLIC_APP_CONFIG.heroSubtitleDe,
    heroSubtitleEn: cleanStr(patch.heroSubtitleEn, store.config.heroSubtitleEn, 240) || DEFAULT_PUBLIC_APP_CONFIG.heroSubtitleEn,
    landingHeadlineAr: cleanStr(patch.landingHeadlineAr, store.config.landingHeadlineAr, 480) || DEFAULT_PUBLIC_APP_CONFIG.landingHeadlineAr,
    landingHeadlineDe: cleanStr(patch.landingHeadlineDe, store.config.landingHeadlineDe, 480) || DEFAULT_PUBLIC_APP_CONFIG.landingHeadlineDe,
    landingHeadlineEn: cleanStr(patch.landingHeadlineEn, store.config.landingHeadlineEn, 480) || DEFAULT_PUBLIC_APP_CONFIG.landingHeadlineEn,
    announcementAr: cleanStr(patch.announcementAr, store.config.announcementAr, 260),
    announcementDe: cleanStr(patch.announcementDe, store.config.announcementDe, 260),
    announcementEn: cleanStr(patch.announcementEn, store.config.announcementEn, 260),
    hiddenModuleIds: nextHidden,
    updatedAt: new Date().toISOString(),
  };

  writeAdminStore({ ...store, config: nextConfig });
  return nextConfig;
}

export function readSuggestions(): SuggestionRecord[] {
  if (inMemorySuggestions.length > 0) return inMemorySuggestions;
  try {
    if (fs.existsSync(SUGGESTIONS_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SUGGESTIONS_STORE_PATH, 'utf8'));
      if (Array.isArray(parsed)) {
        inMemorySuggestions = parsed as SuggestionRecord[];
        return inMemorySuggestions;
      }
    }
  } catch {
    // Ignore read failure cleanly
  }
  return inMemorySuggestions;
}

function saveSuggestionRecord(record: SuggestionRecord): void {
  const existing = readSuggestions();
  inMemorySuggestions = [record, ...existing].slice(0, 200);
  try {
    ensureDataDir();
    fs.writeFileSync(SUGGESTIONS_STORE_PATH, JSON.stringify(inMemorySuggestions, null, 2), { mode: 0o600 });
  } catch {
    // Keep in-memory backup if FS is read-only
  }
}

export async function submitDeveloperSuggestion(params: {
  title: string;
  category: string;
  message: string;
  senderEmail?: string;
}): Promise<{
  record: SuggestionRecord;
  mailtoUrl: string;
}> {
  const title = params.title.trim().slice(0, 140);
  const category = params.category.trim().slice(0, 60) || 'General';
  const message = params.message.trim().slice(0, 2500);
  const senderEmail = params.senderEmail?.trim().slice(0, 140) || undefined;

  let deliveredViaEmail = false;
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.SUGGESTIONS_FROM_EMAIL?.trim() || 'DeutschFlow <onboarding@resend.dev>',
          to: [DEVELOPER_SUGGESTIONS_EMAIL],
          reply_to: senderEmail || undefined,
          subject: `[DeutschFlow Suggestion - ${category}] ${title}`,
          text: `Category: ${category}\nTitle: ${title}\nReply-To: ${senderEmail || 'Not provided'}\n\nMessage:\n${message}`,
        }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        deliveredViaEmail = true;
      }
    } catch {
      deliveredViaEmail = false;
    }
  }

  const record: SuggestionRecord = {
    id: `sug_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    title,
    category,
    message,
    senderEmail,
    deliveredViaEmail,
    createdAt: new Date().toISOString(),
  };

  saveSuggestionRecord(record);

  const mailSubject = encodeURIComponent(`[DeutschFlow Suggestion: ${category}] ${title}`);
  const mailBody = encodeURIComponent(
    `Category: ${category}\nTitle: ${title}\n${senderEmail ? `From: ${senderEmail}\n` : ''}\n${message}`
  );
  const mailtoUrl = `mailto:${DEVELOPER_SUGGESTIONS_EMAIL}?subject=${mailSubject}&body=${mailBody}`;

  return { record, mailtoUrl };
}
