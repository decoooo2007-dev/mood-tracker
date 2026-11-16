/**
 * Massive Multi-Lingual Emotional Lexicon (Option A)
 *
 * Covers 8 emotional dimensions across:
 * 1. English (standard, idiomatic, everyday expressions)
 * 2. Modern Standard Arabic (الفصحى)
 * 3. Egyptian Colloquial Arabic (العامية المصرية)
 */

export type EmotionDimension =
  | "happy"
  | "calm"
  | "motivated"
  | "tired"
  | "sad"
  | "frustrated"
  | "anxious"
  | "confused";

export const EMOTION_DIMENSIONS: readonly EmotionDimension[] = [
  "happy",
  "calm",
  "motivated",
  "tired",
  "sad",
  "frustrated",
  "anxious",
  "confused",
] as const;

export interface LexiconEntry {
  term: string;
  dimension: EmotionDimension;
  weight: number;
}

export interface NormalizedLexiconMatch {
  dimension: EmotionDimension;
  weight: number;
  originalTerm: string;
}

/**
 * Valence polarity of each of the 8 emotional dimensions on [-1, 1].
 */
export const DIMENSION_VALENCE: Record<EmotionDimension, number> = {
  happy: 1.0,
  motivated: 0.95,
  calm: 0.8,
  tired: -0.45,
  confused: -0.5,
  anxious: -0.75,
  sad: -0.85,
  frustrated: -0.9,
};

/**
 * Counterpart dimension when a word/phrase in a given dimension is negated.
 */
export const NEGATED_DIMENSION_MAP: Record<EmotionDimension, EmotionDimension> = {
  happy: "sad",
  calm: "anxious",
  motivated: "frustrated",
  tired: "calm",
  sad: "calm",
  frustrated: "calm",
  anxious: "calm",
  confused: "calm",
};

/**
 * Normalizes Arabic letters (أ/إ/آ -> ا, ة -> ه, ى -> ي), strips diacritics & tatweel,
 * and lowercases Latin text while keeping apostrophes.
 */
export function normalizeLexiconText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Collapses elongated repetitions (e.g. مبسووووط -> مبسوط, happyyyy -> happy).
 */
export function collapseElongationCandidates(token: string): string[] {
  if (!/(.)\1{2,}/u.test(token)) return [token];
  const single = token.replace(/(.)\1{2,}/gu, "$1");
  const doubled = token.replace(/(.)\1{2,}/gu, "$1$1");
  return single === doubled ? [single] : [single, doubled];
}

const ARABIC_PREFIXES = [
  "وبال",
  "فبال",
  "وكال",
  "ولل",
  "فلل",
  "وال",
  "بال",
  "فال",
  "كال",
  "وب",
  "وف",
  "وك",
  "ول",
  "فب",
  "فل",
  "ال",
  "لل",
  "و",
  "ب",
  "ف",
  "ك",
  "ل",
] as const;

/**
 * Generates candidate stems using Arabic morphological prefix stripping.
 */
export function getArabicPrefixCandidates(token: string): string[] {
  const candidates: string[] = [token];
  for (const el of collapseElongationCandidates(token)) {
    if (!candidates.includes(el)) candidates.push(el);
  }

  for (const base of [...candidates]) {
    for (const prefix of ARABIC_PREFIXES) {
      if (base.startsWith(prefix) && base.length - prefix.length >= 2) {
        const stem = base.slice(prefix.length);
        if (!candidates.includes(stem)) {
          candidates.push(stem);
        }
      }
    }
  }
  return candidates;
}

/**
 * Negation triggers (EN + MSA + Egyptian Arabic).
 */
export const NEGATION_WORDS = new Set<string>(
  [
    // English
    "not", "never", "no", "none", "neither", "nor", "without", "hardly", "barely",
    "don't", "dont", "doesn't", "doesnt", "didn't", "didnt",
    "can't", "cant", "cannot", "couldn't", "couldnt",
    "isn't", "isnt", "aren't", "arent", "wasn't", "wasnt", "weren't", "werent",
    "won't", "wont", "wouldn't", "wouldnt", "haven't", "havent", "hasn't", "hasnt",
    // MSA
    "لا", "ليس", "ليست", "لست", "لسنا", "لم", "لن", "غير", "بدون", "بلا", "عدم",
    // Egyptian Colloquial
    "مش", "ما", "مفيش", "مافيش", "مبقاش", "مبقتش", "مابقتش", "مابقاش",
    "معدش", "معدتش", "ماعدش", "ماعدتش", "معنديش", "ماعنديش",
    "ماليش", "مليش", "عمري", "عمرى", "بلاش",
  ].map(normalizeLexiconText)
);

/**
 * Intensity modifiers (amplifiers & diminishers across EN + MSA + Egyptian Arabic).
 */
export const INTENSITY_MODIFIERS: Record<string, number> = Object.fromEntries(
  Object.entries({
    // English amplifiers
    "extremely": 1.75,
    "incredibly": 1.7,
    "unbelievably": 1.65,
    "utterly": 1.65,
    "completely": 1.6,
    "totally": 1.55,
    "deeply": 1.5,
    "very": 1.45,
    "really": 1.35,
    "super": 1.4,
    "truly": 1.35,
    "so": 1.25,
    "quite": 1.15,
    // English diminishers
    "slightly": 0.55,
    "somewhat": 0.65,
    "kinda": 0.7,
    "mildly": 0.6,
    "little": 0.65,
    // MSA amplifiers & diminishers
    "للغاية": 1.75,
    "بشدة": 1.6,
    "جداً": 1.5,
    "جدا": 1.5,
    "كثيراً": 1.45,
    "كثيرا": 1.45,
    "تماماً": 1.55,
    "تماما": 1.55,
    "قليلاً": 0.6,
    "قليلا": 0.6,
    "نسبياً": 0.7,
    "نسبيا": 0.7,
    // Egyptian Colloquial amplifiers & diminishers
    "أوي": 1.55,
    "اوي": 1.55,
    "خالص": 1.6,
    "قوي": 1.5,
    "كتير": 1.4,
    "بجد": 1.35,
    "موت": 1.65,
    "جداا": 1.65,
    "شوية": 0.6,
    "شويه": 0.6,
    "حبة": 0.65,
    "حبه": 0.65,
  }).map(([k, v]) => [normalizeLexiconText(k), v])
);

/**
 * Multi-word phrases (longest matches checked before single tokens).
 */
