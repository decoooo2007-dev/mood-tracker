"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone, Share } from "lucide-react";
import { useLanguage } from "@/lib/providers";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const { isRtl, t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("moodflow-install-dismissed");
    if (wasDismissed) {
      return;
    }

    const nav = navigator as unknown as { standalone?: boolean };
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
    if (isStandalone) {
      return;
    }

    const ua = navigator.userAgent || "";
    const iosDetected =
      /iphone|ipad|ipod/i.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIosDevice(iosDetected);

    let promptEvent: BeforeInstallPromptEvent | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const maybeRevealPrompt = () => {
      if (!promptEvent && !iosDetected) return;
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

    // Trigger check for iOS Safari users where beforeinstallprompt is not fired
    if (iosDetected) {
      maybeRevealPrompt();
    }

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
              <div className="w-12 h-12 rounded-xl accent-avatar flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="theme-text-primary font-semibold text-sm mb-1">
                  {t("install.title")}
                </h3>
                <p className="theme-text-secondary text-xs leading-relaxed">
                  {isIosDevice && !deferredPrompt ? t("install.iosGuide") : t("install.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors theme-text-muted"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIosDevice && !deferredPrompt ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] theme-text-secondary px-2.5 py-1.5 rounded-xl recessed-well flex-1">
                  <Share className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--accent-solid)" }} />
                  <span className="truncate">{t("install.title")}</span>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-4 py-2 rounded-xl accent-gradient-btn text-xs font-medium shrink-0"
                >
                  {t("install.gotIt")}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="flex-1 py-2 rounded-xl recessed-well theme-text-secondary hover:opacity-90 transition-all text-xs font-medium"
                >
                  {t("settings.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleInstall}
                  className="flex-1 py-2 rounded-xl accent-gradient-btn transition-all text-xs font-medium flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("install.button")}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
