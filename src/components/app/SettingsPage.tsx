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
  Download,
  Trash2,
  Info,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { settings, entries, updateSettings, getStats, clearAllData, isUpdating } = useSyncStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
    }
  }, [user, authLoading]);

  const stats = getStats();

  const handleExport = (format: "json" | "csv") => {
    const data = entries;
    let content: string;

    if (format === "json") {
      content = JSON.stringify(data, null, 2);
    } else {
      const headers = ["Date", "Time", "Mood", "Intensity", "Text", "Tags"];
      const rows = data.map((e) => [
        e.date,
        e.time,
        e.mood,
        e.intensity.toString(),
        `"${e.text.replace(/"/g, '""')}"`,
        e.tags.join("; "),
      ]);
      content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    }

    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mood-journal-${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportSuccess(format);
    setTimeout(() => setExportSuccess(null), 2000);
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to delete all your data? This cannot be undone.")) {
      clearAllData();
      setShowClearConfirm(false);
    }
  };

  if (authLoading) {
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
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-white/60">Customize your experience</p>
        </motion.div>

        {/* Appearance */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
            Appearance
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.theme === "dark" ? (
                  <Moon className="w-5 h-5 text-purple-400" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-400" />
                )}
                <div>
                  <p className="text-white font-medium">Theme</p>
                  <p className="text-white/60 text-sm">Choose your preferred look</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSettings({ theme: "dark" })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    settings.theme === "dark"
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => updateSettings({ theme: "light" })}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    settings.theme === "light"
                      ? "bg-purple-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                  disabled
                >
                  Light
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
            Reminders
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Daily Reminder</p>
                  <p className="text-white/60 text-sm">Get reminded to log your mood</p>
                </div>
              </div>
              <button
                onClick={() => updateSettings({ notifications: !settings.notifications })}
                className={`w-12 h-7 rounded-full transition-all relative ${
                  settings.notifications ? "bg-purple-500" : "bg-white/20"
                }`}
              >
                <motion.div
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                  animate={{ left: settings.notifications ? "26px" : "4px" }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
            {settings.notifications && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-sm">Remind at</span>
                  <input
                    type="time"
                    value={settings.reminderTime}
                    onChange={(e) => updateSettings({ reminderTime: e.target.value })}
                    className="px-3 py-2 bg-white/10 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Export */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
            Data
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
            <button
              onClick={() => handleExport("json")}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Export as JSON</p>
                  <p className="text-white/60 text-sm">Full data backup</p>
                </div>
              </div>
              {exportSuccess === "json" ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-white/40" />
              )}
            </button>
            <div className="h-px bg-white/10" />
            <button
              onClick={() => handleExport("csv")}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <p className="text-white font-medium">Export as CSV</p>
                  <p className="text-white/60 text-sm">Spreadsheet compatible</p>
                </div>
              </div>
              {exportSuccess === "csv" ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-white/40" />
              )}
            </button>
            <div className="h-px bg-white/10" />
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full p-4 flex items-center justify-between hover:bg-red-500/10 transition-all"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-400" />
                <div className="text-left">
                  <p className="text-red-400 font-medium">Clear All Data</p>
                  <p className="text-white/60 text-sm">Delete all entries permanently</p>
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
            Statistics
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.totalEntries}</p>
                <p className="text-white/60 text-sm">Total Entries</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.longestStreak}</p>
                <p className="text-white/60 text-sm">Longest Streak</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.averageMood.toFixed(1)}</p>
                <p className="text-white/60 text-sm">Avg Mood Score</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{stats.mostCommonMood}</p>
                <p className="text-white/60 text-sm">Most Common</p>
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
            About
          </h2>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-4">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">MoodFlow</p>
                <p className="text-white/60 text-sm">Version 1.0.0</p>
              </div>
            </div>
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
              <h3 className="text-xl font-bold text-white mb-2">Clear All Data?</h3>
              <p className="text-white/60 mb-6">
                This will permanently delete all {stats.totalEntries} entries. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all"
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>

      <Navigation />
    </GlassBackground>
  );
}