import { describe, it, expect, beforeEach } from "vitest";
import {
  toLocalDateStr,
  parseLocalDate,
  calculateStreak,
  getLongestStreak,
  commonTags,
  translateTag,
} from "@/lib/moods";
import { analyzeSentiment } from "@/lib/sentiment";
import { escapeHtml } from "@/app/api/feedback/route";
import { sanitizeCsvCell } from "@/hooks/useSyncStore";
import { translations, ttag } from "@/lib/i18n/translations";
import { checkRateLimit, clearRateLimitBuckets } from "@/lib/rate-limit";

describe("Local Date Handling & Edge Cases", () => {
  it("formats dates to YYYY-MM-DD in local time with zero padding", () => {
    const d = new Date(2026, 4, 3); // May 3, 2026
    expect(toLocalDateStr(d)).toBe("2026-05-03");
  });

  it("handles leap year date parsing accurately", () => {
    const leapDate = parseLocalDate("2024-02-29");
    expect(leapDate.getFullYear()).toBe(2024);
    expect(leapDate.getMonth()).toBe(1); // 0-indexed February
    expect(leapDate.getDate()).toBe(29);
  });

  it("round-trips date string cleanly without UTC date shifting", () => {
    const original = "2026-10-26";
    const parsed = parseLocalDate(original);
    const formatted = toLocalDateStr(parsed);
    expect(formatted).toBe(original);
  });
});

describe("Streak Calculations", () => {
  it("returns 0 for empty entries list", () => {
    expect(calculateStreak([])).toBe(0);
    expect(getLongestStreak([])).toBe(0);
  });

  it("calculates active streak when user logged today", () => {
    const today = toLocalDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = toLocalDateStr(twoDaysAgo);

    const entries = [
      { date: today },
      { date: yesterdayStr },
      { date: twoDaysAgoStr },
    ];

    expect(calculateStreak(entries)).toBe(3);
  });

  it("maintains streak if user has not yet logged today but logged yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = toLocalDateStr(twoDaysAgo);

    const entries = [
      { date: yesterdayStr },
      { date: twoDaysAgoStr },
    ];

    expect(calculateStreak(entries)).toBe(2);
  });

  it("returns 0 if user last logged two days ago", () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = toLocalDateStr(twoDaysAgo);

    const entries = [{ date: twoDaysAgoStr }];
    expect(calculateStreak(entries)).toBe(0);
  });

  it("deduplicates multiple entries on the same day for streak counting", () => {
    const today = toLocalDateStr(new Date());
    const entries = [
      { date: today },
      { date: today },
      { date: today },
    ];

    expect(calculateStreak(entries)).toBe(1);
    expect(getLongestStreak(entries)).toBe(1);
  });

  it("computes getLongestStreak correctly across broken sequences and unordered inputs", () => {
    const entries = [
      { date: "2026-01-01" },
      { date: "2026-01-04" },
      { date: "2026-01-02" },
      { date: "2026-01-03" }, // Run of 4: Jan 1-4
      { date: "2026-01-07" },
      { date: "2026-01-08" }, // Run of 2: Jan 7-8
    ];

    expect(getLongestStreak(entries)).toBe(4);
  });
});

describe("Sentiment Analysis Engine", () => {
  it("handles empty or whitespace strings gracefully", () => {
    const result = analyzeSentiment("   ", "en");
    expect(result.score).toBe(0);
    expect(result.suggestedMood).toBe("Calm");
    expect(result.keywords).toHaveLength(0);
  });

  it("scores positive and negative English text correctly", () => {
    const pos = analyzeSentiment("I feel so happy, grateful and relaxed today", "en");
    expect(pos.score).toBeGreaterThan(0.3);
    expect(pos.suggestedMood).toBe("Happy");

    const neg = analyzeSentiment("I am feeling exhausted, sad and anxious", "en");
    expect(neg.score).toBeLessThan(-0.3);
    expect(neg.suggestedMood).toBe("Sad");
  });

  it("inverts polarity on negation in English", () => {
    const pos = analyzeSentiment("happy", "en");
    const neg = analyzeSentiment("not happy", "en");
    expect(pos.score).toBeGreaterThan(0);
    expect(neg.score).toBeLessThan(0);
  });

  it("recognizes contraction negations like don't and can't", () => {
    const res = analyzeSentiment("I don't feel happy today", "en");
    expect(res.score).toBeLessThan(0);
  });

  it("scores Arabic sentiment accurately", () => {
    const arPos = analyzeSentiment("أنا سعيد جداً وممتن وفرحان", "ar");
    expect(arPos.score).toBeGreaterThan(0.3);

    const arNeg = analyzeSentiment("أشعر بحزن شديد وتعب وإحباط", "ar");
    expect(arNeg.score).toBeLessThan(-0.3);
  });

  it("inverts polarity on Arabic negations", () => {
    const arPos = analyzeSentiment("سعيد", "ar");
    const arNeg = analyzeSentiment("مش سعيد", "ar");
    expect(arPos.score).toBeGreaterThan(0);
    expect(arNeg.score).toBeLessThan(0);
  });

  it("produces Arabic insights without English mixing", () => {
    const result = analyzeSentiment("أنا متفائل وسعيد", "ar");
    // Ensure no Latin letters exist in the Arabic insight string
    expect(/[a-zA-Z]/.test(result.insight)).toBe(false);
  });
});

