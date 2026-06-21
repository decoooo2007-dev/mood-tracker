"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Star, Check } from "lucide-react";
import { translations, Locale } from "@/lib/i18n/translations";

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
}

export default function FeedbackForm({ isOpen, onClose, locale }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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
          onClose();
          setSent(false);
          setRating(0);
          setMessage("");
        }, 2000);
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md pointer-events-auto backdrop-blur-xl bg-white/10 rounded-3xl border border-white/20 shadow-2xl overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              dir={isArabic ? "rtl" : "ltr"}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">
                  {t("feedback.title")}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {sent ? (
                  <motion.div
                    className="flex flex-col items-center justify-center py-8"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <p className="text-white font-medium">{t("feedback.thankYou")}</p>
                    <p className="text-white/60 text-sm mt-1">{t("feedback.received")}</p>
                  </motion.div>
                ) : (
                  <>
                    {/* Rating */}
                    <div>
                      <label className={`block text-sm text-white/60 mb-2 ${isArabic ? "text-right" : ""}`}>
                        {t("feedback.howLikely")}
                      </label>
                      <div className={`flex items-center justify-center gap-2 ${isArabic ? "flex-row-reverse" : ""}`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-8 h-8 transition-colors ${
                                star <= (hoverRating || rating)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-white/30"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      {(hoverRating || rating) > 0 && (
                        <p className={`text-center text-sm text-white/80 mt-2 ${isArabic ? "text-right" : ""}`}>
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
                        className={`w-full h-28 p-3 bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/40 outline-none focus:border-white/40 resize-none ${
                          isArabic ? "text-right" : ""
                        }`}
                      />
                      <p className={`text-xs text-white/40 mt-1 ${isArabic ? "text-right" : ""}`}>
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
                      className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                        isSending
                          ? "bg-white/10 text-white/40 cursor-not-allowed"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                      }`}
                    >
                      {isSending ? (
                        <motion.div
                          className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {t("feedback.send")}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
