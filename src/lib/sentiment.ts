import type { MoodType } from "@/types/mood";
import { currentLocale } from "./i18n/translations";

export interface SentimentResult {
  score: number; // -1 to 1
  keywords: string[];
  insight: string;
  suggestedMood?: MoodType;
}

const positiveKeywords = [
  "happy", "joy", "excited", "grateful", "thankful", "amazing", "wonderful",
  "great", "fantastic", "love", "awesome", "excellent", "beautiful", "blessed",
  "success", "achieved", "proud", "accomplished", "relaxed", "peaceful",
  "calm", "energized", "motivated", "inspired", "creative", "productive",
  "fun", "enjoyed", "celebrate", "win", "breakthrough", "progress", "growth",
  "learned", "improved", "better", "hope", "optimistic", "positive", "smile",
  "laugh", "giggle", "cheerful", "delighted", "satisfied", "content",
  // Arabic positive
  "سعيد", "سعادة", "مرتاح", "راحة", "الحمدلله", "ممتن", "امتنان", "متفائل", "تفاؤل",
  "هادئ", "هدوء", "رائع", "روعة", "جميل", "جمال", "فرحان", "مبسوط", "ممتاز",
  "مستريح", "بخير", "خير", "أمل", "سلام", "فرح", "نشاط", "نشيط", "طاقة", "حب", "إنجاز", "نجاح"
];

const negativeKeywords = [
  "sad", "depressed", "anxious", "worried", "stressed", "frustrated", "angry",
  "annoyed", "upset", "disappointed", "heartbroken", "lonely", "isolated",
  "tired", "exhausted", "overwhelmed", "burned out", "struggling", "difficult",
  "hard", "terrible", "awful", "horrible", "miserable", "useless", "failure",
  "worthless", "hopeless", "desperate", "scared", "afraid", "nervous", "panic",
  "cry", "tears", "hurt", "pain", "ache", "sick", "ill", "unwell", "unhappy",
  "regret", "guilt", "shame", "embarrassed", "awkward", "uncomfortable",
  // Arabic negative
  "حزين", "حزن", "قلق", "متوتر", "توتر", "تعبان", "تعب", "متعب", "محبط", "إحباط",
  "غاضب", "غضب", "مكتئب", "اكتئاب", "وحيد", "وحدة", "مرهق", "إرهاق", "ضايق", "متضايق",
  "ضيق", "خائف", "خوف", "يائس", "يأس", "ألم", "وجع", "فشل", "فاشل", "سيء", "صعب", "معقد"
];

const negationWords = new Set([
  "not", "never", "no", "don't", "cant", "can't", "isnt", "isn't",
  "wasnt", "wasn't", "won't", "wouldn't", "couldn't", "didn't",
  "لا", "ليس", "مش", "ما", "لم", "لن", "غير"
]);

function matchesKeywordList(token: string, list: string[]): boolean {
  if (list.includes(token)) return true;
  if (token.length > 2 && token.startsWith("و") && list.includes(token.slice(1))) return true;
  if (token.length > 3 && token.startsWith("ال") && list.includes(token.slice(2))) return true;
  if (token.length > 4 && token.startsWith("وال") && list.includes(token.slice(3))) return true;
  if (token.length > 2 && token.startsWith("ب") && list.includes(token.slice(1))) return true;
  if (token.length > 4 && token.startsWith("بال") && list.includes(token.slice(3))) return true;
  if (token.length > 2 && token.startsWith("ف") && list.includes(token.slice(1))) return true;
  return false;
}

const intensityModifiers: Record<string, number> = {
  "very": 1.5,
  "extremely": 2.0,
  "really": 1.3,
  "super": 1.4,
  "so": 1.2,
  "quite": 1.1,
  "slightly": 0.5,
  "a bit": 0.6,
  "kind of": 0.7,
  "جداً": 1.5,
  "كثيراً": 1.5,
  "للغاية": 2.0,
};

