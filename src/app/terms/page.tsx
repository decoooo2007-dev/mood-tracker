"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, CheckCircle, AlertTriangle, Scale, ArrowLeft } from "lucide-react";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import { translations, Locale } from "@/lib/i18n/translations";

export default function TermsPage() {
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
    {
      icon: CheckCircle,
      title: t("terms.acceptance"),
      desc: t("terms.acceptanceDesc"),
      key: "acceptance",
      color: "green"
    },
    {
      icon: FileText,
      title: t("terms.useLicense"),
      desc: t("terms.useLicenseDesc"),
      key: "useLicense",
      color: "blue"
    },
    {
      icon: AlertTriangle,
      title: t("terms.disclaimerTitle"),
      desc: t("terms.disclaimerDesc"),
      key: "disclaimer",
      color: "yellow"
    },
    {
      icon: AlertTriangle,
      title: t("terms.limitations"),
      desc: t("terms.limitationsDesc"),
      key: "limitations",
      color: "red"
    },
    {
      icon: FileText,
      title: t("terms.changes"),
      desc: t("terms.changesDesc"),
      key: "changes",
      color: "purple"
    },
    {
      icon: Scale,
      title: t("terms.governingLaw"),
      desc: t("terms.governingLawDesc"),
      key: "governingLaw",
      color: "gray"
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    green: { bg: "bg-green-500/20", text: "text-green-400" },
    blue: { bg: "bg-blue-500/20", text: "text-blue-400" },
    yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
    red: { bg: "bg-red-500/20", text: "text-red-400" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
    gray: { bg: "bg-gray-500/20", text: "text-gray-400" },
  };

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
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-500 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <FileText className="w-8 h-8 text-white" />
          </motion.div>

          <h1 className="text-3xl font-bold text-white mb-2">{t("terms.title")}</h1>
          <p className="text-white/60">
            {t("legal.lastUpdated")}: {new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </motion.div>

        {/* Intro */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-white/80 leading-relaxed">{t("terms.intro")}</p>
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
                <div className={`w-10 h-10 rounded-xl ${colorClasses[section.color].bg} flex items-center justify-center flex-shrink-0`}>
                  <section.icon className={`w-5 h-5 ${colorClasses[section.color].text}`} />
                </div>
                <div className={isArabic ? "text-right" : ""}>
                  <h2 className="text-lg font-semibold text-white mb-2">{section.title}</h2>
                  <p className="text-white/60 leading-relaxed">{section.desc}</p>
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
