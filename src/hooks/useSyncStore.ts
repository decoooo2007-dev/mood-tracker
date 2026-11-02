"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MoodEntry, UserSettings, MoodStats, MoodType } from "@/types/mood";
import {
  generateId,
  formatTime,
  moodToScore,
  calculateStreak,
  getLongestStreak,
  toLocalDateStr,
} from "@/lib/moods";
import { analyzeSentiment } from "@/lib/sentiment";
import { getSession } from "@/lib/auth";
import { useAuth } from "@/lib/providers";

async function bffFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const response = await fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!response.ok) {
      if (response.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("mood-tracker-session");
      }
      const errBody = await response.json().catch(() => ({}));
      return {
        data: null,
        error: new Error(errBody.error || `HTTP ${response.status}`),
      };
    }
    const json = await response.json();
    return { data: (json.data ?? json) as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Network error"),
    };
  }
}

export function sanitizeCsvCell(value: string): string {
  const escaped = String(value ?? "").replace(/"/g, '""');
  const safe = /^[=+\-@\t\r]/.test(escaped) ? `'${escaped}` : escaped;
  return `"${safe}"`;
}

export function useSyncStore() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const isOnlineRef = useRef(true);

  const session = getSession();
  const userId = authUser?.id || session?.userId || "guest";

  const [localSettings, setLocalSettings] = useState<UserSettings>({
    theme: "dark",
    notifications: true,
    reminderTime: "20:00",
    language: "en",
    exportFormat: "json",
  });

  // Detect online/offline
  useEffect(() => {
    setIsOnline(navigator.onLine);
    isOnlineRef.current = navigator.onLine;

    const handleOnline = () => {
      setIsOnline(true);
      isOnlineRef.current = true;
      queryClient.invalidateQueries({ queryKey: ["mood-entries", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-settings", userId] });
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
  }, [queryClient, userId]);

  // Load entries from BFF API
  const {
    data: entries = [],
    isLoading: entriesLoading,
    error: entriesError,
  } = useQuery({
    queryKey: ["mood-entries", userId],
    queryFn: async () => {
      const currentSession = getSession();
      if (!authUser && !currentSession) return [];

      const { data, error } = await bffFetch<MoodEntry[]>("/api/entries");
      if (error || !data) return [];
      return data;
    },
    enabled: typeof window !== "undefined" && userId !== "guest",
    staleTime: 1000 * 30,
  });

  // Load settings from BFF API
  const {
    data: serverSettings,
    isLoading: settingsLoading,
  } = useQuery({
    queryKey: ["user-settings", userId],
    queryFn: async () => {
      const currentSession = getSession();
      if (!authUser && !currentSession) return null;

      const { data, error } = await bffFetch<Record<string, unknown>>("/api/settings");
      if (error || !data) return null;

      return {
        theme: (data.theme as "dark" | "light") || "dark",
        notifications: typeof data.notifications === "boolean" ? data.notifications : true,
        reminderTime: (data.reminder_time as string) || (data.reminderTime as string) || "20:00",
        language: (data.language as "en" | "ar") || "en",
        exportFormat: (data.export_format as "json" | "csv") || (data.exportFormat as "json" | "csv") || "json",
      } as UserSettings;
    },
    enabled: typeof window !== "undefined" && userId !== "guest",
  });

  const settings = serverSettings || localSettings;

  // Create entry mutation with optimistic update
  const createEntryMutation = useMutation({
    mutationFn: async (params: {
      mood: MoodType;
      intensity: number;
      text: string;
      tags: string[];
    }) => {
      const now = new Date();
      const sentiment = analyzeSentiment(params.text);
      const payload = {
        mood: params.mood,
        intensity: params.intensity,
        text: params.text || "",
        tags: params.tags,
        date: toLocalDateStr(now),
        time: formatTime(now),
        sentiment_score: sentiment.score,
        sentiment_keywords: sentiment.keywords,
      };

      const { data, error } = await bffFetch<MoodEntry>("/api/entries", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (error || !data) {
        throw error || new Error("Failed to create mood entry");
      }

      return data;
    },
    onMutate: async (newParams) => {
      await queryClient.cancelQueries({ queryKey: ["mood-entries", userId] });
      const previousEntries = queryClient.getQueryData<MoodEntry[]>(["mood-entries", userId]) || [];

      const optimisticEntry: MoodEntry = {
        id: generateId(),
        date: toLocalDateStr(new Date()),
        time: formatTime(new Date()),
        mood: newParams.mood,
        intensity: newParams.intensity,
        text: newParams.text || "",
        tags: newParams.tags,
        sentiment: {
          score: analyzeSentiment(newParams.text).score,
          keywords: analyzeSentiment(newParams.text).keywords,
        },
      };

      queryClient.setQueryData<MoodEntry[]>(["mood-entries", userId], [
        optimisticEntry,
        ...previousEntries,
      ]);

      return { previousEntries };
    },
    onError: (_err, _newParams, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["mood-entries", userId], context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-entries", userId] });
    },
  });

  // Delete entry mutation with optimistic update
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await bffFetch(`/api/entries/${id}`, {
        method: "DELETE",
      });
      if (error) throw error;
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["mood-entries", userId] });
      const previousEntries = queryClient.getQueryData<MoodEntry[]>(["mood-entries", userId]);

      queryClient.setQueryData<MoodEntry[]>(["mood-entries", userId], (old) =>
        old ? old.filter((entry) => entry.id !== deletedId) : []
      );

      return { previousEntries };
    },
    onError: (_err, _deletedId, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["mood-entries", userId], context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-entries", userId] });
    },
  });

  // Update entry mutation with optimistic update
  const updateEntryMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      mood?: MoodType;
      intensity?: number;
      text?: string;
      tags?: string[];
    }) => {
      const body: Record<string, unknown> = {};
      if (params.mood !== undefined) body.mood = params.mood;
      if (params.intensity !== undefined) body.intensity = params.intensity;
      if (params.text !== undefined) body.text = params.text;
      if (params.tags !== undefined) body.tags = params.tags;

      const { data, error } = await bffFetch<MoodEntry>(`/api/entries/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (error || !data) throw error || new Error("Failed to update entry");
      return data;
    },
    onMutate: async (updatedParams) => {
      await queryClient.cancelQueries({ queryKey: ["mood-entries", userId] });
      const previousEntries = queryClient.getQueryData<MoodEntry[]>(["mood-entries", userId]);

      queryClient.setQueryData<MoodEntry[]>(["mood-entries", userId], (old) =>
        old
          ? old.map((entry) =>
              entry.id === updatedParams.id
                ? {
                    ...entry,
                    ...(updatedParams.mood !== undefined && { mood: updatedParams.mood }),
                    ...(updatedParams.intensity !== undefined && { intensity: updatedParams.intensity }),
                    ...(updatedParams.text !== undefined && { text: updatedParams.text }),
                    ...(updatedParams.tags !== undefined && { tags: updatedParams.tags }),
                  }
                : entry
            )
          : []
      );

      return { previousEntries };
    },
    onError: (_err, _updatedParams, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["mood-entries", userId], context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-entries", userId] });
    },
  });

  // Theme change - works immediately offline or online
  const changeTheme = useCallback(
    (theme: "dark" | "light") => {
      setLocalSettings((prev) => ({ ...prev, theme }));

      if (theme === "light") {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      } else {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
      }

      localStorage.setItem("moodflow-theme", theme);

      const currentSession = getSession();
      const currentUserId = currentSession?.userId ?? "guest";

      queryClient.setQueryData(["user-settings", currentUserId], (old: UserSettings | undefined) => ({
        ...(old || localSettings),
        theme,
      }));

      if (currentSession) {
        bffFetch("/api/settings", {
          method: "PATCH",
          body: JSON.stringify({ theme }),
        }).catch(() => {});
      }
    },
    [localSettings, queryClient]
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (updates.theme !== undefined) {
        changeTheme(updates.theme);
      }

      const body: Record<string, unknown> = {};
      if (updates.notifications !== undefined) body.notifications = updates.notifications;
      if (updates.reminderTime !== undefined) {
        body.reminder_time = updates.reminderTime;
        body.reminderTime = updates.reminderTime;
      }
      if (updates.language !== undefined) body.language = updates.language;
      if (updates.exportFormat !== undefined) {
        body.export_format = updates.exportFormat;
        body.exportFormat = updates.exportFormat;
      }

      const { data, error } = await bffFetch<Record<string, unknown>>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings", userId] });
    },
  });

  // Clear all data
  const clearAllData = useCallback(async () => {
    const { error } = await bffFetch("/api/entries", {
      method: "DELETE",
    });
    if (error) throw error;

    queryClient.setQueryData(["mood-entries", userId], []);
    queryClient.invalidateQueries({ queryKey: ["mood-entries", userId] });
  }, [queryClient, userId]);

  // Calculate stats with true historical longest streak
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
      totalScore += moodToScore[entry.mood] || 3;
      if (moodDistribution[entry.mood] !== undefined) {
        moodDistribution[entry.mood]++;
      }
    });

    const averageMood = totalScore / data.length;
    const mostCommonMood = Object.entries(moodDistribution).reduce<[MoodType, number]>(
      (a, b) => (b[1] > a[1] ? (b as [MoodType, number]) : a),
      ["Calm", 0]
    )[0];

    const currentStreak = calculateStreak(data);
    const longestStreak = Math.max(currentStreak, getLongestStreak(data));

    const weekAgo = new Date();
    weekAgo.setHours(0, 0, 0, 0);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekAgoStr = toLocalDateStr(weekAgo);
    const entriesThisWeek = data.filter((e) => e.date >= weekAgoStr).length;

    return {
      totalEntries: data.length,
      currentStreak,
      longestStreak,
      averageMood,
      mostCommonMood,
      entriesThisWeek,
      moodDistribution,
    };
  }, [entries]);

  const getWeeklyDataFn = useCallback(() => {
    const weekData: { day: string; score: number }[] = [];
    const today = new Date();
    const isArabic =
      typeof window !== "undefined"
        ? document.documentElement.dir === "rtl"
        : false;

    const arabicDays = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
    const englishDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = toLocalDateStr(date);
      const dayOfWeek = date.getDay();
      const dayName = isArabic ? arabicDays[dayOfWeek] : englishDays[dayOfWeek];

      const dayEntries = entries.filter((e) => e.date === dateStr);
      const avgScore =
        dayEntries.length > 0
          ? dayEntries.reduce((sum, e) => sum + (moodToScore[e.mood] || 3), 0) /
            dayEntries.length
          : 0;

      weekData.push({
        day: dayName,
        score: Math.round(avgScore * 10) / 10,
      });
    }

    return weekData;
  }, [entries]);

  const exportData = useCallback(
    (format: "json" | "csv") => {
      let content: string;
      let mimeType: string;

      if (format === "json") {
        content = JSON.stringify(entries, null, 2);
        mimeType = "application/json";
      } else {
        const headers = ["Date", "Time", "Mood", "Intensity", "Text", "Tags", "Sentiment Score"];
        const rows = entries.map((e) => [
          e.date,
          e.time,
          e.mood,
          String(e.intensity ?? 50),
          sanitizeCsvCell(e.text || ""),
          sanitizeCsvCell((e.tags || []).join("; ")),
          String(e.sentiment?.score ?? ""),
        ]);
        content = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        mimeType = "text/csv;charset=utf-8;";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mood-journal-${toLocalDateStr(new Date())}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [entries]
  );

  return {
    entries,
    settings,
    isLoading: entriesLoading || settingsLoading,
    error: entriesError,
    isOnline,
    addEntry: createEntryMutation.mutate,
    createEntry: createEntryMutation.mutateAsync,
    deleteEntry: deleteEntryMutation.mutateAsync,
    updateEntry: updateEntryMutation.mutateAsync,
    updateSettings: updateSettingsMutation.mutate,
    changeTheme,
    getStats,
    getWeeklyData: getWeeklyDataFn,
    isCreating: createEntryMutation.isPending,
    isDeleting: deleteEntryMutation.isPending,
    isUpdating: updateEntryMutation.isPending,
    clearAllData,
    exportData,
  };
}
