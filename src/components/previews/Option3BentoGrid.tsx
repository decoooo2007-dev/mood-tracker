"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Calendar,
  BookOpen,
  ChevronRight,
  Clock,
  Smile,
  Frown,
  Meh,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const moods = [
  { emoji: "😊", label: "Happy", color: "#22C55E" },
  { emoji: "😐", label: "Okay", color: "#FBBF24" },
  { emoji: "😢", label: "Sad", color: "#6366F1" },
  { emoji: "😤", label: "Frustrated", color: "#EF4444" },
  { emoji: "😴", label: "Tired", color: "#8B5CF6" },
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

const recentEntries = [
  { id: 1, time: "2:30 PM", mood: "Happy", preview: "Great meeting with the team today..." },
  { id: 2, time: "10:15 AM", mood: "Calm", preview: "Morning meditation was refreshing..." },
  { id: 3, time: "Yesterday", mood: "Okay", preview: "Productive but felt a bit tired..." },
];

const timeline = [
  { id: 1, time: "9:00 AM", mood: "😊" },
  { id: 2, time: "12:00 PM", mood: "😐" },
  { id: 3, time: "3:00 PM", mood: "😊" },
  { id: 4, time: "6:00 PM", mood: "😤" },
  { id: 5, time: "9:00 PM", mood: "😊" },
];

export default function Option3BentoGrid() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [journalText, setJournalText] = useState("");
  const [entries, setEntries] = useState(recentEntries);

  const addEntry = () => {
    if (selectedMood !== null && journalText.trim()) {
      const now = new Date();
      const newEntry = {
        id: Date.now(),
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mood: moods[selectedMood].label,
        preview: journalText.slice(0, 50) + (journalText.length > 50 ? "..." : ""),
      };
      setEntries([newEntry, ...entries]);
      setJournalText("");
      setSelectedMood(null);
    }
  };

  const getMoodEmoji = (label: string) => moods.find((m) => m.label === label)?.emoji || "😐";
  const getMoodColor = (score: number) => {
    const colors = ["#EF4444", "#F97316", "#FBBF24", "#84CC16", "#22C55E"];
    return colors[score - 1] || "#FBBF24";
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mood Journal</h1>
          <p className="text-gray-500">Track your daily wellness and reflections</p>
        </motion.div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {/* Today's Mood - Large Card */}
          <motion.div
            className="col-span-2 row-span-2 bg-gray-50 rounded-2xl p-6 border border-gray-100"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Today&apos;s Mood</h2>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-6 mb-6">
              <motion.div
                className="text-8xl"
                animate={selectedMood !== null ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {selectedMood !== null ? moods[selectedMood].emoji : "😐"}
              </motion.div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedMood !== null ? moods[selectedMood].label : "How are you?"}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {selectedMood !== null ? "Tap to change" : "Select your mood below"}
                </p>
              </div>
            </div>

            {/* Mood Selector */}
            <div className="flex justify-between">
              {moods.map((mood, index) => (
                <motion.button
                  key={mood.label}
                  onClick={() => setSelectedMood(index)}
                  className={`p-3 rounded-xl transition-all ${
                    selectedMood === index
                      ? `bg-white shadow-md ring-2 ring-[${mood.color}]`
                      : "hover:bg-white/50"
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            className="col-span-2 bg-gray-50 rounded-2xl p-6 border border-gray-100"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Quick Stats</h2>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{entries.length}</p>
                <p className="text-xs text-gray-500 mt-1">Entries</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">7</p>
                <p className="text-xs text-gray-500 mt-1">Day Streak</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">😊+</p>
                <p className="text-xs text-gray-500 mt-1">Avg Mood</p>
              </div>
            </div>
          </motion.div>

          {/* Weekly Trend */}
          <motion.div
            className="col-span-2 bg-gray-50 rounded-2xl p-6 border border-gray-100"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Weekly Trend</h2>
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} barSize={24}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#9CA3AF", fontSize: 10 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {weekData.map((entry, index) => (
                      <Cell key={index} fill={getMoodColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Journal Entry Input */}
        <motion.div
          className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AnimatePresence>
            {selectedMood !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Write your thoughts...
                </label>
                <textarea
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="What's on your mind today?"
                  className="w-full h-24 p-4 bg-white rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none resize-none transition-all text-gray-700 placeholder-gray-400"
                />
                <motion.button
                  onClick={addEntry}
                  disabled={!journalText.trim()}
                  className={`mt-3 px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 ${
                    journalText.trim()
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                  whileTap={journalText.trim() ? { scale: 0.98 } : {}}
                >
                  Save Entry
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Timeline */}
        <motion.div
          className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Today&apos;s Timeline
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {timeline.map((item, i) => (
              <motion.div
                key={item.id}
                className="flex-shrink-0 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                <span className="text-xs text-gray-400 mb-2">{item.time}</span>
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-gray-100">
                  {item.mood}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Entries */}
        <motion.div
          className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Recent Entries</h2>
            <BookOpen className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all cursor-pointer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                whileHover={{ x: 4 }}
              >
                <span className="text-2xl">{getMoodEmoji(entry.mood)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{entry.preview}</p>
                  <p className="text-sm text-gray-500">{entry.mood} · {entry.time}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}