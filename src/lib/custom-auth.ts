"use client";

// Simple local authentication using localStorage
// Passwords are hashed with SHA-256 for basic security

const USERS_KEY = "moodflow_users";
const CURRENT_USER_KEY = "moodflow_current_user";
const SESSION_KEY = "moodflow_session";

interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface Session {
  userId: string;
  email: string;
  loginTime: string;
}

// Hash password using SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "moodflow_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Generate unique ID
function generateId(): string {
  return crypto.randomUUID();
}

// Get all users
function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
}

// Save users
function saveUsers(users: User[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Create session
function createSession(user: { id: string; email: string }): void {
  if (typeof window === "undefined") return;
  const session: Session = {
    userId: user.id,
    email: user.email,
    loginTime: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

// Get current session
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Get current user
export function getCurrentUser(): { id: string; email: string } | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Register new user
export async function register(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { success: false, error: "Not in browser" };
  }

  const users = getUsers();
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (existingUser) {
    return { success: false, error: "Email already registered" };
  }

  const passwordHash = await hashPassword(password);
  const newUser: User = {
    id: generateId(),
    email: email.toLowerCase(),
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Auto-login after registration
  createSession({ id: newUser.id, email: newUser.email });

  return { success: true };
}

// Login user
export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { success: false, error: "Not in browser" };
  }

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: "Invalid email or password" };
  }

  const passwordHash = await hashPassword(password);

  if (passwordHash !== user.passwordHash) {
    return { success: false, error: "Invalid email or password" };
  }

  createSession({ id: user.id, email: user.email });

  return { success: true };
}

// Logout user
export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

// Check if user is logged in
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_KEY) !== null;
}
