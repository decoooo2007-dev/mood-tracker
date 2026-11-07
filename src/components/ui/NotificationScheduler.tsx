"use client";

import { useEffect, useRef } from "react";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useLanguage } from "@/lib/providers";
import { isToday } from "@/lib/moods";

const LAST_REMINDER_DATE_KEY = "moodflow-last-reminder-date";

export default function NotificationScheduler() {
  const { settings, entries } = useSyncStore();
  const { locale } = useLanguage();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const checkReminder = async () => {
      if (!settings.notifications || !settings.reminderTime) return;
      if (Notification.permission !== "granted") return;

      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const currentTime = `${currentHours}:${currentMinutes}`;

      if (currentTime !== settings.reminderTime) return;

      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;

      const lastReminder = localStorage.getItem(LAST_REMINDER_DATE_KEY);
      if (lastReminder === todayStr) return;

      // Check if user has already logged an entry today
      const hasLoggedToday = entries.some((e) => isToday(e.date));
      if (hasLoggedToday) {
        localStorage.setItem(LAST_REMINDER_DATE_KEY, todayStr);
        return;
      }

      // Trigger notification
      const isAr = locale === "ar";
      const title = isAr ? "تذكير مد فلو اليومي" : "MoodFlow Daily Reminder";
      const body = isAr
        ? "خذ لحظة هادئة الآن لتدوين مشاعرك واكتشاف يومك."
        : "Take a mindful moment to reflect and log your mood today.";

      localStorage.setItem(LAST_REMINDER_DATE_KEY, todayStr);

      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.active) {
            reg.showNotification(title, {
              body,
              icon: "/icons/icon.svg",
              badge: "/icons/icon.svg",
              tag: "moodflow-daily-reminder",
              data: { url: "/" },
            });
            return;
          }
        }

        // Direct Notification fallback
        new Notification(title, {
          body,
          icon: "/icons/icon.svg",
        });
      } catch (err) {
        console.warn("Could not dispatch daily reminder notification:", err);
      }
    };

    // Run check every 30 seconds
    intervalRef.current = setInterval(checkReminder, 30000);
    checkReminder();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [settings.notifications, settings.reminderTime, entries, locale]);

  return null;
}
