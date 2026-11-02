"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useLanguage } from "@/lib/providers";
import {
  Calendar,
  Filter,
  Search,
  ChevronDown,
  Trash2,
  BookOpen,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { MoodType } from "@/types/mood";
import { moodOptions, getRelativeDate, getMoodByLabel } from "@/lib/moods";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import EditEntryModal from "@/components/ui/EditEntryModal";
import MoodHeatmap from "@/components/ui/MoodHeatmap";
import AchievementBadges from "@/components/ui/AchievementBadges";

// Dynamic Recharts with ssr: false
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const PieChart = dynamic(
  () => import("recharts").then((mod) => mod.PieChart),
  { ssr: false }
);
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), {
  ssr: false,
});
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), {
  ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), {
  ssr: false,
});

const moodColors: Record<MoodType, string> = {
  Happy: "#4ADE80",
  Calm: "#60A5FA",
  Sad: "#818CF8",
  Frustrated: "#F87171",
  Tired: "#A78BFA",
};

export default function HistoryPage() {
  const {
    entries,
    deleteEntry,
    updateEntry,
    getStats,
    isLoading,
    isUpdating,
  } = useSyncStore();
  const { t, tmood, ttag, isRtl, locale } = useLanguage();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState<MoodType | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const stats = getStats();

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((e) => (e.tags || []).forEach((tag) => tags.add(tag)));
    return Array.from(tags);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filterMood && entry.mood !== filterMood) return false;
      if (filterTag && !entry.tags?.includes(filterTag)) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        return (
          entry.text?.toLowerCase().includes(query) ||
          entry.mood.toLowerCase().includes(query) ||
          tmood(entry.mood).toLowerCase().includes(query) ||
          entry.tags?.some(
            (tag) =>
              tag.toLowerCase().includes(query) ||
              ttag(tag).toLowerCase().includes(query)
          )
        );
      }
      return true;
    });
  }, [entries, filterMood, filterTag, searchQuery, tmood, ttag]);

  const moodDistributionData = useMemo(() => {
    return Object.entries(stats.moodDistribution)
      .map(([mood, count]) => ({
        id: mood,
        name: tmood(mood),
        value: count,
        color: moodColors[mood as MoodType],
      }))
      .filter((d) => d.value > 0);
  }, [stats, tmood]);

  const confirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteEntry(entryToDelete);
      if (selectedEntry === entryToDelete) {
        setSelectedEntry(null);
      }
      setEntryToDelete(null);
    } catch {
      // Handled in mutation
    }
  };

  const handleSaveEdit = async (updates: {
    mood?: MoodType;
    intensity?: number;
    text?: string;
    tags?: string[];
  }) => {
    if (editingEntry) {
      try {
        await updateEntry({ id: editingEntry, ...updates });
        setEditingEntry(null);
      } catch {
        // Handled in mutation
      }
    }
  };

  const getEntryById = (id: string) => entries.find((e) => e.id === id);

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
          className="mb-6"
        >
          <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">
            {t("history.title")}
          </h1>
          <p className="text-white/60 text-sm">
            {stats.totalEntries} {t("history.entriesRecorded")}
          </p>
        </motion.div>

        {/* Competitor Feature: Milestone Badges */}
        <AchievementBadges
          totalEntries={stats.totalEntries}
          longestStreak={stats.longestStreak}
        />

        {/* Competitor Feature: 90-Day 'Year in Pixels' Heatmap */}
        <MoodHeatmap entries={entries} />

        {/* Mood Distribution Pie Chart */}
        {moodDistributionData.length > 0 && (
          <motion.div
            className="glass rounded-3xl p-6 shadow-xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>{t("history.moodDistribution")}</span>
            </h2>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={moodDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {moodDistributionData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 15, 30, 0.95)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {moodDistributionData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-white/70">
                    {tmood(entry.name)} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Search and Filters */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex gap-2.5">
            <div className="flex-1 relative">
              <Search
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none z-10 ${
                  isRtl ? "right-4" : "left-4"
                }`}
              />
              <input
                type="text"
                placeholder={t("history.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2.5 backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 text-sm ${
                  isRtl ? "pr-11 pl-4" : "pl-11 pr-4"
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-2xl border transition-all ${
                showFilters || filterMood || filterTag
                  ? "bg-purple-500/30 border-purple-500/50 text-white"
                  : "bg-white/10 border-white/20 text-white/60 hover:text-white"
              }`}
              aria-label="Filter"
            >
              <Filter className="w-4 h-4" />
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
                <div className="mt-3 p-4 backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 space-y-3">
                  <div>
                    <span className="text-xs text-white/60 mb-2 block font-medium">
                      {t("history.filterByMood")}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFilterMood(null)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          !filterMood
                            ? "bg-purple-500 text-white shadow-sm"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {t("history.all")}
                      </button>
                      {moodOptions.map((mood) => (
                        <button
                          key={mood.label}
                          type="button"
                          onClick={() =>
                            setFilterMood(
                              filterMood === mood.label
                                ? null
                                : (mood.label as MoodType)
                            )
                          }
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                            filterMood === mood.label
                              ? "bg-purple-500 text-white shadow-sm"
                              : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          <span>{mood.emoji}</span>
                          <span>{tmood(mood.label)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {allTags.length > 0 && (
                    <div>
                      <span className="text-xs text-white/60 mb-2 block font-medium">
                        {t("history.filterByTag")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFilterTag(null)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            !filterTag
                              ? "bg-purple-500 text-white shadow-sm"
                              : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          {t("history.all")}
                        </button>
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setFilterTag(filterTag === tag ? null : tag)
                            }
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              filterTag === tag
                                ? "bg-purple-500 text-white shadow-sm"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                          >
                            {ttag(tag)}
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

        {/* Entries List with 2-line Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>
                {filteredEntries.length}{" "}
                {filteredEntries.length === 1
                  ? t("history.entry")
                  : t("history.entries")}
              </span>
            </h2>
          </div>

          <div className="space-y-3">
            {filteredEntries.length === 0 ? (
              <div className="glass rounded-3xl p-8 text-center shadow-xl">
                <span className="text-5xl mb-3 block">📝</span>
                <h3 className="text-white font-semibold mb-1 text-base">
                  {t("history.noEntries")}
                </h3>
                <p className="text-white/60 text-xs max-w-xs mx-auto">
                  {searchQuery || filterMood || filterTag
                    ? t("history.adjustFilters")
                    : t("history.startTracking")}
                </p>
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const mood = getMoodByLabel(entry.mood);
                const isExpanded = selectedEntry === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="glass rounded-2xl border border-white/10 overflow-hidden transition-colors hover:border-white/20"
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() =>
                        setSelectedEntry(isExpanded ? null : entry.id)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{mood.emoji}</span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white text-sm">
                                {tmood(entry.mood)}
                              </span>
                              <span className="text-white/40 text-xs">·</span>
                              <span className="text-white/50 text-xs">
                                {getRelativeDate(entry.date, locale)}
                              </span>
                              {entry.time && (
                                <>
                                  <span className="text-white/40 text-xs">·</span>
                                  <span className="text-white/50 text-xs">
                                    {entry.time}
                                  </span>
                                </>
                              )}
                            </div>
                            {/* 2-Line Truncated Preview on Collapsed Card */}
                            {!isExpanded && entry.text && (
                              <p className="text-white/60 text-xs line-clamp-2 mt-1">
                                {entry.text}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50 font-medium">
                            {entry.intensity}%
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 text-white/40 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Expanded View */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-white/10">
                              {entry.text && (
                                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap mb-3">
                                  {entry.text}
                                </p>
                              )}

                              {entry.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {entry.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] text-white/60"
                                    >
                                      #{ttag(tag)}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingEntry(entry.id);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-xl text-purple-300 text-xs font-medium transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>{t("history.editEntry")}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEntryToDelete(entry.id);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-300 text-xs font-medium transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{t("history.delete")}</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {entryToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass-modal border border-white/20 rounded-3xl p-6 text-center shadow-2xl text-white"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold mb-1">
                {t("history.deleteConfirm")}
              </h3>
              <p className="text-xs text-white/60 mb-5">
                {isRtl
                  ? "لا يمكن التراجع عن هذا الإجراء."
                  : "This action cannot be undone."}
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors"
                >
                  {t("settings.cancel")}
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-medium transition-colors"
                >
                  {t("history.delete")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Navigation />

      {/* Edit Entry Modal */}
      <EditEntryModal
        isOpen={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        entry={editingEntry ? getEntryById(editingEntry) || null : null}
        onSave={handleSaveEdit}
        isSaving={isUpdating}
      />
    </GlassBackground>
  );
}
