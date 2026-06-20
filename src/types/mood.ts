export interface MoodEntry {
  id: string;
  date: string;
  time: string;
  mood: MoodType;
  intensity: number;
  text: string;
  tags: string[];
  sentiment?: {
    score: number;
    keywords: string[];
  };
}

export type MoodType = "Happy" | "Calm" | "Sad" | "Frustrated" | "Tired";

export interface MoodOption {
  emoji: string;
  label: MoodType;
  color: string;
  gradient: string;
}

export interface UserSettings {
  theme: "dark" | "light";
  notifications: boolean;
  reminderTime: string;
  language: string;
  exportFormat: "json" | "csv" | "pdf";
}

export interface MoodStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  averageMood: number;
  mostCommonMood: MoodType;
  entriesThisWeek: number;
  moodDistribution: Record<MoodType, number>;
}