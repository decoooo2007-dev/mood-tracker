"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clock, Settings, Wifi, WifiOff, LogOut } from "lucide-react";
import { useSyncStore } from "@/hooks/useSyncStore";
import { useAuth } from "@/lib/providers";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/", label: "Today", icon: Home },
  { href: "/history", label: "History", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Navigation() {
  const pathname = usePathname();
  const { isOnline } = useSyncStore();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    router.push("/login");
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

          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-white/60 hover:text-white/80" />
            </button>
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-orange-400" />
            )}
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
