"use client";

import { motion } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Icon */}
        <motion.div
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-500/20 mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <WifiOff className="w-12 h-12 text-purple-400" />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-3xl font-bold text-white mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          You're Offline
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-white/60 mb-8 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          It looks like you've lost your internet connection.
          <br />
          Don't worry - your mood entries are saved locally!
        </motion.p>

        {/* Mood Note */}
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-white/80 text-sm">
            💡 <strong>Tip:</strong> Your mood entries are stored on your device.
            They'll sync automatically when you're back online.
          </p>
        </motion.div>

        {/* Retry Button */}
        <motion.button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 transition-all"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className="w-5 h-5" />
          Try Again
        </motion.button>

        {/* Connection Status */}
        <motion.p
          className="text-white/40 text-xs mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          MoodFlow v1.0.0
        </motion.p>
      </motion.div>
    </div>
  );
}
