import type { MoodType } from "@/types/mood";
import { currentLocale } from "./i18n/translations";
import {
  EMOTION_DIMENSIONS,
  DIMENSION_VALENCE,
  NEGATED_DIMENSION_MAP,
  NORMALIZED_PHRASE_MAP,
  normalizeLexiconText,
  lookupLexiconToken,
  isNegationToken,
  lookupIntensityModifier,
  getArabicPrefixCandidates,
  type EmotionDimension,
} from "./lexicon";

export type { EmotionDimension };

export interface SentimentResult {
  score: number; // -1 to 1
  wellnessIndex: number; // 0 to 100
  dominantDimension: EmotionDimension;
  dimensionScores: Record<EmotionDimension, number>;
  keywords: string[];
  insight: string;
  suggestedMood?: MoodType;
}

export interface CompositeMoodInput {
  mood: MoodType;
  intensity?: number;
  tags?: string[];
  text?: string;
  sentimentScore?: number;
  locale?: "en" | "ar";
}

export interface CompositeMoodResult {
  score: number; // -1 to 1
  wellnessIndex: number; // 0 to 100
  dominantDimension: EmotionDimension;
  dimensionScores: Record<EmotionDimension, number>;
  moodVectorContribution: number;
  traitContribution: number;
  lexiconContribution: number;
}

export interface TagCorrelation {
  tag: string;
  delta: number;
  averageScore: number;
  count: number;
  direction: "lift" | "drain" | "neutral";
}

/**
 * Deterministic Mathematical Constants (Option A)
 */
export const MOOD_BASE_CONSTANT = 0.55;
export const TRAIT_WEIGHT_CONSTANT = 0.25;
export const LEXICON_PHRASE_CONSTANT = 1.35;
export const LEXICON_TOKEN_CONSTANT = 1.0;

/**
 * 8-Dimensional Mood Base Vectors
 */
export const MOOD_BASE_VECTORS: Record<MoodType, Record<EmotionDimension, number>> = {
  Happy: {
    happy: 1.0,
    calm: 0.45,
    motivated: 0.65,
    tired: 0,
    sad: 0,
    frustrated: 0,
    anxious: 0,
    confused: 0,
  },
  Calm: {
    happy: 0.35,
    calm: 1.0,
    motivated: 0.35,
    tired: 0,
    sad: 0,
    frustrated: 0,
    anxious: 0,
    confused: 0,
  },
  Tired: {
    happy: 0,
    calm: 0.15,
    motivated: 0,
    tired: 1.0,
    sad: 0.2,
    frustrated: 0.15,
    anxious: 0.15,
    confused: 0.25,
  },
  Sad: {
    happy: 0,
    calm: 0,
    motivated: 0,
    tired: 0.35,
    sad: 1.0,
    frustrated: 0.25,
    anxious: 0.45,
    confused: 0.3,
  },
  Frustrated: {
    happy: 0,
    calm: 0,
    motivated: 0,
    tired: 0.25,
    sad: 0.3,
    frustrated: 1.0,
    anxious: 0.55,
    confused: 0.35,
  },
};

/**
 * Trait Weights for Known Activity/Context Tags across the 8 dimensions
 */
export const TRAIT_TAG_WEIGHTS: Record<string, Partial<Record<EmotionDimension, number>>> = {
  work: { motivated: 0.45, tired: 0.3, anxious: 0.25 },
  family: { happy: 0.6, calm: 0.55 },
  health: { calm: 0.5, motivated: 0.5, happy: 0.35 },
  exercise: { motivated: 0.85, happy: 0.6, calm: 0.3 },
  sleep: { calm: 0.75, happy: 0.35 },
  social: { happy: 0.7, calm: 0.3 },
  friends: { happy: 0.75, calm: 0.35 },
  creative: { motivated: 0.75, happy: 0.5 },
  learning: { motivated: 0.75, calm: 0.2 },
  study: { motivated: 0.55, tired: 0.25, confused: 0.15 },
  stress: { anxious: 0.85, frustrated: 0.65, tired: 0.35 },
  gratitude: { happy: 0.9, calm: 0.7 },
  prayer: { calm: 0.9, happy: 0.55 },
  relaxing: { calm: 0.9, happy: 0.4 },
  anxiety: { anxious: 0.95, confused: 0.35 },
  motivation: { motivated: 0.95, happy: 0.45 },
};

