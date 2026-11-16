import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/server-supabase";
import { normalizeSubscriptionTier } from "@/lib/subscription";
import {
  ANONYMOUS_ALIAS_REGEX,
  computeLeaderboardMetrics,
  normalizeAnonymousAlias,
  type PublicLeaderboardRow,
} from "@/lib/leaderboard";
import type { MoodType } from "@/types/mood";

export const dynamic = "force-dynamic";

const UpdateLeaderboardProfileSchema = z.object({
  anonymousAlias: z.string().min(1).max(30),
  isOptedIn: z.boolean(),
});

function isMissingLeaderboardTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    /leaderboard_profiles.*does not exist/i.test(err.message || "") ||
    /relation .*leaderboard_profiles.* does not exist/i.test(err.message || "")
  );
}

async function computeCallerMetrics(userId: string) {
  const { data: rows, error } = await supabaseAdmin
    .from("mood_entries")
    .select("date, mood, intensity, tags, sentiment_score")
    .eq("user_id", userId);

  if (error) {
    console.error("[Leaderboard API] Failed to read user entries:", error.message);
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

function mapRows(
  rows: Record<string, unknown>[],
  tierMap: Map<string, string>,
  currentUserId: string
): PublicLeaderboardRow[] {
  return rows.map((row, idx) => {
    const uid = String(row.user_id || "");
    return {
      rank: idx + 1,
      anonymousAlias: String(row.anonymous_alias || ""),
      subscriptionTier: normalizeSubscriptionTier(tierMap.get(uid)),
      consistencyEntries: Number(row.consistency_entries ?? 0),
      activeDays: Number(row.active_days ?? 0),
      currentStreak: Number(row.current_streak ?? 0),
      baselineWellness: Number(row.baseline_wellness ?? 50),
      recentWellness: Number(row.recent_wellness ?? 50),
      improvementDelta: Number(row.improvement_delta ?? 0),
      isCurrentUser: uid === currentUserId,
    };
  });
}

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rate = await checkRateLimit(`leaderboard:get:${session.userId}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const myMetrics = await computeCallerMetrics(session.userId);

  const { data: myProfile, error: myProfileError } = await supabaseAdmin
    .from("leaderboard_profiles")
    .select("anonymous_alias, is_opted_in")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (isMissingLeaderboardTableError(myProfileError)) {
    return NextResponse.json(
      {
        success: true,
        setupRequired: true,
        profile: {
          anonymousAlias: "",
          isOptedIn: false,
          metrics: myMetrics,
        },
        mostEntries: [],
        mostImproved: [],
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Keep the caller's opted-in profile metrics fresh on load
  if (myProfile) {
    await supabaseAdmin
      .from("leaderboard_profiles")
      .update({
        consistency_entries: myMetrics.consistencyEntries,
        active_days: myMetrics.activeDays,
        current_streak: myMetrics.currentStreak,
        baseline_wellness: myMetrics.baselineWellness,
        recent_wellness: myMetrics.recentWellness,
        improvement_delta: myMetrics.improvementDelta,
        qualified_for_growth: myMetrics.qualifiedForGrowth,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.userId);
  }

  const [entriesRes, improvedRes] = await Promise.all([
    supabaseAdmin
      .from("leaderboard_profiles")
      .select(
        "user_id, anonymous_alias, consistency_entries, active_days, current_streak, baseline_wellness, recent_wellness, improvement_delta"
      )
      .eq("is_opted_in", true)
      .gt("consistency_entries", 0)
      .order("consistency_entries", { ascending: false })
      .order("current_streak", { ascending: false })
      .limit(25),
    supabaseAdmin
      .from("leaderboard_profiles")
      .select(
        "user_id, anonymous_alias, consistency_entries, active_days, current_streak, baseline_wellness, recent_wellness, improvement_delta"
      )
      .eq("is_opted_in", true)
      .eq("qualified_for_growth", true)
      .gt("improvement_delta", 0)
      .order("improvement_delta", { ascending: false })
      .order("active_days", { ascending: false })
      .limit(25),
  ]);

  const rawEntriesRows = (entriesRes.data || []) as Record<string, unknown>[];
  const rawImprovedRows = (improvedRes.data || []) as Record<string, unknown>[];

  const userIds = Array.from(
    new Set(
      [...rawEntriesRows, ...rawImprovedRows].map((r) => String(r.user_id || ""))
    )
  ).filter(Boolean);

  const tierMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: userTiers } = await supabaseAdmin
      .from("users")
      .select("id, subscription_tier")
      .in("id", userIds);

    for (const u of userTiers || []) {
      tierMap.set(String(u.id), String(u.subscription_tier || "free"));
    }
  }

  return NextResponse.json(
    {
      success: true,
      setupRequired: false,
      profile: {
        anonymousAlias: myProfile?.anonymous_alias || "",
        isOptedIn: Boolean(myProfile?.is_opted_in),
        metrics: myMetrics,
      },
      mostEntries: mapRows(rawEntriesRows, tierMap, session.userId),
      mostImproved: mapRows(rawImprovedRows, tierMap, session.userId),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rate = await checkRateLimit(`leaderboard:write:${session.userId}`, 20, 15 * 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many updates. Please wait a bit.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = UpdateLeaderboardProfileSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid anonymous handle payload", code: "VALIDATION_ERROR" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const normalizedAlias = normalizeAnonymousAlias(parsed.data.anonymousAlias);
  if (!ANONYMOUS_ALIAS_REGEX.test(normalizedAlias)) {
    return NextResponse.json(
      {
        error:
          "Handle must be 3-20 characters (Arabic, English, numbers, or underscore)",
        code: "INVALID_ALIAS",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Ensure handle does not collide case-insensitively with another user's handle
  const escapedLike = normalizedAlias.replace(/[\\%_]/g, "\\$&");
  const { data: conflicts, error: checkErr } = await supabaseAdmin
    .from("leaderboard_profiles")
    .select("user_id, anonymous_alias")
    .ilike("anonymous_alias", escapedLike)
    .limit(5);

  if (isMissingLeaderboardTableError(checkErr)) {
    return NextResponse.json(
      {
        error: "Leaderboard table migration pending in database.",
        code: "SETUP_REQUIRED",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const takenByOther = (conflicts || []).find(
    (c) =>
      String(c.anonymous_alias).toLowerCase() === normalizedAlias.toLowerCase() &&
      String(c.user_id) !== session.userId
  );
  if (takenByOther) {
    return NextResponse.json(
      { error: "This anonymous handle is already taken", code: "ALIAS_TAKEN" },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }

  const myMetrics = await computeCallerMetrics(session.userId);

  const { error: upsertErr } = await supabaseAdmin
    .from("leaderboard_profiles")
    .upsert(
      {
        user_id: session.userId,
        anonymous_alias: normalizedAlias,
        is_opted_in: parsed.data.isOptedIn,
        consistency_entries: myMetrics.consistencyEntries,
        active_days: myMetrics.activeDays,
        current_streak: myMetrics.currentStreak,
        baseline_wellness: myMetrics.baselineWellness,
        recent_wellness: myMetrics.recentWellness,
        improvement_delta: myMetrics.improvementDelta,
        qualified_for_growth: myMetrics.qualifiedForGrowth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (upsertErr) {
    if (upsertErr.code === "23505") {
      return NextResponse.json(
        { error: "This anonymous handle is already taken", code: "ALIAS_TAKEN" },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }
    console.error("[Leaderboard API POST] Supabase error:", upsertErr.message);
    return NextResponse.json(
      { error: "Failed to save leaderboard handle", code: "DB_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      profile: {
        anonymousAlias: normalizedAlias,
        isOptedIn: parsed.data.isOptedIn,
        metrics: myMetrics,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
