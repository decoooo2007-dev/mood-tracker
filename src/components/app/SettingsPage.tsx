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
  const [importNotice, setImportNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAppLockEnabled(isAppLockEnabled());
  }, []);

  const stats = getStats();

  const currentSettings = settings || {
    theme: "dark" as const,
    notifications: true,
    reminderTime: "21:00",
    language: "en",
    exportFormat: "json" as const,
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
      // Optionally register WebAuthn platform biometric credential if supported
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

        // Register any custom tags present in the imported entry
        for (const tg of tags) {
          saveCustomTag(tg);
        }

        // Check for duplicates
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
            className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">
            {t("settings.title")}
          </h1>
          <p className="text-white/60 text-sm">{t("settings.customize")}</p>
        </motion.div>

        {/* Account Card */}
        {user && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2.5">
              {t("settings.account")}
            </h2>
            <div className="glass rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    @{user.username}
                  </p>
                  <p className="text-white/50 text-xs">
                    {stats.totalEntries} {t("history.entriesRecorded")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t("settings.signOut")}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Appearance (Theme) */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2.5">
            {t("settings.appearance")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentSettings.theme === "dark" ? (
                  <Moon className="w-5 h-5 text-purple-400" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-400" />
                )}
                <div>
                  <p className="text-white font-medium text-sm">
                    {t("settings.theme")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {t("settings.themeDesc")}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => changeTheme("dark")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentSettings.theme === "dark"
                      ? "bg-purple-500 text-white shadow-sm"
                      : "bg-white/10 text-white/60 hover:bg-white/15"
                  }`}
                >
                  {t("settings.dark")}
                </button>
                <button
                  type="button"
                  onClick={() => changeTheme("light")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    currentSettings.theme === "light"
                      ? "bg-purple-500 text-white shadow-sm"
                      : "bg-white/10 text-white/60 hover:bg-white/15"
                  }`}
                >
                  {t("settings.light")}
                </button>
              </div>
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
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2.5">
            {t("settings.reminders")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium text-sm">
                    {t("settings.dailyReminder")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {t("settings.reminderDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    notifications: !currentSettings.notifications,
                  })
                }
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  currentSettings.notifications ? "bg-purple-500" : "bg-white/20"
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
              <div className="px-4 pb-4 pt-1 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-white/70 text-xs">
                    {t("settings.remindAt")}
                  </span>
                  <input
                    type="time"
                    value={currentSettings.reminderTime}
                    onChange={(e) =>
                      updateSettings({ reminderTime: e.target.value })
                    }
                    className="px-3 py-1.5 bg-white/10 rounded-xl text-white text-xs outline-none focus:ring-1 focus:ring-purple-400"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Security & App Lock (Track 1.2) */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2.5">
            {t("lock.enableAppLock")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium text-sm">
                    {t("lock.enableAppLock")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {t("lock.appLockDesc")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAppLock}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  appLockEnabled ? "bg-purple-500" : "bg-white/20"
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
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2.5">
            {t("settings.data")}
          </h2>

          {/* Import Status Alert */}
          {importNotice && (
            <div
              className={`p-3.5 mb-3 rounded-2xl border flex items-center gap-2.5 text-xs font-medium ${
                importNotice.type === "success"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-red-500/20 border-red-500/40 text-red-300"
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
            {/* Import JSON (Track 5.1) */}
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
                <Upload className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium text-sm">
                    {t("settings.importData")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {t("settings.importDesc")}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-white/40 ${isRtl ? "rotate-180" : ""}`}
              />
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={() => exportData("json")}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium text-sm">
                    {t("settings.exportJson")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {isRtl ? "نسخة احتياطية كاملة لبياناتك" : "Full backup of all entries"}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-white/40 ${isRtl ? "rotate-180" : ""}`}
              />
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={() => exportData("csv")}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-pink-400" />
                <div>
                  <p className="text-white font-medium text-sm">
                    {t("settings.exportCsv")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {isRtl ? "ملف جداول بيانات متوافق مع برامج الجداول" : "Excel-compatible spreadsheet with Arabic support"}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-white/40 ${isRtl ? "rotate-180" : ""}`}
              />
            </button>

            {/* Clear All Data */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-red-500/10 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-400 font-medium text-sm">
                    {t("settings.clearAllData")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {t("settings.clearDesc")}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-red-400/50 ${isRtl ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </motion.div>

        {/* Wellness & Crisis Helplines (Track 2.1) */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <div className="glass rounded-2xl overflow-hidden shadow-sm border border-purple-500/20">
            <button
              type="button"
              onClick={() => setShowHelplines(!showHelplines)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <HeartHandshake className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium text-sm">
                    {t("helpline.title")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {t("helpline.subtitle")}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-purple-300 transition-transform ${
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
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-emerald-400" />
                      <span>{t("helpline.egyptMental")}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/20">
                      16328
                    </span>
                  </a>

                  <a
                    href="tel:123"
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-red-400" />
                      <span>{t("helpline.egyptEmergency")}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-red-300 px-2 py-0.5 rounded-full bg-red-500/20">
                      123
                    </span>
                  </a>

                  <a
                    href="tel:988"
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white"
                  >
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-blue-400" />
                      <span>{t("helpline.international")}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-300 px-2 py-0.5 rounded-full bg-blue-500/20">
                      988
                    </span>
                  </a>

                  <p className="text-white/50 text-[11px] pt-1 leading-relaxed">
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
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2.5">
            {t("feedback.title")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm">
            <Link
              href="/feedback"
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium text-sm">
                    {t("settings.sendFeedback")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {t("settings.feedbackDesc")}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-purple-400/50 ${
                  isRtl ? "rotate-180" : ""
                }`}
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
          <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2.5">
            {t("settings.about")}
          </h2>
          <div className="glass rounded-2xl overflow-hidden shadow-sm divide-y divide-white/10">
            <div className="p-4 flex items-center gap-3">
              <Info className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium text-sm">{t("app.title")}</p>
                <p className="text-white/60 text-xs">{t("settings.version")}</p>
              </div>
            </div>

            <Link
              href="/privacy"
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <p className="text-white font-medium text-sm">
                  {t("legal.privacyPolicy")}
                </p>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-white/40 ${isRtl ? "rotate-180" : ""}`}
              />
            </Link>

            <Link
              href="/terms"
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors text-start"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <p className="text-white font-medium text-sm">
                  {t("legal.termsOfService")}
                </p>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-white/40 ${isRtl ? "rotate-180" : ""}`}
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
                className="w-full max-w-sm glass-modal rounded-3xl border border-white/20 p-6 text-center shadow-2xl text-white"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold mb-1">
                  {t("settings.clearConfirm")}
                </h3>
                <p className="text-white/60 text-xs mb-5">
                  {t("settings.clearWarning")}
                </p>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors"
                  >
                    {t("settings.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearData}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors"
                  >
                    {t("settings.deleteAll")}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Set PIN Modal (Track 1.2) */}
          {showPinModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                className="w-full max-w-xs glass-modal rounded-3xl border border-white/20 p-6 text-center shadow-2xl text-white"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold mb-1">
                  {pinStep === "enter" ? t("lock.setPin") : t("lock.confirmPin")}
                </h3>
                <p className="text-white/60 text-xs mb-4">
                  {pinStep === "enter"
                    ? t("lock.subtitle")
                    : t("lock.confirmPin")}
                </p>

                <input
                  type="password"
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
                  className="w-32 py-2 text-center tracking-[1em] text-xl font-bold bg-white/10 rounded-xl border border-white/20 outline-none focus:border-purple-400 mx-auto block mb-3 text-white"
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
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
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
                    className="flex-1 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
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
