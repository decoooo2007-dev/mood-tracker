import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

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

describe("Argon Track 1.1: Client-Side E2EE Vault (crypto-vault.ts)", () => {
  it("encrypts and decrypts English and Arabic journal text with password-derived AES-256-GCM key (enc:v1)", async () => {
    const {
      cacheUserVaultKey,
      clearUserVaultKey,
      encryptJournalText,
      decryptJournalText,
      isEncryptedJournal,
    } = await import("@/lib/crypto-vault");

    clearUserVaultKey();
    const userId = "429ad010-e650-4c6f-a7d6-3d84fbd90893";
    await cacheUserVaultKey(userId, "MyStrongPassword!2026");

    const plainEn = "Today I felt grateful after finishing my exams.";
    const cipherEn = await encryptJournalText(plainEn, userId);
    expect(isEncryptedJournal(cipherEn)).toBe(true);
    expect(cipherEn.startsWith("enc:v1:")).toBe(true);
    expect(cipherEn).not.toContain("grateful");

    const decryptedEn = await decryptJournalText(cipherEn, userId);
    expect(decryptedEn).toBe(plainEn);

    const plainAr = "شعرت اليوم بالهدوء والسكينة بعد الصلاة والمشي.";
    const cipherAr = await encryptJournalText(plainAr, userId);
    expect(cipherAr.startsWith("enc:v1:")).toBe(true);
    const decryptedAr = await decryptJournalText(cipherAr, userId);
    expect(decryptedAr).toBe(plainAr);

    clearUserVaultKey();
  });

  it("falls back to per-user deterministic client key (enc:u1) when password key is not cached and preserves legacy plaintext", async () => {
    const {
      clearUserVaultKey,
      encryptJournalText,
      decryptJournalText,
    } = await import("@/lib/crypto-vault");

    clearUserVaultKey();
    const userA = "11111111-2222-3333-4444-555555555555";
    const userB = "99999999-8888-7777-6666-555555555555";

    const secretNote = "Private reflection stored without password key cache";
    const cipherU1 = await encryptJournalText(secretNote, userA);
    expect(cipherU1.startsWith("enc:u1:")).toBe(true);
    expect(await decryptJournalText(cipherU1, userA)).toBe(secretNote);

    // Different user ID cannot decrypt userA's ciphertext
    expect(await decryptJournalText(cipherU1, userB)).toBe("");

    // Legacy plaintext entries in Supabase pass through unchanged
    const legacyPlaintext = "Legacy unencrypted entry from v1.0";
    expect(await decryptJournalText(legacyPlaintext, userA)).toBe(
      legacyPlaintext
    );
  });
});

describe("Argon Track 4.1: Conflict-Free Offline Mutation Queue (offline-queue.ts)", () => {
  it("coalesces CREATE + UPDATE on an offline tempId into a single CREATE mutation", async () => {
    const { coalesceMutation } = await import("@/lib/offline-queue");
    type QueueItem = import("@/lib/offline-queue").OfflineMutationItem;

    let queue: QueueItem[] = [];
    queue = coalesceMutation(queue, {
      id: "op-1",
      type: "CREATE",
      tempId: "temp-101",
      payload: {
        mood: "Sad",
        intensity: 40,
        text: "enc:v1:iv1:cipher1",
        tags: ["Work"],
        date: "2026-11-07",
        time: "10:00 AM",
        sentiment_score: -0.5,
        sentiment_keywords: ["stressed"],
      },
      createdAt: "2026-11-07T08:00:00Z",
    });

    queue = coalesceMutation(queue, {
      id: "op-2",
      type: "UPDATE",
      targetId: "temp-101",
      payload: {
        mood: "Calm",
        intensity: 75,
        text: "enc:v1:iv2:cipher2",
      },
      createdAt: "2026-11-07T08:05:00Z",
    });

    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("CREATE");
    if (queue[0].type === "CREATE") {
      expect(queue[0].payload.mood).toBe("Calm");
      expect(queue[0].payload.intensity).toBe(75);
      expect(queue[0].payload.text).toBe("enc:v1:iv2:cipher2");
      expect(queue[0].payload.tags).toEqual(["Work"]);
    }
  });

  it("cancels pending CREATE completely when DELETE targets the same offline tempId", async () => {
    const { coalesceMutation } = await import("@/lib/offline-queue");
    type QueueItem = import("@/lib/offline-queue").OfflineMutationItem;

    let queue: QueueItem[] = [];
    queue = coalesceMutation(queue, {
      id: "op-1",
      type: "CREATE",
      tempId: "temp-202",
      payload: {
        mood: "Happy",
        intensity: 80,
        text: "",
        tags: [],
        date: "2026-11-07",
        time: "11:00 AM",
        sentiment_score: 0,
        sentiment_keywords: [],
      },
      createdAt: "2026-11-07T09:00:00Z",
    });

    queue = coalesceMutation(queue, {
      id: "op-2",
      type: "DELETE",
      targetId: "temp-202",
      createdAt: "2026-11-07T09:01:00Z",
    });

    expect(queue).toHaveLength(0);
  });

  it("merges consecutive UPDATEs on a server UUID and replaces UPDATE with DELETE when deleted", async () => {
    const { coalesceMutation } = await import("@/lib/offline-queue");
    type QueueItem = import("@/lib/offline-queue").OfflineMutationItem;

    const serverUuid = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
    let queue: QueueItem[] = [];

    queue = coalesceMutation(queue, {
      id: "op-1",
      type: "UPDATE",
      targetId: serverUuid,
      payload: { intensity: 60 },
      createdAt: "2026-11-07T09:00:00Z",
    });

    queue = coalesceMutation(queue, {
      id: "op-2",
      type: "UPDATE",
      targetId: serverUuid,
      payload: { mood: "Happy", tags: ["Family"] },
      createdAt: "2026-11-07T09:02:00Z",
    });

    expect(queue).toHaveLength(1);
    if (queue[0].type === "UPDATE") {
      expect(queue[0].payload).toEqual({
        intensity: 60,
        mood: "Happy",
        tags: ["Family"],
      });
    }

    queue = coalesceMutation(queue, {
      id: "op-3",
      type: "DELETE",
      targetId: serverUuid,
      createdAt: "2026-11-07T09:05:00Z",
    });

    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("DELETE");

    queue = coalesceMutation(queue, {
      id: "op-4",
      type: "CLEAR_ALL",
      createdAt: "2026-11-07T09:10:00Z",
    });

    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("CLEAR_ALL");
  });
});

