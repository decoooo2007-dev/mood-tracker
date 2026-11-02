"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/providers";

export default function CookieConsent() {
  const pathname = usePathname();
  const { t, isRtl } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      const hasDisclaimer =
        localStorage.getItem("moodflow-disclaimer-acknowledged") ||
        localStorage.getItem("moodflow-disclaimer-accepted");
      const hasConsent = localStorage.getItem("moodflow-cookie-consent");

      if (hasDisclaimer && !hasConsent) {
        setIsVisible(true);
      }
    };

    checkVisibility();
    window.addEventListener("moodflow-onboarding-step", checkVisibility);
    return () => {
      window.removeEventListener("moodflow-onboarding-step", checkVisibility);
    };
  }, []);

  const handleAccept = () => {
    localStorage.setItem("moodflow-cookie-consent", "accepted");
    setIsVisible(false);
    window.dispatchEvent(new Event("moodflow-onboarding-step"));
  };

  const handleDecline = () => {
    localStorage.setItem("moodflow-cookie-consent", "declined");
    setIsVisible(false);
    window.dispatchEvent(new Event("moodflow-onboarding-step"));
  };

  if (pathname === "/login" || pathname === "/offline") {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
        >
          <div className="max-w-4xl mx-auto glass-modal rounded-2xl border border-white/20 p-4 md:p-6 shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {/* Icon & Content */}
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{t("cookies.title")}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{t("cookies.desc")}</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <Link
                  href="/privacy"
                  className="flex items-center gap-1 px-4 py-2 text-white/60 hover:text-white text-sm transition-colors"
                >
                  {t("cookies.learnMore")}
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <button
                  onClick={handleDecline}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-all text-sm"
                >
                  {t("legal.decline")}
                </button>
                <button
                  onClick={handleAccept}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-all text-sm font-medium"
                >
                  {t("legal.accept")}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
