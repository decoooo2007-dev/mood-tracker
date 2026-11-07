"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useAuth, useLanguage } from "@/lib/providers";
import {
  Heart,
  BookOpen,
  Calendar,
  TrendingUp,
  Plus,
  Sparkles,
  Flame,
  Loader2,
  Wind,
  ArrowRight,
} from "lucide-react";
import { MoodType } from "@/types/mood";
import {
  moodOptions,
  commonTags,
  getRelativeDate,
  isToday,
  getWeeklyData,
  getCustomTags,
  saveCustomTag,
  getMoodPrompts,
} from "@/lib/moods";
import { analyzeSentiment, generateWeeklyInsight } from "@/lib/sentiment";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import BreathingExerciseModal from "@/components/ui/BreathingExerciseModal";
import AchievementBadges from "@/components/ui/AchievementBadges";

// Dynamic import for Recharts with ssr: false (F15)
const DynamicWeeklyChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        ResponsiveContainer,
        AreaChart,
        Area,
        XAxis,
        YAxis,
        Tooltip,
      } = mod;

      return function WeeklyChartComponent({
        data,
        isRtl,
        isLight,
      }: {
        data: { day: string; score: number }[];
        isRtl: boolean;
        isLight: boolean;
      }) {
        return (
          <div className="relative w-full h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 12, left: 12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="glassGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: isLight ? "#4B3F72" : "rgba(255,255,255,0.7)",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                  tickMargin={8}
                  reversed={isRtl}
                />
                <YAxis hide domain={[0, 5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 15, 30, 0.95)",
                    backdropFilter: "blur(12px)",
                    border: isLight ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "12px",
                    color: isLight ? "#1F1A3A" : "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#A78BFA"
                  strokeWidth={2.5}
                  fill="url(#glassGradient)"
                  dot={{ fill: "#A78BFA", strokeWidth: 0, r: 3.5 }}
                  activeDot={{ r: 5, fill: "#F472B6", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-36 rounded-2xl bg-white/5 animate-pulse" />
    ),
  }
);

export default function TodayPage() {
  const {
    entries,
    createEntry,
    getStats,
    isLoading,
    isCreating,
    settings,
  } = useSyncStore();
  const { user } = useAuth();
  const { isRtl, locale, t, tmood, ttag } = useLanguage();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [journalText, setJournalText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(50);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);

  // Phase 2: Custom tags & Guided prompts & Deep reflection state
  const [customTags, setCustomTags] = useState<string[]>(() => getCustomTags());
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState("");
  const [isReflecting, setIsReflecting] = useState(false);
  const [deepReflection, setDeepReflection] = useState<{
    pattern: string;
    booster: string;
    habit: string;
  } | null>(null);

  const moodPrompts = useMemo(() => {
    if (selectedMood === null) return [];
    return getMoodPrompts(moodOptions[selectedMood].label, locale);
  }, [selectedMood, locale]);

  const allAvailableTags = useMemo(() => {
    const merged = [...commonTags, ...customTags];
    const seen = new Set(merged.map((t) => t.toLowerCase()));
    for (const entry of entries) {
      for (const tag of entry.tags || []) {
        const trimmed = tag.trim();
        if (trimmed && !seen.has(trimmed.toLowerCase())) {
          seen.add(trimmed.toLowerCase());
          merged.push(trimmed);
        }
      }
    }
    return merged;
  }, [customTags, entries]);

  const stats = getStats();
  const weeklyInsight = useMemo(
    () => generateWeeklyInsight(entries, locale),
    [entries, locale]
  );
  const todayEntries = useMemo(
    () => entries.filter((e) => isToday(e.date)),
    [entries]
  );
  const weeklyData = useMemo(
    () => getWeeklyData(entries, locale),
    [entries, locale]
  );

  // Sentiment analysis on text typing
  const sentiment = useMemo(() => {
    if (journalText.trim().length >= 5) {
      return analyzeSentiment(journalText, locale);
    }
    return null;
  }, [journalText, locale]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveCustomTag = () => {
    const trimmed = newTagText.trim();
    if (!trimmed) return;
    const updated = saveCustomTag(trimmed);
    setCustomTags(updated);
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setNewTagText("");
    setIsAddingTag(false);
  };

  const handleRequestDeepReflection = async () => {
    if (isReflecting) return;
    setIsReflecting(true);
    try {
      const res = await fetch("/api/ai/reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (res.ok) {
        const data = await res.json();
        const ref = data.reflection || data.data;
        if (ref) {
          setDeepReflection({
            pattern: String(ref.pattern || ref.rhythm || ""),
            booster: String(ref.booster || ""),
            habit: String(ref.habit || ""),
          });
          return;
        }
      }
      // Offline / guest heuristic fallback
      const isAr = locale === "ar";
      setDeepReflection({
        pattern: weeklyInsight,
        booster: isAr
          ? "كانت لحظات التأمل الهادئة والامتنان هي الأكثر ارتباطاً بارتفاع مستوى الراحة."
          : "Moments of gratitude and peaceful downtime were your strongest positive drivers.",
        habit: isAr
          ? "خصص خمس دقائق كل صباح للتنفس الواعي لتعزيز صفاء ذهنك طوال اليوم."
          : "Dedicate 5 minutes each morning to mindful breathing to maintain your calm focus.",
      });
    } catch {
      const isAr = locale === "ar";
      setDeepReflection({
        pattern: weeklyInsight,
        booster: isAr
          ? "كانت لحظات التأمل الهادئة والامتنان هي الأكثر ارتباطاً بارتفاع مستوى الراحة."
          : "Moments of gratitude and peaceful downtime were your strongest positive drivers.",
        habit: isAr
          ? "خصص خمس دقائق كل صباح للتنفس الواعي لتعزيز صفاء ذهنك طوال اليوم."
          : "Dedicate 5 minutes each morning to mindful breathing to maintain your calm focus.",
      });
    } finally {
      setIsReflecting(false);
    }
  };

  const handleSaveMood = async () => {
    if (selectedMood === null || isCreating) return;

    const clampedIntensity = Math.max(1, Math.min(100, Math.round(sliderValue)));

    try {
      await createEntry({
        mood: moodOptions[selectedMood].label as MoodType,
        intensity: clampedIntensity,
        text: journalText.trim(),
        tags: selectedTags,
      });

      // Show breathing modal suggestion if mood is heavy (Sad or Frustrated with high intensity)
      const currentMoodLabel = moodOptions[selectedMood].label;
      if (
        (currentMoodLabel === "Sad" || currentMoodLabel === "Frustrated") &&
        clampedIntensity >= 70
      ) {
        setIsBreathingOpen(true);
      }

      setJournalText("");
      setSelectedMood(null);
      setSelectedTags([]);
      setSliderValue(50);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2500);
    } catch (err) {
      console.error("Save mood entry failed:", err);
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

  const isLight = settings.theme === "light";
  const selectedMoodLabel =
    selectedMood !== null ? moodOptions[selectedMood]?.label : null;
  const isHeavyMoodSelected =
    selectedMoodLabel === "Sad" || selectedMoodLabel === "Frustrated";

  return (
    <GlassBackground>
      <Disclaimer />
      <BreathingExerciseModal
        isOpen={isBreathingOpen}
        onClose={() => setIsBreathingOpen(false)}
      />

      <div
        className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Hero User Banner */}
        <motion.div
          className="glass rounded-full px-4 py-2.5 mb-6 shadow-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                <span className="text-base font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <p className="text-white/60 text-xs">{t("greeting.welcome")}</p>
                <p className="text-white font-semibold text-sm">@{user?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBreathingOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 rounded-full border border-purple-500/30 text-xs text-purple-300 font-medium transition-colors"
                aria-label={t("breathing.cta")}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>{t("breathing.cta")}</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full">
                <Flame
                  className={`w-4 h-4 ${
                    stats.currentStreak > 0 ? "text-orange-400" : "text-white/40"
                  }`}
                />
                <div className="flex items-baseline gap-1">
                  <span className="text-white font-bold text-sm">
                    {stats.currentStreak}
                  </span>
                  <span className="text-white/60 text-[10px]">
                    {t("stats.dayStreak")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Header Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full mb-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-white/80 font-medium">
              {stats.currentStreak > 0 ? t("greeting.streak") : t("greeting.start")}
            </span>
            {stats.currentStreak > 0 && <Flame className="w-4 h-4 text-orange-400" />}
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {t("greeting.feeling")}
          </h1>
          <p className="text-white/60 text-sm">{t("greeting.moment")}</p>
        </motion.div>

        {/* Mood Selector Card */}
        <motion.div
          className="glass rounded-[2rem] p-4 md:p-6 mb-6 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span>{t("select.mood")}</span>
            </h2>

            <button
              onClick={() => setIsBreathingOpen(true)}
              className="sm:hidden flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200"
            >
              <Wind className="w-3.5 h-3.5" />
              <span>{t("breathing.cta")}</span>
            </button>
          </div>

          {/* 5 Mood Options with Active Selection Ring */}
          <div className="grid grid-cols-5 gap-2 md:gap-3 mb-4">
            {moodOptions.map((mood, index) => {
              const isSelected = selectedMood === index;
              return (
                <motion.button
                  key={mood.label}
                  onClick={() => setSelectedMood(index)}
                  className={`relative flex flex-col items-center justify-center p-2.5 md:p-4 rounded-2xl transition-all min-h-[72px] md:min-h-[88px] ${
                    isSelected
                      ? "ring-2 ring-white shadow-xl scale-105 bg-white/20 border-white/40"
                      : "bg-white/5 hover:bg-white/10 border border-white/10"
                  }`}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                  aria-pressed={isSelected}
                  aria-label={tmood(mood.label)}
                >
                  <span className="text-2xl md:text-3xl emoji">{mood.emoji}</span>
                  <span
                    className={`text-[10px] md:text-xs mt-1.5 font-medium ${
                      isSelected ? "text-white font-bold" : "text-white/60"
                    }`}
                  >
                    {tmood(mood.label)}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Gentle Callout Banner when Sad or Frustrated is selected */}
          <AnimatePresence>
            {isHeavyMoodSelected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="p-3.5 rounded-2xl bg-purple-500/15 border border-purple-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/25 flex items-center justify-center flex-shrink-0 text-purple-300 mt-0.5">
                      <Wind className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-xs">
                        {t("breathing.calloutTitle")}
                      </p>
                      <p className="text-white/70 text-xs leading-relaxed">
                        {t("breathing.calloutDesc")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBreathingOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/30 text-white text-xs font-medium transition-colors flex-shrink-0"
                  >
                    {t("breathing.cta")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mood Intensity Slider */}
          {selectedMood !== null && (
            <motion.div
              className="mb-5 px-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-white/70 font-medium">
                  {t("entry.intensity")}
                </span>
                <span className="text-xs text-white font-bold">
                  {sliderValue}%
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-white/10">
                <motion.div
                  className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${sliderValue}%` }}
                  animate={{ width: `${sliderValue}%` }}
                />
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={sliderValue}
                  onChange={(e) =>
                    setSliderValue(
                      Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1))
                    )
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label={t("entry.intensity")}
                />
              </div>
            </motion.div>
          )}

          {/* Journal Entry (Optional note) */}
          <AnimatePresence>
            {selectedMood !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-white/10">
                  {/* Tags (Preset + Custom) */}
                  <div className="mb-4">
                    <span className="text-xs text-white/60 mb-2 block">
                      {t("entry.tags")}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {allAvailableTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            selectedTags.includes(tag)
                              ? "bg-purple-500 text-white shadow-sm"
                              : "bg-white/10 text-white/70 hover:bg-white/20"
                          }`}
                        >
                          {ttag(tag)}
                        </button>
                      ))}

                      {/* Add Custom Tag Chip */}
                      {!isAddingTag ? (
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(true)}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-purple-300 hover:bg-white/20 border border-purple-500/30 flex items-center gap-1 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{t("tag.addCustom")}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={newTagText}
                            onChange={(e) => setNewTagText(e.target.value)}
                            placeholder={t("tag.newPlaceholder")}
                            className="px-2.5 py-1 bg-white/15 rounded-lg text-xs text-white placeholder-white/40 border border-white/20 outline-none focus:border-purple-400"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveCustomTag();
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveCustomTag}
                            className="px-2.5 py-1 bg-purple-500 text-white rounded-lg text-xs font-semibold hover:bg-purple-600 transition-colors"
                          >
                            {t("tag.save")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingTag(false);
                              setNewTagText("");
                            }}
                            className="px-2 py-1 bg-white/10 text-white/60 hover:text-white rounded-lg text-xs transition-colors"
                          >
                            {t("tag.cancel")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phase 2: Guided Prompts */}
                  {moodPrompts.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs text-white/60 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-300" />
                        <span>{t("prompt.header")}</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {moodPrompts.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setJournalText((prev) =>
                                prev.trim() ? `${prev.trim()}\n\n${p} ` : `${p} `
                              );
                            }}
                            className="px-2.5 py-1 rounded-xl text-[11px] bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/25 text-purple-200 transition-colors text-start"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder={t("entry.journal")}
                    className="w-full h-24 p-3.5 backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/20 outline-none resize-none transition-all text-white placeholder-white/40 text-sm"
                  />

                  {/* Save Button (Optional Journal) */}
                  <motion.button
                    onClick={handleSaveMood}
                    disabled={selectedMood === null || isCreating}
                    className="mt-3.5 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={!isCreating ? { scale: 1.01 } : {}}
                    whileTap={!isCreating ? { scale: 0.99 } : {}}
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>{isCreating ? t("entry.saving") : t("entry.save")}</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* AI Sentiment Insight */}
        <AnimatePresence>
          {sentiment && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="backdrop-blur-xl bg-purple-500/20 rounded-2xl p-4 border border-purple-500/30 mb-6 shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-semibold text-sm">
                      {t("ai.insight")}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sentiment.score > 0.3
                          ? "bg-green-500/30 text-green-300"
                          : sentiment.score < -0.3
                          ? "bg-red-500/30 text-red-300"
                          : "bg-yellow-500/30 text-yellow-300"
                      }`}
                    >
                      {sentiment.score > 0.3
                        ? t("sentiment.positive")
                        : sentiment.score < -0.3
                        ? t("sentiment.negative")
                        : t("sentiment.neutral")}
                    </span>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed">
                    {sentiment.insight}
                  </p>
                  {sentiment.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {sentiment.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] text-white/70"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weekly AI Insight Bubble & Deep Reflection Card */}
        <motion.div
          className="glass rounded-2xl p-4 md:p-5 mb-6 shadow-md"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-semibold text-white/90">
                {t("ai.deepReflection")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRequestDeepReflection}
              disabled={isReflecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-95 text-white rounded-xl text-xs font-medium shadow transition-all disabled:opacity-50 self-start sm:self-auto"
            >
              {isReflecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isReflecting ? t("ai.generating") : t("ai.generateReflection")}</span>
            </button>
          </div>

          <p className="text-white/80 text-xs font-medium leading-relaxed">
            {weeklyInsight}
          </p>

          {/* Deep Reflection 3-point structured output */}
          <AnimatePresence>
            {deepReflection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3.5 pt-3.5 border-t border-white/10"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[11px] font-semibold text-purple-300 mb-1">
                      {t("ai.reflectionPattern")}
                    </p>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {deepReflection.pattern}
                    </p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[11px] font-semibold text-pink-300 mb-1">
                      {t("ai.reflectionBooster")}
                    </p>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {deepReflection.booster}
                    </p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[11px] font-semibold text-emerald-300 mb-1">
                      {t("ai.reflectionHabit")}
                    </p>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {deepReflection.habit}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Success Toast */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 backdrop-blur-xl bg-emerald-500/90 text-white rounded-full border border-white/20 shadow-2xl flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-white" />
              <span className="font-medium text-sm">{t("entry.saved")}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Grid: Fixed Middle Card */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          {/* Card 1: Total Entries */}
          <motion.div
            className="glass rounded-2xl p-4 text-center shadow-md"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-center gap-1 text-purple-300 mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="text-2xl font-bold">{stats.totalEntries}</span>
            </div>
            <p className="text-xs text-white/50">{t("stats.total")}</p>
          </motion.div>

          {/* Card 2: Current Streak (Restored!) */}
          <motion.div
            className="glass rounded-2xl p-4 text-center shadow-md"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <Flame className="w-4 h-4" />
              <span className="text-2xl font-bold">{stats.currentStreak}</span>
            </div>
            <p className="text-xs text-white/50">{t("stats.streak")}</p>
          </motion.div>

          {/* Card 3: This Week */}
          <motion.div
            className="glass rounded-2xl p-4 text-center shadow-md"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center gap-1 text-pink-300 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-2xl font-bold">{stats.entriesThisWeek}</span>
            </div>
            <p className="text-xs text-white/50">{t("stats.week")}</p>
          </motion.div>
        </div>

        {/* Competitor Parity: Achievement Badges Showcase (F20) */}
        <AchievementBadges
          longestStreak={stats.longestStreak}
          totalEntries={stats.totalEntries}
        />

        {/* Weekly Trend Rolling Chart (F9 + F15) */}
        <motion.div
          className="glass rounded-3xl p-6 mb-6 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span>{t("trend.weekly")}</span>
            </h2>
            <span className="text-xs text-white/50">
              {isRtl ? "آخر ٧ أيام" : "Last 7 days"}
            </span>
          </div>

          <DynamicWeeklyChart
            data={weeklyData}
            isRtl={isRtl}
            isLight={isLight}
          />
        </motion.div>

        {/* Today's Entries List */}
        {todayEntries.length > 0 && (
          <motion.div
            className="glass rounded-3xl p-6 shadow-xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span>{t("entries.today")}</span>
            </h2>
            <div className="space-y-3">
              {todayEntries.map((entry, i) => {
                const mood = moodOptions.find((m) => m.label === entry.mood);
                return (
                  <motion.div
                    key={entry.id}
                    className="p-4 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.75 + i * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl emoji">{mood?.emoji}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white text-sm">
                            {tmood(entry.mood)}
                          </span>
                          <span className="text-white/40 text-xs">·</span>
                          <span className="text-white/40 text-xs">{entry.time}</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/60 font-medium">
                        {entry.intensity}%
                      </span>
                    </div>
                    {entry.text && (
                      <p className="text-white/80 text-sm leading-relaxed mb-2">
                        {entry.text}
                      </p>
                    )}
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] text-white/70"
                          >
                            #{ttag(tag)}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty Today Fallback: Recent Entries Preview (F9 #8) */}
        {todayEntries.length === 0 && (
          <motion.div
            className="glass rounded-3xl p-6 shadow-xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {entries.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold text-base">
                      {isRtl ? "الإدخالات الأخيرة" : "Recent Check-ins"}
                    </h3>
                    <p className="text-white/50 text-xs">
                      {isRtl ? "لم تسجل مزاج اليوم بعد" : "You haven't logged today yet"}
                    </p>
                  </div>
                  <Link
                    href="/history"
                    className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1 font-medium"
                  >
                    <span>{isRtl ? "عرض الكل" : "View All"}</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {entries.slice(0, 3).map((entry) => {
                    const mood = moodOptions.find((m) => m.label === entry.mood);
                    return (
                      <div
                        key={entry.id}
                        className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl emoji">{mood?.emoji}</span>
                          <div>
                            <span className="font-semibold text-white">
                              {tmood(entry.mood)}
                            </span>
                            <span className="text-white/40 text-[10px] mx-1.5">·</span>
                            <span className="text-white/50 text-[10px]">
                              {getRelativeDate(entry.date, locale)}
                            </span>
                          </div>
                        </div>
                        <span className="text-white/50">{entry.intensity}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="text-5xl mb-3 block emoji">🌟</span>
                <h3 className="text-white font-semibold text-base mb-1">
                  {t("empty.noEntries")}
                </h3>
                <p className="text-white/60 text-xs">{t("empty.selectMood")}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <Navigation />
    </GlassBackground>
  );
}
