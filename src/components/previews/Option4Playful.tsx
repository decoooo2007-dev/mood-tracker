"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Trophy,
  Star,
  BookOpen,
  Flame,
  Heart,
  PartyPopper,
  Zap,
} from "lucide-react";

const moods = [
  { emoji: "😊", label: "Happy", color: "#FFB84D", bgColor: "from-yellow-400/20 to-orange-400/20" },
  { emoji: "😌", label: "Calm", color: "#4ECDC4", bgColor: "from-teal-400/20 to-cyan-400/20" },
  { emoji: "😢", label: "Sad", color: "#6366F1", bgColor: "from-indigo-400/20 to-purple-400/20" },
  { emoji: "😤", label: "Frustrated", color: "#FF6B9D", bgColor: "from-pink-400/20 to-rose-400/20" },
  { emoji: "😴", label: "Tired", color: "#8B5CF6", bgColor: "from-violet-400/20 to-purple-400/20" },
];

const achievementBadges = [
  { icon: Flame, label: "7 Day Streak", color: "from-orange-400 to-red-400", unlocked: true },
  { icon: BookOpen, label: "10 Entries", color: "from-blue-400 to-indigo-400", unlocked: true },
  { icon: Heart, label: "Self Care", color: "from-pink-400 to-rose-400", unlocked: false },
  { icon: Star, label: "Mood Master", color: "from-yellow-400 to-amber-400", unlocked: false },
];

const journalEntries = [
  { id: 1, date: "Today", mood: "Happy", text: "Amazing breakthrough on the project! The team was incredible.", badge: "🎉" },
  { id: 2, date: "Yesterday", mood: "Calm", text: "Quiet morning with coffee and meditation. Perfect start.", badge: "☕" },
  { id: 3, date: "2 days ago", mood: "Frustrated", text: "Traffic was terrible but made it through.", badge: "🚗" },
];

