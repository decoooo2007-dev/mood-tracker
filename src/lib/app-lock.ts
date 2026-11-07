/**
 * Local App Passcode & Biometric Lock (Track 1.2)
 *
 * Stores a salted SHA-256 hash of the user's 4-digit PIN in localStorage.
 * Tracks unlock status per session in sessionStorage so users aren't prompted on every route change.
 */

const PIN_STORAGE_KEY = "moodflow-app-lock-pin";
const SESSION_UNLOCK_KEY = "moodflow-session-unlocked";
const PIN_SALT = "moodflow-pin-salt-2026";

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PIN_SALT}:${pin.trim()}`);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function isAppLockEnabled(): boolean {
  if (typeof globalThis.localStorage === "undefined") {
    return false;
  }
  try {
    return Boolean(globalThis.localStorage.getItem(PIN_STORAGE_KEY));
  } catch {
    return false;
  }
}

export async function setAppLockPin(pin: string): Promise<boolean> {
  if (typeof globalThis.localStorage === "undefined" || !/^\d{4}$/.test(pin)) {
    return false;
  }
  try {
    const hashed = await hashPin(pin);
    globalThis.localStorage.setItem(PIN_STORAGE_KEY, hashed);
    markSessionUnlocked();
    return true;
  } catch {
    return false;
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  if (typeof globalThis.localStorage === "undefined" || !/^\d{4}$/.test(pin)) {
    return false;
  }
  try {
    const stored = globalThis.localStorage.getItem(PIN_STORAGE_KEY);
    if (!stored) return true;
    const computed = await hashPin(pin);
    const valid = computed === stored;
    if (valid) {
      markSessionUnlocked();
    }
    return valid;
  } catch {
    return false;
  }
}

export function removeAppLock(): void {
  if (typeof globalThis.localStorage === "undefined") return;
  try {
    globalThis.localStorage.removeItem(PIN_STORAGE_KEY);
    if (typeof globalThis.sessionStorage !== "undefined") {
      globalThis.sessionStorage.removeItem(SESSION_UNLOCK_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function isSessionUnlocked(): boolean {
  if (typeof globalThis.sessionStorage === "undefined") {
    return true;
  }
  try {
    if (!isAppLockEnabled()) return true;
    return globalThis.sessionStorage.getItem(SESSION_UNLOCK_KEY) === "true";
  } catch {
    return true;
  }
}

export function markSessionUnlocked(): void {
  if (typeof globalThis.sessionStorage === "undefined") return;
  try {
    globalThis.sessionStorage.setItem(SESSION_UNLOCK_KEY, "true");
  } catch {
    // Ignore storage errors
  }
}

export function lockSession(): void {
  if (typeof globalThis.sessionStorage === "undefined") return;
  try {
    globalThis.sessionStorage.removeItem(SESSION_UNLOCK_KEY);
  } catch {
    // Ignore storage errors
  }
}

export async function isBiometricsAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
