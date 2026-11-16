import { calculateStreak } from "@/lib/moods";
import { computeCompositeMoodScore } from "@/lib/sentiment";
import type { MoodType, SubscriptionTier } from "@/types/mood";

/** Anti-cheat constants — audited server-side so spammed check-ins cannot game rankings */
export const MAX_CREDITED_ENTRIES_PER_DAY = 2;
export const MIN_ENTRIES_FOR_GROWTH = 10;
export const MIN_ACTIVE_DAYS_FOR_GROWTH = 7;

/** Safe bilingual anonymous alias pattern (Arabic, English, digits, underscore; 3–20 chars) */
export const ANONYMOUS_ALIAS_REGEX = /^[a-zA-Z0-9_\u0600-\u06FF]{3,20}$/;

export interface LeaderboardEntryInput {
  date: string;
  mood: MoodType;
  intensity: number;
  tags?: string[];
  sentiment_score?: number;
}

export interface LeaderboardMetrics {
  totalRawEntries: number;
  consistencyEntries: number;
  activeDays: number;
  currentStreak: number;
  baselineWellness: number;
  recentWellness: number;
  improvementDelta: number;
  qualifiedForGrowth: boolean;
}

export interface PublicLeaderboardRow {
  rank: number;
  anonymousAlias: string;
  subscriptionTier: SubscriptionTier;
  consistencyEntries: number;
  activeDays: number;
  currentStreak: number;
  baselineWellness: number;
  recentWellness: number;
  improvementDelta: number;
  isCurrentUser: boolean;
}

export function normalizeAnonymousAlias(raw: string): string {
  return raw.trim().normalize("NFC");
}

/**
 * Computes anti-cheat public leaderboard metrics from a user's entries:
 * 1. Consistency (`consistencyEntries`): caps public credit at 2 entries per unique local date
 *    so bulk-spamming entries in 1 minute never inflates public rank.
 * 2. Life Growth (`improvementDelta`): computes daily Option A Wellness Index means, requires
 *    `>= 10` raw entries across `>= 7` distinct active days, and compares chronological Early
 *    Baseline (first half of active days) vs. Recent Window (second half, up to 14 active days).
 */
export function computeLeaderboardMetrics(
  entries: LeaderboardEntryInput[]
): LeaderboardMetrics {
  if (!entries || entries.length === 0) {
    return {
      totalRawEntries: 0,
      consistencyEntries: 0,
      activeDays: 0,
      currentStreak: 0,
      baselineWellness: 50,
      recentWellness: 50,
      improvementDelta: 0,
      qualifiedForGrowth: false,
    };
  }

  const dailyCounts = new Map<string, number>();
  const dailyWellness = new Map<string, { sum: number; count: number }>();

  for (const entry of entries) {
    const dateKey = String(entry.date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;

    dailyCounts.set(dateKey, (dailyCounts.get(dateKey) ?? 0) + 1);

    const composite = computeCompositeMoodScore({
      mood: entry.mood,
      intensity: typeof entry.intensity === "number" ? entry.intensity : 50,
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      sentimentScore:
        typeof entry.sentiment_score === "number" ? entry.sentiment_score : 0,
    });

    const bucket = dailyWellness.get(dateKey) || { sum: 0, count: 0 };
    bucket.sum += composite.wellnessIndex;
    bucket.count += 1;
    dailyWellness.set(dateKey, bucket);
  }

  let consistencyEntries = 0;
  for (const count of dailyCounts.values()) {
    consistencyEntries += Math.min(MAX_CREDITED_ENTRIES_PER_DAY, count);
  }

  const sortedDates = Array.from(dailyWellness.keys()).sort();
  const activeDays = sortedDates.length;
  const currentStreak = calculateStreak(sortedDates.map((d) => ({ date: d })));

  const dayAverages = sortedDates.map((d) => {
    const b = dailyWellness.get(d)!;
    return b.sum / b.count;
  });

  if (dayAverages.length === 0) {
    return {
      totalRawEntries: entries.length,
      consistencyEntries: 0,
      activeDays: 0,
      currentStreak: 0,
      baselineWellness: 50,
      recentWellness: 50,
      improvementDelta: 0,
      qualifiedForGrowth: false,
    };
  }

  const splitIndex = Math.max(1, Math.floor(dayAverages.length / 2));
  const earlySlice = dayAverages.slice(0, splitIndex);
  const recentRaw = dayAverages.slice(splitIndex);
  const recentSlice =
    recentRaw.length > 0 ? recentRaw.slice(-14) : dayAverages.slice(-1);

  const avg = (arr: number[]) =>
    arr.reduce((acc, v) => acc + v, 0) / Math.max(1, arr.length);

  const baselineWellness = Math.round(avg(earlySlice));
  const recentWellness = Math.round(avg(recentSlice));
  const qualifiedForGrowth =
    entries.length >= MIN_ENTRIES_FOR_GROWTH &&
    activeDays >= MIN_ACTIVE_DAYS_FOR_GROWTH;
  const improvementDelta = qualifiedForGrowth
    ? Math.round((recentWellness - baselineWellness) * 10) / 10
    : 0;

  return {
    totalRawEntries: entries.length,
    consistencyEntries,
    activeDays,
    currentStreak,
    baselineWellness,
    recentWellness,
    improvementDelta,
    qualifiedForGrowth,
  };
}
