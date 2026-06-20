"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Clock, Settings, LogOut, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/providers";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Today", icon: Home },
  { href: "/history", label: "History", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isOnline, isLoading } = useSyncStore();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    router.push("/login");
    setIsSigningOut(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6">
      <div className="max-w-md mx-auto">
        <motion.div
          className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 shadow-2xl px-4 py-3 flex justify-between items-center"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {/* Navigation Items */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                    isActive
                      ? "text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl"
                      layoutId="navIndicator"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-5 h-5 relative z-10 ${
                      isActive ? "text-white" : ""
                    }`}
                  />
                  <span className={`text-xs relative z-10 ${isActive ? "font-medium" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Status & User */}
          <div className="flex items-center gap-3">
            {/* Online/Offline indicator */}
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <span title="Offline mode"><WifiOff className="w-4 h-4 text-orange-400" /></span>
            )}

            {/* User menu */}
            {user && (
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                title="Sign out"
              >
                {isSigningOut ? (
                  <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
                ) : (
                  <>
                    <span className="text-xs text-white/70 hidden sm:inline">
                      {user.email?.split("@")[0]}
                    </span>
                    <LogOut className="w-4 h-4 text-white/70" />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
