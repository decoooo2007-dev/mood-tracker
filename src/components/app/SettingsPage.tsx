"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useAuth, useLanguage } from "@/lib/providers";
import {
  Moon,
  Sun,
  Bell,
  Trash2,
  Info,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Shield,
  FileText,
  Download,
  Upload,
  LogOut,
  User,
  Lock,
  HeartHandshake,
  Phone,
  CheckCircle2,
  AlertCircle,
  Palette,
  Sparkles,
  MousePointerClick,
  Layers,
} from "lucide-react";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import {
  isAppLockEnabled,
  setAppLockPin,
  removeAppLock,
  registerBiometricCredential,
} from "@/lib/app-lock";
import { saveCustomTag } from "@/lib/moods";
import {
  PALETTES,
  getStoredAppearance,
  setStoredPaletteId,
  setStoredMoodStyle,
  setStoredSpotlightStyle,
  setStoredMoodReactive,
  type MoodButtonStyle,
  type SpotlightStyle,
} from "@/lib/theme";
import type { MoodType } from "@/types/mood";

export default function SettingsPage() {
  const router = useRouter();
  const {
    entries,
    createEntry,
    settings,
    updateSettings,
    changeTheme,
    getStats,
    clearAllData,
    exportData,
    isLoading,
  } = useSyncStore();
  const { user, signOut } = useAuth();
  const { t, isRtl } = useLanguage();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter");
  const [pinError, setPinError] = useState("");
  const [showHelplines, setShowHelplines] = useState(false);
  const [importNotice, setImportNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Appearance state (Palettes 1-8, Mood Style, Spotlight, Mode-Aware Aura)
  const [paletteId, setPaletteId] = useState<number>(4);
  const [moodStyle, setMoodStyle] = useState<MoodButtonStyle>("hybrid");
  const [spotlightStyle, setSpotlightStyle] = useState<SpotlightStyle>("classic");
  const [moodReactive, setMoodReactive] = useState<boolean>(false);

  useEffect(() => {
    setAppLockEnabled(isAppLockEnabled());
    const syncAppearance = () => {
      const app = getStoredAppearance();
      setPaletteId(app.paletteId);
      setMoodStyle(app.moodStyle);
      setSpotlightStyle(app.spotlightStyle);
      setMoodReactive(app.moodReactive);
    };
    syncAppearance();
    window.addEventListener("moodflow-appearance-change", syncAppearance);
    return () => window.removeEventListener("moodflow-appearance-change", syncAppearance);
  }, []);

  const stats = getStats();

  const currentSettings = settings || {
    theme: "dark" as const,
    notifications: true,
    reminderTime: "21:00",
    language: "en",
    exportFormat: "json" as const,
  };

  const handleThemeSwitch = (mode: "dark" | "light") => {
    changeTheme(mode);
    // Automatic Mode-Aware Aura Rule feedback in local state
    setMoodReactive(mode === "light");
  };

  const handleToggleNotifications = () => {
    const nextEnabled = !currentSettings.notifications;
    if (
      nextEnabled &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
    updateSettings({ notifications: nextEnabled });
  };

  const handleToggleAppLock = () => {
    if (appLockEnabled) {
      removeAppLock();
      setAppLockEnabled(false);
    } else {
      setNewPin("");
      setConfirmPin("");
      setPinStep("enter");
      setPinError("");
      setShowPinModal(true);
    }
  };

  const handleSavePin = async () => {
    if (newPin.length !== 4) {
      setPinError(t("lock.enterPin"));
      return;
    }
    if (pinStep === "enter") {
      setPinStep("confirm");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError(t("lock.pinMismatch"));
      return;
    }
    const success = await setAppLockPin(newPin);
    if (success) {
      setAppLockEnabled(true);
      setShowPinModal(false);
      setNewPin("");
      setConfirmPin("");
      registerBiometricCredential().catch(() => {});
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setImportNotice({ type: "error", text: t("settings.importError") });
        return;
      }

      const validMoods = new Set(["Happy", "Calm", "Sad", "Frustrated", "Tired"]);
      let importedCount = 0;
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        const rawMood = String(item.mood || "Calm");
        const mood = (validMoods.has(rawMood) ? rawMood : "Calm") as MoodType;
        const intensity =
          typeof item.intensity === "number"
            ? Math.max(1, Math.min(100, Math.round(item.intensity)))
            : 50;
        const entryText = typeof item.text === "string" ? item.text : "";
        const tags = Array.isArray(item.tags)
          ? item.tags.filter((tg: unknown): tg is string => typeof tg === "string")
          : [];
        const date =
          typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
            ? item.date
            : "";
        const time = typeof item.time === "string" ? item.time : "";

        for (const tg of tags) {
          saveCustomTag(tg);
        }

        const exists = entries.some(
          (existing) =>
            existing.date === date &&
            existing.time === time &&
            existing.mood === mood
        );

        if (!exists) {
          try {
            await createEntry({
              mood,
              intensity,
              text: entryText,
              tags,
              date: date || undefined,
              time: time || undefined,
            });
            importedCount++;
          } catch {
            // Continue with other entries
          }
        }
      }

      setImportNotice({
        type: "success",
        text: `${t("settings.importSuccess")} (${importedCount})`,
      });
      setTimeout(() => setImportNotice(null), 5000);
    } catch {
      setImportNotice({ type: "error", text: t("settings.importError") });
      setTimeout(() => setImportNotice(null), 5000);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearData = async () => {
    try {
      await clearAllData();
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear data:", err);
    }
  };

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <GlassBackground>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            className="w-12 h-12 border-4 border-t-transparent rounded-full"
            style={{ borderColor: "var(--accent-solid)", borderTopColor: "transparent" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-10" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-extrabold theme-text-primary mb-1 tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="theme-text-secondary text-sm">{t("settings.customize")}</p>
        </motion.div>

        {/* Account Card */}
        {user && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider mb-2.5">
              {t("settings.account")}
            </h2>
            <div className="glass rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full accent-avatar flex items-center justify-center text-white font-bold text-sm shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="theme-text-primary font-semibold text-sm">
                    @{user.username}
                  </p>
                  <p className="theme-text-muted text-xs">
                    {stats.totalEntries} {t("history.entriesRecorded")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl recessed-well theme-text-primary text-xs font-medium transition-opacity hover:opacity-90"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t("settings.signOut")}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Appearance (Theme Mode + Palettes 1-8 + Mood Button Style + Spotlight + Mode-Aware Aura) */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider mb-2.5">
            {t("settings.appearance")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm divide-y divide-white/10">
            {/* Dark / Light Mode */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {currentSettings.theme === "dark" ? (
                  <Moon className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("settings.theme")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("settings.themeDesc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleThemeSwitch("dark")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentSettings.theme === "dark"
                      ? "accent-gradient-btn shadow-sm"
                      : "recessed-well theme-text-secondary"
                  }`}
                >
                  {t("settings.dark")}
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeSwitch("light")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentSettings.theme === "light"
                      ? "accent-gradient-btn shadow-sm"
                      : "recessed-well theme-text-secondary"
                  }`}
                >
                  {t("settings.light")}
                </button>
              </div>
            </div>

            {/* Selectable Palettes 1–8 (#4 Nile Sapphire x Gold Default) */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Palette className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("appearance.palette")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("appearance.paletteDesc")}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PALETTES.map((pal) => {
                  const active = pal.id === paletteId;
                  return (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => {
                        setPaletteId(pal.id);
                        setStoredPaletteId(pal.id);
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-start transition-all ${
                        active
                          ? "accent-pill ring-1 ring-[var(--accent-solid)] font-semibold"
                          : "recessed-well theme-text-secondary hover:opacity-95"
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-white/50 shadow-sm"
                        style={{ background: pal.swatch }}
                      />
                      <span className="text-xs truncate">
                        {isRtl ? pal.nameAr : pal.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood Button Style (Hybrid Orb-Keycaps / 3D Keycaps / Glowing Orbs) */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Layers className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("appearance.moodStyle")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("appearance.moodStyleDesc")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "hybrid", label: t("appearance.styleHybrid") },
                    { id: "keycaps", label: t("appearance.styleKeycaps") },
                    { id: "orbs", label: t("appearance.styleOrbs") },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setMoodStyle(opt.id);
                      setStoredMoodStyle(opt.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      moodStyle === opt.id
                        ? "accent-gradient-btn shadow-sm"
                        : "recessed-well theme-text-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cursor Spotlight (Crystal Pearl / Accent Prism) */}
            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <MousePointerClick className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("appearance.spotlight")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("appearance.spotlightDesc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {(
                  [
                    { id: "classic", label: t("appearance.spotClassic") },
                    { id: "accent", label: t("appearance.spotAccent") },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSpotlightStyle(opt.id);
                      setStoredSpotlightStyle(opt.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      spotlightStyle === opt.id
                        ? "accent-gradient-btn shadow-sm"
                        : "recessed-well theme-text-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood-Reactive Background Aura Toggle (dir="ltr" enforced) */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("appearance.moodReactive")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("appearance.moodReactiveDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                dir="ltr"
                onClick={() => {
                  const next = !moodReactive;
                  setMoodReactive(next);
                  setStoredMoodReactive(next);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  moodReactive ? "accent-gradient-btn" : "bg-white/20"
                }`}
                aria-label="Toggle Mood-Reactive Aura"
              >
                <motion.div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                  animate={{
                    left: moodReactive ? "22px" : "2px",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Reminders / Notifications */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider mb-2.5">
            {t("settings.reminders")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("settings.dailyReminder")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("settings.reminderDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                dir="ltr"
                onClick={handleToggleNotifications}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  currentSettings.notifications ? "accent-gradient-btn" : "bg-white/20"
                }`}
                aria-label="Toggle reminder"
              >
                <motion.div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                  animate={{
                    left: currentSettings.notifications ? "22px" : "2px",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            {currentSettings.notifications && (
              <div className="px-4 pb-4 pt-1 border-t border-white/10">
                <div className="flex items-center gap-3">
                  <span className="theme-text-secondary text-xs">
                    {t("settings.remindAt")}
                  </span>
                  <input
                    type="time"
                    value={currentSettings.reminderTime}
                    onChange={(e) =>
                      updateSettings({ reminderTime: e.target.value })
                    }
                    className="px-3 py-1.5 recessed-well rounded-xl theme-text-primary text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Security & App Lock */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider mb-2.5">
            {t("lock.enableAppLock")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("lock.enableAppLock")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("lock.appLockDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                dir="ltr"
                onClick={handleToggleAppLock}
                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                  appLockEnabled ? "accent-gradient-btn" : "bg-white/20"
                }`}
                aria-label="Toggle App Lock"
              >
                <motion.div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                  animate={{
                    left: appLockEnabled ? "22px" : "2px",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Data & Export */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider mb-2.5">
            {t("settings.data")}
          </h2>

          {importNotice && (
            <div
              className={`p-3.5 mb-3 rounded-2xl border flex items-center gap-2.5 text-xs font-medium ${
                importNotice.type === "success"
                  ? "bg-emerald-500/20 border-emerald-500/40 stat-positive"
                  : "bg-red-500/20 border-red-500/40 stat-negative"
              }`}
            >
              {importNotice.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{importNotice.text}</span>
            </div>
          )}

          <div className="glass rounded-2xl overflow-hidden shadow-sm divide-y divide-white/10">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileImport}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("settings.importData")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("settings.importDesc")}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 theme-text-muted ${isRtl ? "rotate-180" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={() => exportData("json")}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("settings.exportJson")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {isRtl ? "نسخة احتياطية كاملة لبياناتك" : "Full backup of all entries"}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 theme-text-muted ${isRtl ? "rotate-180" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={() => exportData("csv")}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-pink-400" />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("settings.exportCsv")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {isRtl
                      ? "ملف جداول بيانات متوافق مع برامج الجداول"
                      : "Excel-compatible spreadsheet with Arabic support"}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 theme-text-muted ${isRtl ? "rotate-180" : ""}`}
              />
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-red-500/10 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-400" />
                <div>
                  <p className="stat-negative font-medium text-sm">
                    {t("settings.clearAllData")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("settings.clearDesc")}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-red-400/60 ${isRtl ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </motion.div>

        {/* Wellness & Crisis Helplines (Deduplicated Numbers: 16328, 123, 988) */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <div className="glass rounded-2xl overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setShowHelplines(!showHelplines)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <HeartHandshake className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("helpline.title")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("helpline.subtitle")}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 theme-text-secondary transition-transform ${
                  showHelplines ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showHelplines && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 pt-2 border-t border-white/10 space-y-2.5 text-xs overflow-hidden"
                >
                  <a
                    href="tel:16328"
                    className="flex items-center justify-between p-3 rounded-xl recessed-well hover:opacity-95 transition-opacity theme-text-primary"
                  >
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>{t("helpline.egyptMental")}</span>
                    </div>
                    <span
                      dir="ltr"
                      className="text-[11px] font-semibold stat-positive px-2.5 py-0.5 rounded-full bg-emerald-500/20"
                    >
                      16328
                    </span>
                  </a>

                  <a
                    href="tel:123"
                    className="flex items-center justify-between p-3 rounded-xl recessed-well hover:opacity-95 transition-opacity theme-text-primary"
                  >
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-red-400" />
                      <span>{t("helpline.egyptEmergency")}</span>
                    </div>
                    <span
                      dir="ltr"
                      className="text-[11px] font-semibold stat-negative px-2.5 py-0.5 rounded-full bg-red-500/20"
                    >
                      123
                    </span>
                  </a>

                  <a
                    href="tel:988"
                    className="flex items-center justify-between p-3 rounded-xl recessed-well hover:opacity-95 transition-opacity theme-text-primary"
                  >
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-blue-400" />
                      <span>{t("helpline.international")}</span>
                    </div>
                    <span
                      dir="ltr"
                      className="text-[11px] font-semibold accent-pill px-2.5 py-0.5 rounded-full"
                    >
                      988
                    </span>
                  </a>

                  <p className="theme-text-muted text-[11px] pt-1 leading-relaxed">
                    {t("helpline.note")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Feedback Link */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider mb-2.5">
            {t("feedback.title")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm">
            <Link
              href="/feedback"
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <div>
                  <p className="theme-text-primary font-medium text-sm">
                    {t("settings.sendFeedback")}
                  </p>
                  <p className="theme-text-secondary text-xs">
                    {t("settings.feedbackDesc")}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 theme-text-muted ${isRtl ? "rotate-180" : ""}`}
              />
            </Link>
          </div>
        </motion.div>

        {/* About & Legal */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xs font-semibold theme-text-muted uppercase tracking-wider mb-2.5">
            {t("settings.about")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm divide-y divide-white/10">
            <div className="p-4 flex items-center gap-3">
              <Info className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
              <div>
                <p className="theme-text-primary font-medium text-sm">{t("app.title")}</p>
                <p className="theme-text-secondary text-xs">{t("settings.version")}</p>
              </div>
            </div>

            <Link
              href="/privacy"
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <p className="theme-text-primary font-medium text-sm">
                  {t("legal.privacyPolicy")}
                </p>
              </div>
              <ChevronRight
                className={`w-4 h-4 theme-text-muted ${isRtl ? "rotate-180" : ""}`}
              />
            </Link>

            <Link
              href="/terms"
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                <p className="theme-text-primary font-medium text-sm">
                  {t("legal.termsOfService")}
                </p>
              </div>
              <ChevronRight
                className={`w-4 h-4 theme-text-muted ${isRtl ? "rotate-180" : ""}`}
              />
            </Link>
          </div>
        </motion.div>

        {/* Clear Data Confirmation Modal */}
        <AnimatePresence>
          {showClearConfirm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                className="w-full max-w-sm glass-modal rounded-3xl border border-white/20 p-6 text-center shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold mb-1 theme-text-primary">
                  {t("settings.clearConfirm")}
                </h3>
                <p className="theme-text-secondary text-xs mb-5">
                  {t("settings.clearWarning")}
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl recessed-well theme-text-primary font-medium text-sm"
                  >
                    {t("settings.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearData}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white keep-white font-medium text-sm transition-colors"
                  >
                    {t("settings.deleteAll")}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Set PIN Modal (with inputMode="numeric") */}
          {showPinModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                className="w-full max-w-xs glass-modal rounded-3xl border border-white/20 p-6 text-center shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="w-12 h-12 rounded-2xl accent-pill flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold mb-1 theme-text-primary">
                  {pinStep === "enter" ? t("lock.setPin") : t("lock.confirmPin")}
                </h3>
                <p className="theme-text-secondary text-xs mb-4">
                  {pinStep === "enter" ? t("lock.subtitle") : t("lock.confirmPin")}
                </p>

                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  pattern="\d*"
                  autoFocus
                  value={pinStep === "enter" ? newPin : confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setPinError("");
                    if (pinStep === "enter") {
                      setNewPin(val);
                    } else {
                      setConfirmPin(val);
                    }
                  }}
                  className="w-32 py-2 text-center tracking-[1em] text-xl font-bold recessed-well rounded-xl outline-none mx-auto block mb-3 theme-text-primary"
                  placeholder="••••"
                />

                {pinError && (
                  <p className="text-xs text-red-400 mb-3 font-medium">
                    {pinError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setNewPin("");
                      setConfirmPin("");
                      setPinStep("enter");
                      setPinError("");
                    }}
                    className="flex-1 py-2 rounded-xl recessed-well theme-text-primary text-xs font-medium"
                  >
                    {t("settings.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePin}
                    disabled={
                      pinStep === "enter"
                        ? newPin.length !== 4
                        : confirmPin.length !== 4
                    }
                    className="flex-1 py-2 rounded-xl accent-gradient-btn disabled:opacity-50 text-xs font-semibold"
                  >
                    {pinStep === "enter" ? t("entry.save") : t("lock.setPin")}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <Navigation />
    </GlassBackground>
  );
}