export const PHRASE_LEXICON: LexiconEntry[] = [
  // ==================== HAPPY (PHRASES) ====================
  { term: "on cloud nine", dimension: "happy", weight: 1.7 },
  { term: "over the moon", dimension: "happy", weight: 1.7 },
  { term: "best day ever", dimension: "happy", weight: 1.7 },
  { term: "made my day", dimension: "happy", weight: 1.55 },
  { term: "so grateful", dimension: "happy", weight: 1.5 },
  { term: "feeling blessed", dimension: "happy", weight: 1.55 },
  { term: "full of joy", dimension: "happy", weight: 1.6 },
  { term: "really happy", dimension: "happy", weight: 1.55 },
  { term: "super happy", dimension: "happy", weight: 1.65 },
  { term: "good vibes", dimension: "happy", weight: 1.35 },
  { term: "great mood", dimension: "happy", weight: 1.45 },
  { term: "الحمد لله", dimension: "happy", weight: 1.55 },
  { term: "الشكر لله", dimension: "happy", weight: 1.45 },
  { term: "سعيد جدا", dimension: "happy", weight: 1.65 },
  { term: "فرحان اوي", dimension: "happy", weight: 1.65 },
  { term: "مبسوط اوي", dimension: "happy", weight: 1.65 },
  { term: "مبسوطة اوي", dimension: "happy", weight: 1.65 },
  { term: "زي الفل", dimension: "happy", weight: 1.55 },
  { term: "فل الفل", dimension: "happy", weight: 1.55 },
  { term: "تمام التمام", dimension: "happy", weight: 1.5 },
  { term: "مية مية", dimension: "happy", weight: 1.5 },
  { term: "ميه ميه", dimension: "happy", weight: 1.5 },
  { term: "طاير من الفرحة", dimension: "happy", weight: 1.75 },
  { term: "طايرة من الفرحة", dimension: "happy", weight: 1.75 },
  { term: "فرحتي متتوصفش", dimension: "happy", weight: 1.75 },
  { term: "قلبي طاير", dimension: "happy", weight: 1.6 },
  { term: "يا سلام", dimension: "happy", weight: 1.35 },
  { term: "احلى يوم", dimension: "happy", weight: 1.6 },
  { term: "يوم جميل", dimension: "happy", weight: 1.45 },
  { term: "يوم حلو", dimension: "happy", weight: 1.45 },
  { term: "فضل ونعمة", dimension: "happy", weight: 1.55 },
  { term: "ربنا كرمني", dimension: "happy", weight: 1.6 },
  { term: "نفسيتي حلوة", dimension: "happy", weight: 1.55 },
  { term: "دماغي عالية", dimension: "happy", weight: 1.4 },
  { term: "كله تمام", dimension: "happy", weight: 1.35 },
  { term: "خير وبركة", dimension: "happy", weight: 1.45 },
  { term: "الحياة حلوة", dimension: "happy", weight: 1.55 },
  { term: "بضحك من قلبي", dimension: "happy", weight: 1.6 },
  { term: "مرتاح نفسيا", dimension: "happy", weight: 1.45 },
  { term: "عالي العال", dimension: "happy", weight: 1.55 },
  { term: "في السما", dimension: "happy", weight: 1.5 },
  { term: "فوق السحاب", dimension: "happy", weight: 1.6 },
  { term: "في احسن حال", dimension: "happy", weight: 1.55 },
  { term: "ولا اروع", dimension: "happy", weight: 1.55 },
  { term: "مزاجي عنب", dimension: "happy", weight: 1.55 },
  { term: "زي القمر", dimension: "happy", weight: 1.45 },
  { term: "فرحان موت", dimension: "happy", weight: 1.7 },
  { term: "مبسوط على الاخر", dimension: "happy", weight: 1.7 },
  { term: "فوق الريح", dimension: "happy", weight: 1.55 },

  // ==================== CALM (PHRASES) ====================
  { term: "at peace", dimension: "calm", weight: 1.55 },
  { term: "peace of mind", dimension: "calm", weight: 1.6 },
  { term: "deep breath", dimension: "calm", weight: 1.25 },
  { term: "slow down", dimension: "calm", weight: 1.15 },
  { term: "feeling grounded", dimension: "calm", weight: 1.45 },
  { term: "inner peace", dimension: "calm", weight: 1.6 },
  { term: "calm focus", dimension: "calm", weight: 1.45 },
  { term: "quiet mind", dimension: "calm", weight: 1.5 },
  { term: "سلام داخلي", dimension: "calm", weight: 1.6 },
  { term: "راحة بال", dimension: "calm", weight: 1.6 },
  { term: "راحة البال", dimension: "calm", weight: 1.6 },
  { term: "صافي الذهن", dimension: "calm", weight: 1.5 },
  { term: "دماغي صافية", dimension: "calm", weight: 1.5 },
  { term: "مرتاح البال", dimension: "calm", weight: 1.55 },
  { term: "في روقان", dimension: "calm", weight: 1.55 },
  { term: "على روقان", dimension: "calm", weight: 1.45 },
  { term: "روقان بال", dimension: "calm", weight: 1.55 },
  { term: "البال مرتاح", dimension: "calm", weight: 1.55 },
  { term: "مزاجي رايق", dimension: "calm", weight: 1.5 },
  { term: "مزاجي هادي", dimension: "calm", weight: 1.45 },
  { term: "رايق اوي", dimension: "calm", weight: 1.55 },
  { term: "نفسيتي مرتاحة", dimension: "calm", weight: 1.5 },
  { term: "نفسيتي هادية", dimension: "calm", weight: 1.5 },
  { term: "مهدي اعصابي", dimension: "calm", weight: 1.4 },
  { term: "واخد نفسي", dimension: "calm", weight: 1.25 },
  { term: "الدنيا هادية", dimension: "calm", weight: 1.4 },
  { term: "مفيش ضغط", dimension: "calm", weight: 1.35 },
  { term: "حاسس بسلام", dimension: "calm", weight: 1.5 },
  { term: "حاسس بامان", dimension: "calm", weight: 1.45 },
  { term: "دماغي رايقة", dimension: "calm", weight: 1.55 },
  { term: "البال رايق", dimension: "calm", weight: 1.55 },
  { term: "مريح دماغي", dimension: "calm", weight: 1.45 },
  { term: "على الهادي", dimension: "calm", weight: 1.4 },
  { term: "اعصابي هادية", dimension: "calm", weight: 1.5 },
  { term: "صافي البال", dimension: "calm", weight: 1.55 },

  // ==================== MOTIVATED (PHRASES) ====================
  { term: "in the zone", dimension: "motivated", weight: 1.55 },
  { term: "locked in", dimension: "motivated", weight: 1.5 },
  { term: "crushing it", dimension: "motivated", weight: 1.6 },
  { term: "got it done", dimension: "motivated", weight: 1.45 },
  { term: "ready to go", dimension: "motivated", weight: 1.4 },
  { term: "fired up", dimension: "motivated", weight: 1.55 },
  { term: "proud of myself", dimension: "motivated", weight: 1.55 },
  { term: "making progress", dimension: "motivated", weight: 1.45 },
  { term: "never give up", dimension: "motivated", weight: 1.45 },
  { term: "شديت حيلي", dimension: "motivated", weight: 1.65 },
  { term: "كسرت الدنيا", dimension: "motivated", weight: 1.75 },
  { term: "مكسر الدنيا", dimension: "motivated", weight: 1.7 },
  { term: "قدها وقدود", dimension: "motivated", weight: 1.65 },
  { term: "داخل بقلب جامد", dimension: "motivated", weight: 1.55 },
  { term: "طاقتي عالية", dimension: "motivated", weight: 1.55 },
  { term: "همة عالية", dimension: "motivated", weight: 1.55 },
  { term: "بداية قوية", dimension: "motivated", weight: 1.5 },
  { term: "عندي طاقة", dimension: "motivated", weight: 1.45 },
  { term: "عندي شغف", dimension: "motivated", weight: 1.5 },
  { term: "عندي هدف", dimension: "motivated", weight: 1.4 },
  { term: "حاطط هدف", dimension: "motivated", weight: 1.4 },
  { term: "مش هستسلم", dimension: "motivated", weight: 1.55 },
  { term: "خلصت الشغل", dimension: "motivated", weight: 1.45 },
  { term: "عملت انجاز", dimension: "motivated", weight: 1.6 },
  { term: "فخور بنفسي", dimension: "motivated", weight: 1.6 },
  { term: "فخورة بنفسي", dimension: "motivated", weight: 1.6 },
  { term: "مركز جدا", dimension: "motivated", weight: 1.45 },
  { term: "دماغي شغالة", dimension: "motivated", weight: 1.35 },
  { term: "في المود", dimension: "motivated", weight: 1.35 },
  { term: "تحدي جديد", dimension: "motivated", weight: 1.35 },
  { term: "شد حيلك", dimension: "motivated", weight: 1.5 },
  { term: "هنكسر الدنيا", dimension: "motivated", weight: 1.7 },
  { term: "طاقة ايجابية", dimension: "motivated", weight: 1.55 },
  { term: "انجاز كبير", dimension: "motivated", weight: 1.6 },
  { term: "خطوة لقدام", dimension: "motivated", weight: 1.4 },
  { term: "قد التحدي", dimension: "motivated", weight: 1.55 },
  { term: "شغال تمام", dimension: "motivated", weight: 1.35 },

  // ==================== TIRED (PHRASES) ====================
  { term: "burned out", dimension: "tired", weight: 1.65 },
  { term: "burnt out", dimension: "tired", weight: 1.65 },
  { term: "burn out", dimension: "tired", weight: 1.6 },
  { term: "running on empty", dimension: "tired", weight: 1.6 },
  { term: "worn out", dimension: "tired", weight: 1.5 },
  { term: "wiped out", dimension: "tired", weight: 1.55 },
  { term: "no energy", dimension: "tired", weight: 1.5 },
  { term: "out of energy", dimension: "tired", weight: 1.55 },
  { term: "low battery", dimension: "tired", weight: 1.45 },
  { term: "need sleep", dimension: "tired", weight: 1.35 },
  { term: "can barely stay awake", dimension: "tired", weight: 1.5 },
  { term: "فصلت شحن", dimension: "tired", weight: 1.65 },
  { term: "فصلت خالص", dimension: "tired", weight: 1.6 },
  { term: "فاصل شحن", dimension: "tired", weight: 1.6 },
  { term: "فاصل خالص", dimension: "tired", weight: 1.55 },
  { term: "بطاريتي فضيت", dimension: "tired", weight: 1.65 },
  { term: "بطاريتى خلصت", dimension: "tired", weight: 1.65 },
  { term: "طاقتي خلصت", dimension: "tired", weight: 1.6 },
  { term: "ميت من التعب", dimension: "tired", weight: 1.7 },
  { term: "ميتة من التعب", dimension: "tired", weight: 1.7 },
  { term: "مهدود حيلي", dimension: "tired", weight: 1.6 },
  { term: "هدة حيل", dimension: "tired", weight: 1.55 },
  { term: "جسمي مكسر", dimension: "tired", weight: 1.55 },
  { term: "مش قادر", dimension: "tired", weight: 1.35 },
  { term: "مش قادرة", dimension: "tired", weight: 1.35 },
  { term: "مش بنام", dimension: "tired", weight: 1.4 },
  { term: "مفيش حيل", dimension: "tired", weight: 1.5 },
  { term: "مافيش حيل", dimension: "tired", weight: 1.5 },
  { term: "عايز انام", dimension: "tired", weight: 1.4 },
  { term: "عايزة انام", dimension: "tired", weight: 1.4 },
  { term: "محتاج انام", dimension: "tired", weight: 1.4 },
  { term: "محتاجة انام", dimension: "tired", weight: 1.4 },
  { term: "مش شايف قدامي", dimension: "tired", weight: 1.55 },
  { term: "عيني بتقفل", dimension: "tired", weight: 1.45 },
  { term: "نايم على روحي", dimension: "tired", weight: 1.5 },
  { term: "نفسي اتقطع", dimension: "tired", weight: 1.45 },
  { term: "روحي طلعت", dimension: "tired", weight: 1.55 },
  { term: "تعبان اوي", dimension: "tired", weight: 1.55 },
  { term: "تعبانة اوي", dimension: "tired", weight: 1.55 },
  { term: "هلكان اوي", dimension: "tired", weight: 1.65 },
  { term: "مفرهد خالص", dimension: "tired", weight: 1.6 },
  { term: "فاصل بطارية", dimension: "tired", weight: 1.6 },
  { term: "بطاريتي خلصت", dimension: "tired", weight: 1.65 },
  { term: "مفيش طاقة", dimension: "tired", weight: 1.55 },
  { term: "مافيش طاقة", dimension: "tired", weight: 1.55 },
  { term: "طاقتي زيرو", dimension: "tired", weight: 1.6 },
  { term: "صفر طاقة", dimension: "tired", weight: 1.6 },
  { term: "منمتش كويس", dimension: "tired", weight: 1.5 },
  { term: "مش عارف ارتاح", dimension: "tired", weight: 1.45 },
  { term: "هموت وانام", dimension: "tired", weight: 1.6 },
  { term: "سهران طول الليل", dimension: "tired", weight: 1.4 },
  { term: "عايز ارتاح", dimension: "tired", weight: 1.35 },
  { term: "عايزة ارتاح", dimension: "tired", weight: 1.35 },

  // ==================== SAD (PHRASES) ====================
  { term: "feeling down", dimension: "sad", weight: 1.4 },
  { term: "broken heart", dimension: "sad", weight: 1.65 },
  { term: "falling apart", dimension: "sad", weight: 1.6 },
  { term: "feel alone", dimension: "sad", weight: 1.5 },
  { term: "all alone", dimension: "sad", weight: 1.5 },
  { term: "miss someone", dimension: "sad", weight: 1.25 },
  { term: "want to cry", dimension: "sad", weight: 1.55 },
  { term: "broke down crying", dimension: "sad", weight: 1.7 },
  { term: "heavy heart", dimension: "sad", weight: 1.55 },
  { term: "not okay", dimension: "sad", weight: 1.35 },
  { term: "not fine", dimension: "sad", weight: 1.3 },
  { term: "قلبي واجعني", dimension: "sad", weight: 1.65 },
  { term: "قلبي وجعني", dimension: "sad", weight: 1.65 },
  { term: "نفسي مكسورة", dimension: "sad", weight: 1.65 },
  { term: "مكسور الخاطر", dimension: "sad", weight: 1.65 },
  { term: "مفيش نفس", dimension: "sad", weight: 1.45 },
  { term: "ماليش نفس", dimension: "sad", weight: 1.45 },
  { term: "فاقد الشغف", dimension: "sad", weight: 1.55 },
  { term: "فاقدة الشغف", dimension: "sad", weight: 1.55 },
  { term: "حاسس بوحدة", dimension: "sad", weight: 1.55 },
  { term: "حاسه بوحدة", dimension: "sad", weight: 1.55 },
  { term: "حاسس بفراغ", dimension: "sad", weight: 1.5 },
  { term: "ضاقت بيا", dimension: "sad", weight: 1.6 },
  { term: "الدنيا سودة", dimension: "sad", weight: 1.65 },
  { term: "الدمعة في عيني", dimension: "sad", weight: 1.6 },
  { term: "دموعي نازلة", dimension: "sad", weight: 1.65 },
  { term: "محدش حاسس بيا", dimension: "sad", weight: 1.6 },
  { term: "مخنوق اوي", dimension: "sad", weight: 1.6 },
  { term: "مخنوقة اوي", dimension: "sad", weight: 1.6 },
  { term: "زعلان اوي", dimension: "sad", weight: 1.55 },
  { term: "زعلانة اوي", dimension: "sad", weight: 1.55 },
  { term: "موجوع اوي", dimension: "sad", weight: 1.65 },
  { term: "تعبان نفسيا", dimension: "sad", weight: 1.6 },
  { term: "مليش نفس", dimension: "sad", weight: 1.45 },
  { term: "مليش مزاج", dimension: "sad", weight: 1.45 },
  { term: "ماليش مزاج", dimension: "sad", weight: 1.45 },
  { term: "نفسيتي تعبانة", dimension: "sad", weight: 1.6 },
  { term: "نفسيتي وحشة", dimension: "sad", weight: 1.6 },
  { term: "نفسيتي زفت", dimension: "sad", weight: 1.65 },
  { term: "حالتي زفت", dimension: "sad", weight: 1.6 },
  { term: "قلبي مكسور", dimension: "sad", weight: 1.65 },
  { term: "الدنيا ضيقة", dimension: "sad", weight: 1.55 },
  { term: "حاسس بكآبة", dimension: "sad", weight: 1.6 },
  { term: "حاسة بكآبة", dimension: "sad", weight: 1.6 },

  // ==================== FRUSTRATED (PHRASES) ====================
  { term: "fed up", dimension: "frustrated", weight: 1.55 },
  { term: "sick and tired", dimension: "frustrated", weight: 1.6 },
  { term: "losing my mind", dimension: "frustrated", weight: 1.55 },
  { term: "pissed off", dimension: "frustrated", weight: 1.65 },
  { term: "drives me crazy", dimension: "frustrated", weight: 1.5 },
  { term: "had enough", dimension: "frustrated", weight: 1.5 },
  { term: "so annoying", dimension: "frustrated", weight: 1.45 },
  { term: "nothing works", dimension: "frustrated", weight: 1.45 },
  { term: "waste of time", dimension: "frustrated", weight: 1.35 },
  { term: "دمي محروق", dimension: "frustrated", weight: 1.7 },
  { term: "دمى محروق", dimension: "frustrated", weight: 1.7 },
  { term: "حرق دم", dimension: "frustrated", weight: 1.6 },
  { term: "مش طايق", dimension: "frustrated", weight: 1.55 },
  { term: "مش طايقة", dimension: "frustrated", weight: 1.55 },
  { term: "مش طايق نفسي", dimension: "frustrated", weight: 1.7 },
  { term: "مش طايقة نفسي", dimension: "frustrated", weight: 1.7 },
  { term: "جبت اخري", dimension: "frustrated", weight: 1.65 },
  { term: "جبت اخرى", dimension: "frustrated", weight: 1.65 },
  { term: "طفح الكيل", dimension: "frustrated", weight: 1.65 },
  { term: "فقدت اعصابي", dimension: "frustrated", weight: 1.6 },
  { term: "حاجة تقرف", dimension: "frustrated", weight: 1.55 },
  { term: "حاجة تعصب", dimension: "frustrated", weight: 1.55 },
  { term: "كل حاجة بايظة", dimension: "frustrated", weight: 1.6 },
  { term: "باظت خالص", dimension: "frustrated", weight: 1.55 },
  { term: "مفيش فايدة", dimension: "frustrated", weight: 1.55 },
  { term: "مافيش فايدة", dimension: "frustrated", weight: 1.55 },
  { term: "مش قادر استحمل", dimension: "frustrated", weight: 1.65 },
  { term: "مش قادرة استحمل", dimension: "frustrated", weight: 1.65 },
  { term: "نار جوايا", dimension: "frustrated", weight: 1.6 },
  { term: "زهقان اوي", dimension: "frustrated", weight: 1.5 },
  { term: "قرفان اوي", dimension: "frustrated", weight: 1.55 },
  { term: "متنرفز اوي", dimension: "frustrated", weight: 1.55 },
  { term: "طالع عيني", dimension: "frustrated", weight: 1.45 },
  { term: "مش طايق حد", dimension: "frustrated", weight: 1.65 },
  { term: "مش طايقة حد", dimension: "frustrated", weight: 1.65 },
  { term: "مش طايق الكلام", dimension: "frustrated", weight: 1.6 },
  { term: "دمي بيغلي", dimension: "frustrated", weight: 1.65 },
  { term: "اعصابي اتحرقت", dimension: "frustrated", weight: 1.6 },
  { term: "زهقت خلاص", dimension: "frustrated", weight: 1.55 },
  { term: "قرفت خلاص", dimension: "frustrated", weight: 1.6 },
  { term: "روحي في مناخيري", dimension: "frustrated", weight: 1.6 },
  { term: "وصلت لاخري", dimension: "frustrated", weight: 1.6 },
  { term: "على اخري", dimension: "frustrated", weight: 1.55 },

  // ==================== ANXIOUS (PHRASES) ====================
  { term: "on edge", dimension: "anxious", weight: 1.5 },
  { term: "panic attack", dimension: "anxious", weight: 1.8 },
  { term: "freaking out", dimension: "anxious", weight: 1.65 },
  { term: "under pressure", dimension: "anxious", weight: 1.45 },
  { term: "can't sleep", dimension: "anxious", weight: 1.4 },
  { term: "cant sleep", dimension: "anxious", weight: 1.4 },
  { term: "mind is racing", dimension: "anxious", weight: 1.55 },
  { term: "stressed out", dimension: "anxious", weight: 1.6 },
  { term: "worried sick", dimension: "anxious", weight: 1.65 },
  { term: "heart racing", dimension: "anxious", weight: 1.55 },
  { term: "شايل الهم", dimension: "anxious", weight: 1.6 },
  { term: "شايلة الهم", dimension: "anxious", weight: 1.6 },
  { term: "قلبي مقبوض", dimension: "anxious", weight: 1.65 },
  { term: "على اعصابي", dimension: "anxious", weight: 1.6 },
  { term: "اعصابي سايبة", dimension: "anxious", weight: 1.55 },
  { term: "بفكر كتير", dimension: "anxious", weight: 1.45 },
  { term: "دماغي شغالة تفكير", dimension: "anxious", weight: 1.55 },
  { term: "قلبي بيدق بسرعة", dimension: "anxious", weight: 1.6 },
  { term: "مش مطمن", dimension: "anxious", weight: 1.45 },
  { term: "مش مطمنة", dimension: "anxious", weight: 1.45 },
  { term: "تحت ضغط", dimension: "anxious", weight: 1.45 },
  { term: "ضغط نفسي", dimension: "anxious", weight: 1.55 },
  { term: "هم الدنيا", dimension: "anxious", weight: 1.55 },
  { term: "مش عارف انام", dimension: "anxious", weight: 1.45 },
  { term: "مش عارفه انام", dimension: "anxious", weight: 1.45 },
  { term: "خايف افشل", dimension: "anxious", weight: 1.55 },
  { term: "خايفة افشل", dimension: "anxious", weight: 1.55 },
  { term: "حاسس بقلق", dimension: "anxious", weight: 1.5 },
  { term: "توتر رهيب", dimension: "anxious", weight: 1.65 },
  { term: "مشدود الاعصاب", dimension: "anxious", weight: 1.55 },
  { term: "عندي قلق", dimension: "anxious", weight: 1.5 },
  { term: "بفكر بزيادة", dimension: "anxious", weight: 1.45 },
  { term: "خايف من بكرة", dimension: "anxious", weight: 1.5 },
  { term: "خايفة من بكرة", dimension: "anxious", weight: 1.5 },
  { term: "مزنوق في الوقت", dimension: "anxious", weight: 1.45 },
  { term: "هم ثقيل", dimension: "anxious", weight: 1.55 },

  // ==================== CONFUSED (PHRASES) ====================
  { term: "at a loss", dimension: "confused", weight: 1.5 },
  { term: "mixed feelings", dimension: "confused", weight: 1.4 },
  { term: "brain fog", dimension: "confused", weight: 1.5 },
  { term: "can't focus", dimension: "confused", weight: 1.45 },
  { term: "cant focus", dimension: "confused", weight: 1.45 },
  { term: "don't know what to do", dimension: "confused", weight: 1.55 },
  { term: "dont know what to do", dimension: "confused", weight: 1.55 },
  { term: "second guessing", dimension: "confused", weight: 1.4 },
  { term: "all over the place", dimension: "confused", weight: 1.45 },
  { term: "torn between", dimension: "confused", weight: 1.4 },
  { term: "doesn't make sense", dimension: "confused", weight: 1.35 },
  { term: "مش مجمع", dimension: "confused", weight: 1.55 },
  { term: "مش مجمعة", dimension: "confused", weight: 1.55 },
  { term: "دماغي لفة", dimension: "confused", weight: 1.55 },
  { term: "دماغي لافة", dimension: "confused", weight: 1.55 },
  { term: "دماغي لفت", dimension: "confused", weight: 1.55 },
  { term: "دماغي بتلف", dimension: "confused", weight: 1.5 },
  { term: "مش فاهم نفسي", dimension: "confused", weight: 1.5 },
  { term: "مش فاهمة نفسي", dimension: "confused", weight: 1.5 },
  { term: "مش عارف اخد قرار", dimension: "confused", weight: 1.55 },
  { term: "مش عارفة اخد قرار", dimension: "confused", weight: 1.55 },
  { term: "مشتت الذهن", dimension: "confused", weight: 1.5 },
  { term: "دماغي مش شغالة", dimension: "confused", weight: 1.5 },
  { term: "مش فاهم حاجة", dimension: "confused", weight: 1.55 },
  { term: "مش فاهمه حاجه", dimension: "confused", weight: 1.55 },
  { term: "مش عارف اعمل ايه", dimension: "confused", weight: 1.6 },
  { term: "مش عارفه اعمل ايه", dimension: "confused", weight: 1.6 },
  { term: "مش قادر اقرر", dimension: "confused", weight: 1.5 },
  { term: "مش قادرة اقرر", dimension: "confused", weight: 1.5 },
  { term: "كل حاجة داخلة في بعض", dimension: "confused", weight: 1.6 },
  { term: "الدنيا ملخبطة", dimension: "confused", weight: 1.55 },
  { term: "دماغي سايحة", dimension: "confused", weight: 1.55 },
  { term: "مش مستوعب", dimension: "confused", weight: 1.45 },
  { term: "مش مستوعبة", dimension: "confused", weight: 1.45 },
  { term: "مش فاهم", dimension: "confused", weight: 1.4 },
  { term: "مش فاهمة", dimension: "confused", weight: 1.4 },
  { term: "مش عارف", dimension: "confused", weight: 1.35 },
  { term: "مش عارفة", dimension: "confused", weight: 1.35 },
  { term: "مش مركز", dimension: "confused", weight: 1.4 },
  { term: "مش مركزة", dimension: "confused", weight: 1.4 },
  { term: "عقلي واقف", dimension: "confused", weight: 1.5 },
  { term: "بين نارين", dimension: "confused", weight: 1.5 },
];