export function analyzeSentiment(text: string, locale?: "en" | "ar"): SentimentResult {
  if (!text || !text.trim()) {
    const isAr = (locale || currentLocale) === "ar";
    return {
      score: 0,
      keywords: [],
      insight: isAr ? "لا يوجد نص كافٍ للتحليل بعد." : "No text provided for sentiment analysis.",
      suggestedMood: "Calm",
    };
  }

  // Preserve letters, numbers, spaces, and apostrophes for contractions
  const normalized = text.toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);

  const foundKeywords: string[] = [];
  let scoreSum = 0;
  let matchesCount = 0;

  tokens.forEach((token, index) => {
    let polarity = 0;
    if (matchesKeywordList(token, positiveKeywords)) {
      polarity = 1;
    } else if (matchesKeywordList(token, negativeKeywords)) {
      polarity = -1;
    }

    if (polarity !== 0) {
      foundKeywords.push(token);

      // 2-word lookback for negations
      let isNegated = false;
      let multiplier = 1.0;

      for (let offset = 1; offset <= 2; offset++) {
        const prevIndex = index - offset;
        if (prevIndex >= 0) {
          const prev = tokens[prevIndex];
          if (negationWords.has(prev)) {
            isNegated = !isNegated;
          }
          if (intensityModifiers[prev]) {
            multiplier *= intensityModifiers[prev];
          }
        }
      }

      if (isNegated) {
        polarity = -polarity;
      }

      scoreSum += polarity * multiplier;
      matchesCount += 1;
    }
  });

  let score = 0;
  if (matchesCount > 0) {
    score = scoreSum / matchesCount;
    score = Math.max(-1, Math.min(1, score));
  }

  const effectiveLocale = locale || currentLocale;
  const isArabic = effectiveLocale === "ar";

  let insight = "";
  if (isArabic) {
    if (score > 0.5) {
      insight = "مشاعر إيجابية رائعة! كلماتك تعكس الفرح والامتنان.";
    } else if (score > 0.2) {
      insight = "إيجابي بشكل عام، أنت في حالة نفسية جيدة.";
    } else if (score > -0.2) {
      insight = "مشاعر متوازنة، ليست إيجابية أو سلبية للغاية.";
    } else if (score > -0.5) {
      insight = "تظهر بعض المشاعر السلبية. قد يفيدك بعض الاسترخاء والرعاية الذاتية.";
    } else {
      insight = "تم رصد مشاعر ثقيلة. قد يساعدك التحدث مع شخص تثق به.";
    }
  } else {
    if (score > 0.5) {
      insight = "Very positive vibes! Your words reflect joy and gratitude.";
    } else if (score > 0.2) {
      insight = "Generally positive - you're in a good headspace.";
    } else if (score > -0.2) {
      insight = "Balanced emotions - neither very positive nor negative.";
    } else if (score > -0.5) {
      insight = "Some negative feelings present. Consider some self-care.";
    } else {
      insight = "Heavy emotions detected. It might help to talk to someone.";
    }
  }

  let suggestedMood: MoodType | undefined;
  if (score > 0.6) suggestedMood = "Happy";
  else if (score > 0.2) suggestedMood = "Calm";
  else if (score < -0.6) suggestedMood = "Sad";
  else if (score < -0.2) suggestedMood = "Frustrated";
  else suggestedMood = "Tired";

  return {
    score: Math.round(score * 100) / 100,
    keywords: [...new Set(foundKeywords)].slice(0, 5),
    insight,
    suggestedMood,
  };
}

export function generateWeeklyInsight(
  entries: { mood: MoodType; date: string }[],
  locale?: "en" | "ar"
): string {
  const isArabic = (locale || currentLocale) === "ar";

  if (entries.length === 0) {
    return isArabic
      ? "ابدأ التتبع لرؤية تحليلات حول أسبوعك!"
      : "Start tracking to see insights about your week!";
  }

  const moodScore: Record<MoodType, number> = {
    Happy: 5,
    Calm: 4,
    Tired: 3,
    Sad: 2,
    Frustrated: 1,
  };

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

  const avgScore = thisWeek.reduce((sum, e) => sum + (moodScore[e.mood] || 3), 0) / thisWeek.length;
  const moodCounts: Record<MoodType, number> = { Happy: 0, Calm: 0, Sad: 0, Frustrated: 0, Tired: 0 };
  thisWeek.forEach((e) => {
    if (moodCounts[e.mood] !== undefined) moodCounts[e.mood]++;
  });

  const dominantMood = (Object.entries(moodCounts).reduce((a, b) => (b[1] > a[1] ? b : a))[0]) as MoodType;
  const dominantMoodAr = moodNamesAr[dominantMood] || "متوازن";

  if (avgScore >= 4) {
    return isArabic
      ? `أسبوع رائع! كنت تشعر بـ${dominantMoodAr} في الغالب. استمر في العمل الرائع!`
      : `This week has been wonderful! You reported ${dominantMood.toLowerCase()} most often. Keep up the great work!`;
  } else if (avgScore >= 3) {
    return isArabic
      ? `أسبوع جيد بشكل عام. كان شعورك المعتاد هو ${dominantMoodAr}. كيف يمكنك جعل الأسبوع القادم أفضل؟`
      : `A solid week overall. ${dominantMood} has been your typical mood. How can you make next week even better?`;
  } else if (avgScore >= 2) {
    return isArabic
      ? `كان لهذا الأسبوع بعض التحديات. شعرت بـ${dominantMoodAr} في الغالب. تذكر أنه من الطبيعي أن تمر بأيام صعبة.`
      : `This week had some challenges. You mostly felt ${dominantMood.toLowerCase()}. Remember, it's okay to have difficult days.`;
  } else {
    return isArabic
      ? `يبدو أن هذا كان أسبوعاً صعباً. كنت تشعر بـ${dominantMoodAr} غالباً. فكر في طلب الدعم إذا احتجت إلى ذلك.`
      : `It sounds like this was a tough week. You reported ${dominantMood.toLowerCase()} often. Consider reaching out for support if you need it.`;
  }
}