describe("Phase 2: Custom Tags Management", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => {
        store.set(key, String(val));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      length: 0,
    } as Storage;
  });

  it("handles custom tags persistence, deduplication, and case-insensitivity", async () => {
    const { getCustomTags, saveCustomTag, getAllTags, commonTags } = await import("@/lib/moods");

    expect(getCustomTags()).toEqual([]);

    const updated = saveCustomTag("Deep Meditation");
    expect(updated).toContain("Deep Meditation");
    expect(getCustomTags()).toEqual(["Deep Meditation"]);

    // Deduplication check
    const dedup = saveCustomTag("deep meditation");
    expect(dedup).toHaveLength(1);

    // Common tags collision check
    const commonCollision = saveCustomTag(commonTags[0]);
    expect(commonCollision).toHaveLength(1);

    // getAllTags contains both common and custom
    const all = getAllTags();
    expect(all).toContain(commonTags[0]);
    expect(all).toContain("Deep Meditation");
  });
});

describe("Phase 2: Guided Journaling Prompts", () => {
  it("returns 3 distinct prompts per mood in EN and AR", async () => {
    const { getMoodPrompts, moodOptions } = await import("@/lib/moods");

    for (const option of moodOptions) {
      const enPrompts = getMoodPrompts(option.label, "en");
      expect(enPrompts).toHaveLength(3);
      for (const p of enPrompts) {
        expect(p.length).toBeGreaterThan(5);
      }

      const arPrompts = getMoodPrompts(option.label, "ar");
      expect(arPrompts).toHaveLength(3);
      for (const p of arPrompts) {
        expect(p.length).toBeGreaterThan(5);
        // Strict BiDi: No English letters
        expect(/[a-zA-Z]/.test(p)).toBe(false);
      }
    }
  });
});

describe("Phase 2: App Lock Vault & PIN Security", () => {
  it("hashes PIN using Web Crypto SHA-256 and verifies accurately", async () => {
    const { hashPin, setAppLockPin, verifyPin, isAppLockEnabled, removeAppLock } =
      await import("@/lib/app-lock");

    const pin = "1357";
    const hashed = await hashPin(pin);
    expect(hashed).toHaveLength(64); // SHA-256 hex is 64 chars

    // Enable PIN lock
    const enabled = await setAppLockPin(pin);
    expect(enabled).toBe(true);
    expect(isAppLockEnabled()).toBe(true);

    const isValid = await verifyPin("1357");
    expect(isValid).toBe(true);

    const isInvalid = await verifyPin("9999");
    expect(isInvalid).toBe(false);

    // Remove lock
    removeAppLock();
    expect(isAppLockEnabled()).toBe(false);
  });

  it("rejects biometric authentication when no WebAuthn credential is registered (P0-1 regression)", async () => {
    const { hasRegisteredBiometrics, authenticateBiometric, removeAppLock } =
      await import("@/lib/app-lock");

    removeAppLock();
    expect(hasRegisteredBiometrics()).toBe(false);
    expect(await authenticateBiometric()).toBe(false);
  });
});

describe("Phase 2: Strict BiDi Purity on all Arabic Translations", () => {
  it("enforces zero Latin ASCII letters across all translations.ar keys", () => {
    const arKeys = Object.entries(translations.ar);
    expect(arKeys.length).toBeGreaterThan(60);

    for (const [key, value] of arKeys) {
      if (typeof value === "string") {
        const hasLatin = /[a-zA-Z]/.test(value);
        if (hasLatin) {
          throw new Error(`Arabic key "${key}" contains Latin characters: "${value}"`);
        }
        expect(hasLatin).toBe(false);
      }
    }
  });
});

describe("Security Hardening: CSRF Origin & Middleware Protection", () => {
  it("blocks cross-origin mutating API requests with 403 CSRF_REJECTED and blocks unauthenticated /api/ai", async () => {
    const { NextRequest } = await import("next/server");
    const { middleware } = await import("@/middleware");

    // 1. Cross-origin POST to /api/entries must be blocked with 403
    const crossOriginReq = new NextRequest("https://moodflow.example.com/api/entries", {
      method: "POST",
      headers: {
        host: "moodflow.example.com",
        origin: "https://evil-attacker.com",
      },
    });
    const csrfRes = await middleware(crossOriginReq);
    expect(csrfRes.status).toBe(403);
    const csrfBody = await csrfRes.json();
    expect(csrfBody.code).toBe("CSRF_REJECTED");

    // 2. Same-origin unauthenticated POST to /api/ai/reflection must return 401
    const unauthAiReq = new NextRequest("https://moodflow.example.com/api/ai/reflection", {
      method: "POST",
      headers: {
        host: "moodflow.example.com",
        origin: "https://moodflow.example.com",
      },
    });
    const aiRes = await middleware(unauthAiReq);
    expect(aiRes.status).toBe(401);

    // 3. /apple-icon must be publicly accessible for iOS PWA home screen fetching
    const appleIconReq = new NextRequest("https://moodflow.example.com/apple-icon", {
      method: "GET",
      headers: { host: "moodflow.example.com" },
    });
    const appleIconRes = await middleware(appleIconReq);
    expect(appleIconRes.status).toBe(200);
  });
});

