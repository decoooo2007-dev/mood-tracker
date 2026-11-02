"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Clock, Settings, WifiOff, LogOut, Globe, MessageSquare } from "lucide-react";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useAuth, useLanguage } from "@/lib/providers";
import type { TranslationKey } from "@/lib/i18n/translations";

const navItems: { href: string; labelKey: TranslationKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/feedback", labelKey: "nav.feedback", icon: MessageSquare },
  { href: "/history", labelKey: "nav.history", icon: Clock },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOnline } = useSyncStore();
  const { user, signOut } = useAuth();
  const { locale, toggleLanguage, t } = useLanguage();

  if (!user || pathname === "/login" || pathname === "/offline" || pathname.startsWith("/preview")) {
    return null;
  }

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-2">
      <div className="pointer-events-auto max-w-[calc(100vw-1.5rem)]">
        <motion.div
          className="glass rounded-full px-2 py-1.5 flex items-center gap-1 shadow-2xl"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {/* Navigation Items */}
          <div className="flex items-center">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={t(item.labelKey)}
                  className={`relative flex flex-col items-center gap-0.5 px-2.5 sm:px-4 py-1.5 rounded-full transition-all min-w-[52px] sm:min-w-[64px] ${
                    isActive
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-purple-500/40 to-pink-500/40 rounded-full"
                      initial={false}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 relative z-10 ${
                      isActive ? "text-white" : ""
                    }`}
                  />
                  <span className={`text-[10px] relative z-10 ${isActive ? "font-semibold text-white" : ""}`}>
                    {t(item.labelKey)}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="w-px h-6 bg-white/20 mx-0.5" />

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-white/10 rounded-full transition-colors"
              aria-label={locale === "en" ? "تبديل إلى العربية" : "Switch to English"}
              title={locale === "en" ? "العربية" : "English"}
            >
              <Globe className="w-4 h-4 text-white/80" />
              <span className="text-[10px] font-semibold text-white/80 uppercase">
                {locale === "en" ? "عربي" : "EN"}
              </span>
            </button>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white"
              aria-label={t("settings.signOut")}
              title={t("settings.signOut")}
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Offline Indicator */}
            {!isOnline && (
              <div className="px-1" title={t("offline.title")}>
                <WifiOff className="w-4 h-4 text-amber-400" />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