/**
 * Single-word lexicon across all 8 dimensions (EN + MSA + Egyptian Colloquial).
 */
export const TOKEN_LEXICON: LexiconEntry[] = [
  // ==================== HAPPY (TOKENS) ====================
  // English
  { term: "happy", dimension: "happy", weight: 1.3 },
  { term: "joy", dimension: "happy", weight: 1.35 },
  { term: "joyful", dimension: "happy", weight: 1.35 },
  { term: "excited", dimension: "happy", weight: 1.25 },
  { term: "grateful", dimension: "happy", weight: 1.3 },
  { term: "thankful", dimension: "happy", weight: 1.25 },
  { term: "gratitude", dimension: "happy", weight: 1.25 },
  { term: "blessed", dimension: "happy", weight: 1.3 },
  { term: "amazing", dimension: "happy", weight: 1.25 },
  { term: "wonderful", dimension: "happy", weight: 1.25 },
  { term: "fantastic", dimension: "happy", weight: 1.3 },
  { term: "awesome", dimension: "happy", weight: 1.2 },
  { term: "excellent", dimension: "happy", weight: 1.2 },
  { term: "great", dimension: "happy", weight: 1.1 },
  { term: "good", dimension: "happy", weight: 0.9 },
  { term: "love", dimension: "happy", weight: 1.25 },
  { term: "loved", dimension: "happy", weight: 1.3 },
  { term: "delighted", dimension: "happy", weight: 1.35 },
  { term: "cheerful", dimension: "happy", weight: 1.25 },
  { term: "thrilled", dimension: "happy", weight: 1.4 },
  { term: "ecstatic", dimension: "happy", weight: 1.5 },
  { term: "elated", dimension: "happy", weight: 1.45 },
  { term: "smile", dimension: "happy", weight: 1.05 },
  { term: "smiling", dimension: "happy", weight: 1.1 },
  { term: "laugh", dimension: "happy", weight: 1.1 },
  { term: "laughing", dimension: "happy", weight: 1.15 },
  { term: "enjoyed", dimension: "happy", weight: 1.1 },
  { term: "fun", dimension: "happy", weight: 1.1 },
  { term: "celebrate", dimension: "happy", weight: 1.25 },
  { term: "optimistic", dimension: "happy", weight: 1.2 },
  { term: "hopeful", dimension: "happy", weight: 1.15 },
  { term: "beautiful", dimension: "happy", weight: 1.1 },
  { term: "bright", dimension: "happy", weight: 0.95 },
  { term: "glad", dimension: "happy", weight: 1.1 },
  { term: "pleased", dimension: "happy", weight: 1.1 },
  { term: "euphoric", dimension: "happy", weight: 1.5 },
  { term: "radiant", dimension: "happy", weight: 1.25 },
  // MSA
  { term: "سعيد", dimension: "happy", weight: 1.35 },
  { term: "سعيدة", dimension: "happy", weight: 1.35 },
  { term: "سعادة", dimension: "happy", weight: 1.35 },
  { term: "فرح", dimension: "happy", weight: 1.3 },
  { term: "فرحة", dimension: "happy", weight: 1.3 },
  { term: "بهجة", dimension: "happy", weight: 1.35 },
  { term: "سرور", dimension: "happy", weight: 1.3 },
  { term: "مسرور", dimension: "happy", weight: 1.3 },
  { term: "ممتن", dimension: "happy", weight: 1.3 },
  { term: "ممتنة", dimension: "happy", weight: 1.3 },
  { term: "امتنان", dimension: "happy", weight: 1.3 },
  { term: "متفائل", dimension: "happy", weight: 1.25 },
  { term: "متفائلة", dimension: "happy", weight: 1.25 },
  { term: "تفاؤل", dimension: "happy", weight: 1.25 },
  { term: "رائع", dimension: "happy", weight: 1.25 },
  { term: "رائعة", dimension: "happy", weight: 1.25 },
  { term: "روعة", dimension: "happy", weight: 1.25 },
  { term: "جميل", dimension: "happy", weight: 1.1 },
  { term: "جميلة", dimension: "happy", weight: 1.1 },
  { term: "ممتاز", dimension: "happy", weight: 1.25 },
  { term: "نعمة", dimension: "happy", weight: 1.25 },
  { term: "بركة", dimension: "happy", weight: 1.2 },
  { term: "حب", dimension: "happy", weight: 1.2 },
  { term: "بخير", dimension: "happy", weight: 1.0 },
  { term: "أمل", dimension: "happy", weight: 1.15 },
  { term: "مبتهج", dimension: "happy", weight: 1.35 },
  { term: "سعيدين", dimension: "happy", weight: 1.35 },
  // Egyptian Colloquial
  { term: "مبسوط", dimension: "happy", weight: 1.4 },
  { term: "مبسوطة", dimension: "happy", weight: 1.4 },
  { term: "مبسوطين", dimension: "happy", weight: 1.4 },
  { term: "فرحان", dimension: "happy", weight: 1.4 },
  { term: "فرحانة", dimension: "happy", weight: 1.4 },
  { term: "فرحانين", dimension: "happy", weight: 1.4 },
  { term: "الحمدلله", dimension: "happy", weight: 1.45 },
  { term: "عظمة", dimension: "happy", weight: 1.4 },
  { term: "منشكح", dimension: "happy", weight: 1.45 },
  { term: "منشكحة", dimension: "happy", weight: 1.45 },
  { term: "مفرفش", dimension: "happy", weight: 1.35 },
  { term: "مفرفشة", dimension: "happy", weight: 1.35 },
  { term: "فرفشة", dimension: "happy", weight: 1.3 },
  { term: "جامد", dimension: "happy", weight: 1.2 },
  { term: "جامدة", dimension: "happy", weight: 1.2 },
  { term: "تحفة", dimension: "happy", weight: 1.25 },
  { term: "عسل", dimension: "happy", weight: 1.2 },
  { term: "موفق", dimension: "happy", weight: 1.25 },
  { term: "اتوفقت", dimension: "happy", weight: 1.35 },
  { term: "كويس", dimension: "happy", weight: 1.0 },
  { term: "كويسة", dimension: "happy", weight: 1.0 },
  { term: "كويسين", dimension: "happy", weight: 1.0 },
  { term: "طاير", dimension: "happy", weight: 1.25 },
  { term: "ضحك", dimension: "happy", weight: 1.15 },
  { term: "happily", dimension: "happy", weight: 1.3 },
  { term: "thankfully", dimension: "happy", weight: 1.25 },
  { term: "bliss", dimension: "happy", weight: 1.4 },
  { term: "blissful", dimension: "happy", weight: 1.4 },

  // ==================== CALM (TOKENS) ====================
  // English
  { term: "calm", dimension: "calm", weight: 1.3 },
  { term: "peaceful", dimension: "calm", weight: 1.35 },
  { term: "peace", dimension: "calm", weight: 1.3 },
  { term: "relaxed", dimension: "calm", weight: 1.3 },
  { term: "relaxing", dimension: "calm", weight: 1.25 },
  { term: "serene", dimension: "calm", weight: 1.4 },
  { term: "serenity", dimension: "calm", weight: 1.4 },
  { term: "tranquil", dimension: "calm", weight: 1.35 },
  { term: "grounded", dimension: "calm", weight: 1.25 },
  { term: "mindful", dimension: "calm", weight: 1.25 },
  { term: "balanced", dimension: "calm", weight: 1.2 },
  { term: "steady", dimension: "calm", weight: 1.1 },
  { term: "content", dimension: "calm", weight: 1.2 },
  { term: "satisfied", dimension: "calm", weight: 1.15 },
  { term: "comfortable", dimension: "calm", weight: 1.15 },
  { term: "still", dimension: "calm", weight: 0.9 },
  { term: "quiet", dimension: "calm", weight: 1.0 },
  { term: "soothing", dimension: "calm", weight: 1.2 },
  { term: "chill", dimension: "calm", weight: 1.15 },
  { term: "gentle", dimension: "calm", weight: 1.05 },
  { term: "safe", dimension: "calm", weight: 1.15 },
  { term: "centered", dimension: "calm", weight: 1.25 },
  { term: "composed", dimension: "calm", weight: 1.2 },
  { term: "breathe", dimension: "calm", weight: 0.95 },
  // MSA
  { term: "هادئ", dimension: "calm", weight: 1.35 },
  { term: "هادئة", dimension: "calm", weight: 1.35 },
  { term: "هدوء", dimension: "calm", weight: 1.35 },
  { term: "سكينة", dimension: "calm", weight: 1.45 },
  { term: "طمأنينة", dimension: "calm", weight: 1.4 },
  { term: "مطمئن", dimension: "calm", weight: 1.35 },
  { term: "مطمئنة", dimension: "calm", weight: 1.35 },
  { term: "راحة", dimension: "calm", weight: 1.3 },
  { term: "مرتاح", dimension: "calm", weight: 1.35 },
  { term: "مرتاحة", dimension: "calm", weight: 1.35 },
  { term: "مستريح", dimension: "calm", weight: 1.3 },
  { term: "مستقرة", dimension: "calm", weight: 1.2 },
  { term: "مستقر", dimension: "calm", weight: 1.2 },
  { term: "استرخاء", dimension: "calm", weight: 1.3 },
  { term: "مسترخي", dimension: "calm", weight: 1.3 },
  { term: "تأمل", dimension: "calm", weight: 1.2 },
  { term: "صافي", dimension: "calm", weight: 1.2 },
  { term: "سلام", dimension: "calm", weight: 1.3 },
  { term: "رضا", dimension: "calm", weight: 1.3 },
  { term: "راضي", dimension: "calm", weight: 1.25 },
  { term: "راضية", dimension: "calm", weight: 1.25 },
  { term: "متوازن", dimension: "calm", weight: 1.2 },
  // Egyptian Colloquial
  { term: "رايق", dimension: "calm", weight: 1.4 },
  { term: "رايقة", dimension: "calm", weight: 1.4 },
  { term: "رايقين", dimension: "calm", weight: 1.4 },
  { term: "روقان", dimension: "calm", weight: 1.45 },
  { term: "مطمن", dimension: "calm", weight: 1.4 },
  { term: "مطمنة", dimension: "calm", weight: 1.4 },
  { term: "هادي", dimension: "calm", weight: 1.3 },
  { term: "هادية", dimension: "calm", weight: 1.3 },
  { term: "مروق", dimension: "calm", weight: 1.35 },
  { term: "مروقة", dimension: "calm", weight: 1.35 },
  { term: "مستكين", dimension: "calm", weight: 1.3 },
  { term: "سالك", dimension: "calm", weight: 1.15 },

  // ==================== MOTIVATED (TOKENS) ====================
  // English
  { term: "motivated", dimension: "motivated", weight: 1.4 },
  { term: "inspired", dimension: "motivated", weight: 1.35 },
  { term: "productive", dimension: "motivated", weight: 1.35 },
  { term: "accomplished", dimension: "motivated", weight: 1.4 },
  { term: "achieved", dimension: "motivated", weight: 1.35 },
  { term: "success", dimension: "motivated", weight: 1.3 },
  { term: "succeed", dimension: "motivated", weight: 1.3 },
  { term: "energized", dimension: "motivated", weight: 1.3 },
  { term: "driven", dimension: "motivated", weight: 1.3 },
  { term: "determined", dimension: "motivated", weight: 1.35 },
  { term: "focused", dimension: "motivated", weight: 1.25 },
  { term: "proud", dimension: "motivated", weight: 1.3 },
  { term: "confident", dimension: "motivated", weight: 1.3 },
  { term: "ambitious", dimension: "motivated", weight: 1.25 },
  { term: "breakthrough", dimension: "motivated", weight: 1.45 },
  { term: "progress", dimension: "motivated", weight: 1.25 },
  { term: "growth", dimension: "motivated", weight: 1.2 },
  { term: "win", dimension: "motivated", weight: 1.25 },
  { term: "winning", dimension: "motivated", weight: 1.3 },
  { term: "unstoppable", dimension: "motivated", weight: 1.5 },
  { term: "creative", dimension: "motivated", weight: 1.15 },
  { term: "learned", dimension: "motivated", weight: 1.1 },
  { term: "improved", dimension: "motivated", weight: 1.2 },
  { term: "strong", dimension: "motivated", weight: 1.15 },
  { term: "empowered", dimension: "motivated", weight: 1.35 },
  { term: "discipline", dimension: "motivated", weight: 1.2 },
  { term: "workout", dimension: "motivated", weight: 1.1 },
  // MSA
  { term: "متحفز", dimension: "motivated", weight: 1.4 },
  { term: "متحفزة", dimension: "motivated", weight: 1.4 },
  { term: "تحفيز", dimension: "motivated", weight: 1.3 },
  { term: "حافز", dimension: "motivated", weight: 1.25 },
  { term: "حماس", dimension: "motivated", weight: 1.35 },
  { term: "متحمس", dimension: "motivated", weight: 1.35 },
  { term: "متحمسة", dimension: "motivated", weight: 1.35 },
  { term: "إنجاز", dimension: "motivated", weight: 1.4 },
  { term: "نجاح", dimension: "motivated", weight: 1.35 },
  { term: "ناجح", dimension: "motivated", weight: 1.3 },
  { term: "تقدم", dimension: "motivated", weight: 1.25 },
  { term: "إصرار", dimension: "motivated", weight: 1.35 },
  { term: "عزيمة", dimension: "motivated", weight: 1.35 },
  { term: "طموح", dimension: "motivated", weight: 1.3 },
  { term: "همة", dimension: "motivated", weight: 1.3 },
  { term: "شغف", dimension: "motivated", weight: 1.3 },
  { term: "نشيط", dimension: "motivated", weight: 1.25 },
  { term: "نشاط", dimension: "motivated", weight: 1.2 },
  { term: "طاقة", dimension: "motivated", weight: 1.15 },
  { term: "قوي", dimension: "motivated", weight: 1.2 },
  { term: "قوية", dimension: "motivated", weight: 1.2 },
  { term: "واثق", dimension: "motivated", weight: 1.25 },
  { term: "واثقة", dimension: "motivated", weight: 1.25 },
  { term: "فخور", dimension: "motivated", weight: 1.3 },
  { term: "ملهم", dimension: "motivated", weight: 1.3 },
  // Egyptian Colloquial
  { term: "انجزت", dimension: "motivated", weight: 1.45 },
  { term: "هنجز", dimension: "motivated", weight: 1.35 },
  { term: "مكمل", dimension: "motivated", weight: 1.3 },
  { term: "مكملة", dimension: "motivated", weight: 1.3 },
  { term: "هكمل", dimension: "motivated", weight: 1.3 },
  { term: "قدها", dimension: "motivated", weight: 1.45 },
  { term: "هعملها", dimension: "motivated", weight: 1.4 },
  { term: "هنجح", dimension: "motivated", weight: 1.4 },
  { term: "متشجع", dimension: "motivated", weight: 1.35 },
  { term: "متشجعة", dimension: "motivated", weight: 1.35 },
  { term: "مستعد", dimension: "motivated", weight: 1.25 },
  { term: "مستعدة", dimension: "motivated", weight: 1.25 },
  { term: "مركز", dimension: "motivated", weight: 1.2 },
  { term: "مركزة", dimension: "motivated", weight: 1.2 },

  // ==================== TIRED (TOKENS) ====================
  // English
  { term: "tired", dimension: "tired", weight: 1.3 },
  { term: "exhausted", dimension: "tired", weight: 1.5 },
  { term: "drained", dimension: "tired", weight: 1.45 },
  { term: "fatigued", dimension: "tired", weight: 1.45 },
  { term: "fatigue", dimension: "tired", weight: 1.4 },
  { term: "sleepy", dimension: "tired", weight: 1.25 },
  { term: "drowsy", dimension: "tired", weight: 1.25 },
  { term: "weary", dimension: "tired", weight: 1.35 },
  { term: "sluggish", dimension: "tired", weight: 1.25 },
  { term: "lethargic", dimension: "tired", weight: 1.3 },
  { term: "burnout", dimension: "tired", weight: 1.55 },
  { term: "exhaustion", dimension: "tired", weight: 1.5 },
  { term: "depleted", dimension: "tired", weight: 1.4 },
  { term: "groggy", dimension: "tired", weight: 1.2 },
  { term: "heavy", dimension: "tired", weight: 1.0 },
  { term: "sore", dimension: "tired", weight: 1.1 },
  { term: "weak", dimension: "tired", weight: 1.15 },
  { term: "yawning", dimension: "tired", weight: 1.1 },
  // MSA
  { term: "متعب", dimension: "tired", weight: 1.35 },
  { term: "متعبة", dimension: "tired", weight: 1.35 },
  { term: "تعب", dimension: "tired", weight: 1.3 },
  { term: "مرهق", dimension: "tired", weight: 1.45 },
  { term: "مرهقة", dimension: "tired", weight: 1.45 },
  { term: "إرهاق", dimension: "tired", weight: 1.45 },
  { term: "منهك", dimension: "tired", weight: 1.5 },
  { term: "منهكة", dimension: "tired", weight: 1.5 },
  { term: "إنهاك", dimension: "tired", weight: 1.5 },
  { term: "إعياء", dimension: "tired", weight: 1.4 },
  { term: "خمول", dimension: "tired", weight: 1.3 },
  { term: "نعاس", dimension: "tired", weight: 1.3 },
  { term: "نعسان", dimension: "tired", weight: 1.3 },
  { term: "كسل", dimension: "tired", weight: 1.1 },
  { term: "استنزاف", dimension: "tired", weight: 1.4 },
  { term: "مستنزف", dimension: "tired", weight: 1.45 },
  // Egyptian Colloquial
  { term: "هلكان", dimension: "tired", weight: 1.5 },
  { term: "هلكانة", dimension: "tired", weight: 1.5 },
  { term: "هلكانين", dimension: "tired", weight: 1.5 },
  { term: "مفرهد", dimension: "tired", weight: 1.5 },
  { term: "مفرهدة", dimension: "tired", weight: 1.5 },
  { term: "تعبان", dimension: "tired", weight: 1.4 },
  { term: "تعبانة", dimension: "tired", weight: 1.4 },
  { term: "تعبانين", dimension: "tired", weight: 1.4 },
  { term: "همدان", dimension: "tired", weight: 1.4 },
  { term: "همدانة", dimension: "tired", weight: 1.4 },
  { term: "متكسر", dimension: "tired", weight: 1.4 },
  { term: "متكسرة", dimension: "tired", weight: 1.4 },
  { term: "مطحون", dimension: "tired", weight: 1.45 },
  { term: "مطحونة", dimension: "tired", weight: 1.45 },
  { term: "مكسل", dimension: "tired", weight: 1.2 },
  { term: "مكسلة", dimension: "tired", weight: 1.2 },
  { term: "دايخ", dimension: "tired", weight: 1.35 },
  { term: "دايخة", dimension: "tired", weight: 1.35 },
  { term: "فاصل", dimension: "tired", weight: 1.4 },
  { term: "فاصلة", dimension: "tired", weight: 1.4 },
  { term: "مستوي", dimension: "tired", weight: 1.4 },
  { term: "مفصول", dimension: "tired", weight: 1.45 },
  { term: "مطبق", dimension: "tired", weight: 1.45 },
  { term: "مطبقة", dimension: "tired", weight: 1.45 },
  { term: "ارق", dimension: "tired", weight: 1.35 },
  { term: "تعبانين", dimension: "tired", weight: 1.4 },
  { term: "insomnia", dimension: "tired", weight: 1.35 },
  { term: "sleepless", dimension: "tired", weight: 1.35 },
  { term: "exhausting", dimension: "tired", weight: 1.4 },
  { term: "منمتش", dimension: "tired", weight: 1.35 },
  { term: "سهران", dimension: "tired", weight: 1.15 },

  // ==================== SAD (TOKENS) ====================
  // English
  { term: "sad", dimension: "sad", weight: 1.4 },
  { term: "depressed", dimension: "sad", weight: 1.65 },
  { term: "depression", dimension: "sad", weight: 1.65 },
  { term: "heartbroken", dimension: "sad", weight: 1.65 },
  { term: "lonely", dimension: "sad", weight: 1.45 },
  { term: "isolated", dimension: "sad", weight: 1.4 },
  { term: "miserable", dimension: "sad", weight: 1.55 },
  { term: "hopeless", dimension: "sad", weight: 1.6 },
  { term: "desperate", dimension: "sad", weight: 1.5 },
  { term: "cry", dimension: "sad", weight: 1.4 },
  { term: "crying", dimension: "sad", weight: 1.45 },
  { term: "tears", dimension: "sad", weight: 1.4 },
  { term: "hurt", dimension: "sad", weight: 1.35 },
  { term: "pain", dimension: "sad", weight: 1.3 },
  { term: "grief", dimension: "sad", weight: 1.6 },
  { term: "grieving", dimension: "sad", weight: 1.6 },
  { term: "sorrow", dimension: "sad", weight: 1.5 },
  { term: "unhappy", dimension: "sad", weight: 1.35 },
  { term: "empty", dimension: "sad", weight: 1.3 },
  { term: "worthless", dimension: "sad", weight: 1.6 },
  { term: "devastated", dimension: "sad", weight: 1.65 },
  { term: "down", dimension: "sad", weight: 1.05 },
  { term: "gloomy", dimension: "sad", weight: 1.3 },
  { term: "melancholy", dimension: "sad", weight: 1.35 },
  { term: "regret", dimension: "sad", weight: 1.2 },
  { term: "guilt", dimension: "sad", weight: 1.25 },
  { term: "ashamed", dimension: "sad", weight: 1.25 },
  { term: "disappointed", dimension: "sad", weight: 1.3 },
  { term: "terrible", dimension: "sad", weight: 1.35 },
  { term: "awful", dimension: "sad", weight: 1.35 },
  { term: "horrible", dimension: "sad", weight: 1.35 },
  // MSA
  { term: "حزين", dimension: "sad", weight: 1.45 },
  { term: "حزينة", dimension: "sad", weight: 1.45 },
  { term: "حزن", dimension: "sad", weight: 1.45 },
  { term: "مكتئب", dimension: "sad", weight: 1.65 },
  { term: "مكتئبة", dimension: "sad", weight: 1.65 },
  { term: "اكتئاب", dimension: "sad", weight: 1.65 },
  { term: "كآبة", dimension: "sad", weight: 1.55 },
  { term: "أسى", dimension: "sad", weight: 1.5 },
  { term: "ألم", dimension: "sad", weight: 1.4 },
  { term: "وجع", dimension: "sad", weight: 1.4 },
  { term: "يأس", dimension: "sad", weight: 1.55 },
  { term: "يائس", dimension: "sad", weight: 1.55 },
  { term: "يائسة", dimension: "sad", weight: 1.55 },
  { term: "وحيد", dimension: "sad", weight: 1.4 },
  { term: "وحيدة", dimension: "sad", weight: 1.4 },
  { term: "وحدة", dimension: "sad", weight: 1.35 },
  { term: "بكاء", dimension: "sad", weight: 1.45 },
  { term: "فقد", dimension: "sad", weight: 1.35 },
  { term: "فقدان", dimension: "sad", weight: 1.4 },
  { term: "حسرة", dimension: "sad", weight: 1.5 },
  { term: "سيء", dimension: "sad", weight: 1.25 },
  { term: "مؤلم", dimension: "sad", weight: 1.45 },
  // Egyptian Colloquial
  { term: "مخنوق", dimension: "sad", weight: 1.5 },
  { term: "مخنوقة", dimension: "sad", weight: 1.5 },
  { term: "زعلان", dimension: "sad", weight: 1.4 },
  { term: "زعلانة", dimension: "sad", weight: 1.4 },
  { term: "زعلانين", dimension: "sad", weight: 1.4 },
  { term: "مقهور", dimension: "sad", weight: 1.6 },
  { term: "مقهورة", dimension: "sad", weight: 1.6 },
  { term: "موجوع", dimension: "sad", weight: 1.55 },
  { term: "موجوعة", dimension: "sad", weight: 1.55 },
  { term: "متكدر", dimension: "sad", weight: 1.4 },
  { term: "متكدرة", dimension: "sad", weight: 1.4 },
  { term: "مكسور", dimension: "sad", weight: 1.5 },
  { term: "مكسورة", dimension: "sad", weight: 1.5 },
  { term: "بعيط", dimension: "sad", weight: 1.55 },
  { term: "عيطت", dimension: "sad", weight: 1.55 },
  { term: "مكتئبين", dimension: "sad", weight: 1.6 },
  { term: "زفت", dimension: "sad", weight: 1.5 },
  { term: "وحش", dimension: "sad", weight: 1.3 },
  { term: "وحشة", dimension: "sad", weight: 1.3 },
  { term: "سيئة", dimension: "sad", weight: 1.25 },

  // ==================== FRUSTRATED (TOKENS) ====================
  // English
  { term: "frustrated", dimension: "frustrated", weight: 1.45 },
  { term: "frustrating", dimension: "frustrated", weight: 1.4 },
  { term: "frustration", dimension: "frustrated", weight: 1.4 },
  { term: "angry", dimension: "frustrated", weight: 1.45 },
  { term: "anger", dimension: "frustrated", weight: 1.45 },
  { term: "furious", dimension: "frustrated", weight: 1.65 },
  { term: "mad", dimension: "frustrated", weight: 1.35 },
  { term: "annoyed", dimension: "frustrated", weight: 1.3 },
  { term: "annoying", dimension: "frustrated", weight: 1.3 },
  { term: "irritated", dimension: "frustrated", weight: 1.35 },
  { term: "irritating", dimension: "frustrated", weight: 1.35 },
  { term: "upset", dimension: "frustrated", weight: 1.3 },
  { term: "aggravated", dimension: "frustrated", weight: 1.4 },
  { term: "enraged", dimension: "frustrated", weight: 1.65 },
  { term: "bitter", dimension: "frustrated", weight: 1.3 },
  { term: "resentful", dimension: "frustrated", weight: 1.4 },
  { term: "unfair", dimension: "frustrated", weight: 1.2 },
  { term: "hate", dimension: "frustrated", weight: 1.45 },
  { term: "stuck", dimension: "frustrated", weight: 1.2 },
  { term: "fail", dimension: "frustrated", weight: 1.25 },
  { term: "failure", dimension: "frustrated", weight: 1.35 },
  { term: "useless", dimension: "frustrated", weight: 1.4 },
  { term: "toxic", dimension: "frustrated", weight: 1.35 },
  { term: "exhausting", dimension: "frustrated", weight: 1.25 },
  // MSA
  { term: "محبط", dimension: "frustrated", weight: 1.45 },
  { term: "محبطة", dimension: "frustrated", weight: 1.45 },
  { term: "إحباط", dimension: "frustrated", weight: 1.45 },
  { term: "غاضب", dimension: "frustrated", weight: 1.45 },
  { term: "غاضبة", dimension: "frustrated", weight: 1.45 },
  { term: "غضب", dimension: "frustrated", weight: 1.45 },
  { term: "سخط", dimension: "frustrated", weight: 1.4 },
  { term: "غيظ", dimension: "frustrated", weight: 1.4 },
  { term: "مغتاظ", dimension: "frustrated", weight: 1.45 },
  { term: "استياء", dimension: "frustrated", weight: 1.35 },
  { term: "مستاء", dimension: "frustrated", weight: 1.35 },
  { term: "ضايق", dimension: "frustrated", weight: 1.3 },
  { term: "متضايق", dimension: "frustrated", weight: 1.35 },
  { term: "متضايقة", dimension: "frustrated", weight: 1.35 },
  { term: "ضيق", dimension: "frustrated", weight: 1.3 },
  { term: "فشل", dimension: "frustrated", weight: 1.3 },
  { term: "فاشل", dimension: "frustrated", weight: 1.35 },
  { term: "صعب", dimension: "frustrated", weight: 1.05 },
  { term: "معقد", dimension: "frustrated", weight: 1.1 },
  // Egyptian Colloquial
  { term: "متعصب", dimension: "frustrated", weight: 1.5 },
  { term: "متعصبة", dimension: "frustrated", weight: 1.5 },
  { term: "اتعصبت", dimension: "frustrated", weight: 1.5 },
  { term: "معصبني", dimension: "frustrated", weight: 1.45 },
  { term: "قرفان", dimension: "frustrated", weight: 1.45 },
  { term: "قرفانة", dimension: "frustrated", weight: 1.45 },
  { term: "قرفت", dimension: "frustrated", weight: 1.45 },
  { term: "زهقان", dimension: "frustrated", weight: 1.4 },
  { term: "زهقانة", dimension: "frustrated", weight: 1.4 },
  { term: "زهقت", dimension: "frustrated", weight: 1.4 },
  { term: "مفروس", dimension: "frustrated", weight: 1.5 },
  { term: "مفروسة", dimension: "frustrated", weight: 1.5 },
  { term: "متنرفز", dimension: "frustrated", weight: 1.45 },
  { term: "متنرفزة", dimension: "frustrated", weight: 1.45 },
  { term: "اتنرفزت", dimension: "frustrated", weight: 1.45 },
  { term: "مستفز", dimension: "frustrated", weight: 1.4 },
  { term: "مستفزة", dimension: "frustrated", weight: 1.4 },
  { term: "اتخنقت", dimension: "frustrated", weight: 1.45 },
  { term: "مقفول", dimension: "frustrated", weight: 1.35 },
  { term: "مقفولة", dimension: "frustrated", weight: 1.35 },
  { term: "اتقفلت", dimension: "frustrated", weight: 1.4 },
  { term: "هطق", dimension: "frustrated", weight: 1.55 },
  { term: "هفرقع", dimension: "frustrated", weight: 1.55 },
  { term: "مولع", dimension: "frustrated", weight: 1.45 },
  { term: "باظت", dimension: "frustrated", weight: 1.35 },
  { term: "bored", dimension: "frustrated", weight: 1.05 },
  { term: "زهقانين", dimension: "frustrated", weight: 1.4 },
  { term: "قرفانين", dimension: "frustrated", weight: 1.45 },
  { term: "متعصبين", dimension: "frustrated", weight: 1.5 },
  { term: "stressful", dimension: "anxious", weight: 1.35 },
  { term: "overwhelming", dimension: "anxious", weight: 1.45 },

  // ==================== ANXIOUS (TOKENS) ====================
  // English
  { term: "anxious", dimension: "anxious", weight: 1.45 },
  { term: "anxiety", dimension: "anxious", weight: 1.45 },
  { term: "worried", dimension: "anxious", weight: 1.35 },
  { term: "worry", dimension: "anxious", weight: 1.3 },
  { term: "worrying", dimension: "anxious", weight: 1.3 },
  { term: "stressed", dimension: "anxious", weight: 1.4 },
  { term: "stress", dimension: "anxious", weight: 1.35 },
  { term: "nervous", dimension: "anxious", weight: 1.35 },
  { term: "scared", dimension: "anxious", weight: 1.45 },
  { term: "afraid", dimension: "anxious", weight: 1.4 },
  { term: "fear", dimension: "anxious", weight: 1.4 },
  { term: "panic", dimension: "anxious", weight: 1.65 },
  { term: "panicking", dimension: "anxious", weight: 1.65 },
  { term: "terrified", dimension: "anxious", weight: 1.65 },
  { term: "overwhelmed", dimension: "anxious", weight: 1.5 },
  { term: "uneasy", dimension: "anxious", weight: 1.25 },
  { term: "restless", dimension: "anxious", weight: 1.25 },
  { term: "tense", dimension: "anxious", weight: 1.3 },
  { term: "overthinking", dimension: "anxious", weight: 1.4 },
  { term: "dread", dimension: "anxious", weight: 1.5 },
  { term: "paranoid", dimension: "anxious", weight: 1.45 },
  { term: "insecure", dimension: "anxious", weight: 1.3 },
  { term: "pressure", dimension: "anxious", weight: 1.2 },
  // MSA
  { term: "قلق", dimension: "anxious", weight: 1.45 },
  { term: "قلقة", dimension: "anxious", weight: 1.45 },
  { term: "متوتر", dimension: "anxious", weight: 1.45 },
  { term: "متوترة", dimension: "anxious", weight: 1.45 },
  { term: "توتر", dimension: "anxious", weight: 1.4 },
  { term: "خائف", dimension: "anxious", weight: 1.45 },
  { term: "خائفة", dimension: "anxious", weight: 1.45 },
  { term: "خوف", dimension: "anxious", weight: 1.4 },
  { term: "ذعر", dimension: "anxious", weight: 1.6 },
  { term: "هلع", dimension: "anxious", weight: 1.65 },
  { term: "فزع", dimension: "anxious", weight: 1.55 },
  { term: "رهبة", dimension: "anxious", weight: 1.35 },
  { term: "مضغوط", dimension: "anxious", weight: 1.4 },
  { term: "مضغوطة", dimension: "anxious", weight: 1.4 },
  { term: "اضطراب", dimension: "anxious", weight: 1.4 },
  // Egyptian Colloquial
  { term: "قلقان", dimension: "anxious", weight: 1.45 },
  { term: "قلقانة", dimension: "anxious", weight: 1.45 },
  { term: "قلقانين", dimension: "anxious", weight: 1.45 },
  { term: "مقبوض", dimension: "anxious", weight: 1.5 },
  { term: "مقبوضة", dimension: "anxious", weight: 1.5 },
  { term: "مزنوق", dimension: "anxious", weight: 1.4 },
  { term: "مزنوقة", dimension: "anxious", weight: 1.4 },
  { term: "خايف", dimension: "anxious", weight: 1.45 },
  { term: "خايفة", dimension: "anxious", weight: 1.45 },
  { term: "مرعوب", dimension: "anxious", weight: 1.6 },
  { term: "مرعوبة", dimension: "anxious", weight: 1.6 },
  { term: "متخوف", dimension: "anxious", weight: 1.35 },
  { term: "مشدود", dimension: "anxious", weight: 1.35 },
  { term: "مشدودة", dimension: "anxious", weight: 1.35 },

  // ==================== CONFUSED (TOKENS) ====================
  // English
  { term: "confused", dimension: "confused", weight: 1.4 },
  { term: "confusing", dimension: "confused", weight: 1.35 },
  { term: "confusion", dimension: "confused", weight: 1.4 },
  { term: "lost", dimension: "confused", weight: 1.35 },
  { term: "uncertain", dimension: "confused", weight: 1.3 },
  { term: "unsure", dimension: "confused", weight: 1.25 },
  { term: "puzzled", dimension: "confused", weight: 1.3 },
  { term: "baffled", dimension: "confused", weight: 1.35 },
  { term: "perplexed", dimension: "confused", weight: 1.35 },
  { term: "bewildered", dimension: "confused", weight: 1.4 },
  { term: "indecisive", dimension: "confused", weight: 1.3 },
  { term: "hesitant", dimension: "confused", weight: 1.2 },
  { term: "scattered", dimension: "confused", weight: 1.3 },
  { term: "distracted", dimension: "confused", weight: 1.2 },
  { term: "foggy", dimension: "confused", weight: 1.25 },
  { term: "doubt", dimension: "confused", weight: 1.2 },
  { term: "doubtful", dimension: "confused", weight: 1.25 },
  { term: "awkward", dimension: "confused", weight: 1.1 },
  { term: "weird", dimension: "confused", weight: 0.95 },
  // MSA
  { term: "مشوش", dimension: "confused", weight: 1.45 },
  { term: "مشوشة", dimension: "confused", weight: 1.45 },
  { term: "تشوش", dimension: "confused", weight: 1.4 },
  { term: "محتار", dimension: "confused", weight: 1.4 },
  { term: "محتارة", dimension: "confused", weight: 1.4 },
  { term: "حيرة", dimension: "confused", weight: 1.4 },
  { term: "حيران", dimension: "confused", weight: 1.4 },
  { term: "مرتبك", dimension: "confused", weight: 1.4 },
  { term: "مرتبكة", dimension: "confused", weight: 1.4 },
  { term: "ارتباك", dimension: "confused", weight: 1.35 },
  { term: "مشتت", dimension: "confused", weight: 1.4 },
  { term: "مشتتة", dimension: "confused", weight: 1.4 },
  { term: "تشتت", dimension: "confused", weight: 1.35 },
  { term: "متردد", dimension: "confused", weight: 1.3 },
  { term: "مترددة", dimension: "confused", weight: 1.3 },
  { term: "غموض", dimension: "confused", weight: 1.25 },
  { term: "غامض", dimension: "confused", weight: 1.2 },
  // Egyptian Colloquial
  { term: "متلخبط", dimension: "confused", weight: 1.45 },
  { term: "متلخبطة", dimension: "confused", weight: 1.45 },
  { term: "متلخبطين", dimension: "confused", weight: 1.45 },
  { term: "لخبطة", dimension: "confused", weight: 1.35 },
  { term: "تايه", dimension: "confused", weight: 1.45 },
  { term: "تايهة", dimension: "confused", weight: 1.45 },
  { term: "تايهين", dimension: "confused", weight: 1.45 },
  { term: "توهت", dimension: "confused", weight: 1.45 },
  { term: "ضايع", dimension: "confused", weight: 1.4 },
  { term: "ضايعة", dimension: "confused", weight: 1.4 },
];

