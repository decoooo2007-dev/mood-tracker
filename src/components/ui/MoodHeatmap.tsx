"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Sparkles } from "lucide-react";
import type { MoodEntry, MoodType } from "@/types/mood";
import { moodOptions, toLocalDateStr } from "@/lib/moods";
import { useLanguage } from "@/lib/providers";

interface MoodHeatmapProps {
  entries: MoodEntry[];
}

type RangeDays = 30 | 90 | 365;

interface DayCell {
  dateStr: string;
  date: Date;
}

const moodColorMap: Record<MoodType, string> = {
  Happy: "#4ADE80",
  Calm: "#60A5FA",
  Tired: "#A78BFA",
  Sad: "#818CF8",
  Frustrated: "#F87171",
};

export default function MoodHeatmap({ entries }: MoodHeatmapProps) {
  const { isRtl, locale, t, tmood, ttag } = useLanguage();
  const [rangeDays, setRangeDays] = useState<RangeDays>(90);
  const [isLight, setIsLight] = useState(false);
  const [activeCell, setActiveCell] = useState<{
    date: string;
    entry?: MoodEntry;
  } | null>(null);

  useEffect(() => {
    const checkTheme = () => {
      setIsLight(document.documentElement.classList.contains("light"));
    };
    checkTheme();
    window.addEventListener("moodflow-appearance-change", checkTheme);
    window.addEventListener("storage", checkTheme);
    return () => {
      window.removeEventListener("moodflow-appearance-change", checkTheme);
      window.removeEventListener("storage", checkTheme);
    };
  }, []);

  // Group entries by date (taking latest / first encountered in descending list)
  const entryMap = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    entries.forEach((e) => {
      if (!map.has(e.date)) {
        map.set(e.date, e);
      }
    });
    return map;
  }, [entries]);

  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);

  // Build Sat->Fri aligned week columns for the selected range (30D / 90D / 365D)
  const { columns, monthHeaders, moodCountsInRange } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list: DayCell[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      list.push({ dateStr: toLocalDateStr(d), date: d });
    }

    // Count mood days within the selected range for the top legend
    const counts: Record<MoodType, number> = {
      Happy: 0,
      Calm: 0,
      Sad: 0,
      Frustrated: 0,
      Tired: 0,
    };
    for (const cell of list) {
      const entry = entryMap.get(cell.dateStr);
      if (entry && counts[entry.mood] !== undefined) {
        counts[entry.mood]++;
      }
    }

    // Align weekday rows: Saturday (6) -> row 0, Sun (0) -> 1, ..., Fri (5) -> 6
    const firstRowOffset = (list[0].date.getDay() + 1) % 7;
    const padded: (DayCell | null)[] = [
      ...Array<null>(firstRowOffset).fill(null),
      ...list,
    ];
    while (padded.length % 7 !== 0) {
      padded.push(null);
    }

    const cols: (DayCell | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      cols.push(padded.slice(i, i + 7));
    }

    // Compute month headers aligned to week column indices
    const headers: { colIndex: number; label: string }[] = [];
    let lastMonthKey = "";
    const monthLocale = locale === "ar" ? "ar-EG" : "en-US";

    cols.forEach((col, colIdx) => {
      const firstValid = col.find((c): c is DayCell => c !== null);
      if (!firstValid) return;
      const monthKey = `${firstValid.date.getFullYear()}-${firstValid.date.getMonth()}`;
      if (monthKey !== lastMonthKey) {
        lastMonthKey = monthKey;
        headers.push({
          colIndex: colIdx,
          label: firstValid.date.toLocaleDateString(monthLocale, { month: "short" }),
        });
      }
    });

    return {
      columns: cols,
      monthHeaders: headers,
      moodCountsInRange: counts,
    };
  }, [rangeDays, entryMap, locale]);

  const weekdayLabels = useMemo(
    () =>
      locale === "ar"
        ? ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"]
        : ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
    [locale]
  );

  const emptyCellBg = isLight
    ? "rgba(15, 23, 42, 0.09)"
    : "rgba(255, 255, 255, 0.10)";
  const emptyCellBorder = isLight
    ? "1px solid rgba(15, 23, 42, 0.10)"
    : "1px solid rgba(255, 255, 255, 0.08)";

  const ranges: { value: RangeDays; label: string }[] = [
    { value: 30, label: t("heatmap.range30") },
    { value: 90, label: t("heatmap.range90") },
    { value: 365, label: t("heatmap.range365") },
  ];

  const todayEntry = entryMap.get(todayStr);
  const inspected = activeCell || (todayEntry ? { date: todayStr, entry: todayEntry } : null);

  return (
    <div className="glass rounded-3xl p-5 sm:p-6 mb-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header + 30D / 90D / 365D Range Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl accent-pill flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="theme-text-primary font-bold text-base">
              {t("heatmap.title")}
            </h2>
            <p className="theme-text-muted text-xs">{t("heatmap.subtitle")}</p>
          </div>
        </div>

        <div className="inline-flex rounded-full recessed-well p-0.5 text-[11px]">
          {ranges.map((r) => {
            const active = rangeDays === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRangeDays(r.value)}
                className={`px-2.5 py-1 rounded-full font-semibold transition-all ${
                  active ? "accent-gradient-btn" : "theme-text-secondary hover:opacity-90"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Always-Visible Top Legend Bar: Swatch + Emoji + Mood Meaning + Day Count */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-3 recessed-well rounded-2xl mb-4">
        {moodOptions.map((m) => {
          const moodKey = m.label as MoodType;
          const count = moodCountsInRange[moodKey] || 0;
          return (
            <div
              key={m.label}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px]"
            >
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: moodColorMap[moodKey] }}
              />
              <span className="emoji">{m.emoji}</span>
              <span className="theme-text-primary font-medium">{tmood(m.label)}</span>
              <span className="theme-text-muted">· {count}</span>
            </div>
          );
        })}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px]">
          <span
            className="w-3 h-3 rounded-sm shrink-0"
            style={{ backgroundColor: emptyCellBg, border: emptyCellBorder }}
          />
          <span className="theme-text-muted">{t("heatmap.noEntry")}</span>
        </div>
      </div>

      {/* Month Column Headers + Weekday-Aligned Matrix */}
      <div className="overflow-x-auto pb-2 no-scrollbar">
        <div className="inline-block min-w-full">
          <div className="flex items-start gap-2.5">
            {/* Weekday Axis (Sat -> Fri) */}
            <div className="flex flex-col gap-1.5 text-[10px] theme-text-muted font-medium pt-5 shrink-0">
              {weekdayLabels.map((lbl, idx) => (
                <div
                  key={lbl}
                  className="h-3.5 sm:h-4 flex items-center leading-none"
                >
                  {idx % 2 === 0 ? lbl : ""}
                </div>
              ))}
            </div>

            {/* Columns with Month Headers */}
            <div className="flex-1">
              {/* Month Header Strip */}
              <div
                className="grid gap-1.5 mb-1.5 text-[10px] font-semibold theme-text-muted h-3.5"
                style={{
                  gridTemplateColumns: `repeat(${columns.length}, minmax(0.875rem, 1rem))`,
                }}
              >
                {columns.map((_, colIdx) => {
                  const hdr = monthHeaders.find((h) => h.colIndex === colIdx);
                  return (
                    <div key={colIdx} className="overflow-visible whitespace-nowrap">
                      {hdr ? hdr.label : ""}
                    </div>
                  );
                })}
              </div>

              {/* 7-Row x N-Week Columns Matrix */}
              <div className="flex gap-1.5">
                {columns.map((col, colIdx) => (
                  <div key={colIdx} className="flex flex-col gap-1.5 shrink-0">
                    {col.map((cell, rowIdx) => {
                      if (!cell) {
                        return (
                          <div
                            key={`empty-${colIdx}-${rowIdx}`}
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] opacity-0 pointer-events-none"
                          />
                        );
                      }

                      const entry = entryMap.get(cell.dateStr);
                      const mood = entry ? (entry.mood as MoodType) : null;
                      const bg = mood ? moodColorMap[mood] : emptyCellBg;
                      const isHovered = activeCell?.date === cell.dateStr;
                      const isCurrentDay = cell.dateStr === todayStr;

                      return (
                        <motion.button
                          key={cell.dateStr}
                          type="button"
                          onClick={() => setActiveCell({ date: cell.dateStr, entry })}
                          onMouseEnter={() => setActiveCell({ date: cell.dateStr, entry })}
                          onMouseLeave={() => setActiveCell(null)}
                          className={`no-touch-target w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] transition-transform relative ${
                            entry ? "hover:scale-125 hover:z-10" : "hover:opacity-80"
                          } ${
                            isHovered || isCurrentDay
                              ? isLight
                                ? "ring-2 ring-slate-900/70 scale-110 z-10"
                                : "ring-2 ring-white scale-110 z-10"
                              : ""
                          }`}
                          style={{
                            backgroundColor: bg,
                            border: mood ? "none" : emptyCellBorder,
                          }}
                          aria-label={`${cell.dateStr}: ${mood ? tmood(mood) : t("heatmap.noEntry")}`}
                          whileTap={{ scale: 0.9 }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected / Today Info Banner */}
      <div className="mt-3 min-h-[38px] flex flex-wrap items-center justify-between gap-2 text-xs theme-text-secondary recessed-well rounded-2xl px-3.5 py-2">
        {inspected ? (
          <>
            <div className="flex items-center gap-2">
              {inspected.entry ? (
                <span className="text-base emoji">
                  {moodOptions.find((m) => m.label === inspected.entry?.mood)?.emoji}
                </span>
              ) : null}
              <span className="font-semibold theme-text-primary">{inspected.date}</span>
              {inspected.entry ? (
                <span className="font-medium theme-text-secondary">
                  · {tmood(inspected.entry.mood)} ({inspected.entry.intensity}%)
                </span>
              ) : (
                <span className="theme-text-muted">· {t("heatmap.noEntry")}</span>
              )}
            </div>
            {inspected.entry?.tags && inspected.entry.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {inspected.entry.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full accent-pill text-[10px] font-medium"
                  >
                    #{ttag(tag)}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <span className="theme-text-muted flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--accent-solid)" }} />
            {isRtl
              ? "المس أو مرر على أي مربع لعرض تفاصيل اليوم"
              : "Hover or tap any square to inspect mood details"}
          </span>
        )}
      </div>
    </div>
  );
}
