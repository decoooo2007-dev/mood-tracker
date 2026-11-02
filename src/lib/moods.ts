import type { MoodEntry, MoodOption, MoodType } from "@/types/mood";
import { currentLocale, ttag, type Locale } from "./i18n/translations";

export const moodOptions: MoodOption[] = [
  { emoji: "😊", label: "Happy", color: "#4ADE80", gradient: "from-green-400/50 to-emerald-400/50" },
  { emoji: "😌", label: "Calm", color: "#60A5FA", gradient: "from-blue-400/50 to-cyan-400/50" },
  { emoji: "😢", label: "Sad", color: "#818CF8", gradient: "from-indigo-400/50 to-violet-400/50" },
  { emoji: "😤", label: "Frustrated", color: "#F87171", gradient: "from-red-400/50 to-orange-400/50" },
  { emoji: "😴", label: "Tired", color: "#A78BFA", gradient: "from-violet-400/50 to-purple-400/50" },
];

export const moodToScore: Record<MoodType, number> = {
  Happy: 5,
  Calm: 4,
  Tired: 3,
  Sad: 2,
  Frustrated: 1,
};

export const scoreToMood = (score: number): MoodType => {
  if (score >= 4.5) return "Happy";
  if (score >= 3.5) return "Calm";
  if (score >= 2.5) return "Tired";
  if (score >= 1.5) return "Sad";
  return "Frustrated";
};

export const getMoodByLabel = (label: MoodType): MoodOption => {
  return moodOptions.find((m) => m.label === label) || moodOptions[0];
};

export const commonTags = [
  "Work",
  "Family",
  "Health",
  "Exercise",
  "Sleep",
  "Social",
  "Creative",
  "Learning",
  "Stress",
  "Gratitude",
  "Anxiety",
  "Motivation",
];

export const translateTag = (tag: string, locale: Locale = currentLocale): string => {
  return ttag(tag, locale);
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export function toLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export const formatDate = (date: Date, localeOverride?: Locale): string => {
  const locale = (localeOverride || currentLocale) === "ar" ? "ar-SA" : "en-US";
  return date.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (date: Date, localeOverride?: Locale): string => {
  const locale = (localeOverride || currentLocale) === "ar" ? "ar-SA" : "en-US";
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const isToday = (dateString: string): boolean => {
  return dateString === toLocalDateStr(new Date());
};

export const isYesterday = (dateString: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateString === toLocalDateStr(yesterday);
};

export const getRelativeDate = (dateString: string, localeOverride?: Locale): string => {
  const activeLocale = localeOverride || currentLocale;
  if (isToday(dateString)) {
    return activeLocale === "ar" ? "اليوم" : "Today";
  }
  if (isYesterday(dateString)) {
    return activeLocale === "ar" ? "أمس" : "Yesterday";
  }
  return formatDate(parseLocalDate(dateString), activeLocale);
};

export const calculateStreak = (entries: { date: string }[]): number => {
  if (entries.length === 0) return 0;

  const uniqueAsc = [...new Set(entries.map((e) => e.date))].sort();
  const todayStr = toLocalDateStr(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  // If there's no entry today or yesterday, streak is 0
  const hasToday = uniqueAsc.includes(todayStr);
  const hasYesterday = uniqueAsc.includes(yesterdayStr);
  if (!hasToday && !hasYesterday) return 0;

  let streak = 1;
  const startDay = hasToday ? todayStr : yesterdayStr;
  let currentDate = parseLocalDate(startDay);

  while (true) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevStr = toLocalDateStr(prevDate);
    if (uniqueAsc.includes(prevStr)) {
      streak += 1;
      currentDate = prevDate;
    } else {
      break;
    }
  }

  return streak;
};

export function getLongestStreak(entries: { date: string }[]): number {
  if (entries.length === 0) return 0;
  const uniqueAsc = [...new Set(entries.map((e) => e.date))].sort();
  let maxStreak = 1;
  let current = 1;
  for (let i = 1; i < uniqueAsc.length; i++) {
    const prev = parseLocalDate(uniqueAsc[i - 1]);
    const curr = parseLocalDate(uniqueAsc[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) {
      current += 1;
      if (current > maxStreak) maxStreak = current;
    } else if (diffDays > 1) {
      current = 1;
    }
  }
  return maxStreak;
}

export function getWeeklyData(
  entries: MoodEntry[],
  localeOverride?: Locale
): { day: string; score: number }[] {
  const weekData: { day: string; score: number }[] = [];
  const today = new Date();
  const isArabic = (localeOverride || currentLocale) === "ar";

  const arabicDays = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  const englishDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = toLocalDateStr(date);
    const dayOfWeek = date.getDay(); // 0 = Sun
    const dayName = isArabic ? arabicDays[dayOfWeek] : englishDays[dayOfWeek];

    const dayEntries = entries.filter((e) => e.date === dateStr);
    const avgScore =
      dayEntries.length > 0
        ? dayEntries.reduce((sum, e) => sum + (moodToScore[e.mood] || 3), 0) / dayEntries.length
        : 0;

    weekData.push({
      day: dayName,
      score: Math.round(avgScore * 10) / 10,
    });
  }

  return weekData;
}