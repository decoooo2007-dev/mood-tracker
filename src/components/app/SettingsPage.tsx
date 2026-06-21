"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useAuth } from "@/lib/providers";
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Trash2,
  Info,
  ChevronRight,
  Loader2,
  MessageSquare,
  Shield,
  FileText,
  ExternalLink,
} from "lucide-react";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import FeedbackForm from "@/components/ui/FeedbackForm";
import { t, tmood, translations, Locale } from "@/lib/i18n/translations";

export default function SettingsPage() {
  const { settings, updateSettings, getStats, clearAllData, isUpdating, isLoading } = useSyncStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");

  // Get locale from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("moodflow-locale") as Locale;
    if (stored === "en" || stored === "ar") {
      setLocale(stored);
    }
  }, []);

  const stats = getStats();

  // Default settings
  const currentSettings = settings || {
    theme: "dark" as const,
    notifications: true,
    reminderTime: "21:00",
    language: "en",
    exportFormat: "json" as const,
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to delete all your data? This cannot be undone.")) {
      clearAllData();
      setShowClearConfirm(false);
    }
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
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">{t("settings.title")}</h1>
          <p className="text-white/60">{t("settings.customize")}</p>
        </motion.div>

        {/* Appearance */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
            {t("settings.appearance")}
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {currentSettings.theme === "dark" ? (
                  <Moon className="w-5 h-5 text-purple-400" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-400" />
                )}
                <div>
                  <p className="text-white font-medium">{t("settings.theme")}</p>
                  <p className="text-white/60 text-sm">{t("settings.themeDesc")}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSettings({ theme: "dark" })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentSettings.theme === "dark"
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {t("settings.dark")}
                </button>
                <button
                  onClick={() => updateSettings({ theme: "light" })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentSettings.theme === "light"
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                  disabled
                >
                  {t("settings.light")}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
            {t("settings.reminders")}
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">{t("settings.dailyReminder")}</p>
                  <p className="text-white/60 text-sm">{t("settings.reminderDesc")}</p>
                </div>
              </div>
              <button
                onClick={() => updateSettings({ notifications: !currentSettings.notifications })}
                className={`w-12 h-7 rounded-full transition-all relative ${
                  currentSettings.notifications ? "bg-purple-500" : "bg-white/20"
                }`}
              >
                <motion.div
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                  animate={{ left: currentSettings.notifications ? "26px" : "4px" }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            {currentSettings.notifications && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-sm">{t("settings.remindAt")}</span>
                  <input
                    type="time"
                    value={currentSettings.reminderTime}
                    onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                    className="px-3 py-2 bg-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Feedback */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
            {t("feedback.title")}
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
            <button
              onClick={() => setShowFeedback(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-purple-500/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-medium">{t("settings.sendFeedback")}</p>
                  <p className="text-white/60 text-sm">{t("settings.feedbackDesc")}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/50" />
            </button>
          </div>
        </motion.div>

        {/* Clear Data */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
            {t("settings.data")}
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-red-500/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-400" />
                <div className="text-left">
                  <p className="text-red-400 font-medium">{t("settings.clearAllData")}</p>
                  <p className="text-white/60 text-sm">{t("settings.clearDesc")}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-red-400/50" />
            </button>
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
            {t("settings.statistics")}
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.totalEntries}</p>
                <p className="text-white/60 text-sm">{t("settings.totalEntries")}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.longestStreak}</p>
                <p className="text-white/60 text-sm">{t("settings.longestStreak")}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.averageMood.toFixed(1)}</p>
                <p className="text-white/60 text-sm">{t("settings.avgMood")}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{tmood(stats.mostCommonMood)}</p>
                <p className="text-white/60 text-sm">{t("settings.mostCommon")}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* About */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
            {t("settings.about")}
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
            {/* App Info */}
            <div className="p-4 flex items-center gap-3">
              <Info className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">MoodFlow</p>
                <p className="text-white/60 text-sm">{t("settings.version")}</p>
              </div>
            </div>

            <div className="border-t border-white/10" />

            {/* Legal Links */}
            <a
              href="/privacy"
              className="w-full p-4 flex items-center justify-between hover:bg-purple-500/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-medium">{t("legal.privacyPolicy")}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/50" />
            </a>

            <div className="border-t border-white/10" />

            <a
              href="/terms"
              className="w-full p-4 flex items-center justify-between hover:bg-purple-500/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-medium">{t("legal.termsOfService")}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/50" />
            </a>
          </div>
        </motion.div>

        {/* Clear Data Confirmation Modal */}
        {showClearConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              className="w-full max-w-sm backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-2">{t("settings.clearConfirm")}</h3>
              <p className="text-white/60 mb-6">
                {t("settings.clearWarning")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
                >
                  {t("settings.cancel")}
                </button>
                <button
                  onClick={handleClearData}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
                >
                  {t("settings.deleteAll")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Feedback Form Modal */}
        <FeedbackForm
          isOpen={showFeedback}
          onClose={() => setShowFeedback(false)}
          locale={locale}
        />
      </div>

      <Navigation />
    </GlassBackground>
  );
}