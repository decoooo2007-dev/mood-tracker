"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Calendar,
  BookOpen,
  ChevronRight,
  Sparkles,
  Moon,
  Sun,
  CloudRain,
  Flame,
  Cloudy,
} from "lucide-react";

const moods = [
  { emoji: "😊", label: "Happy", color: "#4ADE80", icon: Sun },
  { emoji: "😌", label: "Calm", color: "#60A5FA", icon: Cloudy },
  { emoji: "😢", label: "Sad", color: "#818CF8", icon: CloudRain },
  { emoji: "😤", label: "Frustrated", color: "#F87171", icon: Flame },
  { emoji: "😴", label: "Tired", color: "#A78BFA", icon: Moon },
];

const journalEntries = [
  { id: 1, date: "Today", mood: "Happy", text: "Had an amazing productive morning! Finished the project ahead of schedule." },
  { id: 2, date: "Yesterday", mood: "Calm", text: "Took time to meditate and reflect. Feeling centered and ready." },
  { id: 3, date: "2 days ago", mood: "Frustrated", text: "Debugging took longer than expected but learned something new." },
];

const calendarDays = [
  { day: "Mon", mood: 4 }, { day: "Tue", mood: 5 }, { day: "Wed", mood: 3 },
  { day: "Thu", mood: 4 }, { day: "Fri", mood: 5 }, { day: "Sat", mood: 4 }, { day: "Sun", mood: null },
];

const getMoodColor = (level: number | null) => {
  if (!level) return "#E5E7EB";
  const colors = ["#EF4444", "#F97316", "#FBBF24", "#84CC16", "#22C55E"];
  return colors[level - 1];
};

export default function Option1Serene() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [journalText, setJournalText] = useState("");
  const [entries, setEntries] = useState(journalEntries);
  const [showEntry, setShowEntry] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Floating organic shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-purple-200/40 to-pink-200/40 blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "-10%", left: "-10%" }}
        />
        <motion.div
          className="absolute w-80 h-80 rounded-full bg-gradient-to-br from-blue-200/30 to-cyan-200/30 blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: "10%", right: "-5%" }}
        />
        <motion.div
          className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-green-200/30 to-emerald-200/30 blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, -40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "40%", right: "20%" }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full mb-6 shadow-sm"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-600 font-medium">Daily Wellness Check-in</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-4">
            How are you feeling?
          </h1>
          <p className="text-gray-500 text-lg">Take a moment to reflect on your day</p>
        </motion.div>

        {/* Mood Selector */}
        <motion.div
          className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/50 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Select your mood
          </h2>
          <div className="flex justify-center gap-4 mb-8">
            {moods.map((mood, index) => (
              <motion.button
                key={mood.label}
                onClick={() => setSelectedMood(index)}
                className={`relative p-4 rounded-2xl transition-all ${
                  selectedMood === index
                    ? "bg-white shadow-xl scale-110"
                    : "bg-white/50 hover:bg-white/80"
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={selectedMood === index ? {
                  boxShadow: [`0 0 0 0 ${mood.color}`, `0 0 0 12px ${mood.color}00`],
                } : {}}
                transition={{ duration: 0.3 }}
              >
                <motion.span
                  className="text-4xl block"
                  animate={selectedMood === index ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.5, repeat: selectedMood === index ? Infinity : 0, repeatDelay: 1 }}
                >
                  {mood.emoji}
                </motion.span>
                <span className={`text-xs mt-2 block font-medium ${
                  selectedMood === index ? "text-gray-800" : "text-gray-500"
                }`}>
                  {mood.label}
                </span>
                {selectedMood === index && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2"
                    style={{ borderColor: mood.color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )}
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
                <div className="pt-6 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-600 mb-3">
                    What&apos;s on your mind? (optional)
                  </label>
                  <textarea
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Write about your feelings..."
                    className="w-full h-32 p-4 bg-white/50 rounded-2xl border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none resize-none transition-all text-gray-700 placeholder-gray-400"
                  />
                  <motion.button
                    onClick={addEntry}
                    disabled={!journalText.trim()}
                    className={`mt-4 w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                      journalText.trim()
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    whileHover={journalText.trim() ? { scale: 1.02 } : {}}
                    whileTap={journalText.trim() ? { scale: 0.98 } : {}}
                  >
                    Save Entry
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Calendar Heatmap */}
        <motion.div
          className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/50 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            This Week&apos;s Mood
          </h2>
          <div className="flex justify-between">
            {calendarDays.map((day, i) => (
              <motion.div
                key={day.day}
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <span className="text-xs text-gray-500 font-medium">{day.day}</span>
                <motion.div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg"
                  style={{ backgroundColor: getMoodColor(day.mood) }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 300 }}
                  whileHover={{ scale: 1.1 }}
                >
                  {day.mood ? moods[day.mood - 1]?.emoji : "—"}
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Journal Entries */}
        <motion.div
          className="bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-semibold text-gray-700 mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            Recent Entries
          </h2>
          <div className="space-y-4">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                className="p-4 bg-white/50 rounded-2xl border border-gray-100 hover:border-purple-200 transition-all cursor-pointer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                whileHover={{ x: 4 }}
                onClick={() => setShowEntry(!showEntry)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">{entry.date}</span>
                  <span className="text-lg">{moods.find((m) => m.label === entry.mood)?.emoji}</span>
                </div>
                <p className="text-gray-700">{entry.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Footer */}
        <motion.div
          className="mt-8 grid grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {[
            { label: "Entries", value: entries.length, icon: BookOpen },
            { label: "Streak", value: "7 days", icon: Flame },
            { label: "Mood Avg", value: "😊+", icon: Heart },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
            >
              <stat.icon className="w-5 h-5 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}