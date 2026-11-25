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
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [hasLocalHint, setHasLocalHint] = useState(false);

  useEffect(() => {
    const supported = browserSupportsWebAuthn();
    setBiometricSupported(supported);
    setHasLocalHint(readLocalHint());

    if (!supported) {
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
      attResp = await startRegistration({ optionsJSON: options });
    } catch {
      // User cancelled the OS biometric prompt, or it failed
      throw new Error('أُلغيت عملية البصمة أو تعذّر قراءتها. أعد المحاولة.');
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
    const { options } = await startBiometricLogin();
    let asseResp: Awaited<ReturnType<typeof startAuthentication>>;
    try {
      asseResp = await startAuthentication({ optionsJSON: options });
    } catch {
      throw new Error('أُلغيت عملية البصمة أو تعذّر قراءتها. أعد المحاولة.');
    }
    const { token, userId, displayName } = await finishBiometricLogin(
      asseResp as Parameters<typeof finishBiometricLogin>[0]
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
