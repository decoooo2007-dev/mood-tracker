"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Database, Share2, Lock, User, Mail, ArrowLeft, FileText } from "lucide-react";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import { translations, Locale } from "@/lib/i18n/translations";

export default function PrivacyPage() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("moodflow-locale") as Locale;
    if (stored === "en" || stored === "ar") {
      setLocale(stored);
    }

    const checkRtl = () => {
      const rtl = document.documentElement.dir === "rtl";
      setLocale(rtl ? "ar" : "en");
    };
    checkRtl();

    const observer = new MutationObserver(checkRtl);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["dir"],
    });

    return () => observer.disconnect();
  }, []);

  const isArabic = locale === "ar";

  const t = (key: string): string => {
    return translations[locale][key as keyof typeof translations.en] || translations.en[key as keyof typeof translations.en] || key;
  };

  const sections = [
    { icon: Shield, title: t("privacy.intro"), key: "intro" },
    { icon: Database, title: t("privacy.dataWeCollect"), desc: t("privacy.dataWeCollectDesc"), key: "dataWeCollect" },
    { icon: Database, title: t("privacy.dataStorage"), desc: t("privacy.dataStorageDesc"), key: "dataStorage" },
    { icon: FileText, title: t("privacy.dataUsage"), desc: t("privacy.dataUsageDesc"), key: "dataUsage" },
    { icon: Share2, title: t("privacy.dataSharing"), desc: t("privacy.dataSharingDesc"), key: "dataSharing" },
    { icon: User, title: t("privacy.yourRights"), desc: t("privacy.yourRightsDesc"), key: "yourRights" },
    { icon: Lock, title: t("privacy.security"), desc: t("privacy.securityDesc"), key: "security" },
    { icon: Mail, title: t("privacy.contact"), desc: t("privacy.contactDesc"), key: "contact" },
  ];

  return (
    <GlassBackground>
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12" dir={isArabic ? "rtl" : "ltr"}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className={`w-5 h-5 ${isArabic ? "rotate-180" : ""}`} />
            <span>{isArabic ? "رجوع" : "Back"}</span>
          </button>

          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-500 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold text-white mb-2">{t("privacy.title")}</h1>
          <p className="text-white/60">
            {t("legal.lastUpdated")}: {new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </motion.div>

        {/* Content */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {sections.map((section, index) => (
            <motion.div
              key={section.key}
              className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
            >
              <div className={`flex items-start gap-4 ${isArabic ? "flex-row-reverse" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <section.icon className="w-5 h-5 text-purple-400" />
                </div>
                <div className={isArabic ? "text-right" : ""}>
                  <h2 className="text-lg font-semibold text-white mb-2">{section.title}</h2>
                  {section.desc && (
                    <p className="text-white/60 leading-relaxed">{section.desc}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <p className="text-white/40 text-sm">
            MoodFlow - {t("app.title")}
          </p>
        </motion.div>
      </div>

      <Navigation />
    </GlassBackground>
  );
}
