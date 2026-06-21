"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, Send, Check, Loader2 } from "lucide-react";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import { translations, Locale } from "@/lib/i18n/translations";

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [locale, setLocale] = useState<Locale>("en");

  // Get locale from localStorage and listen for changes
  useEffect(() => {
    const stored = localStorage.getItem("moodflow-locale") as Locale;
    if (stored === "en" || stored === "ar") {
      setLocale(stored);
    }

    // Listen for direction changes (from Navigation component)
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

  const handleSubmit = async () => {
    if (rating === 0) {
      setError(t("feedback.selectRating"));
      return;
    }
    if (message.trim().length < 10) {
      setError(t("feedback.minLength"));
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message }),
      });

      if (response.ok) {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setRating(0);
          setMessage("");
        }, 3000);
      } else {
        setError(t("feedback.error"));
      }
    } catch {
      setError(t("feedback.error"));
    } finally {
      setIsSending(false);
    }
  };

  const ratingLabels = [
    t("feedback.rating.veryBad"),
    t("feedback.rating.bad"),
    t("feedback.rating.okay"),
    t("feedback.rating.good"),
    t("feedback.rating.veryGood"),
  ];

  return (
    <GlassBackground>
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12" dir={isArabic ? "rtl" : "ltr"}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Star className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("feedback.title")}</h1>
          <p className="text-white/60">{t("settings.feedbackDesc")}</p>
        </motion.div>

        {/* Feedback Card */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {sent ? (
            <motion.div
              className="flex flex-col items-center justify-center py-12"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <p className="text-white text-xl font-medium">{t("feedback.thankYou")}</p>
              <p className="text-white/60 mt-2">{t("feedback.received")}</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Rating */}
              <div>
                <label className={`block text-sm text-white/60 mb-3 ${isArabic ? "text-right" : ""}`}>
                  {t("feedback.howLikely")}
                </label>
                <div className={`flex items-center justify-center gap-3 ${isArabic ? "flex-row-reverse" : ""}`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-2 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 transition-colors ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-white/30"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {(hoverRating || rating) > 0 && (
                  <p className={`text-center text-lg text-white/80 mt-3 ${isArabic ? "text-right" : ""}`}>
                    {ratingLabels[(hoverRating || rating) - 1]}
                  </p>
                )}
              </div>

              {/* Message */}
              <div>
                <label className={`block text-sm text-white/60 mb-2 ${isArabic ? "text-right" : ""}`}>
                  {t("feedback.feedback")}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("feedback.placeholder")}
                  className={`w-full h-40 p-4 bg-white/10 rounded-2xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 resize-none ${
                    isArabic ? "text-right" : ""
                  }`}
                />
                <p className={`text-xs text-white/40 mt-2 ${isArabic ? "text-right" : ""}`}>
                  {message.length} / 10
                </p>
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  className="text-red-400 text-sm text-center"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={isSending}
                className={`w-full py-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all text-lg ${
                  isSending
                    ? "bg-white/10 text-white/40 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                }`}
              >
                {isSending ? (
                  <motion.div
                    className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {t("feedback.send")}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <Navigation />
    </GlassBackground>
  );
}
