"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon,
  Sun,
  Cloud,
  Wind,
  Droplets,
  LineChart,
  BookOpen,
  Plus,
  Heart,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

const moods = [
  { emoji: "😊", label: "Happy", color: "#4ADE80", bgGlow: "rgba(74, 222, 128, 0.3)" },
  { emoji: "😌", label: "Calm", color: "#60A5FA", bgGlow: "rgba(96, 165, 250, 0.3)" },
  { emoji: "😢", label: "Sad", color: "#818CF8", bgGlow: "rgba(129, 140, 248, 0.3)" },
  { emoji: "😤", label: "Frustrated", color: "#F87171", bgGlow: "rgba(248, 113, 113, 0.3)" },
  { emoji: "😴", label: "Tired", color: "#A78BFA", bgGlow: "rgba(167, 139, 250, 0.3)" },
];

const weekData = [
  { day: "Mon", score: 4, label: "Happy" },
  { day: "Tue", score: 3, label: "Calm" },
  { day: "Wed", score: 2, label: "Sad" },
  { day: "Thu", score: 4, label: "Happy" },
  { day: "Fri", score: 5, label: "Excited" },
  { day: "Sat", score: 4, label: "Happy" },
  { day: "Sun", score: 3, label: "Calm" },
];

const journalEntries = [
  { id: 1, date: "Today", mood: "Happy", text: "Had an amazing productive morning! The sun was shining and everything felt possible." },
  { id: 2, date: "Yesterday", mood: "Calm", text: "Took time to meditate. Feeling centered and ready for the week ahead." },
];

export default function Option2ZenGarden() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [journalText, setJournalText] = useState("");
  const [entries, setEntries] = useState(journalEntries);
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");

  useEffect(() => {
    const interval = setInterval(() => {
      setBreathPhase((prev) => {
        if (prev === "inhale") return "hold";
        if (prev === "hold") return "exhale";
        return "inhale";
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const addEntry = () => {
    if (selectedMood !== null && journalText.trim()) {
      const newEntry = {
        id: Date.now(),
        date: "Just now",
        mood: moods[selectedMood].label,
        text: journalText,
      };
      setEntries([newEntry, ...entries]);
      setJournalText("");
      setSelectedMood(null);
    }
  };

  const getBreathText = () => {
    if (breathPhase === "inhale") return "Breathe in...";
    if (breathPhase === "hold") return "Hold...";
    return "Breathe out...";
  };

  return (
    <div className="min-h-screen bg-[#0F0F14] relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(124, 92, 255, 0.15) 0%, transparent 70%)",
            top: "-20%",
            left: "-10%",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255, 107, 157, 0.12) 0%, transparent 70%)",
            bottom: "-10%",
            right: "-5%",
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(96, 165, 250, 0.1) 0%, transparent 70%)",
            top: "40%",
            right: "20%",
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Zen Garden
          </motion.h1>
          <motion.p
            className="text-gray-400 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Take a mindful moment to reflect
          </motion.p>

          {/* Breathing Indicator */}
          <motion.div
            className="mt-8 inline-flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <motion.div
              className="w-24 h-24 rounded-full border-2 border-purple-500/50 flex items-center justify-center"
              animate={{
                scale: breathPhase === "inhale" ? 1.3 : breathPhase === "hold" ? 1.3 : 1,
                borderColor:
                  breathPhase === "inhale"
                    ? "rgba(124, 92, 255, 0.8)"
                    : breathPhase === "hold"
                    ? "rgba(255, 107, 157, 0.8)"
                    : "rgba(96, 165, 250, 0.5)",
              }}
              transition={{ duration: 4, ease: "easeInOut" }}
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30"
                animate={{
                  scale: breathPhase === "inhale" ? 1.2 : breathPhase === "hold" ? 1.2 : 0.9,
                }}
                transition={{ duration: 4, ease: "easeInOut" }}
              />
            </motion.div>
            <motion.p
              className="mt-4 text-gray-500 text-sm font-light tracking-wider"
              key={breathPhase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {getBreathText()}
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Mood Selector */}
        <motion.div
          className="bg-[#1A1A24]/80 backdrop-blur-xl rounded-3xl p-8 border border-white/5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-400" />
            How do you feel?
          </h2>
          <div className="flex justify-center gap-4 mb-8">
            {moods.map((mood, index) => (
              <motion.button
                key={mood.label}
                onClick={() => setSelectedMood(index)}
                className={`relative p-4 rounded-2xl transition-all ${
                  selectedMood === index
                    ? "bg-white/10"
                    : "bg-white/5 hover:bg-white/10"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {selectedMood === index && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      boxShadow: `0 0 30px ${mood.bgGlow}`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
                <span className="text-4xl block relative z-10">{mood.emoji}</span>
                <span className={`text-xs mt-2 block font-medium relative z-10 ${
                  selectedMood === index ? "text-white" : "text-gray-500"
                }`}>
                  {mood.label}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Journal Entry */}
          <AnimatePresence>
            {selectedMood !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-6 border-t border-white/10">
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    What's on your mind?
                  </label>
                  <textarea
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Write your thoughts..."
                    className="w-full h-32 p-4 bg-white/5 rounded-2xl border border-white/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none resize-none transition-all text-gray-200 placeholder-gray-600"
                  />
                  <motion.button
                    onClick={addEntry}
                    disabled={!journalText.trim()}
                    className={`mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                      journalText.trim()
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25"
                        : "bg-white/10 text-gray-500 cursor-not-allowed"
                    }`}
                    whileHover={journalText.trim() ? { scale: 1.02 } : {}}
                    whileTap={journalText.trim() ? { scale: 0.98 } : {}}
                  >
                    <Plus className="w-4 h-4" />
                    Add Entry
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Weekly Trend Chart */}
        <motion.div
          className="bg-[#1A1A24]/80 backdrop-blur-xl rounded-3xl p-8 border border-white/5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-purple-400" />
            Weekly Mood Trend
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekData}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C5CFF" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7C5CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1A1A24",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                  formatter={(value) => [weekData[(value as number) - 1]?.label || "", "Mood"]}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#7C5CFF"
                  strokeWidth={3}
                  fill="url(#moodGradient)"
                  dot={{ fill: "#7C5CFF", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: "#FF6B9D", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Journal Entries */}
        <motion.div
          className="bg-[#1A1A24]/80 backdrop-blur-xl rounded-3xl p-8 border border-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Journal Entries
          </h2>
          <div className="space-y-4">
            {entries.map((entry, i) => {
              const mood = moods.find((m) => m.label === entry.mood);
              return (
                <motion.div
                  key={entry.id}
                  className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.3 + i * 0.1 }}
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: mood?.color || "#7C5CFF",
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-400">{entry.date}</span>
                    <span className="text-lg">{mood?.emoji}</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{entry.text}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Stats Footer */}
        <motion.div
          className="mt-8 grid grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          {[
            { label: "Total Entries", value: entries.length, icon: BookOpen },
            { label: "Current Streak", value: "7 days", icon: Wind },
            { label: "Avg Mood", value: "😊", icon: Heart },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-[#1A1A24]/60 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 + i * 0.1 }}
            >
              <stat.icon className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}