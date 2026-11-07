import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/server-supabase";

export const dynamic = "force-dynamic";

interface ReflectionResponse {
  rhythm: string;
  booster: string;
  habit: string;
  source: "gemini" | "heuristic";
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Rate limit: 10 reflections per day per user
  const rateLimit = await checkRateLimit(
    `ai-reflection:${session.userId}`,
    10,
    24 * 60 * 60 * 1000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Daily AI reflection limit reached. Please try tomorrow.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rawBody = await request.json().catch(() => ({}));
  const locale = rawBody.locale === "ar" ? "ar" : "en";

  // Fetch recent entries from past 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const { data: entries, error } = await supabaseAdmin
    .from("mood_entries")
    .select("mood, intensity, tags, date")
    .eq("user_id", session.userId)
    .gte("date", weekAgoStr)
    .order("date", { ascending: false });

  if (error) {
    console.error("[AI Reflection API] Supabase error:", error.message);
  }

  const recentEntries = entries || [];

  // If Gemini API Key is available, invoke Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && recentEntries.length > 0) {
    try {
      const promptLang =
        locale === "ar"
          ? "CRITICAL RULE: The entire response must be 100% Arabic with ZERO English or Latin characters. Provide 3 short points in JSON: {\"rhythm\": \"...\", \"booster\": \"...\", \"habit\": \"...\"}"
          : "Provide 3 short, constructive points in JSON: {\"rhythm\": \"...\", \"booster\": \"...\", \"habit\": \"...\"}";

      const userSummary = recentEntries
        .map((e) => `Date: ${e.date}, Mood: ${e.mood}, Intensity: ${e.intensity}%, Tags: ${(e.tags || []).join(", ")}`)
        .join("\n");

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `You are a supportive, mindful wellness companion for MoodFlow. Analyze these recent mood logs:\n${userSummary}\n\n${promptLang}\nFormat must be pure JSON with rhythm, booster, habit fields.`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4,
            },
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiJson = await geminiRes.json();
        const rawText =
          geminiJson.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const parsed = JSON.parse(rawText);
        if (parsed.rhythm && parsed.booster && parsed.habit) {
          return NextResponse.json({
            success: true,
            data: {
              rhythm: String(parsed.rhythm),
              booster: String(parsed.booster),
              habit: String(parsed.habit),
              source: "gemini",
            } as ReflectionResponse,
          });
        }
      }
    } catch {
      // Gracefully fall through to heuristic synthesis
    }
  }

  // Graceful heuristic synthesis (works 100% offline or with zero API key)
  const isAr = locale === "ar";
  let rhythm = isAr
    ? "أظهرت تسجيلاتك هذا الأسبوع توازناً ملحوظاً بين فترات النشاط ولحظات الهدوء."
    : "Your logs this week show a steady rhythm with good balance across your days.";

  let booster = isAr
    ? "كانت الأنشطة العائلية ولحظات الامتنان هي الأكثر ارتباطاً بارتفاع مستوى الراحة."
    : "Moments of gratitude and peaceful downtime were your strongest positive drivers.";

  let habit = isAr
    ? "خصص خمس دقائق كل صباح للتنفس الواعي لتعزيز صفاء ذهنك طوال اليوم."
    : "Dedicate 5 minutes each morning to mindful breathing to maintain your calm focus.";

  if (recentEntries.length === 0) {
    rhythm = isAr
      ? "ابدأ بتسجيل مشاعرك يومياً لبناء إيقاعك العاطفي الواعي."
      : "Start logging your moods daily to unlock your weekly emotional pattern.";
    booster = isAr
      ? "تحديد مشاعرك بصدق هو الخطوة الأولى لاكتشاف مصادر قوتك."
      : "Awareness of how you feel is the foundation for finding what lifts you up.";
    habit = isAr
      ? "سجل مزاجك في نفس الوقت يومياً، مثل المساء قبل النوم."
      : "Try checking in at the same time each evening to build a consistent habit.";
  }

  return NextResponse.json({
    success: true,
    data: {
      rhythm,
      booster,
      habit,
      source: "heuristic",
    } as ReflectionResponse,
  });
}
