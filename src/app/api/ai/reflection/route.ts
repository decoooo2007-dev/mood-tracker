import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/server-supabase";
import { tmood, ttag } from "@/lib/i18n/translations";

export const dynamic = "force-dynamic";

interface ReflectionResponse {
  rhythm: string;
  pattern: string;
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
        .map(
          (e) =>
            `Date: ${e.date}, Mood: ${e.mood}, Intensity: ${e.intensity}%, Tags: ${(e.tags || []).join(", ")}`
        )
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
          const rText = String(parsed.rhythm);
          const bText = String(parsed.booster);
          const hText = String(parsed.habit);
          // Enforce BiDi purity if locale is Arabic
          if (
            locale !== "ar" ||
            (!/[a-zA-Z]/.test(rText) &&
              !/[a-zA-Z]/.test(bText) &&
              !/[a-zA-Z]/.test(hText))
          ) {
            const payload: ReflectionResponse = {
              rhythm: rText,
              pattern: rText,
              booster: bText,
              habit: hText,
              source: "gemini",
            };
            return NextResponse.json({
              success: true,
              data: payload,
              reflection: payload,
            });
          }
        }
      }
    } catch {
      // Gracefully fall through to heuristic synthesis
    }
  }

  // Data-driven heuristic synthesis (works 100% offline or with zero API key)
  const isAr = locale === "ar";
  let rhythm: string;
  let booster: string;
  let habit: string;

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
  } else {
    const moodCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    let totalIntensity = 0;

    for (const e of recentEntries) {
      const m = String(e.mood || "Calm");
      moodCounts[m] = (moodCounts[m] || 0) + 1;
      totalIntensity += typeof e.intensity === "number" ? e.intensity : 50;
      const tags = Array.isArray(e.tags) ? e.tags : [];
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const dominantMood =
      Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Calm";
    const avgIntensity = Math.round(totalIntensity / recentEntries.length);
    const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const localizedMood = tmood(dominantMood, locale);
    const localizedTag = topTag
      ? isAr && /[a-zA-Z]/.test(ttag(topTag, "ar"))
        ? "الأنشطة اليومية"
        : ttag(topTag, locale)
      : null;

    rhythm = isAr
      ? `سجلت ${recentEntries.length} قراءات هذا الأسبوع، وكان الشعور الأبرز هو ${localizedMood} بمتوسط تركيز ${avgIntensity}٪.`
      : `You logged ${recentEntries.length} check-ins this week, centered around feeling ${localizedMood} with an average intensity of ${avgIntensity}%.`;

    booster = localizedTag
      ? isAr
        ? `ارتبط وسم ${localizedTag} بأغلب لحظات توازنك ووعيك الذاتي خلال الأيام الماضية.`
        : `Your "${localizedTag}" moments were most strongly connected to your emotional check-ins this week.`
      : isAr
      ? "كانت لحظات التأمل الهادئة والامتنان هي الأكثر ارتباطاً بارتفاع مستوى الراحة."
      : "Moments of gratitude and peaceful downtime were your strongest positive drivers.";

    if (dominantMood === "Sad" || dominantMood === "Frustrated") {
      habit = isAr
        ? "جرب تمرين التنفس الهادئ لمدة دقيقتين عند الشعور بالضغط لاستعادة توازنك."
        : "Try the 4-7-8 breathing exercise for two minutes whenever tension builds to gently reset.";
    } else if (dominantMood === "Tired") {
      habit = isAr
        ? "امنح نفسك قسطاً كافياً من الراحة الليلة وابتعد عن الشاشات قبل النوم بنصف ساعة."
        : "Prioritize restorative rest tonight by stepping away from screens 30 minutes before sleep.";
    } else {
      habit = isAr
        ? "خصص خمس دقائق كل صباح لتدوين شيء واحد تشعر بالامتنان لوجوده في حياتك."
        : "Dedicate 5 minutes each morning to note one thing you are grateful for to sustain your momentum.";
    }
  }

  const payload: ReflectionResponse = {
    rhythm,
    pattern: rhythm,
    booster,
    habit,
    source: "heuristic",
  };

  return NextResponse.json({
    success: true,
    data: payload,
    reflection: payload,
  });
}
