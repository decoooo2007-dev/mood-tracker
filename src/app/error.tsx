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
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">
          {t("error.boundaryTitle")}
        </h1>
        <p className="text-sm text-white/60 mb-6 leading-relaxed">
          {t("error.boundaryDesc")}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg shadow-purple-500/25 hover:opacity-95 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t("error.tryAgain")}</span>
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-white/10 text-white/90 font-medium hover:bg-white/15 transition-all active:scale-[0.98] border border-white/10"
          >
            <Home className="w-4 h-4" />
            <span>{t("error.dashboard")}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