export default function Option4Playful() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [journalText, setJournalText] = useState("");
  const [entries, setEntries] = useState(journalEntries);
  const [showConfetti, setShowConfetti] = useState(false);
  const [entryCount, setEntryCount] = useState(3);
  const confettiRef = useRef<(() => void) | null>(null);

  const triggerConfetti = useCallback(() => {
    if (confettiRef.current) {
      confettiRef.current();
    }
  }, []);

  useEffect(() => {
    // Dynamically import confetti to avoid SSR issues
    const loadConfetti = async () => {
      const confettiModule = await import("canvas-confetti");
      const confetti = confettiModule.default;

      confettiRef.current = () => {
        const count = 200;
        const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

        function fire(particleRatio: number, opts: confetti.Options) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        }

        fire(0.25, { spread: 26, startVelocity: 55 });
        fire(0.2, { spread: 60 });
        fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        fire(0.1, { spread: 120, startVelocity: 45 });
      };
    };

    loadConfetti();
  }, []);

  useEffect(() => {
    if (showConfetti) {
      triggerConfetti();
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, [showConfetti, triggerConfetti]);

  const addEntry = () => {
    if (selectedMood !== null && journalText.trim()) {
      const newEntry = {
        id: Date.now(),
        date: "Just now",
        mood: moods[selectedMood].label,
        text: journalText,
        badge: selectedMood === 0 ? "🎉" : selectedMood === 1 ? "☕" : "💭",
      };
      setEntries([newEntry, ...entries]);
      setEntryCount((prev) => prev + 1);
      setJournalText("");
      setSelectedMood(null);

      if (selectedMood === 0) {
        setShowConfetti(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 relative overflow-hidden">
      {/* Decorative floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { emoji: "✨", x: "20%", delay: 0, duration: 18 },
          { emoji: "⭐", x: "40%", delay: 2, duration: 16 },
          { emoji: "🌟", x: "60%", delay: 4, duration: 20 },
          { emoji: "💫", x: "80%", delay: 1, duration: 17 },
          { emoji: "🎈", x: "10%", delay: 3, duration: 19 },
          { emoji: "🎉", x: "90%", delay: 5, duration: 15 },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl"
            initial={{ x: item.x, y: "-10%", rotate: i * 60 }}
            animate={{
              y: ["-10%", "110%"],
              rotate: [i * 60, i * 60 + 360],
            }}
            transition={{
              duration: item.duration,
              repeat: Infinity,
              ease: "linear",
              delay: item.delay,
            }}
          >
            {item.emoji}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header with celebration */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full mb-6"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Sparkles className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-semibold text-gray-700">
              {entryCount} entries this week! Keep going!
            </span>
            <PartyPopper className="w-5 h-5 text-pink-500" />
          </motion.div>
          <motion.h1
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            How&apos;s your day?
          </motion.h1>
          <p className="text-gray-500 text-lg">Share your feelings — no judgment here!</p>
        </motion.div>

        {/* Mood Selector with bouncy animations */}
        <motion.div
          className="bg-white rounded-3xl p-8 shadow-xl shadow-orange-100/50 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Pick your mood!
          </h2>
          <div className="flex justify-center gap-4 mb-8">
            {moods.map((mood, index) => (
              <motion.button
                key={mood.label}
                onClick={() => setSelectedMood(index)}
                className={`relative p-4 rounded-2xl transition-all ${
                  selectedMood === index
                    ? `bg-gradient-to-br ${mood.bgColor} shadow-lg`
                    : "hover:bg-gray-50"
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 15,
                  delay: 0.4 + index * 0.1,
                }}
                whileHover={{ scale: 1.15, y: -5 }}
                whileTap={{ scale: 0.9, rotate: [0, -10, 10, 0] }}
              >
                {selectedMood === index && (
                  <motion.div
                    className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-orange-200 to-pink-200 -z-10 blur-sm"
                    layoutId="moodGlow"
                  />
                )}
                <motion.span
                  className="text-4xl block"
                  animate={selectedMood === index ? {
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.2, 1],
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {mood.emoji}
                </motion.span>
                <span className={`text-xs mt-2 block font-bold ${
                  selectedMood === index ? "text-gray-800" : "text-gray-500"
                }`}>
                  {mood.label}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Journal Entry with fun input */}
          <AnimatePresence>
            {selectedMood !== null && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className="overflow-hidden"
              >
                <div className="pt-6 border-t-2 border-dashed border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    What&apos;s happening? {moods[selectedMood].emoji}
                  </label>
                  <textarea
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Tell me more about your day..."
                    className="w-full h-32 p-4 bg-gradient-to-br from-gray-50 to-orange-50 rounded-2xl border-2 border-gray-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none resize-none transition-all text-gray-700 placeholder-gray-400 font-medium"
                  />
                  <motion.button
                    onClick={addEntry}
                    disabled={!journalText.trim()}
                    className={`mt-4 w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                      journalText.trim()
                        ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-200"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    whileHover={journalText.trim() ? { scale: 1.02, y: -2 } : {}}
                    whileTap={journalText.trim() ? { scale: 0.98 } : {}}
                  >
                    {journalText.trim() ? (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Save My Feelings!
                      </>
                    ) : (
                      "Write something first..."
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Achievement Badges */}
        <motion.div
          className="bg-white rounded-3xl p-8 shadow-xl shadow-pink-100/50 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Your Achievements
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {achievementBadges.map((badge, i) => (
              <motion.div
                key={badge.label}
                className={`relative p-4 rounded-2xl text-center transition-all ${
                  badge.unlocked
                    ? "bg-gradient-to-br from-white to-gray-50 shadow-md"
                    : "bg-gray-100 opacity-60"
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  delay: 0.6 + i * 0.1,
                }}
                whileHover={badge.unlocked ? { scale: 1.1, y: -5 } : {}}
              >
                <motion.div
                  className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    badge.unlocked
                      ? `bg-gradient-to-br ${badge.color} shadow-lg`
                      : "bg-gray-200"
                  }`}
                  animate={badge.unlocked ? {
                    boxShadow: [
                      "0 4px 15px rgba(0,0,0,0.1)",
                      "0 4px 25px rgba(251, 191, 36, 0.4)",
                      "0 4px 15px rgba(0,0,0,0.1)",
                    ],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <badge.icon className={`w-7 h-7 ${badge.unlocked ? "text-white" : "text-gray-400"}`} />
                </motion.div>
                <span className={`text-xs font-bold ${badge.unlocked ? "text-gray-700" : "text-gray-400"}`}>
                  {badge.label}
                </span>
                {!badge.unlocked && (
                  <span className="absolute top-2 right-2 text-lg">🔒</span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Journal Entries with fun styling */}
        <motion.div
          className="bg-white rounded-3xl p-8 shadow-xl shadow-purple-100/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            Your Journal
          </h2>
          <div className="space-y-4">
            {entries.map((entry, i) => {
              const mood = moods.find((m) => m.label === entry.mood);
              return (
                <motion.div
                  key={entry.id}
                  className="p-5 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-100 hover:border-purple-200 transition-all cursor-pointer relative overflow-hidden"
                  initial={{ opacity: 0, x: -30, rotate: -2 }}
                  animate={{ opacity: 1, x: 0, rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    delay: 0.8 + i * 0.1,
                  }}
                  whileHover={{ x: 5, scale: 1.02 }}
                >
                  <span className="absolute top-3 right-3 text-2xl">{entry.badge}</span>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{mood?.emoji}</span>
                    <div>
                      <span className="font-bold text-gray-800">{entry.date}</span>
                      <span className="text-gray-400 text-sm ml-2">· {entry.mood}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{entry.text}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Fun Stats Footer */}
        <motion.div
          className="mt-8 flex justify-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[
            { emoji: "📚", value: `${entries.length}`, label: "Entries" },
            { emoji: "🔥", value: "7", label: "Day Streak" },
            { emoji: "⭐", value: "12", label: "Badges" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-white rounded-2xl px-6 py-4 shadow-lg text-center"
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{
                type: "spring",
                delay: 1.1 + i * 0.1,
              }}
              whileHover={{ scale: 1.1, y: -5 }}
            >
              <span className="text-3xl block mb-1">{stat.emoji}</span>
              <span className="text-2xl font-bold text-gray-800">{stat.value}</span>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}