/**
 * Pre-normalized multi-word phrase dictionary sorted longest-first for greedy phrase matching.
 */
export const NORMALIZED_PHRASE_MAP: Array<{
  tokens: string[];
  dimension: EmotionDimension;
  weight: number;
  originalTerm: string;
  startsWithNegation: boolean;
}> = (() => {
  const seen = new Set<string>();
  const list: Array<{
    tokens: string[];
    dimension: EmotionDimension;
    weight: number;
    originalTerm: string;
    startsWithNegation: boolean;
  }> = [];

  for (const item of PHRASE_LEXICON) {
    const norm = normalizeLexiconText(item.term);
    if (!norm || seen.has(norm)) continue;
    const tokens = norm.split(" ").filter(Boolean);
    if (tokens.length < 2) continue;
    seen.add(norm);
    list.push({
      tokens,
      dimension: item.dimension,
      weight: item.weight,
      originalTerm: item.term,
      startsWithNegation: NEGATION_WORDS.has(tokens[0]),
    });
  }

  return list.sort((a, b) => b.tokens.length - a.tokens.length);
})();

/**
 * Pre-normalized O(1) lookup map for single-word tokens.
 */
export const NORMALIZED_TOKEN_MAP: Map<string, NormalizedLexiconMatch> = (() => {
  const map = new Map<string, NormalizedLexiconMatch>();
  for (const item of TOKEN_LEXICON) {
    const norm = normalizeLexiconText(item.term);
    if (!norm) continue;
    if (!map.has(norm)) {
      map.set(norm, {
        dimension: item.dimension,
        weight: item.weight,
        originalTerm: item.term,
      });
    }
  }
  return map;
})();

