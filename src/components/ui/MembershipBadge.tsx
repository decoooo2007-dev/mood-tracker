"use client";

import { Crown, Sparkles, Zap, CircleDot } from "lucide-react";
import { SUBSCRIPTION_PLANS, normalizeSubscriptionTier } from "@/lib/subscription";
import { useLanguage } from "@/lib/providers";
import type { SubscriptionTier } from "@/types/mood";

interface MembershipBadgeProps {
  tier?: SubscriptionTier | string | null;
  size?: "sm" | "md";
  className?: string;
}

const BADGE_STYLE_MAP: Record<
  SubscriptionTier,
  {
    wrapperClass: string;
    iconClass: string;
  }
> = {
  free: {
    wrapperClass:
      "recessed-well theme-text-secondary border border-white/15 shadow-none",
    iconClass: "theme-text-muted",
  },
  monthly: {
    wrapperClass:
      "keep-white bg-gradient-to-r from-blue-600/90 to-cyan-500/90 text-white border border-cyan-300/40 shadow-[0_4px_14px_rgba(37,99,235,0.28)]",
    iconClass: "text-cyan-100",
  },
  yearly: {
    wrapperClass:
      "keep-white bg-gradient-to-r from-indigo-600 via-blue-500 to-teal-500 text-white border border-teal-300/50 shadow-[0_4px_16px_rgba(20,184,166,0.32)]",
    iconClass: "text-teal-100",
  },
  lifetime: {
    wrapperClass:
      "bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 font-bold border border-yellow-200/90 shadow-[0_4px_18px_rgba(234,179,8,0.42)]",
    iconClass: "",
  },
};

export default function MembershipBadge({
  tier,
  size = "sm",
  className = "",
}: MembershipBadgeProps) {
  const { locale } = useLanguage();
  const normalized = normalizeSubscriptionTier(tier);
  const meta = SUBSCRIPTION_PLANS[normalized];
  const style = BADGE_STYLE_MAP[normalized];

  const isSm = size === "sm";
  const iconSize = isSm ? "w-3 h-3" : "w-3.5 h-3.5";
  const label = locale === "ar" ? meta.badgeAr : meta.badgeEn;

  const Icon =
    normalized === "lifetime"
      ? Crown
      : normalized === "yearly"
      ? Sparkles
      : normalized === "monthly"
      ? Zap
      : CircleDot;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full shrink-0 tracking-tight ${
        isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      } font-semibold ${style.wrapperClass} ${className}`}
      style={
        normalized === "lifetime"
          ? { color: "#0F172A" }
          : undefined
      }
      title={locale === "ar" ? meta.labelAr : meta.labelEn}
    >
      <Icon
        className={`${iconSize} shrink-0 ${style.iconClass}`}
        style={normalized === "lifetime" ? { color: "#451a03" } : undefined}
      />
      <span style={normalized === "lifetime" ? { color: "#0F172A" } : undefined}>
        {label}
      </span>
    </span>
  );
}
