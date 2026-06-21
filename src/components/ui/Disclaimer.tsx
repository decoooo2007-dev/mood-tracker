"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Heart, Brain, Hand } from "lucide-react";
import { translations, Locale } from "@/lib/i18n/translations";

interface DisclaimerProps {
  onAcknowledge: () => void;
}

export default function Disclaimer({ onAcknowledge }: DisclaimerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    // Check if user has already acknowledged
    const hasAcknowledged = localStorage.getItem("moodflow-disclaimer-acknowledged");
    if (!hasAcknowledged) {
      setIsVisible(true);
    }

    // Get locale
    const stored = localStorage.getItem("moodflow-locale") as Locale;
    if (stored === "en" || stored === "ar") {
      setLocale(stored);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem("moodflow-disclaimer-acknowledged", "true");
    setIsVisible(false);
    onAcknowledge();
  };

  const t = (key: string): string => {
    return translations[locale]?.[key as keyof typeof translations.en] || translations.en[key as keyof typeof translations.en] || key;
  };

  const isArabic = locale === "ar";

  const items = [
    {
      icon: AlertTriangle,
      title: t("disclaimer.notMedical"),
      desc: t("disclaimer.notMedicalDesc"),
      color: "yellow"
    },
    {
      icon: Brain,
      title: t("disclaimer.forAwareness"),
      desc: t("disclaimer.forAwarenessDesc"),
      color: "purple"
    },
    {
      icon: Heart,
      title: t("disclaimer.seekHelp"),
      desc: t("disclaimer.seekHelpDesc"),
      color: "red"
    },
  ];

  const colorClasses = {
    yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
    red: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg pointer-events-auto backdrop-blur-xl bg-black/90 rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              dir={isArabic ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Hand className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{t("disclaimer.title")}</h2>
                    <p className="text-white/60 text-sm">MoodFlow</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-4 space-y-3">
                {items.map((item) => (
                  <div
                    key={item.title}
                    className={`flex items-start gap-3 p-4 rounded-xl ${colorClasses[item.color as keyof typeof colorClasses].bg} border ${colorClasses[item.color as keyof typeof colorClasses].border}`}
                  >
                    <item.icon className={`w-5 h-5 ${colorClasses[item.color as keyof typeof colorClasses].text} flex-shrink-0 mt-0.5`} />
                    <div className={isArabic ? "text-right" : ""}>
                      <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
                      <p className="text-white/70 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Button */}
              <div className="p-6 pt-2">
                <button
                  onClick={handleAcknowledge}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-all"
                >
                  {t("disclaimer.continue")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
