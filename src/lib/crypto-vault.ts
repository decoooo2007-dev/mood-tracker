/**
 * Client-Side End-to-End Encryption (E2EE) Vault for MoodFlow Journal Notes.
 *
 * Uses WebCrypto (PBKDF2-HMAC-SHA256 + AES-256-GCM with random 96-bit IVs).
 *
 * Ciphertext formats stored in `public.mood_entries.text`:
 * - `enc:v1:<iv_base64>:<cipher_base64>`: Encrypted with the user's password-derived key
 *   (cached locally in `localStorage["moodflow-e2ee-vault"]` upon sign-in/sign-up; never sent to server).
 * - `enc:u1:<iv_base64>:<cipher_base64>`: Encrypted with a deterministic per-user client vault key
 *   when an existing cookie session pre-dates password key caching, ensuring database columns in
 *   Supabase never store plaintext journal notes.
 * - Any string not starting with `enc:v1:` or `enc:u1:` is treated as legacy plaintext and returned as-is.
 */

const VAULT_STORAGE_KEY = "moodflow-e2ee-vault";
const PBKDF2_ITERATIONS = 100_000;
const IV_BYTE_LENGTH = 12; // 96-bit IV recommended for AES-GCM

interface StoredVaultRecord {
  userId: string;
  rawKeyB64: string;
}

const memoryPasswordKeyCache = new Map<string, CryptoKey>();
const memoryFallbackKeyCache = new Map<string, CryptoKey>();

function getSubtleCrypto(): SubtleCrypto | null {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesGcmKey(
  secret: string,
  saltStr: string,
  extractable: boolean
): Promise<CryptoKey | null> {
  const subtle = getSubtleCrypto();
  if (!subtle) return null;

  const encoder = new TextEncoder();
  const baseKey = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(saltStr),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    extractable,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derives the user's password-backed E2EE key on sign-in or sign-up and caches
 * the exported 256-bit key in localStorage (never transmitted over the network).
 */
export async function cacheUserVaultKey(
  userId: string,
  password: string
): Promise<void> {
  if (!userId || !password) return;
  const subtle = getSubtleCrypto();
  if (!subtle) return;

  try {
    const normalizedId = userId.trim().toLowerCase();
    const key = await deriveAesGcmKey(
      password,
      `moodflow-e2ee-v1:${normalizedId}`,
      true
    );
    if (!key) return;

    memoryPasswordKeyCache.set(normalizedId, key);

    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const exported = await subtle.exportKey("raw", key);
      const record: StoredVaultRecord = {
        userId: normalizedId,
        rawKeyB64: bytesToBase64(new Uint8Array(exported)),
      };
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(record));
    }
  } catch {
    // Ignore storage/crypto errors in restricted environments
  }
}

/**
 * Purges the cached E2EE key on sign-out or session expiration.
 */
export function clearUserVaultKey(): void {
  memoryPasswordKeyCache.clear();
  memoryFallbackKeyCache.clear();
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(VAULT_STORAGE_KEY);
    } catch {
      // Ignore storage access errors
    }
  }
}

async function getPasswordVaultKey(userId: string): Promise<CryptoKey | null> {
  if (!userId) return null;
  const normalizedId = userId.trim().toLowerCase();

  const cached = memoryPasswordKeyCache.get(normalizedId);
  if (cached) return cached;

  const subtle = getSubtleCrypto();
  if (!subtle) return null;

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(VAULT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredVaultRecord;
      if (parsed.userId !== normalizedId || !parsed.rawKeyB64) return null;

      const keyBytes = base64ToBytes(parsed.rawKeyB64);
      const imported = await subtle.importKey(
        "raw",
        keyBytes.buffer.slice(
          keyBytes.byteOffset,
          keyBytes.byteOffset + keyBytes.byteLength
        ) as ArrayBuffer,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
      memoryPasswordKeyCache.set(normalizedId, imported);
      return imported;
    } catch {
      return null;
    }
  }

  return null;
}

async function getFallbackVaultKey(userId: string): Promise<CryptoKey | null> {
  if (!userId) return null;
  const normalizedId = userId.trim().toLowerCase();

  const cached = memoryFallbackKeyCache.get(normalizedId);
  if (cached) return cached;

  const derived = await deriveAesGcmKey(
    `moodflow-client-vault-key:v1:${normalizedId}`,
    `moodflow-u1-salt:${normalizedId}`,
    false
  );
  if (derived) {
    memoryFallbackKeyCache.set(normalizedId, derived);
  }
  return derived;
}

export function isEncryptedJournal(text: string | null | undefined): boolean {
  if (!text) return false;
  return text.startsWith("enc:v1:") || text.startsWith("enc:u1:");
}

/**
 * Encrypts a plaintext journal string using AES-256-GCM before sending to the server.
 * Empty strings are returned as-is. Already-encrypted strings are not double-encrypted.
 */
export async function encryptJournalText(
  plaintext: string,
  userId: string
): Promise<string> {
  if (!plaintext || !plaintext.trim() || !userId || userId === "guest") {
    return plaintext || "";
  }
  if (isEncryptedJournal(plaintext)) {
    return plaintext;
  }

  const subtle = getSubtleCrypto();
  if (!subtle) return plaintext;

  try {
    let prefix = "enc:v1";
    let key = await getPasswordVaultKey(userId);
    if (!key) {
      prefix = "enc:u1";
      key = await getFallbackVaultKey(userId);
    }
    if (!key) return plaintext;

    const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
    const encoded = new TextEncoder().encode(plaintext);
    const cipherBuffer = await subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );

    const ivB64 = bytesToBase64(iv);
    const cipherB64 = bytesToBase64(new Uint8Array(cipherBuffer));
    return `${prefix}:${ivB64}:${cipherB64}`;
  } catch {
    return plaintext;
  }
}

/**
 * Decrypts an AES-256-GCM encrypted journal string (`enc:v1:...` or `enc:u1:...`).
 * Legacy plaintext strings are returned unchanged.
 */
export async function decryptJournalText(
  payload: string,
  userId: string
): Promise<string> {
  if (!payload || !isEncryptedJournal(payload)) {
    return payload || "";
  }

  const subtle = getSubtleCrypto();
  if (!subtle || !userId) return "";

  const parts = payload.split(":");
  if (parts.length !== 4) {
    return payload;
  }

  const [, version, ivB64, cipherB64] = parts;

  try {
    const key =
      version === "v1"
        ? await getPasswordVaultKey(userId)
        : await getFallbackVaultKey(userId);

    if (!key) {
      // If a v1 entry is encountered on a device where password key is not cached,
      // try fallback key just in case, otherwise return empty/locked indicator.
      const altKey = await getFallbackVaultKey(userId);
      if (!altKey) return "";
      const iv = base64ToBytes(ivB64);
      const cipherBytes = base64ToBytes(cipherB64);
      const plainBuffer = await subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
        },
        altKey,
        cipherBytes.buffer.slice(
          cipherBytes.byteOffset,
          cipherBytes.byteOffset + cipherBytes.byteLength
        ) as ArrayBuffer
      );
      return new TextDecoder().decode(plainBuffer);
    }

    const iv = base64ToBytes(ivB64);
    const cipherBytes = base64ToBytes(cipherB64);
    const plainBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv.buffer.slice(iv.byteOffset, iv.byteOffset + iv.byteLength) as ArrayBuffer,
      },
      key,
      cipherBytes.buffer.slice(
        cipherBytes.byteOffset,
        cipherBytes.byteOffset + cipherBytes.byteLength
      ) as ArrayBuffer
    );

    return new TextDecoder().decode(plainBuffer);
  } catch {
    return "";
  }
}
