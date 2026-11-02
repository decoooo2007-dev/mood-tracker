"use client";

import { useEffect } from "react";

export default function ThemeScript() {
  useEffect(() => {
    const applyThemeAndLocale = () => {
      const html = document.documentElement;

      // Theme
      const storedTheme = localStorage.getItem("moodflow-theme");
      if (storedTheme === "light") {
        html.classList.remove("dark");
        html.classList.add("light");
      } else {
        html.classList.remove("light");
        html.classList.add("dark");
      }

      // Locale / Direction
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
    return () => {
      window.removeEventListener("storage", applyThemeAndLocale);
    };
  }, []);

  return null;
}
