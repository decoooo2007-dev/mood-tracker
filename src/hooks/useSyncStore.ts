"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoodEntry, UserSettings, MoodStats, MoodType } from "@/types/mood";
import { generateId, formatTime, moodToScore, calculateStreak } from "@/lib/moods";
import { analyzeSentiment } from "@/lib/sentiment";

// Keys for localStorage
const OFFLINE_QUEUE_KEY = "mood-tracker-offline-queue";
const LOCAL_ENTRIES_KEY = "mood-tracker-entries";
const LOCAL_SETTINGS_KEY = "mood-tracker-settings";

// Get entries from localStorage
function getLocalEntries(): MoodEntry[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(LOCAL_ENTRIES_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Save entries to localStorage
function saveLocalEntries(entries: MoodEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
}

// Get settings from localStorage
function getLocalSettings(): UserSettings {
  if (typeof window === "undefined") {
    return {
      theme: "dark",
      notifications: true,
      reminderTime: "21:00",
      language: "en",
      exportFormat: "json",
    };
  }
  const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
  return stored ? JSON.parse(stored) : {
    theme: "dark" as const,
    notifications: true,
    reminderTime: "21:00",
    language: "en",
    exportFormat: "json" as const,
  };
}

// Save settings to localStorage
function saveLocalSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

export function useSyncStore() {
  const queryClient = useQueryClient();
  const isOnlineRef = useRef(typeof window !== "undefined" ? navigator.onLine : true);

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load entries
  const {
    data: entries = [],
    isLoading: entriesLoading,
    error: entriesError,
  } = useQuery({
    queryKey: ["mood-entries"],
    queryFn: () => {
      return getLocalEntries();
    },
    enabled: true,
    staleTime: 1000 * 30,
  });

  // Load settings
  const {
    data: settings = {
      theme: "dark" as const,
      notifications: true,
      reminderTime: "21:00",
      language: "en",
      exportFormat: "json" as const,
    },
    isLoading: settingsLoading,
  } = useQuery({
    queryKey: ["user-settings"],
    queryFn: () => {
      return getLocalSettings();
    },
    enabled: true,
  });

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (params: {
      mood: MoodType;
      intensity: number;
      text: string;
      tags: string[];
    }) => {
      const now = new Date();
      const sentiment = analyzeSentiment(params.text);

      const newEntry: MoodEntry = {
        id: generateId(),
        date: now.toISOString().split("T")[0],
        time: formatTime(now),
        mood: params.mood,
        intensity: params.intensity,
        text: params.text,
        tags: params.tags,
        sentiment: { score: sentiment.score, keywords: sentiment.keywords },
      };

      const currentEntries = getLocalEntries();
      currentEntries.unshift(newEntry);
      saveLocalEntries(currentEntries);

      return newEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const currentEntries = getLocalEntries();
      const filtered = currentEntries.filter((e) => e.id !== id);
      saveLocalEntries(filtered);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const current = getLocalSettings();
      const updated = { ...current, ...updates };
      saveLocalSettings(updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });

  // Clear all data
  const clearAllData = useCallback(() => {
    localStorage.removeItem(LOCAL_ENTRIES_KEY);
    localStorage.removeItem(LOCAL_SETTINGS_KEY);
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
    queryClient.invalidateQueries({ queryKey: ["user-settings"] });
  }, [queryClient]);

  // Calculate stats
  const getStats = useCallback((): MoodStats => {
    const data = entries;

    if (data.length === 0) {
      return {
        totalEntries: 0,
        currentStreak: 0,
        longestStreak: 0,
        averageMood: 0,
        mostCommonMood: "Calm" as MoodType,
        entriesThisWeek: 0,
        moodDistribution: { Happy: 0, Calm: 0, Sad: 0, Frustrated: 0, Tired: 0 },
      };
    }

    const moodDistribution: Record<MoodType, number> = {
      Happy: 0,
      Calm: 0,
      Sad: 0,
      Frustrated: 0,
      Tired: 0,
    };

    let totalScore = 0;
    data.forEach((entry) => {
      totalScore += moodToScore[entry.mood];
      moodDistribution[entry.mood]++;
    });

    const averageMood = totalScore / data.length;
    const mostCommonMood = Object.entries(moodDistribution).reduce<[MoodType, number]>(
      (a, b) => (b[1] > a[1] ? (b as [MoodType, number]) : a),
      ["Calm", 0]
    )[0];

    const currentStreak = calculateStreak(data);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const entriesThisWeek = data.filter(
      (e) => new Date(e.date) >= weekAgo
    ).length;

    return {
      totalEntries: data.length,
      currentStreak,
      longestStreak: currentStreak,
      averageMood,
      mostCommonMood,
      entriesThisWeek,
      moodDistribution,
    };
  }, [entries]);

  const getWeeklyData = useCallback(() => {
    const weekData: { day: string; score: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

      const dayEntries = entries.filter((e) => e.date === dateStr);
      const avgScore =
        dayEntries.length > 0
          ? dayEntries.reduce((sum, e) => sum + moodToScore[e.mood], 0) /
            dayEntries.length
          : 0;

      weekData.push({
        day: dayName,
        score: Math.round(avgScore * 10) / 10,
      });
    }

    return weekData;
  }, [entries]);

  return {
    entries,
    settings,
    isLoading: entriesLoading || settingsLoading,
    error: entriesError,
    isOnline: isOnlineRef.current,
    addEntry: createEntryMutation.mutate,
    deleteEntry: deleteEntryMutation.mutate,
    updateSettings: updateSettingsMutation.mutate,
    getStats,
    getWeeklyData,
    isCreating: createEntryMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
    isUpdating: updateSettingsMutation.isPending,
    clearAllData,
    exportData: (format: "json" | "csv") => {
      let content: string;

      if (format === "json") {
        content = JSON.stringify(entries, null, 2);
      } else {
        const headers = ["Date", "Time", "Mood", "Intensity", "Text", "Tags"];
        const rows = entries.map((e) => [
          e.date,
          e.time,
          e.mood,
          e.intensity.toString(),
          `"${e.text.replace(/"/g, '""')}"`,
          e.tags.join("; "),
        ]);
        content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      }

      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mood-journal-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}