describe("Track 1 (Option A): 8-Dimension EN / MSA / Egyptian Colloquial Lexicon & Formula", () => {
  it("detects all 8 emotional dimensions accurately in English including multi-word phrases", async () => {
    const { analyzeSentiment } = await import("@/lib/sentiment");

    const happy = analyzeSentiment("I am on cloud nine and feeling so blessed today!", "en");
    expect(happy.dominantDimension).toBe("happy");
    expect(happy.wellnessIndex).toBeGreaterThan(75);
    expect(happy.score).toBeGreaterThan(0.5);

    const calm = analyzeSentiment("I feel inner peace and serenity right now.", "en");
    expect(calm.dominantDimension).toBe("calm");
    expect(calm.wellnessIndex).toBeGreaterThan(70);

    const motivated = analyzeSentiment("Locked in and crushing it, making huge progress!", "en");
    expect(motivated.dominantDimension).toBe("motivated");
    expect(motivated.wellnessIndex).toBeGreaterThan(75);

    const tired = analyzeSentiment("Completely burned out and running on empty.", "en");
    expect(tired.dominantDimension).toBe("tired");
    expect(tired.suggestedMood).toBe("Tired");
    expect(tired.score).toBeLessThan(-0.2);

    const sad = analyzeSentiment("Heartbroken, lonely, and feeling down.", "en");
    expect(sad.dominantDimension).toBe("sad");
    expect(sad.suggestedMood).toBe("Sad");
    expect(sad.score).toBeLessThan(-0.5);

    const frustrated = analyzeSentiment("Fed up, furious, and sick and tired of nothing working.", "en");
    expect(frustrated.dominantDimension).toBe("frustrated");
    expect(frustrated.suggestedMood).toBe("Frustrated");
    expect(frustrated.score).toBeLessThan(-0.5);

    const anxious = analyzeSentiment("Heart racing, on edge, and having a panic attack.", "en");
    expect(anxious.dominantDimension).toBe("anxious");
    expect(anxious.score).toBeLessThan(-0.5);

    const confused = analyzeSentiment("Brain fog and at a loss, mixed feelings everywhere.", "en");
    expect(confused.dominantDimension).toBe("confused");
    expect(confused.score).toBeLessThan(-0.2);
  });

  it("normalizes Modern Standard Arabic letters, diacritics, and prefixes (و/ال/وال/ب/بال/ف/ك/لل)", async () => {
    const { analyzeSentiment } = await import("@/lib/sentiment");

    const msaPos = analyzeSentiment("أشعُرُ بالهُدوءِ والسَّكِينَةِ والامتنانِ وَالتَّفَاؤُل", "ar");
    expect(msaPos.score).toBeGreaterThan(0.5);
    expect(msaPos.wellnessIndex).toBeGreaterThan(75);
    expect(/[a-zA-Z]/.test(msaPos.insight)).toBe(false);

    const msaMotivated = analyzeSentiment("سعيد للنجاح والإنجاز والتقدم", "ar");
    expect(msaMotivated.score).toBeGreaterThan(0.5);
    expect(msaMotivated.dimensionScores.motivated).toBeGreaterThan(0);

    const msaAnxious = analyzeSentiment("أشعر كالقلق والذعر والاضطراب فالتعب شديد", "ar");
    expect(msaAnxious.score).toBeLessThan(-0.3);
    expect(msaAnxious.dimensionScores.anxious).toBeGreaterThan(0);
    expect(msaAnxious.dimensionScores.tired).toBeGreaterThan(0);
  });

  it("scores Egyptian Colloquial (عامية مصرية) accurately across all 8 dimensions", async () => {
    const { analyzeSentiment } = await import("@/lib/sentiment");

    const egHappy = analyzeSentiment("الحمدلله مبسوط أوي وفرحان والدنيا زي الفل وعظمة ومنشكح", "ar");
    expect(egHappy.dominantDimension).toBe("happy");
    expect(egHappy.wellnessIndex).toBeGreaterThan(75);
    expect(/[a-zA-Z]/.test(egHappy.insight)).toBe(false);

    const egCalm = analyzeSentiment("قاعد رايق وفي روقان ومطمن على الاخر", "ar");
    expect(egCalm.dominantDimension).toBe("calm");
    expect(egCalm.wellnessIndex).toBeGreaterThan(70);

    const egMotivated = analyzeSentiment("الحمدلله انجزت وشديت حيلي وكسرت الدنيا", "ar");
    expect(egMotivated.dominantDimension).toBe("motivated");
    expect(egMotivated.wellnessIndex).toBeGreaterThan(75);

    const egTired = analyzeSentiment("انا هلكان ومفرهد وتعبان وفصلت شحن وبطاريتي فضيت", "ar");
    expect(egTired.dominantDimension).toBe("tired");
    expect(egTired.suggestedMood).toBe("Tired");
    expect(egTired.score).toBeLessThan(-0.2);

    const egSad = analyzeSentiment("مخنوق وزعلان ومقهور وموجوع", "ar");
    expect(egSad.dominantDimension).toBe("sad");
    expect(egSad.suggestedMood).toBe("Sad");
    expect(egSad.score).toBeLessThan(-0.5);

    const egFrustrated = analyzeSentiment("دمي محروق ومتعصب وقرفان وزهقان ومفروس ومتنرفز ومش طايق", "ar");
    expect(egFrustrated.dominantDimension).toBe("frustrated");
    expect(egFrustrated.suggestedMood).toBe("Frustrated");
    expect(egFrustrated.score).toBeLessThan(-0.5);

    const egAnxious = analyzeSentiment("قلقان ومقبوض وشايل الهم ومزنوق", "ar");
    expect(egAnxious.dominantDimension).toBe("anxious");
    expect(egAnxious.score).toBeLessThan(-0.4);

    const egConfused = analyzeSentiment("متلخبط وتايه ومحتار ومشوش ومش مجمع", "ar");
    expect(egConfused.dominantDimension).toBe("confused");
    expect(egConfused.score).toBeLessThan(-0.2);
  });

  it("handles Egyptian negation idioms vs negated adjectives and elongated words", async () => {
    const { analyzeSentiment } = await import("@/lib/sentiment");

    // Negation-prefixed negative idioms must NOT flip positive
    const idiomFrustrated = analyzeSentiment("مش طايق نفسي النهارده", "ar");
    expect(idiomFrustrated.score).toBeLessThan(-0.4);
    expect(idiomFrustrated.dominantDimension).toBe("frustrated");

    const idiomConfused = analyzeSentiment("دماغي لفة ومش مجمع", "ar");
    expect(idiomConfused.score).toBeLessThan(-0.2);
    expect(idiomConfused.dominantDimension).toBe("confused");

    // Negated positive flips negative; negated negative flips positive
    const negatedPositive = analyzeSentiment("أنا مش مبسوط خالص", "ar");
    expect(negatedPositive.score).toBeLessThan(0);

    const negatedNegative = analyzeSentiment("أنا مش زعلان ومش قلقان", "ar");
    expect(negatedNegative.score).toBeGreaterThan(0);

    // Elongation handling
    const elongated = analyzeSentiment("مبسووووط اويييي", "ar");
    expect(elongated.score).toBeGreaterThan(0.5);
    expect(elongated.dominantDimension).toBe("happy");
  });

  it("computes deterministic composite mood score combining Mood Vector, Intensity, Trait Tags, and Lexicon", async () => {
    const { computeCompositeMoodScore } = await import("@/lib/sentiment");

    const highHappy = computeCompositeMoodScore({
      mood: "Happy",
      intensity: 95,
      tags: ["Exercise", "Gratitude"],
      text: "الحمدلله انجزت ومبسوط أوي",
      locale: "ar",
    });
    const lowHappy = computeCompositeMoodScore({
      mood: "Happy",
      intensity: 20,
      tags: [],
      text: "",
      locale: "en",
    });
    const heavyFrustrated = computeCompositeMoodScore({
      mood: "Frustrated",
      intensity: 90,
      tags: ["Stress", "Anxiety"],
      text: "دمي محروق ومش طايق",
      locale: "ar",
    });

    expect(highHappy.wellnessIndex).toBeGreaterThan(lowHappy.wellnessIndex);
    expect(highHappy.wellnessIndex).toBeGreaterThanOrEqual(80);
    expect(highHappy.wellnessIndex).toBeLessThanOrEqual(100);
    expect(highHappy.moodVectorContribution).toBeGreaterThan(0);
    expect(highHappy.traitContribution).toBeGreaterThan(0);
    expect(highHappy.lexiconContribution).toBeGreaterThan(0);

    expect(heavyFrustrated.wellnessIndex).toBeLessThan(25);
    expect(heavyFrustrated.wellnessIndex).toBeGreaterThanOrEqual(0);
    expect(heavyFrustrated.score).toBeLessThan(-0.5);
    expect(heavyFrustrated.traitContribution).toBeLessThan(0);
  });
});

