"use client";

import { useEffect } from "react";
import { applyAppearanceTokens, getStoredAppearance } from "@/lib/theme";

export default function ThemeScript() {
  useEffect(() => {
    const applyThemeAndLocale = () => {
      const html = document.documentElement;
      const appearance = getStoredAppearance();
      applyAppearanceTokens(appearance);

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
