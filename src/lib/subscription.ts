import type { SubscriptionTier } from "@/types/mood";

/**
 * Global Feature-Gating Switch (Pre-Payment Architecture Readiness).
 *
 * Keep `false` while Payment Integration (Paymob / Kashier) is on wait so
 * all existing users enjoy full access without paywall blocks while the tier
 * badges, DB schema, and entitlement helpers are tested and verified.
 * Flip to `true` when separating Free vs. Paid tiers at payment launch.
 */
export const PAYWALL_ENFORCEMENT_ENABLED = false;

export const SUBSCRIPTION_TIERS: readonly SubscriptionTier[] = [
  "free",
  "monthly",
  "yearly",
  "lifetime",
] as const;

export const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  monthly: 1,
  yearly: 2,
  lifetime: 3,
};

export interface SubscriptionPlanMeta {
  id: SubscriptionTier;
  rank: number;
  labelEn: string;
  labelAr: string;
  badgeEn: string;
  badgeAr: string;
  priceEgpEn: string;
  priceEgpAr: string;
  priceUsd: string;
  summaryEn: string;
  summaryAr: string;
  featuresEn: string[];
  featuresAr: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlanMeta> = {
  free: {
    id: "free",
    rank: 0,
    labelEn: "Free Forever",
    labelAr: "الباقة المجانية",
    badgeEn: "Free",
    badgeAr: "مجاني",
    priceEgpEn: "0 EGP",
    priceEgpAr: "٠ ج.م",
    priceUsd: "$0",
    summaryEn:
      "Generous daily tracking built for growth: unlimited check-ins, streaks, breathing, community board, and core insights.",
    summaryAr:
      "تتبع يومي شامل ومجاني: تسجيل غير محدود، السلسلة المتواصلة، تمارين التنفس، ولوحة المنافسة.",
    featuresEn: [
      "Unlimited 5-mood check-ins, notes & streaks",
      "12 preset tags + up to 3 custom tags",
      "7-day trend chart & 30-day Mood Heatmap",
      "4-7-8 Breathing Modal & 5 Achievement Badges",
      "Anonymous Community Board participation",
      "2 Themes (Nile Sapphire & Obsidian Pearl) + JSON/CSV Export",
    ],
    featuresAr: [
      "تسجيل مشاعر يومي غير محدود مع الملاحظات والسلسلة",
      "١٢ وسماً جاهزاً مع ٣ وسوم مخصصة",
      "الرسم البياني الأسبوعي وخريطة ٣٠ يوماً الحرارية",
      "تمرين التنفس الهادئ وشارات الإنجاز الخمس",
      "المشاركة الكاملة في لوحة الإنجاز المجهولة",
      "سمتان لونيتان وتصدير البيانات بملفات النص والجداول",
    ],
  },
  monthly: {
    id: "monthly",
    rank: 1,
    labelEn: "Pro Monthly",
    labelAr: "الباقة الاحترافية الشهرية",
    badgeEn: "Pro Monthly",
    badgeAr: "برو شهري",
    priceEgpEn: "79 EGP / mo",
    priceEgpAr: "٧٩ ج.م / شهرياً",
    priceUsd: "$4.99 / mo",
    summaryEn:
      "Flexible monthly upgrade unlocking all 8 themes, custom factor editing, biometric lock, and printable PDF reports.",
    summaryAr:
      "ترقية شهرية مرنة تفتح كافة السمات الثماني وتعديل العوامل وقفل البصمة والتقارير.",
    featuresEn: [
      "Everything in Free Forever",
      "All 8 curated Dark & Light color palettes",
      "Unlimited custom tags & editable Lifts/Drains factors",
      "90-day Mood Heatmap + 3 Deep Weekly AI Reflections/wk",
      "Biometric (FaceID / TouchID) Lock & Printable PDF Reports",
    ],
    featuresAr: [
      "جميع مزايا الباقة المجانية",
      "فتح كافة لوحات الألوان الثماني للوضعين الداكن والفاتح",
      "وسوم مخصصة غير محدودة وتعديل عوامل رفع وخفض المزاج",
      "خريطة ٩٠ يوماً الحرارية و٣ تحليلات عميقة أسبوعياً",
      "قفل البصمة الحيوية وتقارير شهرية قابلة للطباعة",
    ],
  },
  yearly: {
    id: "yearly",
    rank: 2,
    labelEn: "Pro Yearly",
    labelAr: "الباقة الاحترافية السنوية",
    badgeEn: "Pro Yearly",
    badgeAr: "برو سنوي",
    priceEgpEn: "599 EGP / yr",
    priceEgpAr: "٥٩٩ ج.م / سنوياً",
    priceUsd: "$39.99 / yr",
    summaryEn:
      "Full annual mastery (save 37%) with 365-day full-year heatmap analytics, unlimited AI reflections, and streak shields.",
    summaryAr:
      "إتقان سنوي كامل بتوفير ٣٧٪ مع خريطة ٣٦٥ يوماً الكاملة وتحليلات ذكية غير محدودة.",
    featuresEn: [
      "Everything in Pro Monthly (Save 37% yearly)",
      "Full 365-day year-round Mood Heatmap",
      "Unlimited Deep Weekly AI Reflections & Time-of-Day insights",
      "2 Streak Freeze Shields/month + Annual Year-in-Review PDF",
      "Early access to new seasonal themes & Aurora Pro Badge",
    ],
    featuresAr: [
      "جميع مزايا الباقة الشهرية بتوفير ٣٧٪",
      "خريطة المزاج الحرارية الكاملة لمدة ٣٦٥ يوماً",
      "تحليلات ذكية عميقة غير محدودة حسب أوقات اليوم",
      "درعان لحماية السلسلة شهرياً وتقرير مراجعة العام",
      "أولوية الوصول للسمات الجديدة وشارة البرو السنوية",
    ],
  },
  lifetime: {
    id: "lifetime",
    rank: 3,
    labelEn: "Founding Lifetime",
    labelAr: "عضوية المؤسسين مدى الحياة",
    badgeEn: "Founding Lifetime",
    badgeAr: "مؤسس مدى الحياة",
    priceEgpEn: "1,499 EGP once",
    priceEgpAr: "١٤٩٩ ج.م لمرة واحدة",
    priceUsd: "$79 once",
    summaryEn:
      "One-time VIP Founder status unlocking every current and future MoodFlow flagship AI & wellness module forever.",
    summaryAr:
      "عضوية تأسيسية دائمة تفتح كافة المزايا الحالية ووحدات الذكاء المستقبلية مدى الحياة.",
    featuresEn: [
      "Everything in Pro Yearly Forever (Zero recurring fees)",
      "All Future Flagship Modules Free (Fine-Tuned AI, Camera HRV, Voice Prosody, CBT Reframer & Comfort Vault)",
      "Unlimited Streak Freeze Shields + Encrypted Backup Restore Priority",
      "Exclusive Royal Gold Crown Badge across App & Anonymous Board",
    ],
    featuresAr: [
      "جميع مزايا الباقة السنوية مدى الحياة بدون اشتراك متكرر",
      "فتح جميع الوحدات المستقبلية والنماذج الذكية المتقدمة مجاناً",
      "دروع حماية غير محدودة للسلسلة وأولوية الاستعادة المشفرة",
      "شارة التاج الذهبية الحصرية في التطبيق ولوحة المنافسة",
    ],
  },
};

export interface TierCapabilities {
  tier: SubscriptionTier;
  paywallActive: boolean;
  paletteLimit: number;
  customTagsLimit: number;
  heatmapMaxDays: 30 | 90 | 365;
  weeklyDeepReflectionLimit: number;
  editableFactors: boolean;
  pdfReportExport: boolean;
  biometricLock: boolean;
  streakShieldsPerMonth: number;
  futureModulesIncluded: boolean;
  founderBoardFlair: boolean;
}

/**
 * Safely normalizes any database or unknown value into a valid SubscriptionTier.
 * Always fails closed to `"free"` to prevent privilege escalation.
 */
export function normalizeSubscriptionTier(raw: unknown): SubscriptionTier {
  if (typeof raw !== "string") return "free";
  const cleaned = raw.trim().toLowerCase();
  if (
    cleaned === "lifetime" ||
    cleaned === "founder" ||
    cleaned === "founding"
  ) {
    return "lifetime";
  }
  if (cleaned === "yearly" || cleaned === "annual" || cleaned === "pro_yearly") {
    return "yearly";
  }
  if (cleaned === "monthly" || cleaned === "pro" || cleaned === "pro_monthly") {
    return "monthly";
  }
  return "free";
}

/**
 * Evaluates whether a user tier satisfies a required tier.
 * When `enforcePaywall` is `false` (pre-payment growth phase), returns `true`
 * cleanly so features remain open while tier badges & contracts are tested.
 */
export function hasTierAccess(
  userTier: SubscriptionTier | string | null | undefined,
  requiredTier: SubscriptionTier,
  enforcePaywall: boolean = PAYWALL_ENFORCEMENT_ENABLED
): boolean {
  if (!enforcePaywall) {
    return true;
  }
  const normalizedUser = normalizeSubscriptionTier(userTier);
  return TIER_RANK[normalizedUser] >= TIER_RANK[requiredTier];
}

/**
 * Computes clearly separated feature capabilities across Free, Pro Monthly, Pro Yearly, and Founding Lifetime.
 */
export function getTierCapabilities(
  userTier: SubscriptionTier | string | null | undefined,
  enforcePaywall: boolean = PAYWALL_ENFORCEMENT_ENABLED
): TierCapabilities {
  const tier = normalizeSubscriptionTier(userTier);
  if (!enforcePaywall) {
    return {
      tier,
      paywallActive: false,
      paletteLimit: 8,
      customTagsLimit: Number.POSITIVE_INFINITY,
      heatmapMaxDays: 365,
      weeklyDeepReflectionLimit: Number.POSITIVE_INFINITY,
      editableFactors: true,
      pdfReportExport: true,
      biometricLock: true,
      streakShieldsPerMonth: Number.POSITIVE_INFINITY,
      futureModulesIncluded: true,
      founderBoardFlair: tier === "lifetime",
    };
  }

  if (tier === "lifetime") {
    return {
      tier,
      paywallActive: true,
      paletteLimit: 8,
      customTagsLimit: Number.POSITIVE_INFINITY,
      heatmapMaxDays: 365,
      weeklyDeepReflectionLimit: Number.POSITIVE_INFINITY,
      editableFactors: true,
      pdfReportExport: true,
      biometricLock: true,
      streakShieldsPerMonth: Number.POSITIVE_INFINITY,
      futureModulesIncluded: true,
      founderBoardFlair: true,
    };
  }

  if (tier === "yearly") {
    return {
      tier,
      paywallActive: true,
      paletteLimit: 8,
      customTagsLimit: Number.POSITIVE_INFINITY,
      heatmapMaxDays: 365,
      weeklyDeepReflectionLimit: Number.POSITIVE_INFINITY,
      editableFactors: true,
      pdfReportExport: true,
      biometricLock: true,
      streakShieldsPerMonth: 2,
      futureModulesIncluded: false,
      founderBoardFlair: false,
    };
  }

  if (tier === "monthly") {
    return {
      tier,
      paywallActive: true,
      paletteLimit: 8,
      customTagsLimit: Number.POSITIVE_INFINITY,
      heatmapMaxDays: 90,
      weeklyDeepReflectionLimit: 3,
      editableFactors: true,
      pdfReportExport: true,
      biometricLock: true,
      streakShieldsPerMonth: 0,
      futureModulesIncluded: false,
      founderBoardFlair: false,
    };
  }

  return {
    tier: "free",
    paywallActive: true,
    paletteLimit: 2,
    customTagsLimit: 3,
    heatmapMaxDays: 30,
    weeklyDeepReflectionLimit: 0,
    editableFactors: false,
    pdfReportExport: false,
    biometricLock: false,
    streakShieldsPerMonth: 0,
    futureModulesIncluded: false,
    founderBoardFlair: false,
  };
}