describe("Track 3: Tag Correlations & Editable Factor Preferences", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => {
        store.set(key, String(val));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      length: 0,
    } as Storage;
  });

  it("calculates positive lifting tags vs negative draining tags accurately", async () => {
    const { computeTagCorrelations } = await import("@/lib/sentiment");

    const sampleEntries = [
      { mood: "Happy" as const, intensity: 90, tags: ["Exercise", "Prayer"], text: "Great workout" },
      { mood: "Happy" as const, intensity: 85, tags: ["Exercise", "Family"], text: "Wonderful day" },
      { mood: "Calm" as const, intensity: 80, tags: ["Prayer"], text: "Peaceful" },
      { mood: "Frustrated" as const, intensity: 85, tags: ["Stress", "Work"], text: "Annoyed" },
      { mood: "Sad" as const, intensity: 80, tags: ["Stress"], text: "Exhausted and sad" },
    ];

    const correlations = computeTagCorrelations(sampleEntries);
    const exercise = correlations.find((c) => c.tag === "Exercise");
    const stress = correlations.find((c) => c.tag === "Stress");

    expect(exercise).toBeDefined();
    expect(exercise!.direction).toBe("lift");
    expect(exercise!.delta).toBeGreaterThan(0);

    expect(stress).toBeDefined();
    expect(stress!.direction).toBe("drain");
    expect(stress!.delta).toBeLessThan(0);
  });

  it("supports adding, renaming, pinning, hiding, removing, and resetting custom factors", async () => {
    const {
      getFactorPreferences,
      addCustomFactor,
      renameFactor,
      togglePinFactor,
      toggleHideFactor,
      removeCustomFactor,
      resetFactorPreferences,
      buildEditableFactors,
    } = await import("@/lib/factors");

    const correlations = [
      { tag: "Exercise", delta: 24, averageScore: 84, count: 4, direction: "lift" as const },
      { tag: "Prayer", delta: 28, averageScore: 88, count: 5, direction: "lift" as const },
      { tag: "Stress", delta: -22, averageScore: 30, count: 3, direction: "drain" as const },
    ];

    addCustomFactor("Morning Walk", "lift", 15);
    renameFactor("Exercise", "Gym Session");
    togglePinFactor("Exercise"); // Pin Exercise above Prayer even though Prayer has +28
    toggleHideFactor("Stress");

    const prefs = getFactorPreferences();
    const { lifters, drainers, hiddenItems } = buildEditableFactors(correlations, prefs);

    expect(lifters[0].rawTag).toBe("Exercise");
    expect(lifters[0].label).toBe("Gym Session");
    expect(lifters[0].isPinned).toBe(true);
    expect(lifters.some((l) => l.rawTag === "Morning Walk" && l.isCustom)).toBe(true);
    expect(drainers).toHaveLength(0);
    expect(hiddenItems).toHaveLength(1);
    expect(hiddenItems[0].rawTag).toBe("Stress");

    removeCustomFactor("Morning Walk");
    const afterRemove = buildEditableFactors(correlations, getFactorPreferences());
    expect(afterRemove.lifters.some((l) => l.rawTag === "Morning Walk")).toBe(false);

    const reset = resetFactorPreferences();
    expect(reset.pinned).toHaveLength(0);
    expect(reset.hidden).toHaveLength(0);
  });
});

