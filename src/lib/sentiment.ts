import { MoodType } from "@/types/mood";

interface SentimentResult {
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
  "laugh", "giggle", "cheerful", "delighted", "satisfied", "content"
];

const negativeKeywords = [
  "sad", "depressed", "anxious", "worried", "stressed", "frustrated", "angry",
  "annoyed", "upset", "disappointed", "heartbroken", "lonely", "isolated",
  "tired", "exhausted", "overwhelmed", "burned out", "struggling", "difficult",
  "hard", "terrible", "awful", "horrible", "miserable", "useless", "failure",
  "worthless", "hopeless", "desperate", "scared", "afraid", "nervous", "panic",
  "cry", "tears", "hurt", "pain", "ache", "sick", "ill", "unwell", "unhappy",
  "regret", "guilt", "shame", "embarrassed", "awkward", "uncomfortable"
];

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
  "not": -1.0,
  "don't": -1.0,
  "doesn't": -1.0,
  "didn't": -1.0,
  "won't": -1.0,
  "can't": -0.5,
  "couldn't": -0.8,
  "never": -1.2,
  "always": 1.2
};

export function analyzeSentiment(text: string): SentimentResult {
  const words = text.toLowerCase().split(/\s+/);
  const foundKeywords: string[] = [];
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach((word, index) => {
    const cleanWord = word.replace(/[.,!?;:'"()]/g, "");

    // Check for positive keywords
    if (positiveKeywords.includes(cleanWord)) {
      foundKeywords.push(cleanWord);
      positiveCount++;

      // Check for preceding intensity modifier
      if (index > 0) {
        const prevWord = words[index - 1].replace(/[.,!?;:'"()]/g, "").toLowerCase();
        if (intensityModifiers[prevWord as keyof typeof intensityModifiers]) {
          positiveCount += intensityModifiers[prevWord as keyof typeof intensityModifiers] - 1;
        }
      }
    }

    // Check for negative keywords
    if (negativeKeywords.includes(cleanWord)) {
      foundKeywords.push(cleanWord);
      negativeCount++;

      // Check for preceding intensity modifier
      if (index > 0) {
        const prevWord = words[index - 1].replace(/[.,!?;:'"()]/g, "").toLowerCase();
        if (intensityModifiers[prevWord as keyof typeof intensityModifiers]) {
          negativeCount += intensityModifiers[prevWord as keyof typeof intensityModifiers] - 1;
        }
      }
    }
  });

  // Calculate sentiment score (-1 to 1)
  const totalKeywords = positiveCount + negativeCount;
  let score = 0;

  if (totalKeywords > 0) {
    score = (positiveCount - negativeCount) / totalKeywords;
    score = Math.max(-1, Math.min(1, score));
  }

  // Generate insight
  let insight = "";
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

  // Suggest a mood based on sentiment
  let suggestedMood: MoodType | undefined;
  if (score > 0.6) suggestedMood = "Happy";
  else if (score > 0.2) suggestedMood = "Calm";
  else if (score < -0.6) suggestedMood = "Sad";
  else if (score < -0.2) suggestedMood = "Frustrated";
  else suggestedMood = "Tired";

  return {
    score,
    keywords: [...new Set(foundKeywords)].slice(0, 5),
    insight,
    suggestedMood
  };
}

export function getCorrelationInsights(
  entries: { mood: MoodType; text: string; date: string; tags?: string[] }[]
): {
  timePatterns: { time: string; mood: MoodType }[];
  tagCorrelations: { tag: string; avgMood: string }[];
  weeklyPatterns: { day: string; avgMood: number }[];
} {
  // Analyze time of day patterns
  const timePatterns: { time: string; mood: MoodType }[] = [];

  // Analyze tag correlations
  const tagMoodMap: Record<string, { sum: number; count: number }> = {};
  const moodScore: Record<MoodType, number> = {
    Happy: 5,
    Calm: 4,
    Tired: 3,
    Sad: 2,
    Frustrated: 1
  };

  entries.forEach((entry) => {
    entry.tags?.forEach((tag: string) => {
      if (!tagMoodMap[tag]) {
        tagMoodMap[tag] = { sum: 0, count: 0 };
      }
      tagMoodMap[tag].sum += moodScore[entry.mood];
      tagMoodMap[tag].count++;
    });
  });

  const tagCorrelations = Object.entries(tagMoodMap)
    .filter(([_, data]) => data.count >= 2)
    .map(([tag, data]) => ({
      tag,
      avgMood: (data.sum / data.count).toFixed(1)
    }))
    .sort((a, b) => parseFloat(b.avgMood) - parseFloat(a.avgMood));

  // Weekly patterns
  const dayMoodMap: Record<string, number[]> = {};
  entries.forEach((entry) => {
    const date = new Date(entry.date);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    if (!dayMoodMap[dayName]) dayMoodMap[dayName] = [];
    dayMoodMap[dayName].push(moodScore[entry.mood]);
  });

  const weeklyPatterns = Object.entries(dayMoodMap).map(([day, scores]) => ({
    day,
    avgMood: scores.reduce((a, b) => a + b, 0) / scores.length
  }));

  return { timePatterns, tagCorrelations, weeklyPatterns };
}

export function generateWeeklyInsight(
  entries: { mood: MoodType; date: string }[]
): string {
  if (entries.length === 0) return "Start tracking to see insights about your week!";

  const moodScore: Record<MoodType, number> = {
    Happy: 5,
    Calm: 4,
    Tired: 3,
    Sad: 2,
    Frustrated: 1
  };

  const thisWeek = entries.filter((e) => {
    const entryDate = new Date(e.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return entryDate >= weekAgo;
  });

  if (thisWeek.length === 0) return "No entries this week yet. Keep tracking!";

  const avgScore = thisWeek.reduce((sum, e) => sum + moodScore[e.mood], 0) / thisWeek.length;
  const moodCounts: Record<MoodType, number> = { Happy: 0, Calm: 0, Sad: 0, Frustrated: 0, Tired: 0 };
  thisWeek.forEach((e) => moodCounts[e.mood]++);
  const dominantMood = Object.entries(moodCounts).reduce((a, b) => b[1] > a[1] ? b : a)[0];

  if (avgScore >= 4) {
    return `This week has been wonderful! You reported ${dominantMood.toLowerCase()} most often. Keep up the great work! 🌟`;
  } else if (avgScore >= 3) {
    return `A solid week overall. ${dominantMood} has been your typical mood. How can you make next week even better?`;
  } else if (avgScore >= 2) {
    return `This week had some challenges. You mostly felt ${dominantMood.toLowerCase()}. Remember, it's okay to have difficult days.`;
  } else {
    return `It sounds like this was a tough week. You reported ${dominantMood.toLowerCase()} often. Consider reaching out for support if you need it. 💙`;
  }
}