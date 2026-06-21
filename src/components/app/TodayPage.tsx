"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useAuth } from "@/lib/providers";
import {
  Heart,
  BookOpen,
  Calendar,
  TrendingUp,
  Plus,
  Sparkles,
  Flame,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { MoodType } from "@/types/mood";
import { moodOptions, commonTags, getRelativeDate, isToday, moodToScore } from "@/lib/moods";
import { analyzeSentiment, generateWeeklyInsight } from "@/lib/sentiment";
import { t, tmood, currentLocale } from "@/lib/i18n/translations";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";

export default function TodayPage() {
  const {
    entries,
    addEntry,
    getStats,
    isLoading,
    isCreating,
  } = useSyncStore();
  const { user } = useAuth();

  // Initialize isRtl from localStorage or document.dir
  const [isRtl, setIsRtl] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("moodflow-locale");
      if (stored === "ar") return true;
      if (stored === "en") return false;
      return document.documentElement.dir === "rtl";
    }
    return false;
  });

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [journalText, setJournalText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(50);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sentiment, setSentiment] = useState<ReturnType<typeof analyzeSentiment> | null>(null);

  const stats = getStats();
  const weeklyInsight = generateWeeklyInsight(entries);
  const todayEntries = entries.filter((e) => isToday(e.date));

  // Update RTL when document.dir changes
  useEffect(() => {
    const checkRtl = () => {
      const rtl = document.documentElement.dir === "rtl";
      setIsRtl(rtl);
    };
    checkRtl();
    // Listen for changes
    const observer = new MutationObserver(checkRtl);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });
    return () => observer.disconnect();
  }, []);

  // Generate weekly data with Saturday as the first day
  const weeklyData = useMemo(() => {
    const isArabic = isRtl;

    // Day names: Saturday to Friday (index 0=Saturday, 6=Friday)
    const arabicDays = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
    const englishDays = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

    const getLocalDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const weekData: { day: string; score: number }[] = [];

    // Find the most recent Saturday (start of week in Middle East standard)
    const todayDay = today.getDay(); // 0=Sunday, 6=Saturday
    const daysBackToSaturday = todayDay === 6 ? 0 : todayDay + 1;

    // Start from the most recent Saturday
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - daysBackToSaturday);

    // Generate 7 days starting from Saturday
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = getLocalDateStr(date);

      // Get day index (0=Sunday in JS, convert to Saturday=0)
      const jsDayIndex = date.getDay();
      const dayIndex = (jsDayIndex + 1) % 7;

      // Get day name based on locale
      const dayName = isArabic ? arabicDays[dayIndex] : englishDays[dayIndex];

      const dayEntries = entries.filter((e) => e.date === dateStr);
      const avgScore =
        dayEntries.length > 0
          ? dayEntries.reduce((sum, e) => sum + moodToScore[e.mood], 0) / dayEntries.length
          : 0;

      weekData.push({
        day: dayName,
        score: Math.round(avgScore * 10) / 10,
      });
    }

    return weekData;
  }, [entries, isRtl]);

  // Analyze sentiment when text changes
  useEffect(() => {
    if (journalText.length > 10) {
      const result = analyzeSentiment(journalText);
      setSentiment(result);
    } else {
      setSentiment(null);
    }
  }, [journalText]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const addMoodEntry = () => {
    if (selectedMood !== null && journalText.trim()) {
      addEntry({
        mood: moodOptions[selectedMood].label as MoodType,
        intensity: sliderValue,
        text: journalText,
        tags: selectedTags,
      });
      setJournalText("");
      setSelectedMood(null);
      setSelectedTags([]);
      setSliderValue(50);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
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
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12">
        {/* Hero Bar */}
        <motion.div
          className="backdrop-blur-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 mb-6 border border-white/20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
            <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className={isRtl ? "text-right" : ""}>
                <p className="text-white/60 text-sm">{t("greeting.welcome")}</p>
                <p className="text-white font-semibold text-lg">@{user?.username}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl ${isRtl ? "flex-row-reverse" : ""}`}>
              <Flame className={`w-5 h-5 ${stats.currentStreak > 0 ? "text-orange-400" : "text-white/40"}`} />
              <div className="text-right">
                <p className="text-white font-bold text-lg">{stats.currentStreak}</p>
                <p className="text-white/60 text-xs">{t("stats.dayStreak")}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-center mb-8 ${isRtl ? "rtl" : ""}`}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 backdrop-blur-md bg-white/10 rounded-full mb-4 border border-white/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-5 h-5 text-purple-300" />
            <span className="text-sm text-white/90 font-medium">
              {stats.currentStreak > 0
                ? t("greeting.streak")
                : t("greeting.start")}
            </span>
            {stats.currentStreak > 0 && <Flame className="w-5 h-5 text-orange-400" />}
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {t("greeting.feeling")}
          </h1>
          <p className="text-white/60">{t("greeting.moment")}</p>
        </motion.div>

        {/* Mood Selector */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-4 md:p-6 border border-white/20 shadow-2xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className={`text-base font-semibold text-white mb-4 flex items-center gap-2 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
            <Heart className="w-5 h-5 text-pink-400" />
            {t("select.mood")}
          </h2>
          <div className="grid grid-cols-5 gap-2 md:gap-3 mb-4 md:mb-6">
            {moodOptions.map((mood, index) => (
              <motion.button
                key={mood.label}
                onClick={() => setSelectedMood(index)}
                className={`relative flex flex-col items-center justify-center p-2 md:p-3 rounded-2xl transition-all backdrop-blur-sm touch-target mood-button ${
                  selectedMood === index
                    ? `bg-gradient-to-br ${mood.gradient} shadow-xl ring-2 ring-white/30`
                    : "bg-white/5 hover:bg-white/10 active:bg-white/20"
                }`}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <span className="text-2xl md:text-3xl emoji">{mood.emoji}</span>
                <span className={`text-[10px] md:text-xs mt-1 font-medium ${
                  selectedMood === index ? "text-white" : "text-white/60"
                }`}>
                  {tmood(mood.label)}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Mood Slider */}
          {selectedMood !== null && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
            >
              <div className={`flex justify-between items-center mb-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                <span className="text-sm text-white/60">{t("entry.intensity")}</span>
                <span className="text-sm text-white/90 font-medium">{sliderValue}%</span>
              </div>
              <div className="relative h-2 rounded-full bg-white/10">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                  style={{ width: `${sliderValue}%` }}
                  animate={{ width: `${sliderValue}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderValue}
                  onChange={(e) => setSliderValue(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </motion.div>
          )}

          {/* Journal Entry */}
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
                    <span className="text-xs text-white/60 mb-2 block">{t("entry.tags")}</span>
                    <div className={`flex flex-wrap gap-2 ${isRtl ? "justify-end" : ""}`}>
                      {commonTags.slice(0, 8).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            selectedTags.includes(tag)
                              ? "bg-purple-500/50 text-white"
                              : "bg-white/10 text-white/60 hover:bg-white/20"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder={t("entry.journal")}
                    className="w-full h-28 p-4 backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/20 outline-none resize-none transition-all text-white placeholder-white/40"
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                  <motion.button
                    onClick={addMoodEntry}
                    disabled={!journalText.trim()}
                    className={`mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 backdrop-blur-sm transition-all ${
                      journalText.trim()
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    }`}
                    whileHover={journalText.trim() && !isCreating ? { scale: 1.02 } : {}}
                    whileTap={journalText.trim() && !isCreating ? { scale: 0.98 } : {}}
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {isCreating ? t("entry.saving") : t("entry.save")}
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
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="backdrop-blur-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl p-4 border border-purple-500/30 mb-6"
            >
              <div className={`flex items-start gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                </div>
                <div className={`flex-1 ${isRtl ? "text-right" : ""}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <span className="text-white font-medium">{t("ai.insight")}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sentiment.score > 0.3 ? "bg-green-500/30 text-green-300" :
                      sentiment.score < -0.3 ? "bg-red-500/30 text-red-300" :
                      "bg-yellow-500/30 text-yellow-300"
                    }`}>
                      {sentiment.score > 0.3 ? t("sentiment.positive") : sentiment.score < -0.3 ? t("sentiment.negative") : t("sentiment.neutral")}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{sentiment.insight}</p>
                  {sentiment.keywords.length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-2 ${isRtl ? "justify-end" : ""}`}>
                      {sentiment.keywords.map((kw) => (
                        <span key={kw} className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-white/60">
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

        {/* Weekly Insight */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <p className={`text-white/70 text-sm leading-relaxed ${isRtl ? "text-right" : ""}`}>{weeklyInsight}</p>
        </motion.div>

        {/* Success Message */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 backdrop-blur-xl bg-green-500/90 rounded-full border border-white/20 shadow-2xl flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-white font-medium">{t("entry.saved")}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-3 gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {[
            { label: t("stats.total"), value: stats.totalEntries, icon: BookOpen, color: "from-purple-500/30 to-pink-500/30" },
            { label: t("stats.streak"), value: `${stats.currentStreak}d`, icon: Flame, color: "from-orange-500/30 to-red-500/30" },
            { label: t("stats.week"), value: stats.entriesThisWeek, icon: Calendar, color: "from-blue-500/30 to-cyan-500/30" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`backdrop-blur-xl bg-gradient-to-br ${stat.color} rounded-2xl p-4 text-center border border-white/20`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              whileHover={{ scale: 1.05, y: -3 }}
            >
              <stat.icon className="w-5 h-5 text-white/80 mx-auto mb-1" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/60">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Weekly Trend Chart */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 shadow-2xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className={`text-base font-semibold text-white mb-4 flex items-center gap-2 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
            <TrendingUp className="w-5 h-5 text-purple-400" />
            {t("trend.weekly")}
          </h2>

          {/* Chart Container with proper margins */}
          <div className="relative" style={{ minWidth: "100%", minHeight: 144 }}>
            <ResponsiveContainer width="100%" height={144}>
              <AreaChart
                data={weeklyData}
                margin={{ top: 10, right: 15, left: 15, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="glassGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* XAxis with RTL support */}
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "rgba(255,255,255,0.7)",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                  tickMargin={12}
                  interval={0}
                  reversed={isRtl}
                  tickCount={7}
                  minTickGap={5}
                />

                <YAxis hide domain={[0, 5]} />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 30, 0.95)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  labelStyle={{
                    color: "rgba(255,255,255,0.8)",
                    marginBottom: "4px",
                  }}
                  cursor={{ stroke: "rgba(167, 139, 250, 0.5)", strokeWidth: 1 }}
                />

                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#A78BFA"
                  strokeWidth={2.5}
                  fill="url(#glassGradient)"
                  dot={{ fill: "#A78BFA", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#F472B6", strokeWidth: 0 }}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Today's Entries */}
        {todayEntries.length > 0 && (
          <motion.div
            className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 shadow-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <h2 className={`text-base font-semibold text-white mb-4 flex items-center gap-2 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
              <BookOpen className="w-5 h-5 text-purple-400" />
              {t("entries.today")}
            </h2>
            <div className="space-y-3">
              {todayEntries.map((entry, i) => {
                const mood = moodOptions.find((m) => m.label === entry.mood);
                return (
                  <motion.div
                    key={entry.id}
                    className="p-4 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.1 }}
                  >
                    <div className={`flex items-center justify-between mb-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                      <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                        <span className="text-2xl emoji">{mood?.emoji}</span>
                        <div className={`flex items-center gap-1 ${isRtl ? "flex-row-reverse" : ""}`}>
                          <span className="font-medium text-white">{tmood(entry.mood)}</span>
                          <span className="text-white/40 text-sm mx-1">·</span>
                          <span className="text-white/40 text-sm">{entry.time}</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/50">{entry.intensity}%</span>
                    </div>
                    <p className={`text-white/70 leading-relaxed ${isRtl ? "text-right" : ""}`}>{entry.text}</p>
                    {entry.tags.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-2 ${isRtl ? "justify-end" : ""}`}>
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
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {todayEntries.length === 0 && (
          <motion.div
            className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <span className="text-5xl mb-4 block emoji">🌟</span>
            <h3 className="text-white font-medium mb-2">{t("empty.noEntries")}</h3>
            <p className="text-white/60 text-sm">{t("empty.selectMood")}</p>
          </motion.div>
        )}
      </div>

      <Navigation />
    </GlassBackground>
  );
}
