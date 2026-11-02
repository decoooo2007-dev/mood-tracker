"use client";

import { motion } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/providers";

export default function OfflinePage() {
  const { isRtl, t } = useLanguage();

  const handleRetry = () => {
    if (typeof window !== "undefined") {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        window.location.href = "/";
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0F0F14] flex items-center justify-center p-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <motion.div
        className="max-w-md w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Icon */}
        <motion.div
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-500/20 mb-6 shadow-xl"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <WifiOff className="w-12 h-12 text-purple-400" />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-3xl font-bold text-white mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {t("offline.title")}
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-white/60 mb-6 leading-relaxed text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {t("offline.subtitle")}
        </motion.p>

        {/* Note Card */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 mb-6 text-xs text-white/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {isRtl
            ? "💡 مدخلاتك محفوظة محلياً في أمان وستتم مزامنتها تلقائياً عند اتصالك بالإنترنت."
            : "💡 Your entries are stored safely on your device and will sync automatically when back online."}
        </motion.div>

        {/* Retry Button */}
        <motion.button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg text-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t("offline.retry")}</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
