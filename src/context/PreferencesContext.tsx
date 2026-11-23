import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchPublicAppConfig, type PublicAppConfig } from '../services/api';
import type { UILanguage, UITheme } from '../types/media';

const THEME_STORAGE_KEY = 'deutschflow_theme_v1';
const LANG_STORAGE_KEY = 'deutschflow_lang_v1';

interface PreferencesContextValue {
  theme: UITheme;
  setTheme: (theme: UITheme) => void;
  toggleTheme: () => void;
  lang: UILanguage;
  setLang: (lang: UILanguage) => void;
  appConfig: PublicAppConfig | null;
  setAppConfig: (cfg: PublicAppConfig | null) => void;
  refreshAppConfig: () => Promise<void>;
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readInitialTheme(): UITheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Ignore storage access errors
  }
  return 'dark';
}

function readInitialLang(): UILanguage {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ar' || saved === 'de' || saved === 'en') return saved;
  } catch {
    // Ignore storage access errors
  }
  return 'ar';
}

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<UITheme>(() => readInitialTheme());
  const [lang, setLangState] = useState<UILanguage>(() => readInitialLang());
  const [appConfig, setAppConfig] = useState<PublicAppConfig | null>(null);
  // Keep admin token strictly in memory — never in localStorage
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage quota errors
    }
  }, [lang]);

  const refreshAppConfig = useCallback(async () => {
    const cfg = await fetchPublicAppConfig();
    if (cfg) {
      setAppConfig(cfg);
    }
  }, []);

  useEffect(() => {
    void refreshAppConfig();
  }, [refreshAppConfig]);

  const setTheme = useCallback((next: UITheme) => {
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setLang = useCallback((next: UILanguage) => {
    setLangState(next);
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        lang,
        setLang,
        appConfig,
        setAppConfig,
        refreshAppConfig,
        adminToken,
        setAdminToken,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }
  return ctx;
}
