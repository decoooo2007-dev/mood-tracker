import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/server-supabase";
import { getSessionFromRequest } from "@/lib/jwt";
import { analyzeSentiment } from "@/lib/sentiment";
import { formatEntryRow, normalizeMoodValue } from "@/app/api/entries/route";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UpdateEntrySchema = z.object({
  mood: z.string().min(1).optional(),
  intensity: z.number().min(1).max(100).optional(),
  text: z.string().max(15000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  sentiment_score: z.number().optional(),
  sentiment_keywords: z.array(z.string()).optional(),
  sentiment: z
    .object({
      score: z.number().optional(),
      keywords: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid entry ID", code: "INVALID_ID" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = UpdateEntrySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid update payload",
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.mood !== undefined) {
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
    updates.mood = normalizedMood;
  }

  if (parsed.data.intensity !== undefined) {
    updates.intensity = Math.max(1, Math.min(100, Math.round(parsed.data.intensity)));
  }

  if (parsed.data.text !== undefined) {
    updates.text = parsed.data.text;
    const isCiphertext =
      parsed.data.text.startsWith("enc:v1:") ||
      parsed.data.text.startsWith("enc:u1:");
    const computed = isCiphertext
      ? { score: 0, keywords: [] as string[] }
      : analyzeSentiment(parsed.data.text);
    updates.sentiment_score =
      parsed.data.sentiment_score ??
      parsed.data.sentiment?.score ??
      computed.score;
    updates.sentiment_keywords =
      parsed.data.sentiment_keywords ??
      parsed.data.sentiment?.keywords ??
      computed.keywords;
  } else {
    if (parsed.data.sentiment_score !== undefined) {
      updates.sentiment_score = parsed.data.sentiment_score;
    } else if (parsed.data.sentiment?.score !== undefined) {
      updates.sentiment_score = parsed.data.sentiment.score;
    }
    if (parsed.data.sentiment_keywords !== undefined) {
      updates.sentiment_keywords = parsed.data.sentiment_keywords;
    } else if (parsed.data.sentiment?.keywords !== undefined) {
      updates.sentiment_keywords = parsed.data.sentiment.keywords;
    }
  }

  if (parsed.data.tags !== undefined) {
    updates.tags = parsed.data.tags;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("mood_entries")
    .update(updates)
    .eq("id", id)
    .eq("user_id", session.userId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[Entries API PATCH] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to update mood entry", code: "DB_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!updated) {
    return NextResponse.json(
      { error: "Mood entry not found", code: "NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: formatEntryRow(updated as Record<string, unknown>),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { error: "Invalid entry ID", code: "INVALID_ID" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data: deleted, error } = await supabaseAdmin
    .from("mood_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[Entries API DELETE] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to delete mood entry", code: "DB_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!deleted) {
    return NextResponse.json(
      { error: "Mood entry not found", code: "NOT_FOUND" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { success: true, data: { id: deleted.id, deleted: true } },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
