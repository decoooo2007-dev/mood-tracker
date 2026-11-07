"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getSession, signOut as authSignOut, verifyServerSession } from "@/lib/auth";
import { translations, Locale, TranslationKey, setLocale as setI18nLocale } from "@/lib/i18n/translations";

interface AuthContextType {
  user: { id: string; username: string } | null;
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: () => {},
});

interface LanguageContextType {
  locale: Locale;
  isRtl: boolean;
  setLocale: (locale: Locale) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
  tmood: (mood: string) => string;
  ttag: (tag: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  isRtl: false,
  setLocale: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
  tmood: (mood) => mood,
  ttag: (tag) => tag,
});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 60 * 24,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncLocalSession = () => {
      const session = getSession();
      if (session) {
        setUser({ id: session.userId || session.id || "", username: session.username });
        setIsLoading(false);
      } else {
        setUser(null);
      }
    };

    syncLocalSession();
    window.addEventListener("moodflow-auth-change", syncLocalSession);

    // Verify session with server
    verifyServerSession()
      .then((verified) => {
        if (verified) {
          setUser({ id: verified.userId, username: verified.username });
        } else {
          setUser(null);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      window.removeEventListener("moodflow-auth-change", syncLocalSession);
    };
  }, []);

  const signOut = () => {
    authSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("moodflow-locale") as Locale;
    if (stored === "en" || stored === "ar") {
      setLocaleState(stored);
      setI18nLocale(stored);
      document.documentElement.dir = stored === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = stored;
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setI18nLocale(newLocale);
    localStorage.setItem("moodflow-locale", newLocale);
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLocale;
  }, []);

  const toggleLanguage = useCallback(() => {
    const next = locale === "en" ? "ar" : "en";
    setLocale(next);
  }, [locale, setLocale]);

  const t = useCallback(
    (key: TranslationKey): string => {
      return (
        translations[locale]?.[key] ||
        translations.en?.[key] ||
        key
      );
    },
    [locale]
  );

  const tmood = useCallback(
    (mood: string): string => {
      const key = `mood.${mood.toLowerCase()}` as TranslationKey;
      return (
        translations[locale]?.[key] ||
        translations.en?.[key] ||
        mood
      );
    },
    [locale]
  );

  const ttag = useCallback(
    (tag: string): string => {
      const key = `tag.${tag.trim().toLowerCase()}` as TranslationKey;
      return (
        translations[locale]?.[key] ||
        translations.en?.[key] ||
        tag
      );
    },
    [locale]
  );

  const isRtl = locale === "ar";

  return (
    <LanguageContext.Provider
      value={{ locale, isRtl, setLocale, toggleLanguage, t, tmood, ttag }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>{children}</LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return {
    user: context.user,
    isLoading: context.isLoading,
    signOut: context.signOut,
    isAuthenticated: !!context.user,
  };
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
