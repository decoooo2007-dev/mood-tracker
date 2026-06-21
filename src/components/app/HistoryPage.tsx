"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useAuth } from "@/lib/providers";
import {
  Calendar,
  Filter,
  Search,
  ChevronDown,
  Trash2,
  BookOpen,
  Clock,
  X,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { MoodType } from "@/types/mood";
import { moodOptions, getRelativeDate, moodToScore, getMoodByLabel } from "@/lib/moods";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import { t, tmood } from "@/lib/i18n/translations";

const moodColors: Record<MoodType, string> = {
  Happy: "#4ADE80",
  Calm: "#60A5FA",
  Sad: "#818CF8",
  Frustrated: "#F87171",
  Tired: "#A78BFA",
};

export default function HistoryPage() {
  const { entries, deleteEntry, getStats, isLoading, isDeleting } = useSyncStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState<MoodType | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const stats = getStats();

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterMood && entry.mood !== filterMood) return false;
      if (filterTag && !entry.tags.includes(filterTag)) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          entry.text.toLowerCase().includes(query) ||
          entry.mood.toLowerCase().includes(query) ||
          entry.tags.some((t) => t.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [entries, filterMood, filterTag, searchQuery]);

  const moodDistributionData = useMemo(() => {
    return Object.entries(stats.moodDistribution).map(([mood, count]) => ({
      name: mood,
      value: count,
      color: moodColors[mood as MoodType],
    })).filter(d => d.value > 0);
  }, [stats]);

  const handleDelete = (id: string) => {
    if (confirm(t("history.deleteConfirm"))) {
      deleteEntry(id);
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
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-white mb-2">{t("history.title")}</h1>
          <p className="text-white/60">{stats.totalEntries} {t("history.entriesRecorded")}</p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          className="grid grid-cols-2 gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20">
            <p className="text-white/60 text-xs mb-1">{t("history.currentStreak")}</p>
            <p className="text-2xl font-bold text-white">{stats.currentStreak} {t("history.days")}</p>
          </div>
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20">
            <p className="text-white/60 text-xs mb-1">{t("history.longestStreak")}</p>
            <p className="text-2xl font-bold text-white">{stats.longestStreak} {t("history.days")}</p>
          </div>
        </motion.div>

        {/* Mood Distribution */}
        {moodDistributionData.length > 0 && (
          <motion.div
            className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 shadow-2xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              {t("history.moodDistribution")}
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moodDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {moodDistributionData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 15, 30, 0.9)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {moodDistributionData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-white/60">{tmood(entry.name)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search and Filter */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder={t("history.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 backdrop-blur-sm bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 backdrop-blur-sm rounded-xl border transition-all ${
                showFilters || filterMood || filterTag
                  ? "bg-purple-500/30 border-purple-500/50 text-white"
                  : "bg-white/10 border-white/20 text-white/60"
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-4 backdrop-blur-sm bg-white/10 rounded-xl border border-white/20">
                  <div className="mb-3">
                    <span className="text-xs text-white/60 mb-2 block">{t("history.filterByMood")}</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilterMood(null)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          !filterMood
                            ? "bg-purple-500/50 text-white"
                            : "bg-white/10 text-white/60"
                        }`}
                      >
                        {t("history.all")}
                      </button>
                      {moodOptions.map((mood) => (
                        <button
                          key={mood.label}
                          onClick={() => setFilterMood(filterMood === mood.label ? null : mood.label as MoodType)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                            filterMood === mood.label
                              ? "bg-purple-500/50 text-white"
                              : "bg-white/10 text-white/60 hover:bg-white/20"
                          }`}
                        >
                          <span className="emoji">{mood.emoji}</span>
                          {tmood(mood.label)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {allTags.length > 0 && (
                    <div>
                      <span className="text-xs text-white/60 mb-2 block">{t("history.filterByTag")}</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setFilterTag(null)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            !filterTag
                              ? "bg-purple-500/50 text-white"
                              : "bg-white/10 text-white/60"
                          }`}
                        >
                          {t("history.all")}
                        </button>
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              filterTag === tag
                                ? "bg-purple-500/50 text-white"
                                : "bg-white/10 text-white/60 hover:bg-white/20"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Entries List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              {filteredEntries.length} {filteredEntries.length === 1 ? t("history.entry") : t("history.entries")}
            </h2>
          </div>

          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 text-center">
                <span className="text-5xl mb-4 block emoji">📝</span>
                <h3 className="text-white font-medium mb-2">{t("history.noEntries")}</h3>
                <p className="text-white/60 text-sm">
                  {searchQuery || filterMood || filterTag
                    ? t("history.adjustFilters")
                    : t("history.startTracking")}
                </p>
              </div>
            ) : (
              filteredEntries.map((entry, i) => {
                const mood = getMoodByLabel(entry.mood);
                return (
                  <motion.div
                    key={entry.id}
                    className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setSelectedEntry(selectedEntry === entry.id ? null : entry.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl emoji">{mood.emoji}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-medium text-white">{tmood(entry.mood)}</span>
                            <span className="text-white/40 text-sm">·</span>
                            <span className="text-white/40 text-sm">{getRelativeDate(entry.date)}</span>
                            <span className="text-white/40 text-sm">·</span>
                            <span className="text-white/40 text-sm">{entry.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50">{entry.intensity}%</span>
                          <ChevronDown
                            className={`w-4 h-4 text-white/40 transition-transform ${
                              selectedEntry === entry.id ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      <AnimatePresence>
                        {selectedEntry === entry.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <p className="text-white/80 leading-relaxed mb-3">{entry.text}</p>
                              {entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {entry.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/60"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(entry.id);
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 text-sm transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                                {t("history.delete")}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      <Navigation />
    </GlassBackground>
  );
}