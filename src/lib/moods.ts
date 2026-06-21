import { MoodOption, MoodType } from "@/types/mood";

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

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Import currentLocale to determine date format
import { currentLocale } from "./i18n/translations";

export const formatDate = (date: Date): string => {
  const locale = currentLocale === "ar" ? "ar-SA" : "en-US";
  return date.toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (date: Date): string => {
  const locale = currentLocale === "ar" ? "ar-SA" : "en-US";
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getWeekDates = (): string[] => {
  const isArabic = currentLocale === "ar";

  // Day names - Saturday to Friday (correct order for both)
  const arabicDays = ["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];
  const englishDays = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

  const days = isArabic ? arabicDays : englishDays;

  // Get today (0 = Sunday, 1 = Monday, ..., 6 = Saturday in JS)
  // Convert to our index where 0 = Saturday
  const today = new Date();
  const todayIndex = (today.getDay() + 1) % 7; // 0-6, Saturday=0

  // Build 7 days ending with today
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const dayIndex = (todayIndex - 6 + i + 7) % 7;
    dates.push(days[dayIndex]);
  }

  return dates;
};

export const isToday = (dateString: string): boolean => {
  const today = new Date();
  const entryDate = new Date(dateString);
  return (
    entryDate.getDate() === today.getDate() &&
    entryDate.getMonth() === today.getMonth() &&
    entryDate.getFullYear() === today.getFullYear()
  );
};

export const isYesterday = (dateString: string): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const entryDate = new Date(dateString);
  return (
    entryDate.getDate() === yesterday.getDate() &&
    entryDate.getMonth() === yesterday.getMonth() &&
    entryDate.getFullYear() === yesterday.getFullYear()
  );
};

export const getRelativeDate = (dateString: string): string => {
  if (isToday(dateString)) {
    return currentLocale === "ar" ? "اليوم" : "Today";
  }
  if (isYesterday(dateString)) {
    return currentLocale === "ar" ? "أمس" : "Yesterday";
  }
  return formatDate(new Date(dateString));
};

export const calculateStreak = (entries: { date: string }[]): number => {
  if (entries.length === 0) return 0;

  const sortedDates = [...new Set(entries.map((e) => e.date))].sort().reverse();
  let streak = 0;

  // Use local date format (YYYY-MM-DD)
  const getLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedDates.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = getLocalDateStr(checkDate);

    if (sortedDates.includes(checkDateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
};