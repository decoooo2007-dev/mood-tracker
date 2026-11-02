"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send, Check, ArrowLeft } from "lucide-react";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import { useLanguage } from "@/lib/providers";

type FeedbackCategory = "general" | "bug" | "feature" | "design" | "other";

export default function FeedbackPage() {
  const { isRtl, t } = useLanguage();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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
        body: JSON.stringify({ rating, category, message: message.trim() }),
      });

      if (response.ok) {
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setRating(0);
          setMessage("");
          setCategory("general");
        }, 3000);
      } else {
        const data = await response.json().catch(() => ({}));
        setError(data.error || t("feedback.error"));
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

  const categories: { id: FeedbackCategory; label: string }[] = [
    { id: "general", label: isRtl ? "عام" : "General" },
    { id: "feature", label: isRtl ? "اقتراح ميزة" : "Feature" },
    { id: "bug", label: isRtl ? "إبلاغ عن خطأ" : "Bug" },
    { id: "design", label: isRtl ? "التصميم" : "Design" },
    { id: "other", label: isRtl ? "أخرى" : "Other" },
  ];

  const trimmedLength = message.trim().length;
  const isTooShort = trimmedLength > 0 && trimmedLength < 10;

  return (
    <GlassBackground>
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-start mb-2">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs transition-colors"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>{isRtl ? "رجوع" : "Back"}</span>
            </button>
          </div>

          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <Star className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">{t("feedback.title")}</h1>
          <p className="text-white/60 text-sm">{t("settings.feedbackDesc")}</p>
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
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400">
                <Check className="w-10 h-10" />
              </div>
              <p className="text-white text-xl font-semibold">{t("feedback.thankYou")}</p>
              <p className="text-white/60 mt-1 text-sm">{t("feedback.received")}</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Star Rating */}
              <div>
                <label className="block text-sm text-white/70 mb-3 font-medium">
                  {t("feedback.howLikely")}
                </label>
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-2 sm:p-3 transition-transform hover:scale-110 touch-target"
                      aria-label={`${star} star`}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                          star <= (hoverRating || rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-white/25"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {(hoverRating || rating) > 0 && (
                  <p className="text-center text-sm font-medium text-amber-300 mt-2">
                    {ratingLabels[(hoverRating || rating) - 1]}
                  </p>
                )}
              </div>

              {/* Category Picker */}
              <div>
                <label className="block text-sm text-white/70 mb-2 font-medium">
                  {isRtl ? "نوع الملاحظة" : "Category"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        category === c.id
                          ? "bg-purple-500 text-white shadow-sm"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm text-white/70 font-medium">
                    {t("feedback.feedback")}
                  </label>
                  <span className="text-xs text-white/40">
                    {message.length} / 500{" "}
                    {isTooShort && (
                      <span className="text-amber-400">
                        {isRtl ? "(١٠ أحرف على الأقل)" : "(min 10 chars)"}
                      </span>
                    )}
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("feedback.placeholder")}
                  maxLength={500}
                  className="w-full h-36 p-4 bg-white/10 rounded-2xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 resize-none text-sm leading-relaxed"
                />
              </div>

              {/* Error */}
              {error && (
                <motion.p
                  className="text-red-400 text-xs text-center"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSending || rating === 0 || trimmedLength < 10}
                className="w-full py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isSending ? (
                  <motion.div
                    className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"
                  />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{t("feedback.send")}</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <Navigation />
    </GlassBackground>
  );
}
