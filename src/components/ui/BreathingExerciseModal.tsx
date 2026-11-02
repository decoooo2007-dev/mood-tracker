"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wind, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/providers";

interface BreathingExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = "inhale" | "hold" | "exhale";

export default function BreathingExerciseModal({
  isOpen,
  onClose,
}: BreathingExerciseModalProps) {
  const { isRtl, t } = useLanguage();
  const [phase, setPhase] = useState<Phase>("inhale");
  const [countdown, setCountdown] = useState<number>(4);
  const [cycle, setCycle] = useState<number>(1);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // 4-7-8 timer logic
  useEffect(() => {
    if (!isOpen) {
      setPhase("inhale");
      setCountdown(4);
      setCycle(1);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        // Transition phase
        if (phase === "inhale") {
          setPhase("hold");
          return 7;
        } else if (phase === "hold") {
          setPhase("exhale");
          return 8;
        } else {
          setPhase("inhale");
          setCycle((c) => c + 1);
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, phase]);

  if (!isOpen) return null;

  const phaseConfig: Record<
    Phase,
    { label: string; duration: number; scale: number; color: string; border: string; bg: string }
  > = {
    inhale: {
      label: t("breathing.inhale"),
      duration: 4,
      scale: 1.35,
      color: "text-purple-300",
      border: "border-purple-400",
      bg: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(236,72,153,0.15) 70%)",
    },
    hold: {
      label: t("breathing.hold"),
      duration: 7,
      scale: 1.35,
      color: "text-pink-300",
      border: "border-pink-400",
      bg: "radial-gradient(circle, rgba(236,72,153,0.4) 0%, rgba(244,114,182,0.15) 70%)",
    },
    exhale: {
      label: t("breathing.exhale"),
      duration: 8,
      scale: 0.95,
      color: "text-sky-300",
      border: "border-sky-400",
      bg: "radial-gradient(circle, rgba(56,189,248,0.3) 0%, rgba(99,102,241,0.1) 70%)",
    },
  };

  const current = phaseConfig[phase];

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="breathing-modal-title"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          className="relative w-full max-w-md glass-modal rounded-3xl border border-white/20 p-6 shadow-2xl overflow-hidden flex flex-col items-center text-center"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25 }}
        >
          {/* Header */}
          <div className="w-full flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Wind className="w-5 h-5" />
              </div>
              <div className="text-start">
                <h2 id="breathing-modal-title" className="text-white font-semibold text-base">
                  {t("breathing.title")}
                </h2>
                <p className="text-white/60 text-xs">
                  {t("breathing.subtitle")}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Animated Circle Container */}
          <div className="relative my-8 flex items-center justify-center w-64 h-64">
            {/* Outer halo */}
            <motion.div
              className={`absolute inset-0 rounded-full border-2 ${current.border} opacity-50`}
              animate={{
                scale: current.scale * 1.1,
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: current.duration,
                ease: "easeInOut",
              }}
            />

            {/* Main pulsing circle */}
            <motion.div
              className={`w-48 h-48 rounded-full border-4 ${current.border} shadow-2xl flex flex-col items-center justify-center relative overflow-hidden`}
              style={{ background: current.bg }}
              animate={{
                scale: current.scale,
              }}
              transition={{
                duration: current.duration,
                ease: "easeInOut",
              }}
            >
              <span className="text-4xl font-bold text-white tracking-wider mb-1 font-mono">
                {countdown}
              </span>
              <span className={`text-xs font-semibold uppercase tracking-widest ${current.color}`}>
                {current.label}
              </span>
            </motion.div>
          </div>

          {/* Cycle Counter & Encouragement */}
          <div className="w-full bg-white/5 rounded-2xl p-3 border border-white/10 flex items-center justify-between text-xs text-white/70">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              {isRtl ? `الدورة ${cycle}` : `Cycle ${cycle}`}
            </span>
            <span>
              {isRtl ? "استرخِ ودع التوتر يتلاشى" : "Relax and let tension melt"}
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
