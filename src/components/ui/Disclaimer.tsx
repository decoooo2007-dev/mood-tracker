"use client";

import { useEffect } from "react";

interface DisclaimerProps {
  onAcknowledge?: () => void;
}

/**
 * Non-blocking Medical Disclaimer (Track 2.1).
 *
 * Replaces the intrusive full-screen blocking modal with an inline notice on `/login`
 * and a dedicated "Wellness & Crisis Helplines" card in `SettingsPage.tsx`.
 *
 * Automatically records acknowledgment and dispatches the onboarding event sequence.
 */
export default function Disclaimer({ onAcknowledge }: DisclaimerProps) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasAcknowledged =
        localStorage.getItem("moodflow-disclaimer-acknowledged") ||
        localStorage.getItem("moodflow-disclaimer-accepted");
      if (!hasAcknowledged) {
        localStorage.setItem("moodflow-disclaimer-acknowledged", "true");
        window.dispatchEvent(new Event("moodflow-onboarding-step"));
        onAcknowledge?.();
      }
    }
  }, [onAcknowledge]);

  return null;
}
