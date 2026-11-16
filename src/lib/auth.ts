import { cacheUserVaultKey, clearUserVaultKey } from "@/lib/crypto-vault";
import { normalizeSubscriptionTier } from "@/lib/subscription";
import type { SubscriptionTier } from "@/types/mood";

export interface UserSession {
  id?: string;
  userId: string;
  username: string;
  subscriptionTier: SubscriptionTier;
  createdAt?: string;
}

const SESSION_CACHE_KEY = "mood-tracker-session";

export function getSession(): UserSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserSession>;
    if (!parsed?.userId || !parsed?.username) return null;
    return {
      id: parsed.id || parsed.userId,
      userId: parsed.userId,
      username: parsed.username,
      subscriptionTier: normalizeSubscriptionTier(parsed.subscriptionTier),
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export async function verifyServerSession(): Promise<UserSession | null> {
  try {
    const res = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
    if (!res.ok) {
      localStorage.removeItem(SESSION_CACHE_KEY);
      clearUserVaultKey();
      return null;
    }
    const data = await res.json();
    if (data?.authenticated && data?.user) {
      const user: UserSession = {
        id: data.user.id || data.user.userId,
        userId: data.user.userId || data.user.id,
        username: data.user.username,
        subscriptionTier: normalizeSubscriptionTier(data.user.subscriptionTier),
        createdAt: data.user.createdAt,
      };
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
      return user;
    }
    localStorage.removeItem(SESSION_CACHE_KEY);
    clearUserVaultKey();
    return null;
  } catch {
    return getSession();
  }
}

export async function signUp(username: string, password: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Sign up failed" };
    }
    const user: UserSession = {
      id: data.user.id || data.user.userId,
      userId: data.user.userId || data.user.id,
      username: data.user.username,
      subscriptionTier: normalizeSubscriptionTier(data.user.subscriptionTier),
      createdAt: data.user.createdAt,
    };
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
    await cacheUserVaultKey(user.userId, password);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("moodflow-auth-change"));
    }
    return { success: true, user };
  } catch {
    return { success: false, error: "network error" };
  }
}

export async function signIn(username: string, password: string): Promise<{ success: boolean; error?: string; user?: UserSession }> {
  try {
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Invalid username or password" };
    }
    const user: UserSession = {
      id: data.user.id || data.user.userId,
      userId: data.user.userId || data.user.id,
      username: data.user.username,
      subscriptionTier: normalizeSubscriptionTier(data.user.subscriptionTier),
      createdAt: data.user.createdAt,
    };
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
    await cacheUserVaultKey(user.userId, password);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("moodflow-auth-change"));
    }
    return { success: true, user };
  } catch {
    return { success: false, error: "network error" };
  }
}

export async function signOut(): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_CACHE_KEY);
  clearUserVaultKey();
  window.dispatchEvent(new Event("moodflow-auth-change"));
  try {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "CLEAR_AUTH_CACHE" });
    }
  } catch {
    // Ignore offline signout error
  }
}
