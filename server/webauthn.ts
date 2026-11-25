// DeutschFlow — WebAuthn fingerprint authentication (Passkeys).
// Enables the landing-page fingerprint login: first visit registers the
// user's device biometric, later visits re-recognise it and unlock the app.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type express from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const WEBAUTHN_STORE_PATH = path.join(DATA_DIR, 'deutschflow-webauthn.json');
const CHALLENGE_TTL_MS = 3 * 60 * 1000; // challenge valid for 3 minutes
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // sessions valid for 30 days
const MAX_CREDENTIALS_PER_USER = 5;

// Ephemeral fallback signing key when AUTH_SESSION_SECRET env is unset
const EPHEMERAL_SIGNING_KEY = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  const envSecret = process.env.AUTH_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (envSecret && envSecret.trim().length >= 16) return envSecret.trim();
  return EPHEMERAL_SIGNING_KEY;
}

// ---------------------------------------------------------------------------
// Persistent store — biometric identity must survive server restarts,
// otherwise "recognise my fingerprint next time" breaks on every redeploy.
// ---------------------------------------------------------------------------

interface PendingChallenge {
  challenge: string;
  createdAt: number;
  purpose: 'register' | 'auth';
}

interface AuthChallenge extends PendingChallenge {
  allowed?: string[];
}

interface StoredCredential {
  id: string;
  // publicKey persisted as base64 so it survives JSON round-trips across restarts
  publicKey: Uint8Array;
  publicKeyB64?: string;
  counter: number;
  transports?: string[];
  deviceName?: string;
  registeredAt: string;
  lastUsedAt?: string;
}

interface WebAuthnStore {
  users: Record<
    string,
    {
      credentials: StoredCredential[];
      createdAt: string;
      displayName: string;
    }
  >;
}

interface ChallengeStore {
  register: Record<string, PendingChallenge>;
  auth: Record<string, AuthChallenge>;
}

// In-memory caches over the on-disk store (same pattern as admin.ts)
let inMemoryStore: WebAuthnStore | null = null;
let inMemoryChallenges: ChallengeStore = { register: {}, auth: {} };

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function reviveCredential(raw: unknown): StoredCredential | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== 'string') return null;
  const b64 =
    typeof c.publicKeyB64 === 'string'
      ? c.publicKeyB64
      : c.publicKey instanceof Uint8Array
        ? Buffer.from(c.publicKey as Uint8Array).toString('base64')
        : '';
  if (!b64) return null;
  return {
    id: c.id,
    publicKey: new Uint8Array(Buffer.from(b64, 'base64')),
    publicKeyB64: b64,
    counter: typeof c.counter === 'number' ? c.counter : 0,
    transports: Array.isArray(c.transports) ? (c.transports as string[]) : [],
    deviceName: typeof c.deviceName === 'string' ? c.deviceName : undefined,
    registeredAt: typeof c.registeredAt === 'string' ? c.registeredAt : new Date().toISOString(),
    lastUsedAt: typeof c.lastUsedAt === 'string' ? c.lastUsedAt : undefined,
  };
}

function readStore(): WebAuthnStore {
  if (inMemoryStore) return inMemoryStore;
  try {
    if (fs.existsSync(WEBAUTHN_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(WEBAUTHN_STORE_PATH, 'utf8')) as Partial<WebAuthnStore>;
      inMemoryStore = {
        users:
          parsed.users && typeof parsed.users === 'object'
            ? Object.fromEntries(
                Object.entries(parsed.users).map(([k, v]) => [
                  k,
                  {
                    createdAt: typeof v.createdAt === 'string' ? v.createdAt : new Date().toISOString(),
                    displayName: typeof v.displayName === 'string' ? v.displayName : 'DeutschFlow Learner',
                    credentials: Array.isArray(v.credentials)
                      ? v.credentials.map(reviveCredential).filter((c): c is StoredCredential => c !== null)
                      : [],
                  },
                ])
              )
            : {},
      };
      return inMemoryStore;
    }
  } catch {
    // Fall back to a clean store on corrupt files
  }
  inMemoryStore = { users: {} };
  return inMemoryStore;
}

