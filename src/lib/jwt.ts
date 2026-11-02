import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "moodflow_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days (2592000s)

export interface SessionPayload {
  userId: string;
  username: string;
}

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error(
      "Missing JWT_SECRET or SUPABASE_SERVICE_ROLE_KEY environment variable for session signing."
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    username: payload.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: ["HS256"],
    });
    const userId = typeof payload.userId === "string" ? payload.userId : payload.sub;
    const username = typeof payload.username === "string" ? payload.username : "";

    if (!userId || !username) {
      return null;
    }

    return { userId, username };
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const pairs = cookieHeader.split(";");
    for (const pair of pairs) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const name = pair.slice(0, eqIdx).trim();
      if (name === SESSION_COOKIE_NAME) {
        const rawVal = pair.slice(eqIdx + 1).trim();
        if (!rawVal) return null;
        try {
          return decodeURIComponent(rawVal);
        } catch {
          return rawVal;
        }
      }
    }
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  return null;
}

export async function getSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const token = extractTokenFromRequest(request);
  if (!token) return null;
  return verifySessionToken(token);
}

export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
