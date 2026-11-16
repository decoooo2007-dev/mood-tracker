"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { applyAppearanceTokens, getStoredAppearance } from "@/lib/theme";
import type { MoodType } from "@/types/mood";

interface GlassBackgroundProps {
  children: React.ReactNode;
}

export default function GlassBackground({ children }: GlassBackgroundProps) {
  const activeMoodRef = useRef<MoodType | null>(null);

  // Sync palette tokens, Mode-Aware Aura Rule, and cursor spotlight across .glass surfaces
  useEffect(() => {
    const syncTokens = (e?: Event) => {
      const custom = e as CustomEvent<{ activeMood?: MoodType | null }> | undefined;
      if (custom?.detail && "activeMood" in custom.detail) {
        activeMoodRef.current = custom.detail.activeMood ?? null;
      }
      applyAppearanceTokens(getStoredAppearance(), activeMoodRef.current);
    };

    syncTokens();
    window.addEventListener("moodflow-appearance-change", syncTokens);
    window.addEventListener("storage", syncTokens);

    let rafId = 0;
    const handlePointerMove = (ev: PointerEvent) => {
      if (ev.pointerType === "touch") return;
      if (rafId) cancelAnimationFrame(rafId);
      const clientX = ev.clientX;
      const clientY = ev.clientY;
      rafId = requestAnimationFrame(() => {
        const cards = document.querySelectorAll<HTMLElement>(".glass");
        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty("--mouse-x", `${clientX - rect.left}px`);
          card.style.setProperty("--mouse-y", `${clientY - rect.top}px`);
        });
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("moodflow-appearance-change", syncTokens);
      window.removeEventListener("storage", syncTokens);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fixed Gradient Mesh + Atmospheric Blobs (Nile Sapphire x Gold Default) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0 transition-all duration-700"
          style={{
            background:
              "linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))",
          }}
        />
        <motion.div
          className="absolute w-[780px] h-[780px] rounded-full transition-colors duration-700"
          style={{
            background: "radial-gradient(circle, var(--blob-1) 0%, transparent 70%)",
            top: "-18%",
            left: "-8%",
          }}
          animate={{
            x: [0, 90, 0],
            y: [0, 45, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[620px] h-[620px] rounded-full transition-colors duration-700"
          style={{
            background: "radial-gradient(circle, var(--blob-2) 0%, transparent 70%)",
            bottom: "-12%",
            right: "-6%",
          }}
          animate={{
            x: [0, -75, 0],
            y: [0, -55, 0],
          }}
          transition={{ duration: 25, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[520px] h-[520px] rounded-full transition-colors duration-700"
          style={{
            background: "radial-gradient(circle, var(--blob-3) 0%, transparent 70%)",
            top: "42%",
            left: "42%",
          }}
          animate={{
            x: [-45, 45, -45],
            y: [-25, 25, -25],
          }}
          transition={{ duration: 18, repeat: Infinity }}
        />
        {/* Floating decorative crystal particles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-3.5 h-3.5 rounded-full bg-white/15 backdrop-blur-sm"
            style={{
              top: `${18 + i * 18}%`,
              left: `${12 + i * 21}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.65, 0.3],
            }}
            transition={{
              duration: 3.8 + i * 0.7,
              repeat: Infinity,
              delay: i * 0.45,
            }}
          />
        ))}
      </div>

      {/* Content — single bottom clearance for floating pill navigation */}
      <div className="relative z-10 pb-24">
        {children}
      </div>
    </div>
  );
}