/**
 * Resolves a normalized token against the single-word lexicon (checking Arabic prefixes and elongation).
 */
export function lookupLexiconToken(normalizedToken: string): NormalizedLexiconMatch | null {
  const candidates = getArabicPrefixCandidates(normalizedToken);
  for (const cand of candidates) {
    const match = NORMALIZED_TOKEN_MAP.get(cand);
    if (match) return match;
  }
  return null;
}

/**
 * Checks whether a normalized token is a negation trigger, including prefixed Arabic conjunctions (ومش، ولا، فمش، فلا، وليس).
 */
export function isNegationToken(normalizedToken: string): boolean {
  if (NEGATION_WORDS.has(normalizedToken)) return true;
  if (
    normalizedToken.length >= 3 &&
    (normalizedToken.startsWith("و") || normalizedToken.startsWith("ف")) &&
    NEGATION_WORDS.has(normalizedToken.slice(1))
  ) {
    return true;
  }
  return false;
}

/**
 * Resolves an intensity modifier, including prefixed Arabic forms (وجدا، وأوي، فخالص) and elongated forms.
 */
export function lookupIntensityModifier(normalizedToken: string): number | undefined {
  if (INTENSITY_MODIFIERS[normalizedToken] !== undefined) {
    return INTENSITY_MODIFIERS[normalizedToken];
  }
  for (const cand of collapseElongationCandidates(normalizedToken)) {
    if (INTENSITY_MODIFIERS[cand] !== undefined) {
      return INTENSITY_MODIFIERS[cand];
    }
    if (
      cand.length >= 3 &&
      (cand.startsWith("و") || cand.startsWith("ف") || cand.startsWith("ب")) &&
      INTENSITY_MODIFIERS[cand.slice(1)] !== undefined
    ) {
      return INTENSITY_MODIFIERS[cand.slice(1)];
    }
  }
  return undefined;
}
