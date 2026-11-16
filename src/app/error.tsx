"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/providers";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, isRtl } = useLanguage();

  useEffect(() => {
    console.error("App error boundary caught:", error);

    // Self-heal cross-deployment Next.js chunk skew (ChunkLoadError) with a guarded single reload
    const msg = String(error?.message || "");
    if (
      typeof window !== "undefined" &&
      (/ChunkLoadError|Loading chunk [\d]+ failed|Failed to fetch dynamically imported module/i.test(msg) ||
        error?.name === "ChunkLoadError")
    ) {
      const key = "moodflow-chunk-reload-attempted";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="glass-modal max-w-md w-full p-8 rounded-3xl text-center shadow-2xl border border-white/10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/20">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2 theme-text-primary">
          {t("error.boundaryTitle")}
        </h1>
        <p className="text-sm theme-text-secondary mb-6 leading-relaxed">
          {t("error.boundaryDesc")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl accent-gradient-btn font-medium shadow-lg hover:opacity-95 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t("error.tryAgain")}</span>
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl recessed-well theme-text-primary font-medium transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            <span>{t("error.dashboard")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