function createEmptyDimensionScores(): Record<EmotionDimension, number> {
  return {
    happy: 0,
    calm: 0,
    motivated: 0,
    tired: 0,
    sad: 0,
    frustrated: 0,
    anxious: 0,
    confused: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getDimensionLabel(
  dimension: EmotionDimension,
  locale: "en" | "ar" = currentLocale
): string {
  const isAr = locale === "ar";
  const labels: Record<EmotionDimension, { en: string; ar: string }> = {
    happy: { en: "Happy", ar: "سعيد" },
    calm: { en: "Calm", ar: "هادئ" },
    motivated: { en: "Motivated", ar: "متحفز" },
    tired: { en: "Tired", ar: "متعب" },
    sad: { en: "Sad", ar: "حزين" },
    frustrated: { en: "Frustrated", ar: "محبط" },
    anxious: { en: "Anxious", ar: "قلق" },
    confused: { en: "Confused", ar: "مشوش" },
  };
  return isAr ? labels[dimension].ar : labels[dimension].en;
}

function getDominantDimension(scores: Record<EmotionDimension, number>): EmotionDimension {
  let best: EmotionDimension = "calm";
  let bestVal = -1;
  for (const dim of EMOTION_DIMENSIONS) {
    if (scores[dim] > bestVal) {
      bestVal = scores[dim];
      best = dim;
    }
  }
  return bestVal > 0 ? best : "calm";
}

function suggestMoodFromAnalysis(
  score: number,
  dimensionScores: Record<EmotionDimension, number>,
  dominantDimension: EmotionDimension
): MoodType {
  // Severe negative blend with sad component prioritizes Sad
  if (score < -0.6 && dimensionScores.sad > 0) {
    return "Sad";
  }

  switch (dominantDimension) {
    case "happy":
    case "motivated":
      return score > 0.25 ? "Happy" : "Calm";
    case "calm":
      return score > 0.68 ? "Happy" : "Calm";
    case "tired":
      if (score < -0.6 && dimensionScores.sad > 0) return "Sad";
      return "Tired";
    case "sad":
      return "Sad";
    case "frustrated":
      return "Frustrated";
    case "anxious":
    case "confused":
      if (dimensionScores.sad > dimensionScores.frustrated && score < -0.5) {
        return "Sad";
      }
      return score < -0.15 ? "Frustrated" : "Tired";
  }
}

function buildSentimentInsight(
  score: number,
  dominantDimension: EmotionDimension,
  isArabic: boolean
): string {
  const dimLabel = getDimensionLabel(dominantDimension, isArabic ? "ar" : "en");

  if (isArabic) {
    if (score > 0.5) {
      return `مشاعر إيجابية رائعة! يغلب على كلماتك طابع ${dimLabel} والامتنان.`;
    }
    if (score > 0.2) {
      return `إيجابي بشكل عام؛ تعكس تدوينتك حالة ${dimLabel} وتوازناً نفسياً جيداً.`;
    }
    if (score > -0.2) {
      return `مشاعر متوازنة وهادئة؛ يميل النمط الحالي نحو ${dimLabel}.`;
    }
    if (score > -0.5) {
      return `تظهر علامات ${dimLabel} خفيفة؛ قد يفيدك بعض الراحة والتنفس الهادئ.`;
    }
    return `تم رصد مشاعر ${dimLabel} قوية؛ تذكر أن التمهل أو التحدث مع شخص تثق به قد يخفف عنك.`;
  }

  if (score > 0.5) {
    return `Very positive vibes! Your words strongly reflect a ${dimLabel.toLowerCase()} and uplifted state.`;
  }
  if (score > 0.2) {
    return `Generally positive — your reflection leans ${dimLabel.toLowerCase()} with steady emotional balance.`;
  }
  if (score > -0.2) {
    return `Balanced emotions detected, leaning gently toward ${dimLabel.toLowerCase()}.`;
  }
  if (score > -0.5) {
    return `Some ${dimLabel.toLowerCase()} feelings surfaced. Consider gentle self-care or a brief pause.`;
  }
  return `Heavy ${dimLabel.toLowerCase()} emotions detected. Taking a mindful breath or reaching out for support may help.`;
}

interface TextLexiconAnalysis {
  score: number;
  dimensionScores: Record<EmotionDimension, number>;
  keywords: string[];
  matchCount: number;
  signedValenceSum: number;
  totalMagnitude: number;
}

const textLexiconCache = new Map<string, TextLexiconAnalysis>();
const MAX_LEXICON_CACHE_SIZE = 500;

function analyzeTextLexicon(text: string): TextLexiconAnalysis {
  const cached = textLexiconCache.get(text);
  if (cached) return cached;

  const normalized = normalizeLexiconText(text);
  if (!normalized) {
    return {
      score: 0,
      dimensionScores: createEmptyDimensionScores(),
      keywords: [],
      matchCount: 0,
      signedValenceSum: 0,
      totalMagnitude: 0,
    };
  }

  const tokens = normalized.split(" ").filter(Boolean);
  const consumed = new Array<boolean>(tokens.length).fill(false);
  const dimensionScores = createEmptyDimensionScores();
  const foundKeywords: string[] = [];

  let signedValenceSum = 0;
  let totalMagnitude = 0;
  let matchCount = 0;

  const inspectContext = (
    startIndex: number,
    endIndex: number,
    skipSelfNegation: boolean
  ): { isNegated: boolean; multiplier: number } => {
    let isNegated = false;
    let multiplier = 1.0;

    if (!skipSelfNegation) {
      for (let offset = 1; offset <= 2; offset++) {
        const prevIndex = startIndex - offset;
        if (prevIndex >= 0) {
          const prev = tokens[prevIndex];
          if (isNegationToken(prev)) {
            isNegated = !isNegated;
          }
          const mod = lookupIntensityModifier(prev);
          if (mod !== undefined) {
            multiplier *= mod;
          }
        }
      }
    } else if (startIndex - 1 >= 0) {
      const mod = lookupIntensityModifier(tokens[startIndex - 1]);
      if (mod !== undefined) {
        multiplier *= mod;
      }
    }

    // Look ahead 1 token for trailing Arabic/English intensifiers (e.g. "مبسوط أوي", "تعبان جدا")
    const nextIndex = endIndex + 1;
    if (nextIndex < tokens.length) {
      const mod = lookupIntensityModifier(tokens[nextIndex]);
      if (mod !== undefined) {
        multiplier *= mod;
      }
    }

    return { isNegated, multiplier };
  };

  // 1. Greedy longest-first multi-word phrase matching (supporting Arabic prefix on first phrase token like وشديت حيلي)
  for (let i = 0; i < tokens.length; i++) {
    if (consumed[i]) continue;
    const firstTokenCandidates = getArabicPrefixCandidates(tokens[i]);

    for (const phrase of NORMALIZED_PHRASE_MAP) {
      const len = phrase.tokens.length;
      if (i + len > tokens.length) continue;

      if (!firstTokenCandidates.includes(phrase.tokens[0])) continue;

      let allMatch = true;
      for (let j = 1; j < len; j++) {
        if (consumed[i + j] || tokens[i + j] !== phrase.tokens[j]) {
          allMatch = false;
          break;
        }
      }

      if (allMatch) {
        for (let j = 0; j < len; j++) {
          consumed[i + j] = true;
        }

        const { isNegated, multiplier } = inspectContext(
          i,
          i + len - 1,
          phrase.startsWithNegation
        );

        let effectiveDim = phrase.dimension;
        let valence = DIMENSION_VALENCE[effectiveDim];
        let magnitude = phrase.weight * LEXICON_PHRASE_CONSTANT * multiplier;

        if (isNegated) {
          effectiveDim = NEGATED_DIMENSION_MAP[phrase.dimension];
          valence = valence > 0 ? -Math.abs(valence) * 0.85 : 0.65;
          magnitude *= 0.9;
        }

        dimensionScores[effectiveDim] += magnitude;
        signedValenceSum += valence * magnitude;
        totalMagnitude += magnitude;
        matchCount += 1;
        foundKeywords.push(phrase.originalTerm);
        break;
      }
    }
  }

  // 2. Single-token lexicon matching on remaining unconsumed tokens
  for (let i = 0; i < tokens.length; i++) {
    if (consumed[i]) continue;
    const token = tokens[i];
    const match = lookupLexiconToken(token);
    if (!match) continue;

    const { isNegated, multiplier } = inspectContext(i, i, false);
    let effectiveDim = match.dimension;
    let valence = DIMENSION_VALENCE[effectiveDim];
    let magnitude = match.weight * LEXICON_TOKEN_CONSTANT * multiplier;

    if (isNegated) {
      effectiveDim = NEGATED_DIMENSION_MAP[match.dimension];
      valence = valence > 0 ? -Math.abs(valence) * 0.85 : 0.65;
      magnitude *= 0.9;
    }

    dimensionScores[effectiveDim] += magnitude;
    signedValenceSum += valence * magnitude;
    totalMagnitude += magnitude;
    matchCount += 1;
    foundKeywords.push(token);
  }

  let score = 0;
  if (totalMagnitude > 0) {
    score = clamp(signedValenceSum / totalMagnitude, -1, 1);
  }

  const result: TextLexiconAnalysis = {
    score: round2(score),
    dimensionScores,
    keywords: [...new Set(foundKeywords)].slice(0, 6),
    matchCount,
    signedValenceSum,
    totalMagnitude,
  };
  if (textLexiconCache.size >= MAX_LEXICON_CACHE_SIZE) {
    const oldest = textLexiconCache.keys().next().value;
    if (oldest !== undefined) textLexiconCache.delete(oldest);
  }
  textLexiconCache.set(text, result);
  return result;
}

/**
 * Option A Deterministic Mathematical Trait & Massive Lexicon Sentiment Analyzer.
 */
export function analyzeSentiment(
  text: string,
  locale?: "en" | "ar",
  options?: { mood?: MoodType; intensity?: number; tags?: string[] }
): SentimentResult {
  const effectiveLocale = locale || currentLocale;
  const isArabic = effectiveLocale === "ar";
  const hasOptions = Boolean(options?.mood);

  if ((!text || !text.trim()) && !hasOptions) {
    return {
      score: 0,
      wellnessIndex: 50,
      dominantDimension: "calm",
      dimensionScores: createEmptyDimensionScores(),
      keywords: [],
      insight: isArabic
        ? "لا يوجد نص كافٍ للتحليل بعد."
        : "No text provided for sentiment analysis.",
      suggestedMood: "Calm",
    };
  }

  const textAnalysis = analyzeTextLexicon(text || "");

  if (hasOptions && options?.mood) {
    const composite = computeCompositeMoodScore({
      mood: options.mood,
      intensity: options.intensity,
      tags: options.tags,
      text,
      locale: effectiveLocale,
    });
    return {
      score: composite.score,
      wellnessIndex: composite.wellnessIndex,
      dominantDimension: composite.dominantDimension,
      dimensionScores: composite.dimensionScores,
      keywords: textAnalysis.keywords,
      insight: buildSentimentInsight(
        composite.score,
        composite.dominantDimension,
        isArabic
      ),
      suggestedMood: suggestMoodFromAnalysis(
        composite.score,
        composite.dimensionScores,
        composite.dominantDimension
      ),
    };
  }

  const roundedDimensions = createEmptyDimensionScores();
  for (const dim of EMOTION_DIMENSIONS) {
    roundedDimensions[dim] = round2(textAnalysis.dimensionScores[dim]);
  }

  const dominantDimension = getDominantDimension(roundedDimensions);
  const wellnessIndex = Math.round(clamp(((textAnalysis.score + 1) / 2) * 100, 0, 100));

  const suggestedMood =
    textAnalysis.matchCount > 0
      ? suggestMoodFromAnalysis(textAnalysis.score, roundedDimensions, dominantDimension)
      : "Calm";

  return {
    score: textAnalysis.score,
    wellnessIndex,
    dominantDimension,
    dimensionScores: roundedDimensions,
    keywords: textAnalysis.keywords,
    insight: buildSentimentInsight(textAnalysis.score, dominantDimension, isArabic),
    suggestedMood,
  };
}

/**
 * Deterministic Mathematical Formula:
 * Mood Base Vector * MOOD_BASE_CONSTANT * (Intensity/100)
 * + Sum(TraitWeight * TRAIT_WEIGHT_CONSTANT)
 * + Multi-word Phrase & Token Lexicon Vector
 */
export function computeCompositeMoodScore(
  input: CompositeMoodInput
): CompositeMoodResult {
  const intensity = clamp(
    typeof input.intensity === "number" ? input.intensity : 50,
    1,
    100
  );
  const baseVector = MOOD_BASE_VECTORS[input.mood] || MOOD_BASE_VECTORS.Calm;
  const dimensionScores = createEmptyDimensionScores();

  let moodSigned = 0;
  let moodMag = 0;
  for (const dim of EMOTION_DIMENSIONS) {
    const val = baseVector[dim] * MOOD_BASE_CONSTANT * (intensity / 100);
    dimensionScores[dim] += val;
    moodSigned += val * DIMENSION_VALENCE[dim];
    moodMag += val;
  }

  let traitSigned = 0;
  let traitMag = 0;
  for (const rawTag of input.tags || []) {
    const key = rawTag.trim().toLowerCase();
    const weights = TRAIT_TAG_WEIGHTS[key];
    if (!weights) continue;
    for (const [dimKey, weightVal] of Object.entries(weights)) {
      const dim = dimKey as EmotionDimension;
      const contrib = (weightVal || 0) * TRAIT_WEIGHT_CONSTANT;
      dimensionScores[dim] += contrib;
      traitSigned += contrib * DIMENSION_VALENCE[dim];
      traitMag += contrib;
    }
  }

  let lexSigned = 0;
  let lexMag = 0;
  if (input.text && input.text.trim()) {
    const textAnalysis = analyzeTextLexicon(input.text);
    const lexScale = 0.45;
    for (const dim of EMOTION_DIMENSIONS) {
      const contrib = textAnalysis.dimensionScores[dim] * lexScale;
      dimensionScores[dim] += contrib;
      lexSigned += contrib * DIMENSION_VALENCE[dim];
      lexMag += contrib;
    }
  } else if (typeof input.sentimentScore === "number" && input.sentimentScore !== 0) {
    const s = clamp(input.sentimentScore, -1, 1);
    const mag = Math.abs(s) * 0.5;
    const targetDim: EmotionDimension = s >= 0 ? "happy" : "sad";
    dimensionScores[targetDim] += mag;
    lexSigned += s * mag;
    lexMag += mag;
  }

  const totalSigned = moodSigned + traitSigned + lexSigned;
  const totalMag = moodMag + traitMag + lexMag;

  // Regularized denominator ensures intensity scaling remains monotonic even without tags/text
  const score = totalMag > 0 ? round2(clamp(totalSigned / (totalMag + 0.25), -1, 1)) : 0;
  const wellnessIndex = Math.round(clamp(((score + 1) / 2) * 100, 0, 100));

  const roundedDimensions = createEmptyDimensionScores();
  for (const dim of EMOTION_DIMENSIONS) {
    roundedDimensions[dim] = round2(dimensionScores[dim]);
  }
  const dominantDimension = getDominantDimension(roundedDimensions);

  return {
    score,
    wellnessIndex,
    dominantDimension,
    dimensionScores: roundedDimensions,
    moodVectorContribution: round2(moodSigned),
    traitContribution: round2(traitSigned),
    lexiconContribution: round2(lexSigned),
  };
}

/**
 * Computes tag correlations ("What Lifts vs. Drains Your Mood") across mood entries.
 * Evaluates each entry's mood + intensity + text sentiment without tag self-biasing.
 */
export function computeTagCorrelations(
  entries: Array<{
    mood: MoodType;
    intensity?: number;
    tags?: string[];
    text?: string;
    sentiment?: { score: number };
  }>
): TagCorrelation[] {
  if (!entries || entries.length === 0) return [];

  const entryScores = entries.map((entry) => {
    const composite = computeCompositeMoodScore({
      mood: entry.mood,
      intensity: entry.intensity,
      tags: [], // Omit tags here so we correlate tag presence against mood outcome cleanly
      text: entry.text,
      sentimentScore: entry.sentiment?.score,
    });
    return {
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      wellness: composite.wellnessIndex,
    };
  });

  const tagMap = new Map<string, { sum: number; count: number }>();
  for (const item of entryScores) {
    const seenInEntry = new Set<string>();
    for (const rawTag of item.tags) {
      const trimmed = rawTag.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (seenInEntry.has(lower)) continue;
      seenInEntry.add(lower);

      const existing = tagMap.get(trimmed) || { sum: 0, count: 0 };
      existing.sum += item.wellness;
      existing.count += 1;
      tagMap.set(trimmed, existing);
    }
  }

  const correlations: TagCorrelation[] = [];

  for (const [tag, stats] of tagMap.entries()) {
    const avgWith = stats.sum / stats.count;
    const without = entryScores.filter(
      (e) => !e.tags.some((t) => t.trim().toLowerCase() === tag.toLowerCase())
    );
    const baseline =
      without.length > 0
        ? without.reduce((acc, e) => acc + e.wellness, 0) / without.length
        : 50;

    const delta = Math.round(avgWith - baseline);
    const direction: "lift" | "drain" | "neutral" =
      delta > 0 ? "lift" : delta < 0 ? "drain" : "neutral";

    correlations.push({
      tag,
      delta,
      averageScore: Math.round(avgWith),
      count: stats.count,
      direction,
    });
  }

  return correlations.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function generateWeeklyInsight(
  entries: {
    mood: MoodType;
    date: string;
    intensity?: number;
    tags?: string[];
    text?: string;
    sentiment?: { score: number };
  }[],
  locale?: "en" | "ar"
): string {
  const isArabic = (locale || currentLocale) === "ar";

  if (entries.length === 0) {
    return isArabic
      ? "ابدأ التتبع لرؤية تحليلات حول أسبوعك!"
      : "Start tracking to see insights about your week!";
  }

  const moodNamesAr: Record<MoodType, string> = {
    Happy: "سعيد",
    Calm: "هادئ",
    Sad: "حزين",
    Frustrated: "محبط",
    Tired: "متعب",
  };

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setHours(0, 0, 0, 0);
  weekAgo.setDate(now.getDate() - 6);
  const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, "0")}-${String(weekAgo.getDate()).padStart(2, "0")}`;

  const thisWeek = entries.filter((e) => e.date >= weekAgoStr);

  if (thisWeek.length === 0) {
    return isArabic
      ? "لا توجد إدخالات هذا الأسبوع. استمر في التتبع!"
      : "No entries this week yet. Keep tracking!";
  }

  let totalWellness = 0;
  const moodCounts: Record<MoodType, number> = {
    Happy: 0,
    Calm: 0,
    Sad: 0,
    Frustrated: 0,
    Tired: 0,
  };

  thisWeek.forEach((e) => {
    if (moodCounts[e.mood] !== undefined) moodCounts[e.mood]++;
    const comp = computeCompositeMoodScore({
      mood: e.mood,
      intensity: e.intensity,
      tags: e.tags,
      text: e.text,
      sentimentScore: e.sentiment?.score,
      locale: isArabic ? "ar" : "en",
    });
    totalWellness += comp.wellnessIndex;
  });

  const avgWellness = Math.round(totalWellness / thisWeek.length);
  const dominantMood = Object.entries(moodCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0] as MoodType;
  const dominantMoodAr = moodNamesAr[dominantMood] || "متوازن";

  if (avgWellness >= 72) {
    return isArabic
      ? `أسبوع رائع بمؤشر عافية ${avgWellness} من ١٠٠! كنت تشعر بـ${dominantMoodAr} في الغالب. استمر في هذا التقدم!`
      : `This week has been wonderful with a ${avgWellness}/100 wellness index! You reported ${dominantMood.toLowerCase()} most often.`;
  }
  if (avgWellness >= 52) {
    return isArabic
      ? `أسبوع متوازن بمؤشر عافية ${avgWellness} من ١٠٠. كان شعورك المعتاد هو ${dominantMoodAr}. كيف يمكنك تعزيز طاقتك في الأسبوع القادم؟`
      : `A steady week overall with a ${avgWellness}/100 wellness index. ${dominantMood} has been your typical mood.`;
  }
  if (avgWellness >= 34) {
    return isArabic
      ? `شهد هذا الأسبوع بعض التحديات بمؤشر عافية ${avgWellness} من ١٠٠، وشعرت بـ${dominantMoodAr} في الغالب. تذكر أن تمنح نفسك مساحة للراحة.`
      : `This week brought some challenges (${avgWellness}/100 wellness index), with ${dominantMood.toLowerCase()} showing up most. Give yourself gentle rest.`;
  }
  return isArabic
    ? `يبدو أن هذا الأسبوع كان ثقيلاً بمؤشر عافية ${avgWellness} من ١٠٠ مع تكرار شعور ${dominantMoodAr}. فكر في طلب الدعم أو ممارسة التنفس الهادئ.`
    : `This was a demanding week (${avgWellness}/100 wellness index) with frequent ${dominantMood.toLowerCase()} moments. Consider leaning on support when needed.`;
}
