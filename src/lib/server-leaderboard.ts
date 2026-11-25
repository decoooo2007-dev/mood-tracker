import { supabaseAdmin } from "@/lib/server-supabase";
import {
  computeLeaderboardMetrics,
  type LeaderboardMetrics,
} from "@/lib/leaderboard";
import type { MoodType } from "@/types/mood";

export function isMissingLeaderboardTableError(
  err: { code?: string; message?: string } | null | undefined
): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /leaderboard_profiles.*does not exist/i.test(err.message || "") ||
    /relation .*leaderboard_profiles.* does not exist/i.test(err.message || "") ||
    /could not find the table .*leaderboard_profiles/i.test(err.message || "")
  );
}

/**
 * Computes anti-cheat leaderboard metrics for a user directly from non-sensitive
 * structured fields ONLY (`date`, `mood`, `intensity`, `tags`, `sentiment_score`).
 * Zero-Knowledge Guarantee: Encrypted `text` notes are NEVER selected or decrypted.
 */
export async function computeUserLeaderboardMetrics(
  userId: string
): Promise<LeaderboardMetrics> {
  const { data: rows, error } = await supabaseAdmin
    .from("mood_entries")
    .select("date, mood, intensity, tags, sentiment_score")
    .eq("user_id", userId);

  if (error) {
    console.error("[Leaderboard] Failed to read user entries:", error.message);
    return computeLeaderboardMetrics([]);
  }

  return computeLeaderboardMetrics(
    (rows || []).map((r) => ({
      date: String(r.date || ""),
      mood: (String(r.mood || "Calm") as MoodType),
      intensity: typeof r.intensity === "number" ? r.intensity : 50,
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      sentiment_score:
        typeof r.sentiment_score === "number"
          ? r.sentiment_score
          : Number(r.sentiment_score ?? 0) || 0,
    }))
  );
}

/**
 * Automatically refreshes a user's `leaderboard_profiles` row after any entry
 * mutation (`POST/DELETE /api/entries`, `PATCH/DELETE /api/entries/[id]`).
 *
 * Fast-path & Resilience:
 * - Does an O(1) primary-key check first; users who have not created a leaderboard
 *   profile incur zero extra `mood_entries` reads.
 * - Never throws or blocks mood-entry persistence if the table is pending migration.
 */
export async function syncUserLeaderboardProfile(
  userId: string
): Promise<{ synced: boolean; metrics?: LeaderboardMetrics }> {
  try {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("leaderboard_profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (lookupError) {
      if (!isMissingLeaderboardTableError(lookupError)) {
        console.error(
          "[Leaderboard Sync] Profile lookup failed:",
          lookupError.message
        );
      }
      return { synced: false };
    }

    if (!existing) {
      return { synced: false };
    }

    const metrics = await computeUserLeaderboardMetrics(userId);
    const { error: updateError } = await supabaseAdmin
      .from("leaderboard_profiles")
      .update({
        consistency_entries: metrics.consistencyEntries,
        active_days: metrics.activeDays,
        current_streak: metrics.currentStreak,
        baseline_wellness: metrics.baselineWellness,
        recent_wellness: metrics.recentWellness,
        improvement_delta: metrics.improvementDelta,
        qualified_for_growth: metrics.qualifiedForGrowth,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error(
        "[Leaderboard Sync] Profile update failed:",
        updateError.message
      );
      return { synced: false };
    }

    return { synced: true, metrics };
  } catch (err) {
    console.error("[Leaderboard Sync] Unexpected error:", err);
    return { synced: false };
  }
}
