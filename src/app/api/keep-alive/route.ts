import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server-supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
          error: error.message,
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
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
