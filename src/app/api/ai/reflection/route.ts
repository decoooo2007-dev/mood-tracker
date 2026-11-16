import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/server-supabase";
import { tmood, ttag } from "@/lib/i18n/translations";
import {
  computeCompositeMoodScore,
  computeTagCorrelations,
  getDimensionLabel,
  type EmotionDimension,
} from "@/lib/sentiment";
import { EMOTION_DIMENSIONS } from "@/lib/lexicon";
import type { MoodType } from "@/types/mood";

export const dynamic = "force-dynamic";

interface ReflectionResponse {
  rhythm: string;
  pattern: string;
  booster: string;
  habit: string;
  source: "gemini" | "heuristic";
}

export function classifyTimeWindow(timeStr: unknown): "morning" | "afternoon" | "evening" | "unknown" {
  if (typeof timeStr !== "string" || !timeStr.trim()) return "unknown";
  const s = timeStr.trim().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const isPm = /pm|م/i.test(s);
  const isAm = /am|ص/i.test(s);
  const match = s.match(/(\d{1,2})/);
  if (!match) return "unknown";
  let hour = parseInt(match[1], 10);
  if (Number.isNaN(hour)) return "unknown";
  if (isPm && hour < 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
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

  // Fetch recent entries from past 7 days including sentiment & time columns
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const { data: entries, error } = await supabaseAdmin
    .from("mood_entries")
    .select("mood, intensity, tags, date, time, sentiment_score, sentiment_keywords")
    .eq("user_id", session.userId)
    .gte("date", weekAgoStr)
    .order("date", { ascending: false });

  if (error) {
    console.error("[AI Reflection API] Supabase error:", error.message);
  }

  const recentEntries = (entries || []).map((row) => ({
    mood: (String(row.mood || "Calm") as MoodType),
    intensity: typeof row.intensity === "number" ? row.intensity : 50,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    date: String(row.date || ""),
    time: typeof row.time === "string" ? row.time : "",
    sentiment_score:
      typeof row.sentiment_score === "number"
        ? row.sentiment_score
        : Number(row.sentiment_score ?? 0) || 0,
    sentiment_keywords: Array.isArray(row.sentiment_keywords)
      ? (row.sentiment_keywords as string[])
      : [],
  }));

  // Compute deterministic Option A mathematical trait & lexicon metrics
  const aggregateDimensions: Record<EmotionDimension, number> = {
    happy: 0,
    calm: 0,
    motivated: 0,
    tired: 0,
    sad: 0,
    frustrated: 0,
    anxious: 0,
    confused: 0,
  };

  let totalWellness = 0;
  let totalIntensity = 0;
  const moodCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const keywordCounts: Record<string, number> = {};
  const windowCounts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0 };

  const enrichedEntries = recentEntries.map((e) => {
    const composite = computeCompositeMoodScore({
      mood: e.mood,
      intensity: e.intensity,
      tags: e.tags,
      sentimentScore: e.sentiment_score,
      locale,
    });
    for (const dim of EMOTION_DIMENSIONS) {
      aggregateDimensions[dim] += composite.dimensionScores[dim];
    }
    totalWellness += composite.wellnessIndex;
    totalIntensity += e.intensity;
    moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    for (const tag of e.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    for (const kw of e.sentiment_keywords) {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    }
    const win = classifyTimeWindow(e.time);
    if (win !== "unknown") {
      windowCounts[win] += 1;
    }
    return { ...e, composite };
  });

  const avgWellness =
    enrichedEntries.length > 0 ? Math.round(totalWellness / enrichedEntries.length) : 50;
  const avgIntensity =
    enrichedEntries.length > 0 ? Math.round(totalIntensity / enrichedEntries.length) : 50;
  const dominantDimension = (Object.entries(aggregateDimensions).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || "calm") as EmotionDimension;
  const dominantMood =
    Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Calm";

  const tagCorrelations = computeTagCorrelations(
    recentEntries.map((e) => ({
      mood: e.mood,
      intensity: e.intensity,
      tags: e.tags,
      sentiment: { score: e.sentiment_score },
    }))
  );
  const topLifter = tagCorrelations.find((c) => c.delta > 0);
  const topDrainer = tagCorrelations.find((c) => c.delta < 0);

  // If Gemini API Key is available, invoke Gemini grounded in mathematical trait & lexicon metrics
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && enrichedEntries.length > 0) {
    try {
      const promptLang =
        locale === "ar"
          ? 'CRITICAL RULE: The entire response must be 100% Arabic with ZERO English or Latin characters. Provide 3 short points in JSON: {"rhythm": "...", "booster": "...", "habit": "..."}'
          : 'Provide 3 short, constructive points in JSON: {"rhythm": "...", "booster": "...", "habit": "..."}';

      const userSummary = enrichedEntries
        .map(
          (e) =>
            `Date: ${e.date}, Time: ${e.time || "N/A"}, Mood: ${e.mood}, Intensity: ${e.intensity}%, WellnessIndex: ${e.composite.wellnessIndex}/100, DominantTrait: ${e.composite.dominantDimension}, SentimentScore: ${e.sentiment_score}, Keywords: ${(e.sentiment_keywords || []).join(", ")}, Tags: ${(e.tags || []).join(", ")}`
        )
        .join("\n");

      const mathSummary = `Weekly Avg Wellness Index: ${avgWellness}/100, Dominant Emotional Dimension: ${dominantDimension}, Top Lifter Tag: ${topLifter ? `${topLifter.tag} (+${topLifter.delta})` : "none"}, Top Drainer Tag: ${topDrainer ? `${topDrainer.tag} (${topDrainer.delta})` : "none"}.`;

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
                    text: `You are a supportive, mindful wellness companion for MoodFlow. Analyze these recent mood logs and mathematical trait metrics:\n${mathSummary}\n\nLogs:\n${userSummary}\n\n${promptLang}\nFormat must be pure JSON with rhythm, booster, habit fields.`,
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
            return NextResponse.json(
              {
                success: true,
                data: payload,
                reflection: payload,
              },
              { status: 200, headers: { "Cache-Control": "no-store" } }
            );
          }
        }
      }
    } catch {
      // Gracefully fall through to heuristic synthesis
    }
  }

  // Data-driven mathematical heuristic synthesis (works 100% offline or with zero API key)
  const isAr = locale === "ar";
  let rhythm: string;
  let booster: string;
  let habit: string;

  if (enrichedEntries.length === 0) {
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
    const localizedMood = tmood(dominantMood, locale);
    const localizedDimension = getDimensionLabel(dominantDimension, locale);

    const topTagRaw = topLifter?.tag || Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const localizedTopTag = topTagRaw
      ? isAr && /[a-zA-Z]/.test(ttag(topTagRaw, "ar"))
        ? "الأنشطة اليومية"
        : ttag(topTagRaw, locale)
      : null;

    const topKwRaw = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const safeKeyword =
      topKwRaw && (!isAr || !/[a-zA-Z]/.test(topKwRaw)) ? topKwRaw : null;

    const peakWindow = Object.entries(windowCounts).sort((a, b) => b[1] - a[1])[0];
    const windowLabel =
      peakWindow && peakWindow[1] > 0
        ? peakWindow[0] === "morning"
          ? isAr
            ? "الصباح"
            : "mornings"
          : peakWindow[0] === "afternoon"
          ? isAr
            ? "فترة الظهيرة"
            : "afternoons"
          : isAr
          ? "المساء"
          : "evenings"
        : null;

    rhythm = isAr
      ? `سجلت ${enrichedEntries.length} تدوينات بمتوسط مؤشر عافية ${avgWellness} من ١٠٠، وكان البعد الغالب هو ${localizedDimension} مع شعور ${localizedMood} بشدة ${avgIntensity}٪${windowLabel ? ` خاصة في ${windowLabel}` : ""}.`
      : `Across ${enrichedEntries.length} check-ins, your composite wellness index averaged ${avgWellness}/100, anchored in ${localizedDimension.toLowerCase()} traits and ${localizedMood.toLowerCase()} check-ins at ${avgIntensity}% intensity${windowLabel ? `, mostly during ${windowLabel}` : ""}.`;

    if (topLifter && localizedTopTag) {
      booster = isAr
        ? `ارتبط وسم ${localizedTopTag} برفع مؤشر عافيتك بمقدار ${topLifter.delta} نقطة${safeKeyword ? ` مع تكرار دلالة "${safeKeyword}" في كلماتك` : ""}.`
        : `"${localizedTopTag}" lifted your wellness score by +${topLifter.delta} points${safeKeyword ? `, alongside "${safeKeyword}" in your reflections` : ""}.`;
    } else if (localizedTopTag) {
      booster = isAr
        ? `ارتبط وسم ${localizedTopTag} بأغلب لحظات وعيك وتوازنك خلال الأيام الماضية.`
        : `Your "${localizedTopTag}" moments were most frequently linked with your emotional check-ins this week.`;
    } else {
      booster = isAr
        ? "لحظات الامتنان والهدوء كانت المحرك الأقوى لاستقرار مزاجك هذا الأسبوع."
        : "Moments of gratitude and calm reflection were your strongest emotional stabilizers this week.";
    }

    if (topDrainer) {
      const drainTagSafe =
        isAr && /[a-zA-Z]/.test(ttag(topDrainer.tag, "ar"))
          ? "بعض الضغوط اليومية"
          : ttag(topDrainer.tag, locale);
      habit = isAr
        ? `لاحظنا أن ${drainTagSafe} خفض مؤشر مزاجك؛ خصص دقيقتين للتنفس العميق بعده لاستعادة توازنك.`
        : `Notice "${drainTagSafe}" correlated with a ${topDrainer.delta}-point dip; pair it with a 2-minute 4-7-8 breathing reset.`;
    } else if (
      dominantMood === "Sad" ||
      dominantMood === "Frustrated" ||
      dominantDimension === "anxious" ||
      dominantDimension === "frustrated"
    ) {
      habit = isAr
        ? "جرب تمرين التنفس الهادئ ٤-٧-٨ لمدة دقيقتين عند تصاعد التوتر لاستعادة صفاء ذهنك."
        : "Try the 4-7-8 breathing exercise for two minutes whenever tension rises to gently reset.";
    } else if (dominantMood === "Tired" || dominantDimension === "tired") {
      habit = isAr
        ? "امنح نفسك راحة كافية الليلة وابتعد عن الشاشات قبل النوم بنصف ساعة."
        : "Prioritize restorative rest tonight by stepping away from screens 30 minutes before sleep.";
    } else {
      habit = isAr
        ? "حافظ على تدوين لحظة امتنان واحدة يومياً لتعزيز استمرارية توازنك النفسي."
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

  return NextResponse.json(
    {
      success: true,
      data: payload,
      reflection: payload,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
