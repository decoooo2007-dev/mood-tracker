"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Sparkles } from "lucide-react";
import type { MoodEntry, MoodType } from "@/types/mood";
import { moodOptions, toLocalDateStr } from "@/lib/moods";
import { useLanguage } from "@/lib/providers";

interface MoodHeatmapProps {
  entries: MoodEntry[];
}

export default function MoodHeatmap({ entries }: MoodHeatmapProps) {
  const { isRtl, t, tmood } = useLanguage();
  const [activeCell, setActiveCell] = useState<{
    date: string;
    entry?: MoodEntry;
  } | null>(null);

  // Group entries by date (taking latest or dominant)
  const entryMap = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    entries.forEach((e) => {
      // Keep earliest or latest entry for the day
      if (!map.has(e.date)) {
        map.set(e.date, e);
      }
    });
    return map;
  }, [entries]);

  // Generate last 90 days
  const days = useMemo(() => {
    const list: { dateStr: string; date: Date }[] = [];
    const today = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      list.push({
        dateStr: toLocalDateStr(d),
        date: d,
      });
    }
    return list;
  }, []);

  const moodColorMap: Record<MoodType, string> = {
    Happy: "#4ADE80",
    Calm: "#60A5FA",
    Tired: "#A78BFA",
    Sad: "#818CF8",
    Frustrated: "#F87171",
  };

  return (
    <div className="glass rounded-3xl p-6 mb-8" dir={isRtl ? "rtl" : "ltr"}>
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">
              {t("heatmap.title")}
            </h2>
            <p className="text-white/50 text-xs">
              {isRtl ? "آخر ٩٠ يوماً من رحلتك" : "Last 90 days of your journey"}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-white/60">
          {moodOptions.map((m) => (
            <div key={m.label} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ backgroundColor: moodColorMap[m.label as MoodType] }}
              />
              <span>{tmood(m.label)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-grid grid-rows-7 grid-flow-col gap-1.5 min-w-full sm:min-w-0">
          {days.map(({ dateStr }) => {
            const entry = entryMap.get(dateStr);
            const mood = entry ? (entry.mood as MoodType) : null;
            const bg = mood ? moodColorMap[mood] : "rgba(255, 255, 255, 0.08)";
            const isHovered = activeCell?.date === dateStr;

            return (
              <motion.button
                key={dateStr}
                onClick={() => setActiveCell({ date: dateStr, entry })}
                onMouseEnter={() => setActiveCell({ date: dateStr, entry })}
                onMouseLeave={() => setActiveCell(null)}
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] transition-transform relative ${
                  entry ? "hover:scale-125 hover:z-10" : "hover:bg-white/20"
                } ${isHovered ? "ring-2 ring-white scale-125 z-10" : ""}`}
                style={{ backgroundColor: bg }}
                aria-label={`${dateStr}: ${mood || "No entry"}`}
                whileTap={{ scale: 0.9 }}
              />
            );
          })}
        </div>
      </div>

      {/* Active Cell Info Banner */}
      <div className="mt-3 min-h-[32px] flex items-center justify-between text-xs text-white/70 bg-white/5 rounded-xl px-3 py-1.5 border border-white/5">
        {activeCell ? (
          <>
            <span className="font-medium text-white">
              {activeCell.date}
            </span>
            {activeCell.entry ? (
              <span className="flex items-center gap-1.5 text-purple-300">
                <span className="text-sm">
                  {moodOptions.find((m) => m.label === activeCell.entry?.mood)?.emoji}
                </span>
                <span>{tmood(activeCell.entry.mood)} ({activeCell.entry.intensity}%)</span>
              </span>
            ) : (
              <span className="text-white/40">
                {isRtl ? "لا توجد مدخلات مسجلة في هذا اليوم" : "No entries on this day"}
              </span>
            )}
          </>
        ) : (
          <span className="text-white/40 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            {isRtl ? "المس أو مرر على أي مربع لعرض تفاصيل اليوم" : "Hover or tap any square to inspect mood details"}
          </span>
        )}
      </div>
    </div>
  );
}
