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
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20">
          <Compass className="w-8 h-8 text-white animate-pulse" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent">
          404
        </h1>
        <h2 className="text-lg font-semibold text-white/90 mb-3">
          {t("notFound.title")}
        </h2>
        <p className="text-sm text-white/60 mb-8 leading-relaxed">
          {t("notFound.desc")}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg shadow-purple-500/25 hover:opacity-95 transition-all active:scale-[0.98]"
        >
          <Home className="w-4 h-4" />
          <span>{t("notFound.returnHome")}</span>
        </Link>
      </div>
    </div>
  );
}

