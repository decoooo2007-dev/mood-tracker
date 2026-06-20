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

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getWeekDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(formatDate(date));
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
  if (isToday(dateString)) return "Today";
  if (isYesterday(dateString)) return "Yesterday";
  return formatDate(new Date(dateString));
};

export const calculateStreak = (entries: { date: string }[]): number => {
  if (entries.length === 0) return 0;

  const sortedDates = [...new Set(entries.map((e) => e.date))].sort().reverse();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedDates.length; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const checkDateStr = checkDate.toISOString().split("T")[0];

    if (sortedDates.includes(checkDateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
};