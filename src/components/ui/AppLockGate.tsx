"use client";

import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Fingerprint, Delete } from "lucide-react";
import { useLanguage } from "@/lib/providers";
import {
  isAppLockEnabled,
  isSessionUnlocked,
  verifyPin,
  isBiometricsAvailable,
  hasRegisteredBiometrics,
  authenticateBiometric,
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
  const pinRef = useRef("");

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
    isBiometricsAvailable()
      .then((avail) => setHasBiometrics(avail && hasRegisteredBiometrics()))
      .catch(() => {});
  }, [checkLockState]);

  const handleDigit = useCallback(async (digit: string) => {
    if (pinRef.current.length >= 4) return;
    const nextPin = pinRef.current + digit;
    pinRef.current = nextPin;
    setPin(nextPin);
    setError(false);

    if (nextPin.length === 4) {
      const valid = await verifyPin(nextPin);
      if (valid) {
        pinRef.current = "";
        setIsLocked(false);
        setPin("");
      } else {
        setError(true);
        setTimeout(() => {
          pinRef.current = "";
          setPin("");
          setError(false);
        }, 700);
      }
    }
  }, []);

  const handleDelete = useCallback(() => {
    const next = pinRef.current.slice(0, -1);
    pinRef.current = next;
    setPin(next);
    setError(false);
  }, []);

  // PC physical keyboard 0-9 / Backspace support
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, handleDigit, handleDelete]);

  const handleBiometricUnlock = async () => {
    try {
      const verified = await authenticateBiometric();
      if (verified) {
        pinRef.current = "";
        setIsLocked(false);
        setPin("");
      } else {
        setError(true);
        setTimeout(() => setError(false), 700);
      }
    } catch {
      // Fall back to PIN
    }
  };

  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))",
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <motion.div
        className="w-full max-w-xs glass-modal rounded-3xl p-6 border border-white/20 text-center shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="w-14 h-14 mx-auto rounded-2xl accent-pill flex items-center justify-center mb-4">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold mb-1 theme-text-primary">{t("lock.title")}</h2>
        <p className="text-xs theme-text-secondary mb-6">{t("lock.subtitle")}</p>

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
                    ? "scale-105 shadow-md"
                    : "recessed-well"
                }`}
                style={
                  !error && filled
                    ? {
                        backgroundColor: "var(--accent-solid)",
                        borderColor: "var(--accent-border)",
                      }
                    : undefined
                }
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
              className="h-14 rounded-2xl recessed-well hover:opacity-90 active:scale-95 transition-all text-xl font-semibold flex items-center justify-center theme-text-primary"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {hasBiometrics ? (
              <button
                type="button"
                onClick={handleBiometricUnlock}
                className="h-14 w-full rounded-2xl accent-pill flex items-center justify-center transition-colors"
                title={t("lock.useBiometrics")}
              >
                <Fingerprint className="w-6 h-6" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => handleDigit("0")}
            className="h-14 rounded-2xl recessed-well hover:opacity-90 active:scale-95 transition-all text-xl font-semibold flex items-center justify-center theme-text-primary"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl recessed-well hover:opacity-90 active:scale-95 transition-all flex items-center justify-center theme-text-secondary"
            aria-label="Delete"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
