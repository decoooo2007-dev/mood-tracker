"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  BookOpen,
  Calendar,
  TrendingUp,
  Plus,
  ChevronRight,
  Moon,
  Sun,
  Cloud,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const moods = [
  { emoji: "😊", label: "Happy", color: "#4ADE80", gradient: "from-green-400/50 to-emerald-400/50" },
  { emoji: "😌", label: "Calm", color: "#60A5FA", gradient: "from-blue-400/50 to-cyan-400/50" },
  { emoji: "😢", label: "Sad", color: "#818CF8", gradient: "from-indigo-400/50 to-violet-400/50" },
  { emoji: "😤", label: "Frustrated", color: "#F87171", gradient: "from-red-400/50 to-orange-400/50" },
  { emoji: "😴", label: "Tired", color: "#A78BFA", gradient: "from-violet-400/50 to-purple-400/50" },
];

const weekData = [
  { day: "Mon", score: 4 },
  { day: "Tue", score: 3 },
  { day: "Wed", score: 2 },
  { day: "Thu", score: 4 },
  { day: "Fri", score: 5 },
  { day: "Sat", score: 4 },
  { day: "Sun", score: 3 },
];

const journalEntries = [
  { id: 1, date: "Today", mood: "Happy", text: "Productive day! Shipped the new feature and got great feedback from the team." },
  { id: 2, date: "Yesterday", mood: "Calm", text: "Morning meditation and a peaceful walk. Feeling centered and focused." },
  { id: 3, date: "2 days ago", mood: "Frustrated", text: "Had some blockers but worked through them systematically." },
];

export default function Option5Glassmorphism() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [journalText, setJournalText] = useState("");
  const [entries, setEntries] = useState(journalEntries);
  const [sliderValue, setSliderValue] = useState(50);

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

  const getMoodGradient = () => {
    if (selectedMood === null) return "from-purple-500/20 to-blue-500/20";
    return moods[selectedMood].gradient;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900" />
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)",
            top: "-20%",
            left: "-10%",
          }}
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
            bottom: "-10%",
            right: "-5%",
          }}
          animate={{
            x: [0, -80, 0],
            y: [0, -60, 0],
          }}
          transition={{ duration: 25, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
          }}
          animate={{
            x: [-50, 50, -50],
            y: [-30, 30, -30],
          }}
          transition={{ duration: 18, repeat: Infinity }}
        />
        {/* Floating decorative circles */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 rounded-full bg-white/10 backdrop-blur-sm"
            style={{
              top: `${20 + i * 15}%`,
              left: `${10 + i * 20}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 backdrop-blur-md bg-white/10 rounded-full mb-6 border border-white/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-5 h-5 text-purple-300" />
            <span className="text-sm text-white/90 font-medium">Daily Check-in</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How are you feeling?
          </h1>
          <p className="text-white/60 text-lg">Take a moment for yourself</p>
        </motion.div>

        {/* Mood Selector with Glassmorphism */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Select your mood
          </h2>
          <div className="flex justify-center gap-4 mb-8">
            {moods.map((mood, index) => (
              <motion.button
                key={mood.label}
                onClick={() => setSelectedMood(index)}
                className={`relative p-4 rounded-2xl transition-all backdrop-blur-sm ${
                  selectedMood === index
                    ? `bg-gradient-to-br ${mood.gradient} shadow-xl`
                    : "bg-white/5 hover:bg-white/10"
                }`}
                whileHover={{ scale: 1.15, y: -5 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                {selectedMood === index && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-white/30"
                    layoutId="glassBorder"
                  />
                )}
                <span className="text-4xl block relative z-10">{mood.emoji}</span>
                <span className={`text-xs mt-2 block font-medium relative z-10 ${
                  selectedMood === index ? "text-white" : "text-white/60"
                }`}>
                  {mood.label}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Mood Slider */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-white/60">Mood Intensity</span>
              <span className="text-sm text-white/90 font-medium">{sliderValue}%</span>
            </div>
            <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{ width: `${sliderValue}%` }}
                animate={{ width: `${sliderValue}%` }}
                transition={{ type: "spring", stiffness: 100 }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg"
                style={{ left: `calc(${sliderValue}% - 10px)` }}
                animate={{ left: `calc(${sliderValue}% - 10px)` }}
                transition={{ type: "spring", stiffness: 100 }}
              />
            </div>
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
                  <label className="block text-sm font-medium text-white/80 mb-3">
                    What's on your mind?
                  </label>
                  <textarea
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Write about your feelings..."
                    className="w-full h-32 p-4 backdrop-blur-sm bg-white/10 rounded-2xl border border-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/20 outline-none resize-none transition-all text-white placeholder-white/40"
                  />
                  <motion.button
                    onClick={addEntry}
                    disabled={!journalText.trim()}
                    className={`mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 backdrop-blur-sm transition-all ${
                      journalText.trim()
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    }`}
                    whileHover={journalText.trim() ? { scale: 1.02 } : {}}
                    whileTap={journalText.trim() ? { scale: 0.98 } : {}}
                  >
                    <Plus className="w-4 h-4" />
                    Save Entry
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {[
            { label: "Entries", value: entries.length, icon: BookOpen, color: "from-purple-500/30 to-pink-500/30" },
            { label: "Streak", value: "7 days", icon: Calendar, color: "from-blue-500/30 to-cyan-500/30" },
            { label: "Trend", value: "+12%", icon: TrendingUp, color: "from-green-500/30 to-emerald-500/30" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`backdrop-blur-xl bg-gradient-to-br ${stat.color} rounded-2xl p-4 text-center border border-white/20`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              whileHover={{ scale: 1.05, y: -3 }}
            >
              <stat.icon className="w-5 h-5 text-white/80 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/60">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Weekly Trend Chart */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Weekly Mood Trend
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekData}>
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
                <YAxis hide />
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
                  strokeWidth={3}
                  fill="url(#glassGradient)"
                  dot={{ fill: "#A78BFA", strokeWidth: 0, r: 5 }}
                  activeDot={{ r: 7, fill: "#F472B6", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Journal Entries */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Recent Entries
          </h2>
          <div className="space-y-4">
            {entries.map((entry, i) => {
              const mood = moods.find((m) => m.label === entry.mood);
              return (
                <motion.div
                  key={entry.id}
                  className="p-5 backdrop-blur-sm bg-white/5 rounded-2xl border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.1)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mood?.emoji}</span>
                      <div>
                        <span className="font-medium text-white">{entry.date}</span>
                        <span className="text-white/40 text-sm ml-2">· {entry.mood}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </div>
                  <p className="text-white/70 leading-relaxed">{entry.text}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}