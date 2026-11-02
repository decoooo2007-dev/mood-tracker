import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/server-supabase";
import { getSessionFromRequest } from "@/lib/jwt";
import { analyzeSentiment } from "@/lib/sentiment";
import { formatTime } from "@/lib/moods";
import type { MoodType } from "@/types/mood";

export const dynamic = "force-dynamic";

const VALID_MOODS: Record<string, MoodType> = {
  happy: "Happy",
  calm: "Calm",
  sad: "Sad",
  frustrated: "Frustrated",
  tired: "Tired",
};

export function normalizeMoodValue(raw: string): MoodType | null {
  return VALID_MOODS[raw.trim().toLowerCase()] ?? null;
}

export function formatEntryRow(row: Record<string, unknown>) {
  const score =
    typeof row.sentiment_score === "number"
      ? row.sentiment_score
      : Number(row.sentiment_score ?? 0) || 0;
  const keywords = Array.isArray(row.sentiment_keywords)
    ? (row.sentiment_keywords as string[])
    : [];

  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    date: String(row.date ?? ""),
    time: String(row.time ?? ""),
    mood: (row.mood as MoodType) || "Calm",
    intensity: typeof row.intensity === "number" ? row.intensity : Number(row.intensity ?? 50),
    text: typeof row.text === "string" ? row.text : "",
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    sentiment_score: score,
    sentiment_keywords: keywords,
    sentiment: {
      score,
      keywords,
    },
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  };
}

const CreateEntrySchema = z.object({
  mood: z.string().min(1),
  intensity: z.number().min(1).max(100).optional().default(50),
  text: z.string().max(5000).optional().default(""),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  time: z.string().max(30).optional(),
  sentiment_score: z.number().optional(),
  sentiment_keywords: z.array(z.string()).optional(),
  sentiment: z
    .object({
      score: z.number().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("mood_entries")
    .select("*")
    .eq("user_id", session.userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Entries API GET] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load mood entries", code: "DB_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const entries = (data ?? []).map((row) =>
    formatEntryRow(row as Record<string, unknown>)
  );

  return NextResponse.json(
    { success: true, data: entries },
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

  const rawBody = await request.json().catch(() => null);
  const parsed = CreateEntrySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid mood entry payload",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const normalizedMood = normalizeMoodValue(parsed.data.mood);
  if (!normalizedMood) {
    return NextResponse.json(
      {
        error: "Invalid mood value. Must be Happy, Calm, Sad, Frustrated, or Tired.",
        code: "INVALID_MOOD",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const now = new Date();
  const entryDate =
    parsed.data.date ||
    new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
      .toISOString()
      .split("T")[0];
  const entryTime = parsed.data.time || formatTime(now);
  const entryText = parsed.data.text ?? "";
  const computedSentiment = analyzeSentiment(entryText);

  const sentimentScore =
    parsed.data.sentiment_score ??
    parsed.data.sentiment?.score ??
    computedSentiment.score;
  const sentimentKeywords =
    parsed.data.sentiment_keywords ??
    parsed.data.sentiment?.keywords ??
    computedSentiment.keywords;

  const insertPayload = {
    user_id: session.userId,
    date: entryDate,
    time: entryTime,
    mood: normalizedMood,
    intensity: Math.max(1, Math.min(100, Math.round(parsed.data.intensity))),
    text: entryText,
    tags: parsed.data.tags,
    sentiment_score: sentimentScore,
    sentiment_keywords: sentimentKeywords,
  };

  const { data: inserted, error } = await supabaseAdmin
    .from("mood_entries")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !inserted) {
    console.error("[Entries API POST] Supabase error:", error?.message);
    return NextResponse.json(
      { error: "Failed to save mood entry", code: "DB_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: formatEntryRow(inserted as Record<string, unknown>),
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { error } = await supabaseAdmin
    .from("mood_entries")
    .delete()
    .eq("user_id", session.userId);

  if (error) {
    console.error("[Entries API DELETE ALL] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to clear mood entries", code: "DB_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { success: true, data: { cleared: true } },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
