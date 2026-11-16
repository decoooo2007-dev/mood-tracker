"use client";

import { useEffect, useRef } from "react";
import { applyAppearanceTokens, getStoredAppearance } from "@/lib/theme";
import type { MoodType } from "@/types/mood";

export default function ThemeScript() {
  const activeMoodRef = useRef<MoodType | null>(null);

  useEffect(() => {
    const applyThemeAndLocale = (e?: Event) => {
      const custom = e as CustomEvent<{ activeMood?: MoodType | null }> | undefined;
      if (custom?.detail && "activeMood" in custom.detail) {
        activeMoodRef.current = custom.detail.activeMood ?? null;
      }

      const html = document.documentElement;
      const appearance = getStoredAppearance();
      applyAppearanceTokens(appearance, activeMoodRef.current);

      const storedLocale = localStorage.getItem("moodflow-locale");
      if (storedLocale === "ar") {
        html.dir = "rtl";
        html.lang = "ar";
      } else if (storedLocale === "en") {
        html.dir = "ltr";
        html.lang = "en";
      }
    };

    applyThemeAndLocale();

    window.addEventListener("storage", applyThemeAndLocale);
    window.addEventListener("moodflow-appearance-change", applyThemeAndLocale);
    return () => {
      window.removeEventListener("storage", applyThemeAndLocale);
      window.removeEventListener("moodflow-appearance-change", applyThemeAndLocale);
    };
  }, []);

  return null;
}
