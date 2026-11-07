/**
 * Local App Passcode & Biometric Lock (Track 1.2)
 *
 * Stores a salted SHA-256 hash of the user's 4-digit PIN in localStorage.
 * Tracks unlock status per session in sessionStorage so users aren't prompted on every route change.
 */

const PIN_STORAGE_KEY = "moodflow-app-lock-pin";
const BIOMETRIC_CRED_ID_KEY = "moodflow-biometric-cred-id";
const SESSION_UNLOCK_KEY = "moodflow-session-unlocked";
const PIN_SALT = "moodflow-pin-salt-2026";

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

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
    globalThis.localStorage.removeItem(BIOMETRIC_CRED_ID_KEY);
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
  if (!window.PublicKeyCredential || !navigator.credentials) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasRegisteredBiometrics(): boolean {
  if (typeof globalThis.localStorage === "undefined") return false;
  try {
    return Boolean(globalThis.localStorage.getItem(BIOMETRIC_CRED_ID_KEY));
  } catch {
    return false;
  }
}

export async function registerBiometricCredential(): Promise<boolean> {
  if (!(await isBiometricsAvailable())) return false;
  try {
    const challenge = globalThis.crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "MoodFlow Vault",
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: "moodflow-local-user",
          displayName: "MoodFlow User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.rawId) return false;
    globalThis.localStorage.setItem(
      BIOMETRIC_CRED_ID_KEY,
      bufferToBase64(credential.rawId)
    );
    return true;
  } catch {
    return false;
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  if (!(await isBiometricsAvailable())) return false;
  if (!hasRegisteredBiometrics()) return false;
  try {
    const storedCredB64 = globalThis.localStorage.getItem(BIOMETRIC_CRED_ID_KEY);
    if (!storedCredB64) return false;

    const credIdBytes = base64ToBuffer(storedCredB64);
    const challenge = globalThis.crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: credIdBytes.buffer as ArrayBuffer,
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (assertion) {
      markSessionUnlocked();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
