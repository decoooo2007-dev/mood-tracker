"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Clock,
  Trophy,
  Settings,
  WifiOff,
  LogOut,
  Globe,
  MessageSquare,
  Menu,
  X,
} from "lucide-react";
import { useAuth, useLanguage } from "@/lib/providers";
import type { TranslationKey } from "@/lib/i18n/translations";

const navItems: {
  href: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/history", labelKey: "nav.history", icon: Clock },
  { href: "/board", labelKey: "nav.board", icon: Trophy },
  { href: "/feedback", labelKey: "nav.feedback", icon: MessageSquare },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { locale, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  if (
    !user ||
    pathname === "/login" ||
    pathname === "/offline" ||
    pathname.startsWith("/preview")
  ) {
    return null;
  }

  const handleSignOut = () => {
    setMobileMenuOpen(false);
    signOut();
    router.push("/login");
  };

  const activeItem = navItems.find((item) => item.href === pathname) || navItems[0];
  const ActiveIcon = activeItem.icon;

  return (
    <>
      {mobileMenuOpen && (
        <div
          aria-hidden="true"
          onClick={() => setMobileMenuOpen(false)}
          className="sm:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        />
      )}
      <nav className="fixed bottom-4 sm:bottom-5 left-0 right-0 z-50 flex flex-col items-center pointer-events-none px-2.5">
      {/* Mobile Expandable 5-Tab Launcher Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden pointer-events-auto mb-2 w-full max-w-[360px]">
          <div className="glass-modal rounded-3xl p-2 grid grid-cols-5 gap-1 shadow-2xl">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label={t(item.labelKey)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-2xl text-[10px] font-semibold transition-all ${
                    isActive
                      ? "accent-gradient-btn shadow-md"
                      : "recessed-well theme-text-primary hover:opacity-90"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate max-w-full">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Floating Pill Container */}
      <div className="pointer-events-auto max-w-[calc(100vw-1.25rem)] w-full sm:w-auto flex justify-center">
        {/* DESKTOP & TABLET: Full 5-Tab Floating Pill */}
        <div className="hidden sm:flex glass rounded-full px-2.5 py-1.5 items-center gap-1 shadow-2xl">
          <div className="flex items-center">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={t(item.labelKey)}
                  className={`relative flex flex-col items-center gap-0.5 px-3.5 py-1.5 rounded-full transition-all min-w-[62px] ${
                    isActive
                      ? "theme-text-primary"
                      : "theme-text-secondary hover:opacity-100 opacity-75"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 nav-active-pill rounded-full transition-opacity duration-150" />
                  )}
                  <Icon
                    className={`w-5 h-5 relative z-10 ${
                      isActive ? "theme-text-primary" : ""
                    }`}
                  />
                  <span
                    className={`text-[10px] relative z-10 ${
                      isActive ? "font-bold theme-text-primary" : ""
                    }`}
                  >
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="w-px h-6 bg-white/20 mx-0.5" />

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-white/10 rounded-full transition-colors theme-text-primary"
              aria-label={locale === "en" ? "تبديل إلى العربية" : "Switch to English"}
              title={locale === "en" ? "العربية" : "English"}
            >
              <Globe className="w-4 h-4 theme-text-secondary" />
              <span className="text-[10px] font-semibold theme-text-primary uppercase">
                {locale === "en" ? "عربي" : "EN"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 hover:bg-white/10 rounded-full transition-colors theme-text-secondary hover:opacity-100"
              aria-label={t("settings.signOut")}
              title={t("settings.signOut")}
            >
              <LogOut className="w-4 h-4" />
            </button>

            {!isOnline && (
              <div className="px-1" title={t("offline.title")}>
                <WifiOff className="w-4 h-4 text-amber-400" />
              </div>
            )}
          </div>
        </div>

        {/* MOBILE: Compact Expandable List Button Pill */}
        <div className="flex sm:hidden glass rounded-full px-2 py-1.5 items-center justify-between gap-1.5 w-full max-w-[360px] shadow-2xl">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full accent-gradient-btn text-xs font-semibold shadow-sm min-w-0 shrink"
            aria-expanded={mobileMenuOpen}
            aria-label={t(activeItem.labelKey)}
          >
            {mobileMenuOpen ? (
              <X className="w-4 h-4 shrink-0" />
            ) : (
              <Menu className="w-4 h-4 shrink-0" />
            )}
            <ActiveIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t(activeItem.labelKey)}</span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/"
              aria-label={t("nav.home")}
              className={`p-2 rounded-full transition-colors ${
                pathname === "/" ? "accent-pill" : "theme-text-secondary opacity-80"
              }`}
            >
              <Home className="w-4 h-4" />
            </Link>
            <Link
              href="/board"
              aria-label={t("nav.board")}
              className={`p-2 rounded-full transition-colors ${
                pathname === "/board" ? "accent-pill" : "theme-text-secondary opacity-80"
              }`}
            >
              <Trophy className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 recessed-well rounded-full theme-text-primary text-[10px] font-semibold uppercase"
              aria-label={locale === "en" ? "تبديل إلى العربية" : "Switch to English"}
            >
              <Globe className="w-3.5 h-3.5 theme-text-secondary" />
              <span>{locale === "en" ? "عربي" : "EN"}</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 hover:bg-white/10 rounded-full theme-text-secondary"
              aria-label={t("settings.signOut")}
            >
              <LogOut className="w-4 h-4" />
            </button>

            {!isOnline && (
              <div className="px-0.5" title={t("offline.title")}>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}
