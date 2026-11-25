import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
} from '@simplewebauthn/browser';
import {
  checkAuthSession,
  clearAuthToken,
  finishBiometricLogin,
  finishBiometricRegistration,
  getStoredAuthToken,
  logoutBiometric,
  startBiometricLogin,
  startBiometricRegistration,
  storeAuthToken,
  type BiometricAuthSession,
} from '../services/api';

const FINGERPRINT_HINT_KEY = 'df_biometric_hint_v1';

/**
 * The device's biometric prompt did not complete. `rejected` covers an
 * unrecognised finger, a dismissed prompt, the device's own timeout and
 * "no matching passkey on this device" — the browser reports them all as
 * the same NotAllowedError, so they cannot be told apart here.
 * `unavailable` means this origin may not use WebAuthn at all.
 * `timeout` means the device never answered within CEREMONY_TIMEOUT_MS.
 * Errors reported by the server are thrown unchanged (BiometricApiError,
 * carrying a `code` the UI can branch on).
 */
export type BiometricCeremonyFailReason = 'rejected' | 'unavailable' | 'timeout';

/** Upper bound for the device prompt: a device that never answers must not
 *  leave the dialog in "scanning" forever. */
const CEREMONY_TIMEOUT_MS = 90_000;

export class BiometricCeremonyError extends Error {
  readonly reason: BiometricCeremonyFailReason;

  constructor(reason: BiometricCeremonyFailReason) {
    super(reason);
    this.name = 'BiometricCeremonyError';
    this.reason = reason;
  }
}

function ceremonyFailReason(err: unknown): BiometricCeremonyFailReason {
  if (err instanceof BiometricCeremonyError) return err.reason;
  if (err instanceof Error && (err.name === 'SecurityError' || err.name === 'NotSupportedError')) {
    return 'unavailable';
  }
  return 'rejected';
}

/** The browser offers no way to cancel a pending WebAuthn prompt, so a late
 *  answer is simply left to resolve on its own; the caller has already moved on. */
function withCeremonyTimeout<T>(ceremony: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new BiometricCeremonyError('timeout')), CEREMONY_TIMEOUT_MS);
    ceremony.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

interface AuthContextValue {
  /** null = signed out / unknown yet */
  session: BiometricAuthSession | null;
  /** true while restoring the session on app load */
  initializing: boolean;
  /** does this browser/device support biometric WebAuthn at all */
  biometricSupported: boolean;
  /** has any fingerprint been registered on this device before */
  hasLocalHint: boolean;
  /** register the fingerprint (first time) and sign in */
  registerFingerprint: (userId: string, deviceName: string) => Promise<void>;
  /** recognise the fingerprint (later visits) and sign in */
  loginWithFingerprint: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readLocalHint(): boolean {
  try {
    return localStorage.getItem(FINGERPRINT_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<BiometricAuthSession | null>(null);
  const [initializing, setInitializing] = useState(true);
  // Known synchronously at first render — the "unsupported" notice must not flash for a frame
  const [biometricSupported, setBiometricSupported] = useState<boolean>(() => {
    try {
      return browserSupportsWebAuthn();
    } catch {
      return false;
    }
  });
  const [hasLocalHint, setHasLocalHint] = useState(false);

  useEffect(() => {
    setHasLocalHint(readLocalHint());

    if (!biometricSupported) {
      setInitializing(false);
      return;
    }

    // Restore session silently: a stored token means the fingerprint was
    // recognised before — the user re-enters the workspace without a new tap
    // until the 30-day session expires.
    const token = getStoredAuthToken();
    if (!token) {
      setInitializing(false);
      return;
    }
    void checkAuthSession(token)
      .then((restored) => {
        if (restored) {
          setSession(restored);
        } else {
          clearAuthToken();
        }
      })
      .catch(() => clearAuthToken())
      .finally(() => setInitializing(false));
  }, []);

  const registerFingerprint = useCallback(async (userId: string, deviceName: string) => {
    const { userId: confirmedUserId, options } = await startBiometricRegistration(userId, deviceName);
    let attResp: Awaited<ReturnType<typeof startRegistration>>;
    try {
      attResp = await withCeremonyTimeout(startRegistration({ optionsJSON: options }));
    } catch (err) {
      throw new BiometricCeremonyError(ceremonyFailReason(err));
    }
    const { token } = await finishBiometricRegistration(
      confirmedUserId,
      attResp as Parameters<typeof finishBiometricRegistration>[1],
      deviceName
    );
    storeAuthToken(token);
    try {
      localStorage.setItem(FINGERPRINT_HINT_KEY, '1');
    } catch {
      // Ignore quota errors
    }
    setHasLocalHint(true);
    setSession({ userId: confirmedUserId, displayName: 'DeutschFlow Learner' });
  }, []);

  const loginWithFingerprint = useCallback(async () => {
    const { options, requestId } = await startBiometricLogin();
    let asseResp: Awaited<ReturnType<typeof startAuthentication>>;
    try {
      asseResp = await withCeremonyTimeout(startAuthentication({ optionsJSON: options }));
    } catch (err) {
      throw new BiometricCeremonyError(ceremonyFailReason(err));
    }
    const { token, userId, displayName } = await finishBiometricLogin(
      asseResp as Parameters<typeof finishBiometricLogin>[0],
      requestId
    );
    storeAuthToken(token);
    try {
      localStorage.setItem(FINGERPRINT_HINT_KEY, '1');
    } catch {
      // Ignore quota errors
    }
    setHasLocalHint(true);
    setSession({ userId, displayName });
  }, []);

  const signOut = useCallback(() => {
    void logoutBiometric();
    clearAuthToken();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      biometricSupported,
      hasLocalHint,
      registerFingerprint,
      loginWithFingerprint,
      signOut,
    }),
    [session, initializing, biometricSupported, hasLocalHint, registerFingerprint, loginWithFingerprint, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}

/** Is a platform authenticator (device fingerprint) available on this device? */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}
