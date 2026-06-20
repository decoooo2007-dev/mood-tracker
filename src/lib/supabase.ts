import { createClient } from "@supabase/supabase-js";
import { MoodEntry, UserSettings } from "@/types/mood";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create Supabase client with settings for third-party cookie compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key) => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem(key);
        }
        return null;
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(key);
        }
      },
    },
  },
});

// Database types for Supabase
export interface DatabaseMoodEntry {
  id: string;
  user_id: string;
  date: string;
  time: string;
  mood: string;
  intensity: number;
  text: string;
  tags: string[];
  sentiment_score?: number;
  sentiment_keywords?: string[];
  created_at: string;
  updated_at: string;
}

export interface DatabaseUserSettings {
  user_id: string;
  theme: string;
  notifications: boolean;
  reminder_time: string;
  language: string;
  updated_at: string;
}

// Convert database entry to app entry
export function toAppEntry(dbEntry: DatabaseMoodEntry): MoodEntry {
  return {
    id: dbEntry.id,
    date: dbEntry.date,
    time: dbEntry.time,
    mood: dbEntry.mood as MoodEntry["mood"],
    intensity: dbEntry.intensity,
    text: dbEntry.text,
    tags: dbEntry.tags,
    sentiment: dbEntry.sentiment_score !== undefined ? {
      score: dbEntry.sentiment_score,
      keywords: dbEntry.sentiment_keywords || [],
    } : undefined,
  };
}

// Convert app entry to database entry
export function toDbEntry(
  appEntry: MoodEntry,
  userId: string
): Omit<DatabaseMoodEntry, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    date: appEntry.date,
    time: appEntry.time,
    mood: appEntry.mood,
    intensity: appEntry.intensity,
    text: appEntry.text,
    tags: appEntry.tags,
    sentiment_score: appEntry.sentiment?.score,
    sentiment_keywords: appEntry.sentiment?.keywords,
  };
}

// Convert database settings to app settings
export function toAppSettings(dbSettings: DatabaseUserSettings): UserSettings {
  return {
    theme: dbSettings.theme as "dark" | "light",
    notifications: dbSettings.notifications,
    reminderTime: dbSettings.reminder_time,
    language: dbSettings.language,
    exportFormat: "json",
  };
}

// Convert app settings to database settings
export function toDbSettings(
  appSettings: Partial<UserSettings>,
  userId: string
): Partial<DatabaseUserSettings> {
  return {
    user_id: userId,
    theme: appSettings.theme,
    notifications: appSettings.notifications,
    reminder_time: appSettings.reminderTime,
    language: appSettings.language,
  };
}
