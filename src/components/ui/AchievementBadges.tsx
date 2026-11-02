"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Zap, Heart, Sparkles, Lock } from "lucide-react";
import { useLanguage } from "@/lib/providers";

interface AchievementBadgesProps {
  longestStreak: number;
  totalEntries: number;
}

export default function AchievementBadges({
  longestStreak,
  totalEntries,
}: AchievementBadgesProps) {
  const { isRtl, t } = useLanguage();
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);

  const badges = [
    {
      id: "first_entry",
      label: isRtl ? "أول تسجيل" : "First Check-In",
      desc: isRtl ? "سجلت أول مزاج بنجاح" : "Logged your very first mood entry",
      icon: Sparkles,
      color: "from-emerald-400 to-teal-500",
      unlocked: totalEntries >= 1,
      requirement: isRtl ? "إدخال واحد" : "1 entry",
    },
    {
      id: "streak_3",
      label: isRtl ? "شعلة ٣ أيام" : "3-Day Spark",
      desc: isRtl ? "واصلت التتبع لـ ٣ أيام متتالية" : "Maintained a 3-day streak",
      icon: Zap,
      color: "from-amber-400 to-orange-500",
      unlocked: longestStreak >= 3,
      requirement: isRtl ? "سلسلة ٣ أيام" : "3-day streak",
    },
    {
      id: "streak_7",
      label: isRtl ? "لهب ٧ أيام" : "7-Day Flame",
      desc: isRtl ? "أتممت أسبوعاً كاملاً من الوعي الذاتي" : "Completed a full 7-day week of awareness",
      icon: Flame,
      color: "from-orange-500 to-red-500",
      unlocked: longestStreak >= 7,
      requirement: isRtl ? "سلسلة ٧ أيام" : "7-day streak",
    },
    {
      id: "streak_14",
      label: isRtl ? "وعي ١٤ يوماً" : "14-Day Mindful",
      desc: isRtl ? "بنيت عادة راسخة لمدة أسبوعين" : "Built a 2-week consistent journaling habit",
      icon: Heart,
      color: "from-pink-500 to-rose-500",
      unlocked: longestStreak >= 14,
      requirement: isRtl ? "سلسلة ١٤ يوماً" : "14-day streak",
    },
    {
      id: "streak_30",
      label: isRtl ? "سيد المزاج" : "30-Day Master",
      desc: isRtl ? "حققت شهراً كاملاً من تتبع المزاج" : "Achieved a full 30-day journaling streak",
      icon: Trophy,
      color: "from-yellow-400 to-amber-500",
      unlocked: longestStreak >= 30,
      requirement: isRtl ? "سلسلة ٣٠ يوماً" : "30-day streak",
    },
  ];

  const triggerCelebration = async () => {
    try {
      const confettiModule = await import("canvas-confetti");
      const confetti = confettiModule.default;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999,
      });
    } catch {
      // Ignore if canvas-confetti is unavailable
    }
  };

  return (
    <div className="glass rounded-3xl p-6 mb-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-white font-semibold text-base">
              {t("badges.title")}
            </h2>
            <p className="text-white/50 text-xs">
              {isRtl ? "احتفل بالتزامك واستمراريتك" : "Celebrate your consistency and milestones"}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-white/10 rounded-full text-white/80">
          {badges.filter((b) => b.unlocked).length} / {badges.length}
        </span>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {badges.map((badge, i) => {
          const Icon = badge.icon;
          const isSelected = selectedBadge === badge.id;

          return (
            <motion.button
              key={badge.id}
              onClick={() => {
                setSelectedBadge(isSelected ? null : badge.id);
                if (badge.unlocked) triggerCelebration();
              }}
              className={`relative p-3.5 rounded-2xl flex flex-col items-center text-center transition-all ${
                badge.unlocked
                  ? "bg-white/10 border border-white/20 hover:bg-white/15"
                  : "bg-white/5 border border-white/5 opacity-50"
              } ${isSelected ? "ring-2 ring-white scale-105" : ""}`}
              whileHover={{ scale: badge.unlocked ? 1.05 : 1 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              aria-label={`${badge.label}: ${badge.unlocked ? "Unlocked" : "Locked"}`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2 shadow-lg ${
                  badge.unlocked
                    ? `bg-gradient-to-br ${badge.color} text-white`
                    : "bg-white/10 text-white/30"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>

              <span className={`text-xs font-semibold mb-0.5 ${badge.unlocked ? "text-white" : "text-white/50"}`}>
                {badge.label}
              </span>
              <span className="text-[10px] text-white/40">
                {badge.requirement}
              </span>

              {!badge.unlocked && (
                <div className="absolute top-2 right-2 text-white/40">
                  <Lock className="w-3 h-3" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Badge Detail */}
      {selectedBadge && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-white/80 text-center"
        >
          {badges.find((b) => b.id === selectedBadge)?.desc}
        </motion.div>
      )}
    </div>
  );
}
