"use client";

import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { useLanguage } from "@/lib/providers";

export default function NotFound() {
  const { t, isRtl } = useLanguage();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="glass-modal max-w-md w-full p-8 rounded-3xl text-center shadow-2xl border border-white/10">
        <div className="w-16 h-16 rounded-2xl accent-avatar flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Compass className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 theme-text-primary">
          404
        </h1>
        <h2 className="text-lg font-semibold theme-text-primary mb-3">
          {t("notFound.title")}
        </h2>
        <p className="text-sm theme-text-secondary mb-8 leading-relaxed">
          {t("notFound.desc")}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl accent-gradient-btn font-medium shadow-lg hover:opacity-95 transition-all active:scale-[0.98]"
        >
          <Home className="w-4 h-4" />
          <span>{t("notFound.returnHome")}</span>
        </Link>
      </div>
    </div>
  );
}

