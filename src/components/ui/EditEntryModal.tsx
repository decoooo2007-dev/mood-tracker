"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { MoodEntry, MoodType } from "@/types/mood";
import { moodOptions, commonTags } from "@/lib/moods";
import { useLanguage } from "@/lib/providers";

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: MoodEntry | null;
  onSave: (updates: {
    mood?: MoodType;
    intensity?: number;
    text?: string;
    tags?: string[];
  }) => void;
  isSaving: boolean;
  locale?: string;
}

export default function EditEntryModal({
  isOpen,
  onClose,
  entry,
  onSave,
  isSaving,
}: EditEntryModalProps) {
  const { t, tmood, ttag, isRtl } = useLanguage();

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [intensity, setIntensity] = useState(50);
  const [text, setText] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (entry) {
      const moodIndex = moodOptions.findIndex((m) => m.label === entry.mood);
      setSelectedMood(moodIndex >= 0 ? moodIndex : null);
      setIntensity(Math.max(1, Math.min(100, Math.round(entry.intensity ?? 50))));
      setText(entry.text || "");
      setSelectedTags(entry.tags || []);
    }
  }, [entry]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = () => {
    if (selectedMood === null) return;

    const moodLabel = moodOptions[selectedMood].label as MoodType;

    onSave({
      mood: moodLabel,
      intensity: Math.max(1, Math.min(100, Math.round(intensity))),
      text: text.trim(),
      tags: selectedTags,
    });
  };

  if (!entry) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              className="w-full max-w-md glass-modal rounded-3xl border border-white/20 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto text-white"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              dir={isRtl ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-base font-semibold text-white">
                  {t("history.editEntry")}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Mood Selector */}
                <div>
                  <label className="block text-xs text-white/70 font-medium mb-2">
                    {t("select.mood")}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {moodOptions.map((mood, index) => (
                      <button
                        key={mood.label}
                        type="button"
                        onClick={() => setSelectedMood(index)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                          selectedMood === index
                            ? "bg-white/20 ring-2 ring-white shadow-lg"
                            : "bg-white/5 hover:bg-white/10 border border-white/5"
                        }`}
                        aria-pressed={selectedMood === index}
                      >
                        <span className="text-xl mb-1">{mood.emoji}</span>
                        <span
                          className={`text-[10px] ${
                            selectedMood === index
                              ? "text-white font-bold"
                              : "text-white/60"
                          }`}
                        >
                          {tmood(mood.label)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Intensity */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-white/70 font-medium">
                      {t("entry.intensity")}
                    </span>
                    <span className="text-xs text-white font-bold bg-white/10 px-2 py-0.5 rounded-md">
                      {intensity}%
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/10">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${intensity}%` }}
                    />
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={intensity}
                      onChange={(e) => setIntensity(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* All 12 Tags */}
                <div>
                  <label className="block text-xs text-white/70 font-medium mb-2">
                    {t("entry.tags")}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {commonTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          selectedTags.includes(tag)
                            ? "bg-purple-500/70 text-white shadow-sm ring-1 ring-white/30"
                            : "bg-white/10 text-white/70 hover:bg-white/20"
                        }`}
                      >
                        {ttag(tag)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text (Optional) */}
                <div>
                  <label className="block text-xs text-white/70 font-medium mb-2">
                    {t("entry.journal")}
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t("entry.journal")}
                    className="w-full h-24 p-3 rounded-2xl border border-white/20 bg-white/10 text-white placeholder-white/40 outline-none focus:border-white/40 resize-none text-sm"
                    dir={isRtl ? "rtl" : "ltr"}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-all text-sm"
                >
                  {t("settings.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={selectedMood === null || isSaving}
                  className="flex-1 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-all text-sm disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("entry.save")
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
