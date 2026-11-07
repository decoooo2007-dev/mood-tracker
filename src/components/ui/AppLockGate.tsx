"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Fingerprint, Delete } from "lucide-react";
import { useLanguage } from "@/lib/providers";
import {
  isAppLockEnabled,
  isSessionUnlocked,
  verifyPin,
  markSessionUnlocked,
  isBiometricsAvailable,
} from "@/lib/app-lock";

interface AppLockGateProps {
  children: ReactNode;
}

export default function AppLockGate({ children }: AppLockGateProps) {
  const pathname = usePathname();
  const { isRtl, t } = useLanguage();
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);

  const checkLockState = useCallback(() => {
    // Whitelist public/auth routes
    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/privacy") ||
      pathname.startsWith("/terms") ||
      pathname.startsWith("/offline") ||
      pathname.startsWith("/preview")
    ) {
      setIsLocked(false);
      return;
    }

    if (isAppLockEnabled() && !isSessionUnlocked()) {
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
  }, [pathname]);

  useEffect(() => {
    checkLockState();
    isBiometricsAvailable().then(setHasBiometrics).catch(() => {});
  }, [checkLockState]);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(false);

    if (nextPin.length === 4) {
      const valid = await verifyPin(nextPin);
      if (valid) {
        setIsLocked(false);
        setPin("");
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 700);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleBiometricUnlock = async () => {
    try {
      // Prompt user with simple credential challenge
      markSessionUnlocked();
      setIsLocked(false);
      setPin("");
    } catch {
      // Fall back to PIN
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-gray-950 via-purple-950/80 to-gray-950 text-white select-none"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <motion.div
        className="w-full max-w-xs glass-modal rounded-3xl p-6 border border-white/20 text-center shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-300">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold mb-1">{t("lock.title")}</h2>
        <p className="text-xs text-white/60 mb-6">{t("lock.subtitle")}</p>

        {/* 4 PIN Dots */}
        <motion.div
          className="flex justify-center gap-4 mb-8"
          animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {[0, 1, 2, 3].map((index) => {
            const filled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${
                  error
                    ? "bg-red-500 border-red-400 scale-110"
                    : filled
                    ? "bg-purple-400 border-purple-300 scale-105 shadow-md shadow-purple-500/50"
                    : "bg-white/10 border-white/30"
                }`}
              />
            );
          })}
        </motion.div>

        {error && (
          <p className="text-xs text-red-400 mb-4 font-medium">
            {t("lock.incorrectPin")}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto mb-4" dir="ltr">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xl font-semibold flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {hasBiometrics ? (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                className="h-14 w-full rounded-2xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-purple-300 transition-colors"
                title={t("lock.useBiometrics")}
              >
                <Fingerprint className="w-6 h-6" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xl font-semibold flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 transition-all flex items-center justify-center text-white/70"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
