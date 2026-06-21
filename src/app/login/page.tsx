"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { signUp, signIn, getSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import GlassBackground from "@/components/ui/GlassBackground";
import { Heart, Loader2, Eye, EyeOff, Globe } from "lucide-react";
import { translations, Locale } from "@/lib/i18n/translations";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRtl, setIsRtl] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");

  // Get locale from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("moodflow-locale") as Locale;
    if (stored === "en" || stored === "ar") {
      setLocale(stored);
      setIsRtl(stored === "ar");
    }
  }, []);

  // Translation function using current state
  const t = (key: string): string => {
    return translations[locale][key as keyof typeof translations.en] || translations.en[key as keyof typeof translations.en] || key;
  };

  const toggleLanguage = () => {
    const newLocale = locale === "en" ? "ar" : "en";
    setLocale(newLocale);
    setIsRtl(newLocale === "ar");
    localStorage.setItem("moodflow-locale", newLocale);
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
  };

  // Redirect if already logged in
  useEffect(() => {
    const session = getSession();
    if (session) {
      router.push("/");
    }
  }, [router]);

  const getError = (code: string): string => {
    const key = `error.${code}` as const;
    return t(key as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError(getError("fillAllFields"));
      return;
    }

    if (username.length < 3) {
      setError(getError("usernameMinLength"));
      return;
    }

    if (password.length < 4) {
      setError(getError("passwordMinLength"));
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError(getError("passwordsDoNotMatch"));
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(username.trim(), password);
        if (result.success) {
          window.location.href = "/";
        } else {
          const errorKey = result.error?.includes("taken") ? "usernameTaken" :
                          result.error?.includes("exists") ? "usernameTaken" :
                          result.error?.includes("network") ? "networkError" :
                          "signUpFailed";
          setError(getError(errorKey));
        }
      } else {
        const result = await signIn(username.trim(), password);
        if (result.success) {
          window.location.href = "/";
        } else {
          const errorKey = result.error?.includes("not found") ? "signInFailed" :
                          result.error?.includes("Incorrect") ? "signInFailed" :
                          result.error?.includes("network") ? "networkError" :
                          "signInFailed";
          setError(getError(errorKey));
        }
      }
    } catch {
      setError(getError("somethingWentWrong"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GlassBackground>
      <div className="min-h-screen flex items-center justify-center px-4" dir={isRtl ? "rtl" : "ltr"}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Language Toggle */}
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-4 py-2 backdrop-blur-md bg-white/10 rounded-xl border border-white/20 hover:bg-white/20 transition-colors"
            >
              <Globe className="w-4 h-4 text-white/80" />
              <span className="text-sm font-medium text-white/80 uppercase">
                {locale === "en" ? "عربي" : "EN"}
              </span>
            </button>
          </div>

          {/* Logo */}
          <div className={`text-center mb-8 ${isRtl ? "rtl" : ""}`}>
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Heart className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">{t("app.title")}</h1>
            <p className="text-white/60">
              {isSignUp ? t("auth.createAccount") : t("auth.welcomeBack")}
            </p>
          </div>

          {/* Form */}
          <motion.div
            className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className={`block text-sm text-white/60 mb-2 ${isRtl ? "text-right" : ""}`}>
                  {t("auth.username")}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                  placeholder={t("auth.chooseUsername")}
                  className={`w-full px-4 py-3 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all ${isRtl ? "text-right" : ""}`}
                  autoComplete="username"
                  maxLength={20}
                  dir={isRtl ? "ltr" : undefined}
                />
              </div>

              {/* Password */}
              <div>
                <label className={`block text-sm text-white/60 mb-2 ${isRtl ? "text-right" : ""}`}>
                  {t("auth.password")}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("auth.enterPassword")}
                    className={`w-full px-4 py-3 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all pr-10 ${isRtl ? "text-right pl-10 pr-4" : ""}`}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    dir={isRtl ? "ltr" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors ${isRtl ? "left-3 right-auto" : "right-3"}`}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (Sign Up only) */}
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <label className={`block text-sm text-white/60 mb-2 ${isRtl ? "text-right" : ""}`}>
                    {t("auth.confirmPassword")}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("auth.confirmPasswordPlaceholder")}
                    className={`w-full px-4 py-3 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all ${isRtl ? "text-right" : ""}`}
                    autoComplete="new-password"
                    dir={isRtl ? "ltr" : undefined}
                  />
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm ${isRtl ? "text-right" : ""}`}
                >
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isSignUp ? t("auth.createAccountBtn") : t("auth.signIn")
                )}
              </button>
            </form>

            {/* Toggle */}
            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-white/60 hover:text-white transition-colors text-sm"
              >
                {isSignUp ? t("auth.alreadyHaveAccount") : t("auth.dontHaveAccount")}
              </button>
            </div>
          </motion.div>

          {/* Info */}
          <p className={`text-center text-white/40 text-xs mt-6 ${isRtl ? "rtl" : ""}`}>
            {t("auth.syncInfo")}
          </p>
        </motion.div>
      </div>
    </GlassBackground>
  );
}
