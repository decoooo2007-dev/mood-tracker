"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Flame,
  TrendingUp,
  ShieldCheck,
  Loader2,
  UserCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/providers";
import GlassBackground from "@/components/ui/GlassBackground";
import Navigation from "@/components/ui/Navigation";
import MembershipBadge from "@/components/ui/MembershipBadge";
import type {
  LeaderboardMetrics,
  PublicLeaderboardRow,
} from "@/lib/leaderboard";

interface LeaderboardApiResponse {
  success: boolean;
  setupRequired?: boolean;
  profile: {
    anonymousAlias: string;
    isOptedIn: boolean;
    metrics: LeaderboardMetrics;
  };
  mostEntries: PublicLeaderboardRow[];
  mostImproved: PublicLeaderboardRow[];
}

export default function BoardPage() {
  const { isRtl, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"improved" | "entries">("improved");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  const [aliasInput, setAliasInput] = useState("");
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [metrics, setMetrics] = useState<LeaderboardMetrics>({
    totalRawEntries: 0,
    consistencyEntries: 0,
    activeDays: 0,
    currentStreak: 0,
    baselineWellness: 50,
    recentWellness: 50,
    improvementDelta: 0,
    qualifiedForGrowth: false,
  });

  const [mostImproved, setMostImproved] = useState<PublicLeaderboardRow[]>([]);
  const [mostEntries, setMostEntries] = useState<PublicLeaderboardRow[]>([]);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as LeaderboardApiResponse;
      if (data.success) {
        setSetupRequired(Boolean(data.setupRequired));
        setAliasInput(data.profile?.anonymousAlias || "");
        setIsOptedIn(Boolean(data.profile?.isOptedIn));
        if (data.profile?.metrics) setMetrics(data.profile.metrics);
        setMostImproved(data.mostImproved || []);
        setMostEntries(data.mostEntries || []);
      }
    } catch {
      // Keep clean default state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = aliasInput.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousAlias: trimmed,
          isOptedIn,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const errorMap: Record<string, string> = {
          ALIAS_TAKEN: t("board.errorTaken"),
          INVALID_ALIAS: t("board.errorInvalidAlias"),
          VALIDATION_ERROR: t("board.errorInvalidAlias"),
          SETUP_REQUIRED: t("board.errorSetup"),
          RATE_LIMITED: t("board.errorRateLimited"),
        };
        setFeedback({
          type: "error",
          text: errorMap[String(json.code || "")] || t("board.errorGeneric"),
        });
        return;
      }
      setFeedback({ type: "success", text: t("board.saved") });
      await loadBoard();
      setTimeout(() => setFeedback(null), 3500);
    } catch {
      setFeedback({ type: "error", text: t("error.networkError") });
    } finally {
      setSaving(false);
    }
  };

  const rows = activeTab === "improved" ? mostImproved : mostEntries;

  return (
    <GlassBackground>
      <div
        className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-10"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-2xl accent-avatar flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold theme-text-primary tracking-tight">
                {t("board.title")}
              </h1>
              <p className="theme-text-secondary text-xs sm:text-sm">
                {t("board.subtitle")}
              </p>
            </div>
          </div>
        </motion.div>

        {setupRequired && (
          <div className="glass rounded-2xl p-3.5 mb-5 border border-amber-400/35 text-xs theme-text-secondary">
            {t("board.setupNotice")}
          </div>
        )}

        {/* Caller Personal Anti-Cheat Progress Summary */}
        <div className="glass rounded-3xl p-4 sm:p-5 mb-6 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" style={{ color: "var(--accent-solid)" }} />
              <span>{t("board.yourStats")}</span>
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full accent-pill font-semibold">
              {metrics.qualifiedForGrowth
                ? t("board.growthQualified")
                : t("board.growthNeedMore")}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 text-center">
            <div className="p-3 recessed-well rounded-2xl">
              <p className="text-xl font-bold theme-text-primary">
                {metrics.consistencyEntries}
              </p>
              <p className="text-[11px] theme-text-muted">
                {t("board.creditedEntries")}
              </p>
            </div>
            <div className="p-3 recessed-well rounded-2xl">
              <p className="text-xl font-bold theme-text-primary">
                {metrics.activeDays}
              </p>
              <p className="text-[11px] theme-text-muted">{t("board.activeDays")}</p>
            </div>
            <div className="p-3 recessed-well rounded-2xl">
              <p
                className={`text-xl font-bold ${
                  metrics.improvementDelta > 0
                    ? "stat-positive"
                    : "theme-text-primary"
                }`}
              >
                {metrics.improvementDelta > 0
                  ? `+${metrics.improvementDelta}%`
                  : "0%"}
              </p>
              <p className="text-[11px] theme-text-muted">{t("board.growthDelta")}</p>
            </div>
          </div>
        </div>

        {/* Anonymous Handle & Privacy Opt-In Form */}
        <form
          onSubmit={handleSaveProfile}
          className="glass rounded-3xl p-5 mb-6 shadow-md space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label
                htmlFor="anon-alias-input"
                className="text-sm font-bold theme-text-primary flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4" style={{ color: "var(--accent-solid)" }} />
                <span>{t("board.aliasLabel")}</span>
              </label>
              <p className="text-xs theme-text-muted mt-0.5">
                {t("board.aliasHint")}
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium theme-text-primary">
              <input
                type="checkbox"
                checked={isOptedIn}
                onChange={(e) => setIsOptedIn(e.target.checked)}
                className="w-4 h-4 accent-blue-500 rounded"
              />
              <span>{t("board.optInLabel")}</span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="anon-alias-input"
              type="text"
              maxLength={20}
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder={t("board.aliasPlaceholder")}
              className="flex-1 px-3.5 py-2.5 recessed-well rounded-xl theme-text-primary text-base sm:text-sm outline-none"
            />
            <button
              type="submit"
              disabled={saving || !aliasInput.trim()}
              className="px-5 py-2.5 rounded-xl accent-gradient-btn text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? t("board.saving") : t("board.saveProfile")}</span>
            </button>
          </div>

          {feedback && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-500/20 stat-positive"
                  : "bg-rose-500/20 stat-negative"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </form>

        {/* Leaderboard Category Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="inline-flex rounded-2xl recessed-well p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("improved")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all ${
                activeTab === "improved"
                  ? "accent-gradient-btn shadow"
                  : "theme-text-secondary"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t("board.tabImproved")}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("entries")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition-all ${
                activeTab === "entries"
                  ? "accent-gradient-btn shadow"
                  : "theme-text-secondary"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{t("board.tabEntries")}</span>
            </button>
          </div>

          <span className="text-[11px] theme-text-muted">
            {activeTab === "improved"
              ? t("board.antiSpamGrowth")
              : t("board.antiSpamEntries")}
          </span>
        </div>

        {/* Rankings List */}
        {loading ? (
          <div className="glass rounded-3xl p-8 flex justify-center">
            <Loader2
              className="w-6 h-6 animate-spin"
              style={{ color: "var(--accent-solid)" }}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center">
            <Trophy
              className="w-10 h-10 mx-auto mb-3 opacity-60"
              style={{ color: "var(--accent-solid)" }}
            />
            <p className="text-sm font-medium theme-text-secondary max-w-md mx-auto">
              {activeTab === "improved"
                ? t("board.emptyImproved")
                : t("board.emptyEntries")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.anonymousAlias}
                className={`glass rounded-2xl p-4 flex items-center justify-between gap-3 ${
                  row.isCurrentUser ? "ring-1 ring-[var(--accent-solid)]" : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      row.rank === 1
                        ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow"
                        : "recessed-well theme-text-primary"
                    }`}
                  >
                    #{row.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm theme-text-primary truncate">
                        {row.anonymousAlias}
                      </span>
                      {row.isCurrentUser && (
                        <span className="accent-pill px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {t("board.youBadge")}
                        </span>
                      )}
                      {row.subscriptionTier !== "free" && (
                        <MembershipBadge tier={row.subscriptionTier} size="sm" />
                      )}
                    </div>
                    <p className="text-[11px] theme-text-muted mt-0.5 flex flex-wrap items-center gap-1.5">
                      {activeTab === "improved" ? (
                        <>
                          <span dir="ltr" className="inline-block font-semibold">
                            {row.baselineWellness} → {row.recentWellness}
                          </span>
                          <span>·</span>
                          <span>
                            {row.activeDays} {t("board.activeDays")}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>
                            🔥 {row.currentStreak} {t("stats.dayStreak")}
                          </span>
                          <span>·</span>
                          <span>
                            {row.activeDays} {t("board.activeDays")}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {activeTab === "improved" ? (
                  <span className="text-sm font-extrabold stat-positive shrink-0">
                    +{row.improvementDelta}%
                  </span>
                ) : (
                  <span className="text-sm font-extrabold theme-text-primary shrink-0">
                    {row.consistencyEntries}{" "}
                    <span className="text-[11px] font-normal theme-text-muted">
                      {t("history.entries")}
                    </span>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Navigation />
    </GlassBackground>
  );
}
