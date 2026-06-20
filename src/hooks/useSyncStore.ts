"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/providers";
import {
  supabase,
  toAppEntry,
  toDbEntry,
  toAppSettings,
  toDbSettings,
  DatabaseMoodEntry,
} from "@/lib/supabase";
import { MoodEntry, UserSettings, MoodStats, MoodType } from "@/types/mood";
import { generateId, formatTime, moodToScore, calculateStreak } from "@/lib/moods";
import { analyzeSentiment } from "@/lib/sentiment";

// Keys for localStorage
const OFFLINE_QUEUE_KEY = "mood-tracker-offline-queue";
const LOCAL_ENTRIES_KEY = "mood-tracker-entries";
const LOCAL_SETTINGS_KEY = "mood-tracker-settings";

interface OfflineAction {
  id: string;
  type: "CREATE" | "UPDATE" | "DELETE";
  data: any;
  timestamp: number;
}

export function useSyncStore() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const isOnlineRef = useRef(typeof window !== "undefined" ? navigator.onLine : true);

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      // Process offline queue when back online
      processOfflineQueue();
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

  // Real-time subscription for entries
  useEffect(() => {
    if (!user || !isOnlineRef.current) return;

    const channel = supabase
      .channel("mood_entries_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mood_entries",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate and refetch on changes
          queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Load entries from Supabase
  const {
    data: entries = [],
    isLoading: entriesLoading,
    error: entriesError,
  } = useQuery({
    queryKey: ["mood-entries", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("mood_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Also save to localStorage as backup
      const appEntries = data.map(toAppEntry);
      localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(appEntries));
      return appEntries;
    },
    enabled: !!user && isOnlineRef.current,
    staleTime: 1000 * 30, // 30 seconds
  });

  // Load entries from localStorage when offline
  const localEntries: MoodEntry[] = (() => {
    try {
      const stored = localStorage.getItem(LOCAL_ENTRIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  })();

  // Merge local and remote entries
  const mergedEntries = user ? entries : localEntries;

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
    queryKey: ["user-settings", user?.id],
    queryFn: async () => {
      if (!user) {
        const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
        return stored ? JSON.parse(stored) : {
          theme: "dark" as const,
          notifications: true,
          reminderTime: "21:00",
          language: "en",
          exportFormat: "json" as const,
        };
      }

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const appSettings = data ? toAppSettings(data) : {
        theme: "dark" as const,
        notifications: true,
        reminderTime: "21:00",
        language: "en",
        exportFormat: "json" as const,
      };

      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(appSettings));
      return appSettings;
    },
    enabled: !!user,
  });

  // Create entry mutation with optimistic update
  const createEntryMutation = useMutation({
    mutationFn: async (params: {
      mood: MoodType;
      intensity: number;
      text: string;
      tags: string[];
    }) => {
      if (!user) {
        // Offline mode - save locally
        const now = new Date();
        const newEntry: MoodEntry = {
          id: generateId(),
          date: now.toISOString().split("T")[0],
          time: formatTime(now),
          mood: params.mood,
          intensity: params.intensity,
          text: params.text,
          tags: params.tags,
        };

        // Save to localStorage
        const stored = localStorage.getItem(LOCAL_ENTRIES_KEY);
        const entries: MoodEntry[] = stored ? JSON.parse(stored) : [];
        entries.unshift(newEntry);
        localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));

        return newEntry;
      }

      // Online mode - save to Supabase
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

      const { data, error } = await supabase
        .from("mood_entries")
        .insert(toDbEntry(newEntry, user.id))
        .select()
        .single();

      if (error) throw error;
      return toAppEntry(data);
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["mood-entries"] });

      // Snapshot previous value
      const previousEntries = queryClient.getQueryData(["mood-entries", user?.id]);

      // Optimistically update
      const now = new Date();
      const optimisticEntry: MoodEntry = {
        id: generateId(),
        date: now.toISOString().split("T")[0],
        time: formatTime(now),
        mood: params.mood,
        intensity: params.intensity,
        text: params.text,
        tags: params.tags,
      };

      queryClient.setQueryData(["mood-entries", user?.id], (old: MoodEntry[] = []) => [
        optimisticEntry,
        ...old,
      ]);

      return { previousEntries };
    },
    onError: (err, params, context) => {
      // Rollback on error
      if (context?.previousEntries) {
        queryClient.setQueryData(["mood-entries", user?.id], context.previousEntries);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
    },
  });

  // Delete entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) {
        // Offline mode
        const stored = localStorage.getItem(LOCAL_ENTRIES_KEY);
        const entries: MoodEntry[] = stored ? JSON.parse(stored) : [];
        const filtered = entries.filter((e) => e.id !== id);
        localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(filtered));
        return;
      }

      const { error } = await supabase
        .from("mood_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["mood-entries"] });
      const previousEntries = queryClient.getQueryData(["mood-entries", user?.id]);

      queryClient.setQueryData(["mood-entries", user?.id], (old: MoodEntry[] = []) =>
        old.filter((e) => e.id !== id)
      );

      return { previousEntries };
    },
    onError: (err, id, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(["mood-entries", user?.id], context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      // Always save to localStorage first
      const current = settings;
      const updated = { ...current, ...updates };
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));

      if (!user) return updated;

      const { error } = await supabase
        .from("user_settings")
        .upsert(toDbSettings(updates, user.id));

      if (error) throw error;
      return updated;
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ["user-settings"] });
      const previousSettings = queryClient.getQueryData(["user-settings", user?.id]);

      queryClient.setQueryData(["user-settings", user?.id], (old: UserSettings) => ({
        ...old,
        ...updates,
      }));

      return { previousSettings };
    },
    onError: (err, updates, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(["user-settings", user?.id], context.previousSettings);
      }
    },
  });

  // Process offline queue when back online
  const processOfflineQueue = useCallback(async () => {
    if (!user || !isOnlineRef.current) return;

    try {
      const queue = JSON.parse(
        localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"
      ) as OfflineAction[];

      for (const action of queue) {
        if (action.type === "CREATE") {
          await supabase.from("mood_entries").insert(action.data);
        } else if (action.type === "UPDATE") {
          await supabase
            .from("mood_entries")
            .update(action.data)
            .eq("id", action.data.id);
        } else if (action.type === "DELETE") {
          await supabase
            .from("mood_entries")
            .delete()
            .eq("id", action.id);
        }
      }

      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
    } catch (err) {
      console.error("Error processing offline queue:", err);
    }
  }, [user, queryClient]);

  // Calculate stats
  const getStats = useCallback((): MoodStats => {
    const data = mergedEntries;

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
  }, [mergedEntries]);

  const getWeeklyData = useCallback(() => {
    const weekData: { day: string; score: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

      const dayEntries = mergedEntries.filter((e) => e.date === dateStr);
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
  }, [mergedEntries]);

  return {
    entries: mergedEntries,
    settings,
    isLoading: authLoading || entriesLoading || settingsLoading,
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
    clearAllData: async () => {
      // Clear localStorage
      localStorage.removeItem(LOCAL_ENTRIES_KEY);
      localStorage.removeItem(LOCAL_SETTINGS_KEY);
      localStorage.removeItem(OFFLINE_QUEUE_KEY);

      // Clear server data if logged in
      if (user) {
        await supabase
          .from("mood_entries")
          .delete()
          .eq("user_id", user.id);
      }

      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ["mood-entries"] });
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    exportData: (format: "json" | "csv") => {
      const data = entries;
      let content: string;

      if (format === "json") {
        content = JSON.stringify(data, null, 2);
      } else {
        const headers = ["Date", "Time", "Mood", "Intensity", "Text", "Tags"];
        const rows = data.map((e) => [
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