describe("Track 2: Nile Sapphire Default Palette & BiDi Purity", () => {
  it("sets palette #4 Nile Sapphire first as default with clean flagship names and Arabic BiDi purity", async () => {
    const { DEFAULT_PALETTE_ID, PALETTES, getPaletteById } = await import("@/lib/theme");

    expect(DEFAULT_PALETTE_ID).toBe(4);
    expect(PALETTES).toHaveLength(8);
    expect(PALETTES[0].id).toBe(4);
    expect(getPaletteById(4).nameEn).toBe("Nile Sapphire");

    for (const pal of PALETTES) {
      expect(/[a-zA-Z]/.test(pal.nameAr)).toBe(false);
      expect(/^\d+\./.test(pal.nameEn)).toBe(false);
      expect(/^[٠-٩]+\./.test(pal.nameAr)).toBe(false);
    }
  });

  it("enforces the Automatic Mode-Aware Aura Rule (moodReactive OFF in Dark Mode, ON in Light Mode by default)", async () => {
    const { getStoredAppearance, MOOD_REACTIVE_STORAGE_KEY } = await import("@/lib/theme");
    const store = new Map<string, string>();
    globalThis.window = globalThis as unknown as Window & typeof globalThis;
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => {
        store.set(key, String(val));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      length: 0,
    } as Storage;

    // 1. Default Dark Mode -> moodReactive is automatically false (OFF)
    store.set("moodflow-theme", "dark");
    store.delete(MOOD_REACTIVE_STORAGE_KEY);
    const darkAppearance = getStoredAppearance();
    expect(darkAppearance.theme).toBe("dark");
    expect(darkAppearance.paletteId).toBe(4);
    expect(darkAppearance.moodStyle).toBe("hybrid");
    expect(darkAppearance.moodReactive).toBe(false);

    // 2. Light Mode -> moodReactive is automatically true (ON)
    store.set("moodflow-theme", "light");
    store.delete(MOOD_REACTIVE_STORAGE_KEY);
    const lightAppearance = getStoredAppearance();
    expect(lightAppearance.theme).toBe("light");
    expect(lightAppearance.moodReactive).toBe(true);

    // 3. Explicit override is respected
    store.set(MOOD_REACTIVE_STORAGE_KEY, "true");
    store.set("moodflow-theme", "dark");
    expect(getStoredAppearance().moodReactive).toBe(true);
  });
});

