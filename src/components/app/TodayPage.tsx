"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useAuth } from "@/lib/providers";
import {
  Heart,
  BookOpen,
  Calendar,
  TrendingUp,
  Plus,
  ChevronRight,
  Sparkles,
  X,
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
import { moodOptions, commonTags, getRelativeDate, isToday } from "@/lib/moods";
import { analyzeSentiment, generateWeeklyInsight } from "@/lib/sentiment";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import Link from "next/link";

export default function TodayPage() {
  const { user, isLoading: authLoading } = useAuth();
  const {
    entries,
    addEntry,
    getStats,
    getWeeklyData,
    isLoading,
    isCreating,
  } = useSyncStore();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [journalText, setJournalText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(50);
  const [showSuccess, setShowSuccess] = useState(false);
  const [sentiment, setSentiment] = useState<ReturnType<typeof analyzeSentiment> | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
    }
  }, [user, authLoading]);

  const stats = getStats();
  const weeklyInsight = generateWeeklyInsight(entries);

  // Analyze sentiment when text changes
  useEffect(() => {
    if (journalText.length > 10) {
      const result = analyzeSentiment(journalText);
      setSentiment(result);
    } else {
      setSentiment(null);
    }
  }, [journalText]);
  const weeklyData = getWeeklyData();
  const todayEntries = entries.filter((e) => isToday(e.date));

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

  if (authLoading || isLoading) {
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
          className="text-center mb-8"
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
                ? `${stats.currentStreak} day streak! Keep it up!`
                : "Start your journey today"}
            </span>
            {stats.currentStreak > 0 && <Flame className="w-5 h-5 text-orange-400" />}
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            How are you feeling?
          </h1>
          <p className="text-white/60">Take a moment for yourself</p>
        </motion.div>

        {/* Mood Selector */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 shadow-2xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Select your mood
          </h2>
          <div className="flex justify-center gap-3 mb-6">
            {moodOptions.map((mood, index) => (
              <motion.button
                key={mood.label}
                onClick={() => setSelectedMood(index)}
                className={`relative p-3 rounded-2xl transition-all backdrop-blur-sm ${
                  selectedMood === index
                    ? `bg-gradient-to-br ${mood.gradient} shadow-xl scale-110`
                    : "bg-white/5 hover:bg-white/10"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                {selectedMood === index && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-white/30"
                    layoutId="glassBorder"
                  />
                )}
                <span className="text-3xl block relative z-10">{mood.emoji}</span>
                <span className={`text-xs mt-1 block font-medium relative z-10 ${
                  selectedMood === index ? "text-white" : "text-white/60"
                }`}>
                  {mood.label}
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
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-white/60">Intensity</span>
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
                    <span className="text-xs text-white/60 mb-2 block">Tags (optional)</span>
                    <div className="flex flex-wrap gap-2">
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
                    placeholder="What's on your mind today?"
                    className="w-full h-28 p-4 backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/20 outline-none resize-none transition-all text-white placeholder-white/40"
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
                    {isCreating ? "Saving..." : "Save Entry"}
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
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium">AI Insight</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      sentiment.score > 0.3 ? "bg-green-500/30 text-green-300" :
                      sentiment.score < -0.3 ? "bg-red-500/30 text-red-300" :
                      "bg-yellow-500/30 text-yellow-300"
                    }`}>
                      {sentiment.score > 0.3 ? "Positive" : sentiment.score < -0.3 ? "Negative" : "Neutral"}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{sentiment.insight}</p>
                  {sentiment.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
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
          <p className="text-white/70 text-sm leading-relaxed">{weeklyInsight}</p>
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
              <span className="text-white font-medium">Entry saved!</span>
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
            { label: "Total", value: stats.totalEntries, icon: BookOpen, color: "from-purple-500/30 to-pink-500/30" },
            { label: "Streak", value: `${stats.currentStreak}d`, icon: Flame, color: "from-orange-500/30 to-red-500/30" },
            { label: "This Week", value: stats.entriesThisWeek, icon: Calendar, color: "from-blue-500/30 to-cyan-500/30" },
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

        {/* Weekly Trend */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 shadow-2xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Weekly Trend
          </h2>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
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
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                />
                <YAxis hide domain={[0, 5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 15, 30, 0.9)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#A78BFA"
                  strokeWidth={2}
                  fill="url(#glassGradient)"
                  dot={{ fill: "#A78BFA", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#F472B6", strokeWidth: 0 }}
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
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              Today&apos;s Entries
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
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{mood?.emoji}</span>
                        <div>
                          <span className="font-medium text-white">{entry.mood}</span>
                          <span className="text-white/40 text-sm ml-2">· {entry.time}</span>
                        </div>
                      </div>
                      <span className="text-xs text-white/50">{entry.intensity}%</span>
                    </div>
                    <p className="text-white/70 leading-relaxed">{entry.text}</p>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
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
            <span className="text-5xl mb-4 block">🌟</span>
            <h3 className="text-white font-medium mb-2">No entries today</h3>
            <p className="text-white/60 text-sm">Select your mood above to get started</p>
          </motion.div>
        )}
      </div>

      <Navigation />
    </GlassBackground>
  );
}