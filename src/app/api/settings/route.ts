import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/server-supabase";
import { getSessionFromRequest } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function formatSettingsRow(row: Record<string, unknown> | null, userId: string) {
  const theme = row?.theme === "light" ? "light" : "dark";
  const notifications =
    typeof row?.notifications === "boolean" ? row.notifications : true;
  const reminderTime =
    typeof row?.reminder_time === "string" && row.reminder_time
      ? row.reminder_time
      : "21:00";
  const language =
    typeof row?.language === "string" && row.language ? row.language : "en";
  const exportFormat =
    row?.export_format === "csv" || row?.export_format === "pdf"
      ? row.export_format
      : "json";

  return {
    user_id: userId,
    theme,
    notifications,
    reminder_time: reminderTime,
    reminderTime,
    language,
    export_format: exportFormat,
    exportFormat,
    updated_at: row?.updated_at ?? new Date().toISOString(),
  };
}

const UpdateSettingsSchema = z.object({
  theme: z.enum(["dark", "light"]).optional(),
  notifications: z.boolean().optional(),
  reminder_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  language: z.enum(["en", "ar"]).optional(),
  export_format: z.enum(["json", "csv", "pdf"]).optional(),
  exportFormat: z.enum(["json", "csv", "pdf"]).optional(),
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
    .from("user_settings")
    .select("*")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error) {
    console.error("[Settings API GET] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to load user settings", code: "DB_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const formatted = formatSettingsRow(
    (data as Record<string, unknown> | null) ?? null,
    session.userId
  );

  return NextResponse.json(
    {
      success: true,
      data: formatted,
      ...formatted,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

async function handleUpsertSettings(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rate = await checkRateLimit(`settings:${session.userId}`, 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests", code: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = UpdateSettingsSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid settings payload",
        code: "VALIDATION_ERROR",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const dbPayload: Record<string, unknown> = {
    user_id: session.userId,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.theme !== undefined) {
    dbPayload.theme = parsed.data.theme;
  }
  if (parsed.data.notifications !== undefined) {
    dbPayload.notifications = parsed.data.notifications;
  }
  const reminderTime = parsed.data.reminder_time ?? parsed.data.reminderTime;
  if (reminderTime !== undefined) {
    dbPayload.reminder_time = reminderTime;
  }
  if (parsed.data.language !== undefined) {
    dbPayload.language = parsed.data.language;
  }
  const exportFormat = parsed.data.export_format ?? parsed.data.exportFormat;
  if (exportFormat !== undefined) {
    dbPayload.export_format = exportFormat;
  }

  const { data: upserted, error } = await supabaseAdmin
    .from("user_settings")
    .upsert(dbPayload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    console.error("[Settings API PATCH] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Failed to update user settings", code: "DB_ERROR" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const formatted = formatSettingsRow(
    (upserted as Record<string, unknown>) ?? null,
    session.userId
  );

  return NextResponse.json(
    {
      success: true,
      data: formatted,
      ...formatted,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request: Request) {
  return handleUpsertSettings(request);
}

export async function POST(request: Request) {
  return handleUpsertSettings(request);
}

export async function PUT(request: Request) {
  return handleUpsertSettings(request);
}