describe("Gate 3 (test-guard): Auth, JWT, Time Classifier & API Row Validation", () => {
  it("classifies English, Arabic, and Eastern-Arabic numeral timestamps into morning, afternoon, and evening", async () => {
    const { classifyTimeWindow } = await import("@/app/api/ai/reflection/route");

    expect(classifyTimeWindow("08:30 AM")).toBe("morning");
    expect(classifyTimeWindow("٠٧:١٥ ص")).toBe("morning");
    expect(classifyTimeWindow("02:45 PM")).toBe("afternoon");
    expect(classifyTimeWindow("٠٣:٠٠ م")).toBe("afternoon");
    expect(classifyTimeWindow("09:15 PM")).toBe("evening");
    expect(classifyTimeWindow("١٠:٣٠ م")).toBe("evening");
    expect(classifyTimeWindow("12:00 AM")).toBe("evening");
    expect(classifyTimeWindow("12:30 PM")).toBe("afternoon");
    expect(classifyTimeWindow("")).toBe("unknown");
    expect(classifyTimeWindow(null)).toBe("unknown");
  });

  it("normalizes Arabic/English usernames and performs constant-time SHA-256 verification", async () => {
    const {
      normalizeUsername,
      USERNAME_REGEX,
      computeSha256Hex,
      verifyTimingSafeSha256,
    } = await import("@/lib/server-auth");

    expect(normalizeUsername("  Abdelrhman_2026  ")).toBe("abdelrhman_2026");
    expect(USERNAME_REGEX.test("abdelrhman_2026")).toBe(true);
    expect(USERNAME_REGEX.test("عبدالرحمن_٢٠٢٦")).toBe(true);
    expect(USERNAME_REGEX.test("ab")).toBe(false); // < 3 chars
    expect(USERNAME_REGEX.test("bad<script>")).toBe(false);

    const hash = computeSha256Hex("SecretPass123!");
    expect(verifyTimingSafeSha256("SecretPass123!", hash)).toBe(true);
    expect(verifyTimingSafeSha256("WrongPass", hash)).toBe(false);
    expect(verifyTimingSafeSha256("SecretPass123!", "not-a-valid-hex")).toBe(false);
  });

  it("normalizes mood values case-insensitively and formats database entry rows safely", async () => {
    const { normalizeMoodValue, formatEntryRow } = await import("@/app/api/entries/route");

    expect(normalizeMoodValue("  happy ")).toBe("Happy");
    expect(normalizeMoodValue("FRUSTRATED")).toBe("Frustrated");
    expect(normalizeMoodValue("invalid_mood")).toBeNull();

    const formatted = formatEntryRow({
      id: "123",
      user_id: "u-1",
      date: "2026-11-16",
      time: "09:00 PM",
      mood: "Calm",
      intensity: 80,
      text: "enc:v1:iv:cipher",
      tags: ["Prayer", "Reading"],
      sentiment_score: 0.72,
      sentiment_keywords: ["calm", "peace"],
    });

    expect(formatted.id).toBe("123");
    expect(formatted.mood).toBe("Calm");
    expect(formatted.sentiment.score).toBe(0.72);
    expect(formatted.sentiment.keywords).toEqual(["calm", "peace"]);
  });

  it("signs and verifies HS256 session JWTs and rejects tampered tokens", async () => {
    process.env.JWT_SECRET = "unit-test-jwt-secret-key-minimum-32-bytes-long!!";
    const { signSessionToken, verifySessionToken } = await import("@/lib/jwt");

    const token = await signSessionToken({
      userId: "429ad010-e650-4c6f-a7d6-3d84fbd90893",
      username: "deco",
    });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const verified = await verifySessionToken(token);
    expect(verified).toEqual({
      userId: "429ad010-e650-4c6f-a7d6-3d84fbd90893",
      username: "deco",
    });

    const tampered = `${token.slice(0, -4)}xxxx`;
    expect(await verifySessionToken(tampered)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
  });
});

describe("Subscription Tiers, Entitlements & BiDi Purity (Pre-Payment Architecture)", () => {
  it("normalizes known subscription tiers safely and fails closed to free for untrusted values", async () => {
    const { normalizeSubscriptionTier, PAYWALL_ENFORCEMENT_ENABLED } = await import(
      "@/lib/subscription"
    );

    expect(PAYWALL_ENFORCEMENT_ENABLED).toBe(false);
    expect(normalizeSubscriptionTier("lifetime")).toBe("lifetime");
    expect(normalizeSubscriptionTier("LIFETIME")).toBe("lifetime");
    expect(normalizeSubscriptionTier("yearly")).toBe("yearly");
    expect(normalizeSubscriptionTier("monthly")).toBe("monthly");
    expect(normalizeSubscriptionTier("free")).toBe("free");
    expect(normalizeSubscriptionTier("admin_hack")).toBe("free");
    expect(normalizeSubscriptionTier(null)).toBe("free");
    expect(normalizeSubscriptionTier(undefined)).toBe("free");
  });

  it("keeps features unlocked when paywall is disabled and strictly enforces 4-tier differentiation when enabled", async () => {
    const { hasTierAccess, getTierCapabilities } = await import("@/lib/subscription");

    // Pre-payment phase: enforcePaywall = false -> everything unlocked while testing
    expect(hasTierAccess("free", "lifetime", false)).toBe(true);
    const freePrePaywall = getTierCapabilities("free", false);
    expect(freePrePaywall.paywallActive).toBe(false);
    expect(freePrePaywall.paletteLimit).toBe(8);
    expect(freePrePaywall.heatmapMaxDays).toBe(365);
    expect(freePrePaywall.futureModulesIncluded).toBe(true);
    expect(freePrePaywall.founderBoardFlair).toBe(false);
    expect(getTierCapabilities("lifetime", false).founderBoardFlair).toBe(true);

    // Post-payment phase: enforcePaywall = true -> strict rank & capability differentiation
    expect(hasTierAccess("free", "monthly", true)).toBe(false);
    expect(hasTierAccess("monthly", "yearly", true)).toBe(false);
    expect(hasTierAccess("yearly", "yearly", true)).toBe(true);
    expect(hasTierAccess("yearly", "lifetime", true)).toBe(false);
    expect(hasTierAccess("lifetime", "lifetime", true)).toBe(true);
    expect(hasTierAccess("lifetime", "monthly", true)).toBe(true);

    const freeCaps = getTierCapabilities("free", true);
    expect(freeCaps.paletteLimit).toBe(2);
    expect(freeCaps.customTagsLimit).toBe(3);
    expect(freeCaps.heatmapMaxDays).toBe(30);
    expect(freeCaps.weeklyDeepReflectionLimit).toBe(0);
    expect(freeCaps.editableFactors).toBe(false);
    expect(freeCaps.pdfReportExport).toBe(false);
    expect(freeCaps.biometricLock).toBe(false);
    expect(freeCaps.streakShieldsPerMonth).toBe(0);

    const monthlyCaps = getTierCapabilities("monthly", true);
    expect(monthlyCaps.paletteLimit).toBe(8);
    expect(monthlyCaps.customTagsLimit).toBe(Number.POSITIVE_INFINITY);
    expect(monthlyCaps.heatmapMaxDays).toBe(90);
    expect(monthlyCaps.weeklyDeepReflectionLimit).toBe(3);
    expect(monthlyCaps.editableFactors).toBe(true);
    expect(monthlyCaps.pdfReportExport).toBe(true);
    expect(monthlyCaps.biometricLock).toBe(true);
    expect(monthlyCaps.streakShieldsPerMonth).toBe(0);

    const yearlyCaps = getTierCapabilities("yearly", true);
    expect(yearlyCaps.heatmapMaxDays).toBe(365);
    expect(yearlyCaps.weeklyDeepReflectionLimit).toBe(Number.POSITIVE_INFINITY);
    expect(yearlyCaps.streakShieldsPerMonth).toBe(2);
    expect(yearlyCaps.futureModulesIncluded).toBe(false);
    expect(yearlyCaps.founderBoardFlair).toBe(false);

    const lifetimeCaps = getTierCapabilities("lifetime", true);
    expect(lifetimeCaps.heatmapMaxDays).toBe(365);
    expect(lifetimeCaps.streakShieldsPerMonth).toBe(Number.POSITIVE_INFINITY);
    expect(lifetimeCaps.futureModulesIncluded).toBe(true);
    expect(lifetimeCaps.founderBoardFlair).toBe(true);
  });

  it("enforces zero ASCII Latin letters in all Arabic subscription plan copy", async () => {
    const { SUBSCRIPTION_PLANS, SUBSCRIPTION_TIERS } = await import("@/lib/subscription");

    for (const tier of SUBSCRIPTION_TIERS) {
      const plan = SUBSCRIPTION_PLANS[tier];
      expect(/[a-zA-Z]/.test(plan.labelAr)).toBe(false);
      expect(/[a-zA-Z]/.test(plan.badgeAr)).toBe(false);
      expect(/[a-zA-Z]/.test(plan.priceEgpAr)).toBe(false);
      expect(/[a-zA-Z]/.test(plan.summaryAr)).toBe(false);
      for (const feat of plan.featuresAr) {
        expect(/[a-zA-Z]/.test(feat)).toBe(false);
      }
    }
  });
});

describe("Cross-Device Performance Track 2 & 6: O(1) E2EE Decryption Cache (crypto-vault.ts)", () => {
  it("serves subsequent decryptJournalText calls from O(1) decryptedTextCache without re-invoking subtle.decrypt and clears on clearUserVaultKey", async () => {
    const {
      cacheUserVaultKey,
      clearUserVaultKey,
      encryptJournalText,
      decryptJournalText,
      peekDecryptedJournalText,
      getDecryptedCacheSize,
    } = await import("@/lib/crypto-vault");

    clearUserVaultKey();
    expect(getDecryptedCacheSize()).toBe(0);

    const userId = "88888888-4444-4444-8888-121212121212";
    await cacheUserVaultKey(userId, "FastVaultPassword!2026");

    const plainText = "Smooth 120fps performance across Desktop, Tablet, and Mobile.";
    const cipherText = await encryptJournalText(plainText, userId);

    // Before first decrypt, synchronous peek returns empty string (never raw ciphertext)
    expect(peekDecryptedJournalText(cipherText, userId)).toBe("");

    const decryptSpy = vi.spyOn(globalThis.crypto.subtle, "decrypt");
    try {
      // 1st call invokes WebCrypto subtle.decrypt and populates decryptedTextCache
      const firstRead = await decryptJournalText(cipherText, userId);
      expect(firstRead).toBe(plainText);
      expect(decryptSpy).toHaveBeenCalledTimes(1);
      expect(getDecryptedCacheSize()).toBe(1);

      // Synchronous peek now resolves immediately in O(1)
      expect(peekDecryptedJournalText(cipherText, userId)).toBe(plainText);

      // 2nd and 3rd calls resolve in O(1) from memory without calling subtle.decrypt again
      const secondRead = await decryptJournalText(cipherText, userId);
      const thirdRead = await decryptJournalText(cipherText, userId);
      expect(secondRead).toBe(plainText);
      expect(thirdRead).toBe(plainText);
      expect(decryptSpy).toHaveBeenCalledTimes(1);

      // Clearing the vault purges decryptedTextCache
      clearUserVaultKey();
      expect(getDecryptedCacheSize()).toBe(0);
      expect(peekDecryptedJournalText(cipherText, userId)).toBe("");
    } finally {
      decryptSpy.mockRestore();
      clearUserVaultKey();
    }
  });

  it("isolates decryptedTextCache strictly by userId and triggers onVaultCleared listeners on sign-out", async () => {
    const {
      cacheUserVaultKey,
      clearUserVaultKey,
      encryptJournalText,
      decryptJournalText,
      peekDecryptedJournalText,
      onVaultCleared,
    } = await import("@/lib/crypto-vault");

    clearUserVaultKey();
    const userA = "aaaa1111-2222-3333-4444-555555555555";
    const userB = "bbbb1111-2222-3333-4444-555555555555";

    await cacheUserVaultKey(userA, "UserAPass123!");
    const secretA = "User A private journal entry";
    const cipherA = await encryptJournalText(secretA, userA);

    expect(await decryptJournalText(cipherA, userA)).toBe(secretA);
    expect(peekDecryptedJournalText(cipherA, userA)).toBe(secretA);

    // User B must never hit User A's cached plaintext even with the exact same ciphertext string
    expect(peekDecryptedJournalText(cipherA, userB)).toBe("");
    expect(await decryptJournalText(cipherA, userB)).toBe("");

    let clearNotified = 0;
    const unsubscribe = onVaultCleared(() => {
      clearNotified += 1;
    });

    clearUserVaultKey();
    expect(clearNotified).toBe(1);
    expect(peekDecryptedJournalText(cipherA, userA)).toBe("");
    unsubscribe();
  });
});

describe("Anonymous Community Board & Anti-Cheat Engine (leaderboard.ts & Middleware)", () => {
  it("validates bilingual anonymous aliases safely and rejects XSS or invalid lengths", async () => {
    const { ANONYMOUS_ALIAS_REGEX, normalizeAnonymousAlias } = await import(
      "@/lib/leaderboard"
    );

    expect(ANONYMOUS_ALIAS_REGEX.test(normalizeAnonymousAlias("  NileVoyager_99 "))).toBe(true);
    expect(ANONYMOUS_ALIAS_REGEX.test(normalizeAnonymousAlias("نيل_هادئ"))).toBe(true);
    expect(ANONYMOUS_ALIAS_REGEX.test("ab")).toBe(false);
    expect(ANONYMOUS_ALIAS_REGEX.test("<script>alert(1)</script>")).toBe(false);
    expect(ANONYMOUS_ALIAS_REGEX.test("user with spaces")).toBe(false);
  });

  it("caps daily consistency credit at 2 entries/day and disqualifies single-day spam from Growth ranking", async () => {
    const { computeLeaderboardMetrics, MAX_CREDITED_ENTRIES_PER_DAY } = await import(
      "@/lib/leaderboard"
    );

    const sameDaySpam = Array.from({ length: 12 }, (_, idx) => ({
      date: "2026-11-10T10:00:00.000Z",
      mood: idx < 6 ? ("Sad" as const) : ("Happy" as const),
      intensity: 80,
      tags: [],
    }));

    const metrics = computeLeaderboardMetrics(sameDaySpam);
    expect(metrics.totalRawEntries).toBe(12);
    expect(metrics.activeDays).toBe(1);
    expect(metrics.consistencyEntries).toBe(MAX_CREDITED_ENTRIES_PER_DAY);
    expect(metrics.qualifiedForGrowth).toBe(false);
  });

  it("computes genuine multi-day Life Growth improvement across >= 10 entries and >= 7 active days", async () => {
    const { computeLeaderboardMetrics } = await import("@/lib/leaderboard");

    const entries = [
      // First 5 days: stressed/sad baseline
      { date: "2026-11-01T09:00:00Z", mood: "Sad" as const, intensity: 75, tags: ["stress"] },
      { date: "2026-11-02T09:00:00Z", mood: "Frustrated" as const, intensity: 70, tags: ["work"] },
      { date: "2026-11-03T09:00:00Z", mood: "Sad" as const, intensity: 65, tags: ["tired"] },
      { date: "2026-11-04T09:00:00Z", mood: "Tired" as const, intensity: 60, tags: [] },
      { date: "2026-11-05T09:00:00Z", mood: "Tired" as const, intensity: 50, tags: [] },
      // Recent 5 days: happier/calm progress (10 days total, 12 entries)
      { date: "2026-11-06T09:00:00Z", mood: "Calm" as const, intensity: 75, tags: ["grateful"] },
      { date: "2026-11-07T09:00:00Z", mood: "Happy" as const, intensity: 80, tags: ["exercise"] },
      { date: "2026-11-08T09:00:00Z", mood: "Happy" as const, intensity: 85, tags: ["sleep"] },
      { date: "2026-11-08T20:00:00Z", mood: "Calm" as const, intensity: 85, tags: ["reading"] },
      { date: "2026-11-09T09:00:00Z", mood: "Happy" as const, intensity: 90, tags: ["family"] },
      { date: "2026-11-10T09:00:00Z", mood: "Happy" as const, intensity: 92, tags: ["nature"] },
      { date: "2026-11-10T20:00:00Z", mood: "Calm" as const, intensity: 88, tags: ["focus"] },
    ];

    const metrics = computeLeaderboardMetrics(entries);
    expect(metrics.totalRawEntries).toBe(12);
    expect(metrics.activeDays).toBe(10);
    expect(metrics.consistencyEntries).toBe(12);
    expect(metrics.qualifiedForGrowth).toBe(true);
    expect(metrics.recentWellness).toBeGreaterThan(metrics.baselineWellness);
    expect(metrics.improvementDelta).toBeGreaterThan(20);
  });

  it("blocks unauthenticated requests to /board and /api/leaderboard in middleware", async () => {
    const { middleware } = await import("@/middleware");
    const { NextRequest } = await import("next/server");

    const boardRes = await middleware(new NextRequest("http://localhost:3000/board"));
    expect(boardRes.status).toBe(307);
    expect(boardRes.headers.get("location")).toContain("/login");

    const apiRes = await middleware(new NextRequest("http://localhost:3000/api/leaderboard"));
    expect(apiRes.status).toBe(401);
  });
});








