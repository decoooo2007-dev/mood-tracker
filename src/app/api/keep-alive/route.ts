import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server-supabase";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function verifyKeepAliveSecret(request: Request): boolean {
  const expectedSecret = process.env.KEEP_ALIVE_SECRET?.trim();
  if (!expectedSecret) {
    return true;
  }
  const providedSecret = request.headers.get("x-keep-alive-secret")?.trim() || "";
  const a = Buffer.from(expectedSecret, "utf8");
  const b = Buffer.from(providedSecret, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rate = await checkRateLimit(`keep-alive:${ip}`, 6, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Rate limit exceeded",
          code: "RATE_LIMITED",
        },
        { status: 429, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    if (!verifyKeepAliveSecret(request)) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized keep-alive request",
          code: "UNAUTHORIZED",
        },
        { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .limit(1);

    if (error) {
      console.error("[Keep-Alive] Supabase ping error:", error.message);
      return NextResponse.json(
        {
          success: false,
          message: "Supabase ping failed",
          timestamp: new Date().toISOString(),
        },
        { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Supabase pinged successfully",
        rowsChecked: data?.length ?? 0,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Keep-Alive] Unexpected exception:", message);
    return NextResponse.json(
      {
        success: false,
        message: "Internal error during keep-alive ping",
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