function writeStore(store: WebAuthnStore): void {
  inMemoryStore = store;
  try {
    ensureDataDir();
    fs.writeFileSync(WEBAUTHN_STORE_PATH, JSON.stringify(store, null, 2), { mode: 0o600 });
  } catch {
    // Keep operating via the in-memory store if the FS is read-only
  }
}

function pruneChallenges(): void {
  const now = Date.now();
  for (const scope of ['register', 'auth'] as const) {
    for (const [userId, entry] of Object.entries(inMemoryChallenges[scope])) {
      if (now - entry.createdAt > CHALLENGE_TTL_MS) {
        delete inMemoryChallenges[scope][userId];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Sessions — HMAC-signed tokens, same scheme as admin.ts admin tokens.
// ---------------------------------------------------------------------------

interface UserSessionPayload {
  sub: string;
  role: 'user';
  displayName: string;
  iat: number;
  exp: number;
}

export function signUserSession(userId: string, displayName: string): string {
  const payload: UserSessionPayload = {
    sub: userId,
    role: 'user',
    displayName,
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sigB64}`;
}

export function verifyUserSession(token: string | undefined | null): UserSessionPayload | null {
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
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as UserSessionPayload;
    if (parsed.role !== 'user' || typeof parsed.exp !== 'number' || parsed.exp <= Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function extractSessionToken(req: express.Request): string | null {
  const auth = req.headers.authorization;
  if (!auth || typeof auth !== 'string') return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function requireUserSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const session = verifyUserSession(extractSessionToken(req));
  if (!session) {
    res.status(401).json({ error: 'انتهت صلاحية جلسة الدخول. يرجى تسجيل الدخول بالبصمة مجدداً.' });
    return;
  }
  (req as express.Request & { userSession?: UserSessionPayload }).userSession = session;
  next();
}

// ---------------------------------------------------------------------------
// Relying Party (RP) identity
// ---------------------------------------------------------------------------

function rpName(): string {
  return 'DeutschFlow';
}

function rpID(req: express.Request): string {
  const configured = process.env.WEBAUTHN_RP_ID;
  if (configured && configured.trim()) return configured.trim();
  // Derive from the request origin so it works on localhost and Render alike
  const host = req.headers.host || 'localhost';
  return String(host).split(':')[0];
}

function rpOrigin(req: express.Request): string {
  const configured = process.env.WEBAUTHN_RP_ORIGIN;
  if (configured && configured.trim()) return configured.trim();
  const encrypted =
    (req.socket as { encrypted?: boolean } & import('net').Socket).encrypted === true ||
    String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
  const proto = encrypted ? 'https' : 'http';
  const host = req.headers.host || `localhost:${PORT_FALLBACK}`;
  return `${proto}://${host}`;
}

const PORT_FALLBACK = 3000;

// Simple per-IP rate limiter for auth endpoints (brute-force protection)
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 30;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function authRateLimit(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const ip =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown';
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    next();
    return;
  }
  bucket.count += 1;
  if (bucket.count > RATE_MAX_REQUESTS) {
    res.status(429).json({ error: 'عدد محاولات كبير. انتظر دقيقة ثم أعد المحاولة.' });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// Public API used by server.ts
// ---------------------------------------------------------------------------

export function getWebAuthnStatus(): { enabled: boolean; registeredUsers: number } {
  const store = readStore();
  const users = Object.values(store.users).filter((u) => u.credentials.length > 0);
  return { enabled: users.length > 0, registeredUsers: users.length };
}

export async function handleRegistrationStart(
  req: express.Request,
  res: express.Response
): Promise<void> {
  pruneChallenges();
  const body = (req.body || {}) as { userId?: string; deviceName?: string };
  const rawId = typeof body.userId === 'string' ? body.userId.trim().toLowerCase() : '';
  const deviceName = typeof body.deviceName === 'string' ? body.deviceName.trim().slice(0, 60) : '';

  // Empty userId is allowed: a unique learner_<hex> id is generated below.
  if (rawId && !/^[a-z0-9@._-]{3,40}$/.test(rawId)) {
    res.status(400).json({
      error: 'معرّف مستخدم غير صالح. استخدم حروفاً إنجليزية وأرقاماً (3–40 حرفاً) أو اتركه فارغاً ليُنشأ تلقائياً.',
    });
    return;
  }

  const store = readStore();
  const existing = store.users[rawId];
  if (existing && existing.credentials.length >= MAX_CREDENTIALS_PER_USER) {
    res.status(400).json({ error: 'بلغ هذا الحساب الحد الأقصى للأجهزة المسجّلة (5).' });
    return;
  }

  const userId = rawId || `learner_${crypto.randomBytes(6).toString('hex')}`;
  const options = await generateRegistrationOptions({
    rpName: rpName(),
    rpID: rpID(req),
    userName: userId,
    userDisplayName: existing?.displayName || 'DeutschFlow Learner',
    attestationType: 'none',
    excludeCredentials: (existing?.credentials || []).map((c) => ({ id: c.id })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required', // require the biometric tap itself
    },
  });

  inMemoryChallenges.register[userId] = {
    challenge: options.challenge,
    createdAt: Date.now(),
    purpose: 'register',
  };

  res.setHeader('Cache-Control', 'no-store');
  res.json({ userId, options, deviceName });
}

export async function handleRegistrationFinish(
  req: express.Request,
  res: express.Response
): Promise<void> {
  pruneChallenges();
  const body = (req.body || {}) as {
    userId?: string;
    deviceName?: string;
    credential?: RegistrationResponseJSON;
  };
  const userId = typeof body.userId === 'string' ? body.userId.trim().toLowerCase() : '';
  const deviceName = typeof body.deviceName === 'string' ? body.deviceName.trim().slice(0, 60) : '';
  const credential = body.credential;

  const pending = userId ? inMemoryChallenges.register[userId] : undefined;
  if (!pending || pending.purpose !== 'register') {
    res.status(400).json({ error: 'انتهت صلاحية طلب التسجيل أو غير موجود. ابدأ التسجيل من جديد.' });
    return;
  }
  if (!credential || typeof credential !== 'object') {
    res.status(400).json({ error: 'بيانات البصمة المستلمة غير مكتملة.' });
    return;
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: credential as RegistrationResponseJSON,
      expectedChallenge: pending.challenge,
      expectedOrigin: rpOrigin(req),
      expectedRPID: rpID(req),
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      res.status(400).json({ error: 'تعذر التحقق من تسجيل البصمة. أعد المحاولة.' });
      return;
    }

    const { credential: regCredential } = verification.registrationInfo;
    const store = readStore();
    const user = store.users[userId] || {
      credentials: [],
      createdAt: new Date().toISOString(),
      displayName: 'DeutschFlow Learner',
    };

    const existingCred = user.credentials.find((c) => c.id === regCredential.id);
    const stored: StoredCredential = {
      id: regCredential.id,
      publicKey: regCredential.publicKey,
      publicKeyB64: Buffer.from(regCredential.publicKey).toString('base64'),
      counter: regCredential.counter || 0,
      transports: (credential.response?.transports as string[] | undefined) || [],
      deviceName: deviceName || undefined,
      registeredAt: new Date().toISOString(),
    };
    if (existingCred) {
      Object.assign(existingCred, stored);
    } else {
      user.credentials.push(stored);
    }
    store.users[userId] = user;
    writeStore(store);
    delete inMemoryChallenges.register[userId];

    const sessionToken = signUserSession(userId, user.displayName);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      userId,
      token: sessionToken,
      displayName: user.displayName,
      deviceCount: user.credentials.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'فشل التحقق من التسجيل';
    res.status(400).json({ error: `فشل تسجيل البصمة: ${msg}` });
  }
}

export async function handleAuthenticationStart(
  req: express.Request,
  res: express.Response
): Promise<void> {
  pruneChallenges();
  const store = readStore();
  const allCredentials: Array<{ userId: string; cred: StoredCredential }> = [];
  for (const [userId, user] of Object.entries(store.users)) {
    for (const cred of user.credentials) {
      allCredentials.push({ userId, cred });
    }
  }
  if (allCredentials.length === 0) {
    res.status(404).json({ error: 'لا توجد بصمات مسجّلة على هذا الخادم بعد.' });
    return;
  }

  const options = await generateAuthenticationOptions({
    rpID: rpID(req),
    userVerification: 'required',
    allowCredentials: allCredentials.slice(0, 20).map(({ cred }) => ({ id: cred.id })),
  });

  // Remember the allowed credential ids so the finish step can map back to the user
  const challengeKey = options.challenge;
  inMemoryChallenges.auth[challengeKey] = {
    challenge: challengeKey,
    createdAt: Date.now(),
    purpose: 'auth',
    allowed: allCredentials.slice(0, 20).map(({ cred }) => cred.id),
  };

  res.setHeader('Cache-Control', 'no-store');
  res.json({ options });
}

export async function handleAuthenticationFinish(
  req: express.Request,
  res: express.Response
): Promise<void> {
  pruneChallenges();
  const body = (req.body || {}) as { credential?: AuthenticationResponseJSON };
  const credential = body.credential;
  if (!credential || typeof credential !== 'object' || typeof credential.id !== 'string') {
    res.status(400).json({ error: 'بيانات البصمة المستلمة غير مكتملة.' });
    return;
  }

  // Locate the pending auth challenge that allows this credential
  const candidates = Object.entries(inMemoryChallenges.auth).filter(([, entry]) =>
    entry.allowed?.includes(credential.id)
  );
  if (candidates.length === 0) {
    res.status(400).json({ error: 'انتهت صلاحية طلب الدخول أو البصمة غير معروفة. أعد المحاولة.' });
    return;
  }
  const [challengeKey, entry] = candidates[0];

  const store = readStore();
  let ownerUserId: string | null = null;
  let matched: StoredCredential | null = null;
  for (const [userId, user] of Object.entries(store.users)) {
    const cred = user.credentials.find((c) => c.id === credential.id);
    if (cred) {
      ownerUserId = userId;
      matched = cred;
      break;
    }
  }
  if (!ownerUserId || !matched) {
    res.status(400).json({ error: 'البصمة غير مسجّلة على هذا الخادم.' });
    return;
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: credential as AuthenticationResponseJSON,
      expectedChallenge: entry.challenge,
      expectedOrigin: rpOrigin(req),
      expectedRPID: rpID(req),
      credential: {
        id: matched.id,
        publicKey: new Uint8Array(matched.publicKey),
        counter: matched.counter,
        transports: matched.transports,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      res.status(401).json({ error: 'تعذر التحقق من البصمة. أعد المحاولة.' });
      return;
    }

    // Update counter + last used
    matched.counter = verification.authenticationInfo.newCounter;
    matched.lastUsedAt = new Date().toISOString();
    writeStore(store);
    delete inMemoryChallenges.auth[challengeKey];

    const user = store.users[ownerUserId];
    const sessionToken = signUserSession(ownerUserId, user.displayName);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: true,
      userId: ownerUserId,
      token: sessionToken,
      displayName: user.displayName,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'فشل التحقق من البصمة';
    res.status(400).json({ error: `فشل التحقق من البصمة: ${msg}` });
  }
}

export function handleSessionCheck(req: express.Request, res: express.Response): void {
  const session = verifyUserSession(extractSessionToken(req));
  res.setHeader('Cache-Control', 'no-store');
  if (!session) {
    res.json({ authenticated: false });
    return;
  }
  res.json({
    authenticated: true,
    userId: session.sub,
    displayName: session.displayName,
    expiresAt: new Date(session.exp).toISOString(),
  });
}

export function handleLogout(req: express.Request, res: express.Response): void {
  // Signed tokens are stateless: the client discards them. Nothing to revoke server-side.
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true });
}
