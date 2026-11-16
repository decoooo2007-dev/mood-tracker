"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  toLocalDateStr,
  getWeeklyData,
  getCustomTags,
  saveCustomTag,
  getMoodPrompts,
} from "@/lib/moods";
import {
  analyzeSentiment,
  computeCompositeMoodScore,
  generateWeeklyInsight,
  getDimensionLabel,
} from "@/lib/sentiment";
import {
  dispatchAppearanceChange,
  getStoredAppearance,
  MOOD_AURA_BLOBS,
  type MoodButtonStyle,
} from "@/lib/theme";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import Disclaimer from "@/components/ui/Disclaimer";
import BreathingExerciseModal from "@/components/ui/BreathingExerciseModal";
import AchievementBadges from "@/components/ui/AchievementBadges";

// Dynamic import for Recharts with ssr: false
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
                    <stop offset="0%" stopColor="var(--chart-stroke)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-stroke)" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: isLight ? "#334155" : "rgba(255,255,255,0.72)",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                  tickMargin={8}
                  reversed={isRtl}
                />
                <YAxis hide domain={[0, 5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight
                      ? "rgba(255, 255, 255, 0.96)"
                      : "rgba(10, 16, 32, 0.95)",
                    backdropFilter: "blur(12px)",
                    border: isLight
                      ? "1px solid rgba(15, 23, 42, 0.12)"
                      : "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "12px",
                    color: isLight ? "#0F172A" : "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--chart-stroke)"
                  strokeWidth={2.75}
                  fill="url(#glassGradient)"
                  dot={{ fill: "var(--chart-stroke)", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 5.5, fill: "var(--chart-dot)", strokeWidth: 0 }}
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
  const [selectedDay, setSelectedDay] = useState<"today" | "yesterday">("today");
  const [journalText, setJournalText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(50);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isBreathingOpen, setIsBreathingOpen] = useState(false);
  const [moodStyle, setMoodStyle] = useState<MoodButtonStyle>("hybrid");

  // Animated Horizontal Flip tracking when EN <-> AR switches
  const prevLocaleRef = useRef(locale);
  const [chartFlipKey, setChartFlipKey] = useState(0);
  const [isChartFlipping, setIsChartFlipping] = useState(false);

  // Custom tags & Deep reflection state
  const [customTags, setCustomTags] = useState<string[]>(() => getCustomTags());
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState("");
  const [isReflecting, setIsReflecting] = useState(false);
  const [deepReflection, setDeepReflection] = useState<{
    pattern: string;
    booster: string;
    habit: string;
  } | null>(null);

  useEffect(() => {
    const syncStyle = () => {
      setMoodStyle(getStoredAppearance().moodStyle);
    };
    syncStyle();
    window.addEventListener("moodflow-appearance-change", syncStyle);
    return () => window.removeEventListener("moodflow-appearance-change", syncStyle);
  }, []);

  useEffect(() => {
    if (prevLocaleRef.current !== locale) {
      prevLocaleRef.current = locale;
      setChartFlipKey((k) => k + 1);
      setIsChartFlipping(true);
      const timer = setTimeout(() => setIsChartFlipping(false), 650);
      return () => clearTimeout(timer);
    }
  }, [locale]);

  const handleSelectMood = (index: number) => {
    setSelectedMood(index);
    const chosen = moodOptions[index]?.label || null;
    dispatchAppearanceChange(chosen);
  };

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

  // Real mathematical trait & massive lexicon sentiment analysis
  const sentiment = useMemo(() => {
    const hasEnoughText = journalText.trim().length >= 3;
    if (!hasEnoughText && selectedMood === null) return null;

    const textResult = analyzeSentiment(journalText, locale);
    if (selectedMood !== null) {
      const moodLabel = moodOptions[selectedMood].label;
      const composite = computeCompositeMoodScore({
        mood: moodLabel,
        intensity: sliderValue,
        tags: selectedTags,
        text: journalText,
        locale,
      });
      return {
        ...textResult,
        wellnessIndex: composite.wellnessIndex,
        dominantDimension: hasEnoughText
          ? textResult.dominantDimension
          : composite.dominantDimension,
        score: hasEnoughText ? textResult.score : composite.score,
      };
    }
    return textResult;
  }, [journalText, locale, selectedMood, sliderValue, selectedTags]);

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
    const targetDate = (() => {
      const d = new Date();
      if (selectedDay === "yesterday") {
        d.setDate(d.getDate() - 1);
      }
      return toLocalDateStr(d);
    })();

    try {
      await createEntry({
        mood: moodOptions[selectedMood].label as MoodType,
        intensity: clampedIntensity,
        text: journalText.trim(),
        tags: selectedTags,
        date: targetDate,
      });

      const currentMoodLabel = moodOptions[selectedMood].label;
      if (
        (currentMoodLabel === "Sad" || currentMoodLabel === "Frustrated") &&
        clampedIntensity >= 70
      ) {
        setIsBreathingOpen(true);
      }

      setJournalText("");
      setSelectedMood(null);
      setSelectedDay("today");
      setSelectedTags([]);
      setSliderValue(50);
      dispatchAppearanceChange(null);
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
            className="w-12 h-12 border-4 border-t-transparent rounded-full"
            style={{ borderColor: "var(--accent-solid)", borderTopColor: "transparent" }}
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

  const moodBtnClass =
    moodStyle === "orbs"
      ? "mood-btn-orbs"
      : moodStyle === "keycaps"
      ? "mood-btn-keycaps"
      : "mood-btn-hybrid";

  return (
    <GlassBackground>
      <Disclaimer />
      <BreathingExerciseModal
        isOpen={isBreathingOpen}
        onClose={() => setIsBreathingOpen(false)}
      />

      <div
        className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* 1. Hero User Banner */}
        <motion.div
          className="glass rounded-full px-4 py-2.5 mb-6 shadow-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full accent-avatar flex items-center justify-center shadow-md">
                <span className="text-base font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div>
                <p className="theme-text-secondary text-xs">{t("greeting.welcome")}</p>
                <p className="theme-text-primary font-semibold text-sm">@{user?.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBreathingOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 accent-pill rounded-full text-xs font-medium transition-opacity hover:opacity-90"
                aria-label={t("breathing.cta")}
              >
                <Wind className="w-3.5 h-3.5" />
                <span>{t("breathing.cta")}</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 recessed-well rounded-full">
                <Flame
                  className={`w-4 h-4 ${
                    stats.currentStreak > 0 ? "text-orange-400 flame-animated" : "theme-text-muted"
                  }`}
                />
                <div className="flex items-baseline gap-1">
                  <span className="theme-text-primary font-bold text-sm">
                    {stats.currentStreak}
                  </span>
                  <span className="theme-text-secondary text-[10px]">
                    {t("stats.dayStreak")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. Header Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-7"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 glass rounded-full mb-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4" style={{ color: "var(--accent-solid)" }} />
            <span className="text-xs theme-text-secondary font-medium">
              {stats.currentStreak > 0 ? t("greeting.streak") : t("greeting.start")}
            </span>
            {stats.currentStreak > 0 && <Flame className="w-4 h-4 text-orange-400 flame-animated" />}
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold theme-text-primary mb-2">
            {t("greeting.feeling")}
          </h1>
          <p className="theme-text-secondary text-sm">{t("greeting.moment")}</p>
        </motion.div>

        {/* 3. Mood Selector Card */}
        <motion.div
          className="glass rounded-[2rem] p-4 md:p-6 mb-6 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-semibold theme-text-primary flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span>{t("select.mood")}</span>
            </h2>

            <div className="flex items-center gap-2">
              {/* Today / Yesterday 1-tap Backfill Pill */}
              <div className="inline-flex rounded-full recessed-well p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedDay("today")}
                  className={`px-3 py-1 rounded-full font-semibold transition-all ${
                    selectedDay === "today" ? "accent-gradient-btn" : "theme-text-secondary"
                  }`}
                >
                  {t("time.today")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay("yesterday")}
                  className={`px-3 py-1 rounded-full font-semibold transition-all ${
                    selectedDay === "yesterday" ? "accent-gradient-btn" : "theme-text-secondary"
                  }`}
                >
                  {t("time.yesterday")}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsBreathingOpen(true)}
                className="sm:hidden flex items-center gap-1 text-xs accent-pill px-2.5 py-1 rounded-full"
                aria-label={t("breathing.cta")}
              >
                <Wind className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 5 Mood Buttons (Hybrid Orb-Keycaps Default / 3D Keycaps / Glowing Orbs) */}
          <div className="grid grid-cols-5 gap-2 md:gap-4 mb-4 pt-1">
            {moodOptions.map((mood, index) => {
              const isSelected = selectedMood === index;
              const aura = MOOD_AURA_BLOBS[mood.label];
              return (
                <motion.button
                  key={mood.label}
                  type="button"
                  onClick={() => handleSelectMood(index)}
                  className={`${moodBtnClass} ${isSelected ? "selected" : ""} relative flex flex-col items-center justify-center p-2.5 md:p-3.5 min-h-[76px] md:min-h-[88px]`}
                  style={
                    {
                      "--mood-glow": aura.blob,
                      "--mood-color": aura.color,
                    } as React.CSSProperties
                  }
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={isSelected}
                  aria-label={tmood(mood.label)}
                >
                  <span
                    className={`text-2xl md:text-3xl emoji ${
                      isSelected ? "mood-selected-emoji" : ""
                    }`}
                  >
                    {mood.emoji}
                  </span>
                  <span
                    className={`text-[10px] md:text-xs mt-1.5 font-semibold theme-text-primary ${
                      isSelected ? "" : "opacity-80"
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
                <div className="p-3.5 rounded-2xl accent-pill flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl recessed-well flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wind className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="theme-text-primary font-semibold text-xs">
                        {t("breathing.calloutTitle")}
                      </p>
                      <p className="theme-text-secondary text-xs leading-relaxed">
                        {t("breathing.calloutDesc")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBreathingOpen(true)}
                    className="px-3.5 py-2 rounded-xl accent-gradient-btn text-xs font-medium transition-opacity flex-shrink-0"
                  >
                    {t("breathing.cta")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Thick Capsule Mood Intensity Slider */}
          {selectedMood !== null && (
            <motion.div
              className="mb-5 px-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs theme-text-secondary font-medium">
                  {t("entry.intensity")}
                </span>
                <span className="text-xs theme-text-primary font-bold font-mono">
                  {sliderValue}%
                </span>
              </div>
              <div className="relative h-6 rounded-full recessed-well p-1 overflow-hidden flex items-center">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${sliderValue}%`,
                    background:
                      "linear-gradient(90deg, var(--accent-from), var(--accent-via), var(--accent-to))",
                    boxShadow: "0 0 14px var(--accent-soft)",
                  }}
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

          {/* Tags, Guided Prompts & Journal */}
          <AnimatePresence>
            {selectedMood !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-white/10">
                  {/* Tags */}
                  <div className="mb-4">
                    <span className="text-xs theme-text-secondary mb-2 block">
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
                              ? "accent-tag-active"
                              : "recessed-well theme-text-secondary hover:opacity-90"
                          }`}
                        >
                          {ttag(tag)}
                        </button>
                      ))}

                      {!isAddingTag ? (
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(true)}
                          className="px-3 py-1 rounded-full text-xs font-medium accent-pill flex items-center gap-1 transition-all"
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
                            className="px-2.5 py-1 recessed-well rounded-lg text-xs theme-text-primary outline-none"
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
                            className="px-2.5 py-1 accent-gradient-btn rounded-lg text-xs font-semibold"
                          >
                            {t("tag.save")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingTag(false);
                              setNewTagText("");
                            }}
                            className="px-2 py-1 recessed-well theme-text-secondary rounded-lg text-xs"
                          >
                            {t("tag.cancel")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guided Prompts */}
                  {moodPrompts.length > 0 && (
                    <div className="mb-3">
                      <span className="text-xs theme-text-secondary mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" style={{ color: "var(--accent-solid)" }} />
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
                            className="px-2.5 py-1 rounded-xl text-[11px] accent-pill transition-opacity hover:opacity-90 text-start"
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
                    className="w-full h-24 p-3.5 recessed-well rounded-2xl outline-none resize-none transition-all theme-text-primary placeholder-white/40 text-sm"
                  />

                  <motion.button
                    type="button"
                    onClick={handleSaveMood}
                    disabled={selectedMood === null || isCreating}
                    className="mt-3.5 w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 accent-gradient-btn shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* 4. Live Sentiment & 8-Dimension Trait Insight Card */}
        <AnimatePresence>
          {sentiment && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className="glass rounded-2xl p-4 mb-6 shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl accent-pill flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="theme-text-primary font-semibold text-sm">
                      {t("ai.insight")}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sentiment.score > 0.2
                          ? "bg-emerald-500/20 stat-positive"
                          : sentiment.score < -0.2
                          ? "bg-rose-500/20 stat-negative"
                          : "recessed-well theme-text-secondary"
                      }`}
                    >
                      {sentiment.score > 0.2
                        ? t("sentiment.positive")
                        : sentiment.score < -0.2
                        ? t("sentiment.negative")
                        : t("sentiment.neutral")}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold accent-pill">
                      {t("wellness.index")}: {sentiment.wellnessIndex}/100
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold recessed-well theme-text-primary">
                      {t("wellness.dominant")}: {getDimensionLabel(sentiment.dominantDimension, locale)}
                    </span>
                  </div>
                  <p className="theme-text-secondary text-xs leading-relaxed">
                    {sentiment.insight}
                  </p>
                  {sentiment.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {sentiment.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 recessed-well rounded-full text-[10px] theme-text-secondary"
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

        {/* Weekly AI Insight & Deep Reflection Card */}
        <motion.div
          className="glass rounded-2xl p-4 md:p-5 mb-6 shadow-md"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "var(--accent-solid)" }} />
              <span className="text-xs font-semibold theme-text-primary">
                {t("ai.deepReflection")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRequestDeepReflection}
              disabled={isReflecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 accent-gradient-btn rounded-xl text-xs font-medium shadow transition-all disabled:opacity-50 self-start sm:self-auto"
            >
              {isReflecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isReflecting ? t("ai.generating") : t("ai.generateReflection")}</span>
            </button>
          </div>

          <p className="theme-text-secondary text-xs font-medium leading-relaxed">
            {weeklyInsight}
          </p>

          <AnimatePresence>
            {deepReflection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3.5 pt-3.5 border-t border-white/10"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="p-3 recessed-well rounded-xl">
                    <p className="text-[11px] font-semibold theme-text-primary mb-1">
                      {t("ai.reflectionPattern")}
                    </p>
                    <p className="text-xs theme-text-secondary leading-relaxed">
                      {deepReflection.pattern}
                    </p>
                  </div>
                  <div className="p-3 recessed-well rounded-xl">
                    <p className="text-[11px] font-semibold stat-positive mb-1">
                      {t("ai.reflectionBooster")}
                    </p>
                    <p className="text-xs theme-text-secondary leading-relaxed">
                      {deepReflection.booster}
                    </p>
                  </div>
                  <div className="p-3 recessed-well rounded-xl">
                    <p className="text-[11px] font-semibold theme-text-primary mb-1">
                      {t("ai.reflectionHabit")}
                    </p>
                    <p className="text-xs theme-text-secondary leading-relaxed">
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
              className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 backdrop-blur-xl bg-emerald-500/90 text-white keep-white rounded-full border border-white/20 shadow-2xl flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-white" />
              <span className="font-medium text-sm">{t("entry.saved")}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Stats Grid */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          <motion.div
            className="glass rounded-2xl p-4 text-center shadow-md"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <BookOpen className="w-4 h-4" style={{ color: "var(--accent-solid)" }} />
              <span className="text-2xl font-bold theme-text-primary">{stats.totalEntries}</span>
            </div>
            <p className="text-xs theme-text-muted">{t("stats.total")}</p>
          </motion.div>

          <motion.div
            className="glass rounded-2xl p-4 text-center shadow-md"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Flame className="w-4 h-4 text-orange-400 flame-animated" />
              <span className="text-2xl font-bold theme-text-primary">{stats.currentStreak}</span>
            </div>
            <p className="text-xs theme-text-muted">{t("stats.streak")}</p>
          </motion.div>

          <motion.div
            className="glass rounded-2xl p-4 text-center shadow-md"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Calendar className="w-4 h-4 text-pink-400" />
              <span className="text-2xl font-bold theme-text-primary">{stats.entriesThisWeek}</span>
            </div>
            <p className="text-xs theme-text-muted">{t("stats.week")}</p>
          </motion.div>
        </div>

        {/* 6. Achievement Badges */}
        <AchievementBadges
          longestStreak={stats.longestStreak}
          totalEntries={stats.totalEntries}
        />

        {/* 7. Weekly Trend Chart (with Animated Horizontal Flip on EN <-> AR Switch) */}
        <motion.div
          className="glass rounded-3xl p-6 mb-6 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold theme-text-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
              <span>{t("trend.weekly")}</span>
            </h2>
            <span className="text-xs theme-text-muted">
              {isRtl ? "آخر ٧ أيام" : "Last 7 days"}
            </span>
          </div>

          <div
            key={chartFlipKey}
            className={isChartFlipping ? "chart-flip-active" : undefined}
          >
            <DynamicWeeklyChart
              data={weeklyData}
              isRtl={isRtl}
              isLight={isLight}
            />
          </div>
        </motion.div>

        {/* 8. Today's Entries List */}
        {todayEntries.length > 0 && (
          <motion.div
            className="glass rounded-3xl p-6 shadow-xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-base font-semibold theme-text-primary mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{ color: "var(--accent-solid)" }} />
              <span>{t("entries.today")}</span>
            </h2>
            <div className="space-y-3">
              {todayEntries.map((entry, i) => {
                const mood = moodOptions.find((m) => m.label === entry.mood);
                return (
                  <motion.div
                    key={entry.id}
                    className="p-4 recessed-well rounded-2xl"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 + i * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl emoji">{mood?.emoji}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold theme-text-primary text-sm">
                            {tmood(entry.mood)}
                          </span>
                          <span className="theme-text-muted text-xs">·</span>
                          <span className="theme-text-muted text-xs">{entry.time}</span>
                        </div>
                      </div>
                      <span className="text-xs theme-text-secondary font-medium">
                        {entry.intensity}%
                      </span>
                    </div>
                    {entry.text && (
                      <p className="theme-text-secondary text-sm leading-relaxed mb-2">
                        {entry.text}
                      </p>
                    )}
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
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
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty Today Fallback: Recent Check-ins */}
        {todayEntries.length === 0 && (
          <motion.div
            className="glass rounded-3xl p-6 shadow-xl mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {entries.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="theme-text-primary font-semibold text-base">
                      {isRtl ? "الإدخالات الأخيرة" : "Recent Check-ins"}
                    </h3>
                    <p className="theme-text-muted text-xs">
                      {isRtl ? "لم تسجل مزاج اليوم بعد" : "You haven't logged today yet"}
                    </p>
                  </div>
                  <Link
                    href="/history"
                    className="text-xs accent-pill px-3 py-1 rounded-full flex items-center gap-1 font-medium"
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
                        className="p-3 recessed-well rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl emoji">{mood?.emoji}</span>
                          <div>
                            <span className="font-semibold theme-text-primary">
                              {tmood(entry.mood)}
                            </span>
                            <span className="theme-text-muted text-[10px] mx-1.5">·</span>
                            <span className="theme-text-muted text-[10px]">
                              {getRelativeDate(entry.date, locale)}
                            </span>
                          </div>
                        </div>
                        <span className="theme-text-secondary">{entry.intensity}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="text-5xl mb-3 block emoji">🌟</span>
                <h3 className="theme-text-primary font-semibold text-base mb-1">
                  {t("empty.noEntries")}
                </h3>
                <p className="theme-text-secondary text-xs">{t("empty.selectMood")}</p>
              </div>
            )}
          </motion.div>
        )}
      </div>

      <Navigation />
    </GlassBackground>
  );
}
