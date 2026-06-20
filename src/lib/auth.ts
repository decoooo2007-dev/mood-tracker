// Custom authentication - username/password with Supabase backend
// No email verification needed

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Simple session token (stored in localStorage)
interface Session {
  userId: string;
  username: string;
  token: string;
  expiresAt: number;
}

const SESSION_KEY = "mood-tracker-session";

// Hash password using SHA-256
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Generate random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Get current session
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    const session: Session = JSON.parse(stored);
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// Save session
function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// Sign up - create username and password
export async function signUp(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if username exists
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing.length > 0) {
        return { success: false, error: "Username already taken" };
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const createRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        username,
        password_hash: passwordHash,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      return { success: false, error: err.message || "Failed to create account" };
    }

    const users = await createRes.json();
    const user = users[0];

    // Create default settings
    await fetch(`${SUPABASE_URL}/rest/v1/user_settings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.id,
        theme: "dark",
        notifications: true,
        reminder_time: "21:00",
        language: "en",
        export_format: "json",
      }),
    });

    // Create session
    const session: Session = {
      userId: user.id,
      username: user.username,
      token: generateToken(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    saveSession(session);

    return { success: true };
  } catch (error) {
    return { success: false, error: "Network error" };
  }
}

// Sign in
export async function signIn(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Find user
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!res.ok) {
      return { success: false, error: "Server error" };
    }

    const users = await res.json();
    if (users.length === 0) {
      return { success: false, error: "Username not found" };
    }

    const user = users[0];

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { success: false, error: "Incorrect password" };
    }

    // Create session
    const session: Session = {
      userId: user.id,
      username: user.username,
      token: generateToken(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    saveSession(session);

    return { success: true };
  } catch (error) {
    return { success: false, error: "Network error" };
  }
}

// Sign out
export function signOut(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

// Check if username is available
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (res.ok) {
      const users = await res.json();
      return users.length === 0;
    }
    return false;
  } catch {
    return false;
  }
}

// Get authenticated fetch headers
export function getAuthHeaders(): Record<string, string> {
  const session = getSession();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...(session ? { "x-user-id": session.userId } : {}),
  };
}
