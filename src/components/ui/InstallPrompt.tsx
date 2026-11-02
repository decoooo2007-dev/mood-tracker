"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { useLanguage } from "@/lib/providers";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const { isRtl, t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("moodflow-install-dismissed");
    if (wasDismissed) {
      return;
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    let promptEvent: BeforeInstallPromptEvent | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const maybeRevealPrompt = () => {
      if (!promptEvent) return;
      const hasDisclaimer =
        localStorage.getItem("moodflow-disclaimer-acknowledged") ||
        localStorage.getItem("moodflow-disclaimer-accepted");
      const hasConsent = localStorage.getItem("moodflow-cookie-consent");
      const dismissedNow = localStorage.getItem("moodflow-install-dismissed");
      if (hasDisclaimer && hasConsent && !dismissedNow) {
        if (timerId) clearTimeout(timerId);
        timerId = setTimeout(() => {
          const stillDisclaimer =
            localStorage.getItem("moodflow-disclaimer-acknowledged") ||
            localStorage.getItem("moodflow-disclaimer-accepted");
          const stillConsent = localStorage.getItem("moodflow-cookie-consent");
          if (stillDisclaimer && stillConsent) {
            setIsVisible(true);
          }
        }, 1500);
      }
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      maybeRevealPrompt();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("moodflow-onboarding-step", maybeRevealPrompt);

    return () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("moodflow-onboarding-step", maybeRevealPrompt);
    };
  }, []);

  if (dismissed || pathname === "/login" || pathname === "/offline") {
    return null;
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt?.();
    const choice = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setIsVisible(false);

    if (choice?.outcome === "dismissed") {
      localStorage.setItem("moodflow-install-dismissed", "true");
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("moodflow-install-dismissed", "true");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed bottom-24 z-50 p-4 w-full max-w-sm ${isRtl ? "left-4" : "right-4"}`}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="glass-modal rounded-2xl border border-white/20 shadow-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm mb-1">{t("install.title")}</h3>
                <p className="text-white/60 text-xs leading-relaxed">{t("install.subtitle")}</p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/50"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 transition-all text-xs font-medium"
              >
                {t("settings.cancel")}
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-all text-xs font-medium flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {t("install.button")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
