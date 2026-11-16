"use client";

import { useEffect } from "react";

interface GlassBackgroundProps {
  children: React.ReactNode;
}

export default function GlassBackground({ children }: GlassBackgroundProps) {
  // Desktop Crystal Pearl spotlight with cached .glass elements and rects (updated only on scroll/resize/DOM change)
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function" ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    let cachedCards: { el: HTMLElement; rect: DOMRect }[] = [];
    let rectsDirty = true;
    let rafId = 0;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastX = 0;
    let lastY = 0;

    const refreshRects = () => {
      const nodes = document.querySelectorAll<HTMLElement>(".glass");
      cachedCards = Array.from(nodes).map((el) => ({
        el,
        rect: el.getBoundingClientRect(),
      }));
      rectsDirty = false;
    };

    const markDirty = () => {
      rectsDirty = true;
    };

    const markDirtyWithAnimationSettle = () => {
      rectsDirty = true;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        rectsDirty = true;
      }, 650);
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (ev.pointerType === "touch") return;
      lastX = ev.clientX;
      lastY = ev.clientY;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (rectsDirty || cachedCards.length === 0) {
          refreshRects();
        }
        for (let i = 0; i < cachedCards.length; i++) {
          const { el, rect } = cachedCards[i];
          if (!el.isConnected) {
            rectsDirty = true;
            continue;
          }
          el.style.setProperty("--mouse-x", `${lastX - rect.left}px`);
          el.style.setProperty("--mouse-y", `${lastY - rect.top}px`);
        }
      });
    };

    const observer =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(markDirtyWithAnimationSettle)
        : null;
    if (observer && document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("scroll", markDirty, { passive: true, capture: true });
    window.addEventListener("resize", markDirty, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (settleTimer) clearTimeout(settleTimer);
      observer?.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", markDirty, true);
      window.removeEventListener("resize", markDirty);
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fixed Gradient Mesh + Hardware-Accelerated Atmospheric Blobs (Nile Sapphire x Gold Default) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div
          className="absolute inset-0 transition-colors duration-700"
          style={{
            background:
              "linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))",
          }}
        />
        <div
          className="mf-blob-1 absolute w-[780px] h-[780px] rounded-full transition-colors duration-700"
          style={{
            background: "radial-gradient(circle, var(--blob-1) 0%, transparent 70%)",
            top: "-18%",
            left: "-8%",
          }}
        />
        <div
          className="mf-blob-2 absolute w-[620px] h-[620px] rounded-full transition-colors duration-700"
          style={{
            background: "radial-gradient(circle, var(--blob-2) 0%, transparent 70%)",
            bottom: "-12%",
            right: "-6%",
          }}
        />
        <div
          className="mf-blob-3 absolute w-[520px] h-[520px] rounded-full transition-colors duration-700"
          style={{
            background: "radial-gradient(circle, var(--blob-3) 0%, transparent 70%)",
            top: "42%",
            left: "42%",
          }}
        />
        {/* Floating decorative crystal particles (zero nested backdrop-blur overdraw) */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="mf-particle absolute w-3.5 h-3.5 rounded-full bg-white/15"
            style={{
              top: `${18 + i * 18}%`,
              left: `${12 + i * 21}%`,
              animationDuration: `${3.8 + i * 0.7}s`,
              animationDelay: `${i * 0.45}s`,
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
