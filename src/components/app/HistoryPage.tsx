"use client";

import { useState, useMemo, useEffect } from "react";
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
  FileText,
  Printer,
  X,
  Plus,
  Pin,
  EyeOff,
  Eye,
  Scale,
  Check,
  RotateCcw,
} from "lucide-react";
import { MoodType } from "@/types/mood";
import {
  moodOptions,
  getRelativeDate,
  getMoodByLabel,
  parseLocalDate,
} from "@/lib/moods";
import { computeTagCorrelations } from "@/lib/sentiment";
import {
  getFactorPreferences,
  buildEditableFactors,
  addCustomFactor,
  renameFactor,
  togglePinFactor,
  toggleHideFactor,
  removeCustomFactor,
  resetFactorPreferences,
  type FactorPreferences,
  type DisplayFactor,
} from "@/lib/factors";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import EditEntryModal from "@/components/ui/EditEntryModal";
import MoodHeatmap from "@/components/ui/MoodHeatmap";
import AchievementBadges from "@/components/ui/AchievementBadges";

// Single consolidated Dynamic Recharts PieChart component with ssr: false
const DynamicMoodPieChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = mod;

      return function MoodPieChartComponent({
        data,
        isLight,
      }: {
        data: { id: string; name: string; value: number; color: string }[];
        isLight: boolean;
      }) {
        return (
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight
                      ? "rgba(255, 255, 255, 0.96)"
                      : "rgba(10, 16, 32, 0.95)",
                    backdropFilter: "blur(10px)",
                    border: isLight
                      ? "1px solid rgba(15, 23, 42, 0.12)"
                      : "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "12px",
                    color: isLight ? "#0F172A" : "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 w-full rounded-2xl bg-white/5 animate-pulse" />
    ),
  }
);

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
    settings,
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
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);

  useEffect(() => {
    setVisibleCount(25);
  }, [searchQuery, filterMood, filterTag]);

  // Editable What Lifts vs. Drains Your Mood state
  const [factorPrefs, setFactorPrefs] = useState<FactorPreferences>({
    renamed: {},
    pinned: [],
    hidden: [],
    customFactors: [],
  });

  useEffect(() => {
    setFactorPrefs(getFactorPreferences());
  }, []);
  const [isAddingFactor, setIsAddingFactor] = useState(false);
  const [newFactorLabel, setNewFactorLabel] = useState("");
  const [newFactorDir, setNewFactorDir] = useState<"lift" | "drain">("lift");
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [showHiddenFactors, setShowHiddenFactors] = useState(false);

  const stats = getStats();
  const isLight = settings.theme === "light";

  const currentMonthName = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      month: "long",
      year: "numeric",
    });
  }, [locale]);

  const currentMonthEntries = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    return entries.filter((e) => {
      const d = parseLocalDate(e.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [entries]);

  const monthlyStats = useMemo(() => {
    if (currentMonthEntries.length === 0) {
      return {
        count: 0,
        avgIntensity: 0,
        moodCounts: {
          Happy: 0,
          Calm: 0,
          Sad: 0,
          Frustrated: 0,
          Tired: 0,
        } as Record<MoodType, number>,
        topTags: [] as { tag: string; count: number }[],
      };
    }
    const moodCounts: Record<MoodType, number> = {
      Happy: 0,
      Calm: 0,
      Sad: 0,
      Frustrated: 0,
      Tired: 0,
    };
    let totalIntensity = 0;
    const tagFrequency: Record<string, number> = {};

    for (const e of currentMonthEntries) {
      if (moodCounts[e.mood] !== undefined) {
        moodCounts[e.mood]++;
      }
      totalIntensity += e.intensity ?? 50;
      (e.tags || []).forEach((tag) => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
      });
    }

    const sortedTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));

    return {
      count: currentMonthEntries.length,
      avgIntensity: Math.round(totalIntensity / currentMonthEntries.length),
      moodCounts,
      topTags: sortedTags,
    };
  }, [currentMonthEntries]);

  const tagCorrelations = useMemo(() => computeTagCorrelations(entries), [entries]);

  const { lifters, drainers, hiddenItems } = useMemo(
    () => buildEditableFactors(tagCorrelations, factorPrefs, ttag),
    [tagCorrelations, factorPrefs, ttag]
  );

  const handleAddFactor = () => {
    const trimmed = newFactorLabel.trim();
    if (!trimmed) return;
    setFactorPrefs(addCustomFactor(trimmed, newFactorDir));
    setNewFactorLabel("");
    setIsAddingFactor(false);
  };

  const handleCommitRename = (key: string) => {
    setFactorPrefs(renameFactor(key, renameDraft));
    setRenamingKey(null);
    setRenameDraft("");
  };

  const renderFactorRow = (item: DisplayFactor, isPositive: boolean) => {
    const absDelta = Math.min(100, Math.max(12, Math.abs(item.delta) * 2.5));
    const isRenaming = renamingKey === item.key;

    return (
      <div key={item.key} className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {isRenaming ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCommitRename(item.key);
                    } else if (e.key === "Escape") {
                      setRenamingKey(null);
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg recessed-well theme-text-primary text-xs outline-none w-full max-w-[160px]"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleCommitRename(item.key)}
                  className="p-1 rounded-md accent-gradient-btn"
                  aria-label="Save factor name"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <span className="theme-text-primary font-semibold truncate">
                  {item.label}
                </span>
                {item.count > 0 ? (
                  <span className="text-[10px] theme-text-muted shrink-0">
                    ({item.count} {t("factors.checkins")})
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full accent-pill shrink-0">
                    {t("factors.customBadge")}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`font-bold text-xs me-1 ${
                isPositive ? "stat-positive" : "stat-negative"
              }`}
            >
              {item.delta > 0 ? `+${item.delta}%` : `${item.delta}%`}
            </span>

            <button
              type="button"
              onClick={() => setFactorPrefs(togglePinFactor(item.key))}
              className={`p-1 rounded-md transition-colors ${
                item.isPinned
                  ? "accent-pill"
                  : "bg-white/5 theme-text-muted hover:opacity-100"
              }`}
              title={isRtl ? "تثبيت" : "Pin"}
              aria-label={isRtl ? "تثبيت" : "Pin factor"}
            >
              <Pin className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => {
                setRenamingKey(item.key);
                setRenameDraft(item.label);
              }}
              className="p-1 rounded-md bg-white/5 theme-text-muted hover:opacity-100 transition-colors"
              title={isRtl ? "تعديل الاسم" : "Rename"}
              aria-label={isRtl ? "تعديل الاسم" : "Rename factor"}
            >
              <Pencil className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => setFactorPrefs(toggleHideFactor(item.key))}
              className="p-1 rounded-md bg-white/5 theme-text-muted hover:opacity-100 transition-colors"
              title={isRtl ? "إخفاء" : "Hide"}
              aria-label={isRtl ? "إخفاء" : "Hide factor"}
            >
              <EyeOff className="w-3 h-3" />
            </button>

            {item.isCustom && (
              <button
                type="button"
                onClick={() =>
                  setFactorPrefs(removeCustomFactor(item.customId || item.key))
                }
                className="p-1 rounded-md bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition-colors"
                title={t("history.delete")}
                aria-label={t("history.delete")}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isPositive ? "bg-emerald-400" : "bg-rose-400"
            }`}
            style={{ width: `${absDelta}%` }}
          />
        </div>
      </div>
    );
  };

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
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6"
        >
          <div>
            <h1 className="text-3xl font-extrabold theme-text-primary mb-1 tracking-tight">
              {t("history.title")}
            </h1>
            <p className="theme-text-secondary text-sm">
              {stats.totalEntries} {t("history.entriesRecorded")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 accent-pill rounded-2xl text-xs font-semibold transition-opacity hover:opacity-90 shadow-sm self-start sm:self-auto"
          >
            <FileText className="w-4 h-4" />
            <span>{t("report.button")}</span>
          </button>
        </motion.div>

        {/* Milestone Badges */}
        <AchievementBadges
          totalEntries={stats.totalEntries}
          longestStreak={stats.longestStreak}
        />

        {/* Redesigned Readable Mood Heatmap */}
        <MoodHeatmap entries={entries} />

        {/* Editable "What Lifts vs. Drains Your Mood" Card */}
        <motion.div
          className="glass rounded-3xl p-5 sm:p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl accent-pill flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h2 className="theme-text-primary font-bold text-base">
                  {t("factors.title")}
                </h2>
                <p className="theme-text-muted text-xs">{t("factors.subtitle")}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddingFactor((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl accent-gradient-btn text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("factors.addCustom")}</span>
              </button>

              {hiddenItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHiddenFactors((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl recessed-well text-xs font-medium theme-text-secondary"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>
                    {t("factors.showHidden")} ({hiddenItems.length})
                  </span>
                </button>
              )}

              {(Object.keys(factorPrefs.renamed).length > 0 ||
                factorPrefs.pinned.length > 0 ||
                factorPrefs.hidden.length > 0 ||
                factorPrefs.customFactors.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setFactorPrefs(resetFactorPreferences());
                    setShowHiddenFactors(false);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl recessed-well text-xs font-medium theme-text-muted hover:opacity-100"
                  title={t("factors.reset")}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t("factors.reset")}</span>
                </button>
              )}
            </div>
          </div>

          {/* Add Custom Factor Inline Form */}
          <AnimatePresence>
            {isAddingFactor && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="p-3 recessed-well rounded-2xl flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newFactorLabel}
                    onChange={(e) => setNewFactorLabel(e.target.value)}
                    placeholder={t("factors.newPlaceholder")}
                    className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 theme-text-primary text-xs outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFactor();
                      }
                    }}
                    autoFocus
                  />
                  <div className="inline-flex rounded-xl bg-white/5 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setNewFactorDir("lift")}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${
                        newFactorDir === "lift"
                          ? "bg-emerald-500 text-white keep-white"
                          : "theme-text-secondary"
                      }`}
                    >
                      {t("factors.positiveDelta")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewFactorDir("drain")}
                      className={`px-2.5 py-1 rounded-lg font-semibold ${
                        newFactorDir === "drain"
                          ? "bg-rose-500 text-white keep-white"
                          : "theme-text-secondary"
                      }`}
                    >
                      {t("factors.negativeDelta")}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFactor}
                    className="px-3 py-1.5 rounded-xl accent-gradient-btn text-xs font-semibold"
                  >
                    {t("tag.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingFactor(false);
                      setNewFactorLabel("");
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 theme-text-secondary text-xs"
                  >
                    {t("tag.cancel")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: What Lifts You */}
            <div className="p-4 recessed-well rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold stat-positive">
                  🌟 {t("factors.lifters")}
                </span>
                <span className="text-[10px] theme-text-muted">
                  {t("factors.positiveDelta")}
                </span>
              </div>

              {lifters.length === 0 ? (
                <p className="text-xs theme-text-muted py-2">
                  {t("factors.emptyLifters")}
                </p>
              ) : (
                lifters.slice(0, 5).map((item) => renderFactorRow(item, true))
              )}
            </div>

            {/* Right: What Drains You */}
            <div className="p-4 recessed-well rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold stat-negative">
                  ⚡ {t("factors.drainers")}
                </span>
                <span className="text-[10px] theme-text-muted">
                  {t("factors.negativeDelta")}
                </span>
              </div>

              {drainers.length === 0 ? (
                <p className="text-xs theme-text-muted py-2">
                  {t("factors.emptyDrainers")}
                </p>
              ) : (
                drainers.slice(0, 5).map((item) => renderFactorRow(item, false))
              )}
            </div>
          </div>

          {/* Hidden Factors Drawer */}
          <AnimatePresence>
            {showHiddenFactors && hiddenItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 pt-3 border-t border-white/10"
              >
                <div className="flex flex-wrap gap-2">
                  {hiddenItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFactorPrefs(toggleHideFactor(item.key))}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full recessed-well text-xs theme-text-secondary hover:opacity-100"
                    >
                      <Eye className="w-3 h-3" />
                      <span>
                        {t("factors.restore")}: {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Mood Distribution Pie Chart */}
        {moodDistributionData.length > 0 && (
          <motion.div
            className="glass rounded-3xl p-6 shadow-xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 className="text-base font-semibold theme-text-primary mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: "var(--accent-solid)" }} />
              <span>{t("history.moodDistribution")}</span>
            </h2>
            <DynamicMoodPieChart
              data={moodDistributionData}
              isLight={isLight}
            />
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {moodDistributionData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs theme-text-secondary">
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
                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 theme-text-muted pointer-events-none z-10 ${
                  isRtl ? "right-4" : "left-4"
                }`}
              />
              <input
                type="text"
                placeholder={t("history.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2.5 glass rounded-2xl theme-text-primary placeholder-white/40 outline-none text-sm ${
                  isRtl ? "pr-11 pl-4" : "pl-11 pr-4"
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-2xl border transition-all ${
                showFilters || filterMood || filterTag
                  ? "accent-pill"
                  : "glass theme-text-secondary"
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
                <div className="mt-3 p-4 glass rounded-2xl space-y-3">
                  <div>
                    <span className="text-xs theme-text-secondary mb-2 block font-medium">
                      {t("history.filterByMood")}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setFilterMood(null)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          !filterMood
                            ? "accent-tag-active"
                            : "recessed-well theme-text-secondary"
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
                              ? "accent-tag-active"
                              : "recessed-well theme-text-secondary"
                          }`}
                        >
                          <span className="emoji">{mood.emoji}</span>
                          <span>{tmood(mood.label)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {allTags.length > 0 && (
                    <div>
                      <span className="text-xs theme-text-secondary mb-2 block font-medium">
                        {t("history.filterByTag")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFilterTag(null)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            !filterTag
                              ? "accent-tag-active"
                              : "recessed-well theme-text-secondary"
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
                                ? "accent-tag-active"
                                : "recessed-well theme-text-secondary"
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

        {/* Entries List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-semibold theme-text-primary flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: "var(--accent-solid)" }} />
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
                <span className="text-5xl mb-3 block emoji">📝</span>
                <h3 className="theme-text-primary font-semibold mb-1 text-base">
                  {t("history.noEntries")}
                </h3>
                <p className="theme-text-secondary text-xs max-w-xs mx-auto">
                  {searchQuery || filterMood || filterTag
                    ? t("history.adjustFilters")
                    : t("history.startTracking")}
                </p>
              </div>
            ) : (
              <>
                {filteredEntries.slice(0, visibleCount).map((entry) => {
                  const mood = getMoodByLabel(entry.mood);
                  const isExpanded = selectedEntry === entry.id;

                  return (
                    <div
                      key={entry.id}
                      className="glass history-entry-card rounded-2xl overflow-hidden transition-colors"
                    >
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() =>
                          setSelectedEntry(isExpanded ? null : entry.id)
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl emoji">{mood.emoji}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold theme-text-primary text-sm">
                                  {tmood(entry.mood)}
                                </span>
                                <span className="theme-text-muted text-xs">·</span>
                                <span className="theme-text-muted text-xs">
                                  {getRelativeDate(entry.date, locale)}
                                </span>
                                {entry.time && (
                                  <>
                                    <span className="theme-text-muted text-xs">·</span>
                                    <span className="theme-text-muted text-xs">
                                      {entry.time}
                                    </span>
                                  </>
                                )}
                              </div>
                              {!isExpanded && entry.text && (
                                <p className="theme-text-secondary text-xs line-clamp-2 mt-1">
                                  {entry.text}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs theme-text-secondary font-medium">
                              {entry.intensity}%
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 theme-text-muted transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>

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
                                  <p className="theme-text-secondary text-sm leading-relaxed whitespace-pre-wrap mb-3">
                                    {entry.text}
                                  </p>
                                )}

                                {entry.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {entry.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="px-2 py-0.5 accent-pill rounded-full text-[10px]"
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
                                    className="flex items-center gap-1.5 px-3 py-1.5 accent-pill rounded-xl text-xs font-medium transition-opacity hover:opacity-90"
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
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-xl stat-negative text-xs font-medium transition-colors"
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
                })}

                {filteredEntries.length > visibleCount && (
                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 25)}
                      className="px-5 py-2.5 rounded-2xl glass theme-text-primary text-xs font-semibold hover:opacity-90 transition-opacity shadow-md"
                    >
                      {isRtl
                        ? `عرض المزيد (${filteredEntries.length - visibleCount})`
                        : `Show More (${filteredEntries.length - visibleCount})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Modal */}
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
              className="w-full max-w-sm glass-modal border border-white/20 rounded-3xl p-6 text-center shadow-2xl"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold mb-1 theme-text-primary">
                {t("history.deleteConfirm")}
              </h3>
              <p className="text-xs theme-text-secondary mb-5">
                {isRtl
                  ? "لا يمكن التراجع عن هذا الإجراء."
                  : "This action cannot be undone."}
              </p>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl recessed-well theme-text-primary text-sm font-medium transition-opacity hover:opacity-90"
                >
                  {t("settings.cancel")}
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white keep-white text-sm font-medium transition-colors"
                >
                  {t("history.delete")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Monthly Wellness Report Modal */}
      <AnimatePresence>
        {isReportOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="printable-report w-full max-w-xl glass-modal border border-white/20 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10 no-print">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
                  <span className="font-bold text-sm theme-text-primary">
                    {t("report.title")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl accent-gradient-btn text-xs font-semibold shadow"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{t("report.print")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(false)}
                    className="p-1.5 rounded-xl recessed-well theme-text-secondary hover:opacity-100"
                    aria-label={t("report.close")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mb-6 text-center">
                <h2 className="text-2xl font-extrabold theme-text-primary mb-1">
                  {t("report.title")}
                </h2>
                <p className="text-sm font-medium" style={{ color: "var(--accent-solid)" }}>
                  {currentMonthName}
                </p>
                <p className="theme-text-secondary text-xs mt-1">
                  {t("report.monthOverview")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3.5 recessed-well rounded-2xl text-center">
                  <p className="text-xs theme-text-secondary mb-1">
                    {t("report.totalCheckins")}
                  </p>
                  <p className="text-2xl font-bold theme-text-primary">
                    {monthlyStats.count}
                  </p>
                </div>
                <div className="p-3.5 recessed-well rounded-2xl text-center">
                  <p className="text-xs theme-text-secondary mb-1">
                    {t("report.avgScore")}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: "var(--accent-solid)" }}>
                    {monthlyStats.count > 0 ? `${monthlyStats.avgIntensity}%` : "-"}
                  </p>
                </div>
              </div>

              <div className="mb-6 p-4 recessed-well rounded-2xl">
                <h3 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-3">
                  {t("history.moodDistribution")}
                </h3>
                <div className="space-y-2">
                  {moodOptions.map((mood) => {
                    const count = monthlyStats.moodCounts[mood.label as MoodType] || 0;
                    const pct =
                      monthlyStats.count > 0
                        ? Math.round((count / monthlyStats.count) * 100)
                        : 0;
                    return (
                      <div
                        key={mood.label}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base emoji">{mood.emoji}</span>
                          <span className="theme-text-primary font-medium">
                            {tmood(mood.label)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="theme-text-muted">{count}</span>
                          <span className="font-semibold theme-text-primary w-10 text-end">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {monthlyStats.topTags.length > 0 && (
                <div className="mb-6 p-4 recessed-well rounded-2xl">
                  <h3 className="text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-3">
                    {t("report.topTags")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {monthlyStats.topTags.map(({ tag, count }) => (
                      <span
                        key={tag}
                        className="px-3 py-1 accent-pill rounded-xl text-xs font-medium"
                      >
                        #{ttag(tag)} ({count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 text-center">
                <p className="text-[11px] theme-text-muted">
                  {t("disclaimer.footerNotice")}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Navigation />

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
