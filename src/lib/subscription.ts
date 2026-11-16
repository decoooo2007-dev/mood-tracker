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

/** Primary 3 tiers highlighted in the Plan Badges & Design Showcase */
export const PRIMARY_BADGE_TIERS: readonly SubscriptionTier[] = [
  "free",
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
    labelEn: "Free Starter",
    labelAr: "الباقة المجانية",
    badgeEn: "Free",
    badgeAr: "مجاني",
    priceEgpEn: "0 EGP",
    priceEgpAr: "٠ ج.م",
    priceUsd: "$0",
    summaryEn: "Core daily mood check-ins, streaks, and basic local analytics.",
    summaryAr: "تسجيل المشاعر اليومي والسلسلة المتواصلة والإحصاءات الأساسية.",
    featuresEn: [
      "Daily 5-mood check-ins & notes",
      "Active streak & weekly chart",
      "Default Nile Sapphire theme",
      "JSON & CSV data export",
    ],
    featuresAr: [
      "تسجيل المشاعر اليومية والملاحظات",
      "سلسلة الأيام المتواصلة والرسم الأسبوعي",
      "سمة ياقوت النيل الافتراضية",
      "تصدير البيانات بصيغتي الجدول والنص",
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
    summaryEn: "Full themes, AI deep reflections, and automated mood correlations.",
    summaryAr: "كافة السمات اللونية والتحليلات الذكية وارتباط العوامل.",
    featuresEn: [
      "All 8 atmospheric color palettes",
      "Weekly deep reflection synthesis",
      "What Lifts vs. Drains correlations",
      "Printable monthly wellness PDF report",
    ],
    featuresAr: [
      "جميع لوحات الألوان الثماني",
      "تحليل أسبوعي عميق للمشاعر",
      "تحليل العوامل الرافعة والمستنزفة للمزاج",
      "تقرير شهري جاهز للطباعة",
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
    summaryEn: "Best recurring value (save 37%) with unlimited historical heatmap ranges.",
    summaryAr: "أفضل قيمة متكررة بتوفير ٣٧٪ مع خريطة حرارية شاملة لجميع الفترات.",
    featuresEn: [
      "Everything in Pro Monthly (Save 37%)",
      "30D / 90D / 365D Mood Heatmap analytics",
      "Custom editable Lift/Drain factors",
      "Zero-knowledge E2EE cloud sync",
    ],
    featuresAr: [
      "جميع مزايا الباقة الشهرية بتوفير ٣٧٪",
      "خريطة المزاج الحرارية الكاملة لمدة سنة",
      "تخصيص وتعديل عوامل رفع وخفض المزاج",
      "مزامنة سحابية مشفرة بالكامل",
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
    summaryEn: "Permanent Founding Member status unlocking every current and future module.",
    summaryAr: "عضوية دائمة مدى الحياة تفتح جميع المزايا الحالية والمستقبلية.",
    featuresEn: [
      "Permanent Founding Crown Badge",
      "All 8 themes & Mode-Reactive Aura unlocked",
      "Priority access to future AI & wellness modules",
      "Lifetime updates with zero recurring fees",
    ],
    featuresAr: [
      "شارة التاج الذهبية الدائمة للمؤسسين",
      "فتح جميع السمات والتوهج التفاعلي",
      "أولوية الوصول لوحدات الذكاء المستقبلية",
      "تحديثات دائمة بدون أي رسوم متكررة",
    ],
  },
};

export interface TierCapabilities {
  tier: SubscriptionTier;
  paywallActive: boolean;
  allPalettes: boolean;
  deepAiReflections: boolean;
  editableFactors: boolean;
  fullYearHeatmap: boolean;
  pdfReportExport: boolean;
  futureModulesPriority: boolean;
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
 * When `enforcePaywall` is `false` (pre-payment launch), returns `true` cleanly
 * so features remain open while tier badges & contracts are tested.
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
 * Computes planned feature entitlements for a tier.
 */
export function getTierCapabilities(
  userTier: SubscriptionTier | string | null | undefined,
  enforcePaywall: boolean = PAYWALL_ENFORCEMENT_ENABLED
): TierCapabilities {
  const tier = normalizeSubscriptionTier(userTier);
  return {
    tier,
    paywallActive: enforcePaywall,
    allPalettes: hasTierAccess(tier, "monthly", enforcePaywall),
    deepAiReflections: hasTierAccess(tier, "monthly", enforcePaywall),
    editableFactors: hasTierAccess(tier, "yearly", enforcePaywall),
    fullYearHeatmap: hasTierAccess(tier, "yearly", enforcePaywall),
    pdfReportExport: hasTierAccess(tier, "monthly", enforcePaywall),
    futureModulesPriority: hasTierAccess(tier, "lifetime", enforcePaywall),
  };
}