describe("Security & Sanitization", () => {
  it("escapes dangerous HTML characters in feedback", () => {
    const payload = `<script>alert("XSS & attack")</script> 'test'`;
    const escaped = escapeHtml(payload);
    expect(escaped).toBe(
      `&lt;script&gt;alert(&quot;XSS &amp; attack&quot;)&lt;/script&gt; &#039;test&#039;`
    );
    expect(escaped).not.toContain("<");
    expect(escaped).not.toContain(">");
    expect(escaped).not.toContain('"');
    expect(escaped).not.toContain("'");
  });

  it("neutralizes CSV formula injection characters (=, +, -, @, \\t, \\r)", () => {
    const maliciousFormulas = [
      `=cmd|' /C calc'!A0`,
      `+SUM(A1:A10)`,
      `-cmd|' /C notepad'!A0`,
      `@SUM(B1:B5)`,
      `\t=calc`,
      `\r+attack`,
    ];

    maliciousFormulas.forEach((formula) => {
      const sanitized = sanitizeCsvCell(formula);
      expect(sanitized.startsWith(`"'`)).toBe(true);
      expect(sanitized.endsWith(`"`)).toBe(true);
    });
  });

  it("escapes embedded double quotes in CSV cells", () => {
    const text = `He said "Hello, world!"`;
    const sanitized = sanitizeCsvCell(text);
    expect(sanitized).toBe(`"He said ""Hello, world!"""`);
  });
});

describe("Translations & Localization Purity", () => {
  it("contains no CJK or non-Arabic characters in Arabic translation keys", () => {
    const arKeys = Object.entries(translations.ar);
    const cjkRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;

    arKeys.forEach(([key, val]) => {
      if (typeof val === "string") {
        expect(cjkRegex.test(val), `Key "${key}" contains CJK characters: "${val}"`).toBe(false);
      }
    });
  });

  it("contains zero ASCII Latin letters in any Arabic translation value (BiDi purity)", () => {
    const arEntries = Object.entries(translations.ar);
    const latinRegex = /[a-zA-Z]/;

    arEntries.forEach(([key, val]) => {
      if (typeof val === "string") {
        expect(
          latinRegex.test(val),
          `Arabic key "${key}" contains inline Latin characters: "${val}"`
        ).toBe(false);
      }
    });
  });

  it("translates all 12 commonTags into pure Arabic without Latin characters", () => {
    commonTags.forEach((tag) => {
      const arTag = ttag(tag, "ar");
      expect(arTag).not.toBe(tag);
      expect(/[a-zA-Z]/.test(arTag)).toBe(false);
      expect(translateTag(tag, "en")).toBe(tag);
    });
  });

  it("has matching translation keys between en and ar", () => {
    const enKeys = Object.keys(translations.en);

    // Check that every English key exists in Arabic translations
    enKeys.forEach((key) => {
      expect(key in translations.ar, `Missing key in ar: ${key}`).toBe(true);
    });
  });
});

describe("Rate Limiter", () => {
  beforeEach(() => {
    clearRateLimitBuckets();
  });

  it("allows requests within limit and blocks once limit is exceeded", async () => {
    const key = "test:ip:1";
    const r1 = await checkRateLimit(key, 3, 60_000);
    const r2 = await checkRateLimit(key, 3, 60_000);
    const r3 = await checkRateLimit(key, 3, 60_000);
    const r4 = await checkRateLimit(key, 3, 60_000);

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });
});

describe("Score to Mood Mapping & Weekly Calculations", () => {
  it("maps boundary scores to correct mood classifications", async () => {
    const { scoreToMood } = await import("@/lib/moods");
    expect(scoreToMood(5.0)).toBe("Happy");
    expect(scoreToMood(4.5)).toBe("Happy");
    expect(scoreToMood(4.4)).toBe("Calm");
    expect(scoreToMood(3.5)).toBe("Calm");
    expect(scoreToMood(3.4)).toBe("Tired");
    expect(scoreToMood(2.5)).toBe("Tired");
    expect(scoreToMood(2.4)).toBe("Sad");
    expect(scoreToMood(1.5)).toBe("Sad");
    expect(scoreToMood(1.4)).toBe("Frustrated");
    expect(scoreToMood(0.0)).toBe("Frustrated");
  });

  it("handles getWeeklyData with empty and populated entries and respects locale override", async () => {
    const { getWeeklyData, getRelativeDate } = await import("@/lib/moods");
    const emptyWeekEn = getWeeklyData([], "en");
    expect(emptyWeekEn).toHaveLength(7);
    emptyWeekEn.forEach((d) => {
      expect(d.score).toBe(0);
      expect(/^[A-Za-z]+$/.test(d.day)).toBe(true);
    });

    const emptyWeekAr = getWeeklyData([], "ar");
    expect(emptyWeekAr).toHaveLength(7);
    emptyWeekAr.forEach((d) => {
      expect(d.score).toBe(0);
      expect(/[a-zA-Z]/.test(d.day)).toBe(false);
    });

    const todayStr = toLocalDateStr(new Date());
    expect(getRelativeDate(todayStr, "ar")).toBe("اليوم");
    expect(getRelativeDate(todayStr, "en")).toBe("Today");
  });

  it("generates weekly insights for Arabic without English words", async () => {
    const { generateWeeklyInsight } = await import("@/lib/sentiment");
    const today = toLocalDateStr(new Date());
    const insightAr = generateWeeklyInsight(
      [
        { mood: "Happy", date: today },
        { mood: "Calm", date: today },
      ],
      "ar"
    );
    expect(insightAr.length).toBeGreaterThan(10);
    // Arabic insight must contain zero English letters
    expect(/[a-zA-Z]/.test(insightAr)).toBe(false);
  });

  it("handles null, empty, and normal strings in CSV sanitizer", () => {
    expect(sanitizeCsvCell("")).toBe('""');
    expect(sanitizeCsvCell("Just normal thoughts")).toBe('"Just normal thoughts"');
  });
});


