"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoodEntry, UserSettings, MoodStats, MoodType } from "@/types/mood";
import { generateId, formatTime, moodToScore, calculateStreak } from "@/lib/moods";
import { analyzeSentiment } from "@/lib/sentiment";
import { getSession } from "@/lib/auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase fetch helper
async function supabaseFetch(
  table: string,
  options: {
    method?: string;
    body?: object;
    params?: Record<string, string>;
    select?: string;
  } = {}
) {
  const { method = "GET", body, params, select = "*" } = options;

  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url += `&${key}=${value}`;
    });
  }

  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };

  const session = getSession();
  if (session) {
    headers["x-user-id"] = session.userId;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Supabase error: ${res.status}`);
  }

  return res.json();
}

export function useSyncStore() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);
  const isOnlineRef = useRef(true);

  // Detect online/offline
  useEffect(() => {
    setIsOnline(navigator.onLine);
    isOnlineRef.current = navigator.onLine;

    const handleOnline = () => {
      setIsOnline(true);
      isOnlineRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    };
    const handleOffline = () => {
      setIsOnline(false);
      isOnlineRef.current = false;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [queryClient]);

  // Refetch entries when session is available
  useEffect(() => {
    const session = getSession();
    if (session) {
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    }
  }, [queryClient]);

  // Load entries from Supabase
  const {
    data: entries = [],
    isLoading: entriesLoading,
    error: entriesError,
  } = useQuery({
    queryKey: ["mood-entries"],
    queryFn: async () => {
      const session = getSession();
      if (!session) return [];

      try {
        const data = await supabaseFetch("mood_entries", {
          params: {
            user_id: `eq.${session.userId}`,
            order: "created_at.desc",
          },
        });
        return data.map((e: Record<string, unknown>) => ({
          id: e.id,
          date: e.date,
          time: e.time,
          mood: e.mood,
          intensity: e.intensity,
          text: e.text,
          tags: e.tags || [],
          sentiment: {
            score: (e.sentiment_score as number) || 0,
            keywords: (e.sentiment_keywords as string[]) || [],
          },
        })) as MoodEntry[];
      } catch {
        return [];
      }
    },
    enabled: true,
    staleTime: 1000 * 30,
  });

  // Load settings from Supabase
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
    queryFn: async () => {
      const session = getSession();
      if (!session) return null;

      try {
        const data = await supabaseFetch("user_settings", {
          params: {
            user_id: `eq.${session.userId}`,
          },
        });

        if (data.length === 0) return null;

        const s = data[0];
        return {
          theme: (s.theme as "dark" | "light") || "dark",
          notifications: s.notifications ?? true,
          reminderTime: s.reminder_time || "21:00",
          language: s.language || "en",
          exportFormat: (s.export_format as "json" | "csv") || "json",
        } as UserSettings;
      } catch {
        return null;
      }
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
      const session = getSession();
      if (!session) throw new Error("Not authenticated");

      const now = new Date();
      const sentiment = analyzeSentiment(params.text);

      const newEntry = {
        user_id: session.userId,
        date: now.toISOString().split("T")[0],
        time: formatTime(now),
        mood: params.mood,
        intensity: params.intensity,
        text: params.text,
        tags: params.tags,
        sentiment_score: sentiment.score,
        sentiment_keywords: sentiment.keywords,
      };

      await supabaseFetch("mood_entries", {
        method: "POST",
        body: newEntry,
      });

      return newEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabaseFetch(`mood_entries?id=eq.${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const session = getSession();
      if (!session) throw new Error("Not authenticated");

      const body: Record<string, unknown> = {};
      if (updates.theme !== undefined) body.theme = updates.theme;
      if (updates.notifications !== undefined) body.notifications = updates.notifications;
      if (updates.reminderTime !== undefined) body.reminder_time = updates.reminderTime;
      if (updates.language !== undefined) body.language = updates.language;
      if (updates.exportFormat !== undefined) body.export_format = updates.exportFormat;
      body.updated_at = new Date().toISOString();

      // Check if settings exist
      const existing = await supabaseFetch("user_settings", {
        params: { user_id: `eq.${session.userId}` },
      });

      if (existing.length === 0) {
        await supabaseFetch("user_settings", {
          method: "POST",
          body: { user_id: session.userId, ...body },
        });
      } else {
        await supabaseFetch(`user_settings?user_id=eq.${session.userId}`, {
          method: "PATCH",
          body,
        });
      }

      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });

  // Clear all data
  const clearAllData = useCallback(async () => {
    const session = getSession();
    if (!session) return;

    await supabaseFetch(`mood_entries?user_id=eq.${session.userId}`, {
      method: "DELETE",
    });

    queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
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
    isOnline,
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
