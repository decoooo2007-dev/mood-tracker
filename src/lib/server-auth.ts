import { createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/server-supabase";
import {
  attachSessionCookie,
  clearSessionCookie,
  getSessionFromRequest,
  signSessionToken,
} from "@/lib/jwt";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const USERNAME_REGEX = /^[a-zA-Z0-9_\u0600-\u06FF]{3,20}$/;
export const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;

// Precomputed valid cost-12 bcrypt hash for constant-time missing-user / legacy-fail equalization
export const DUMMY_BCRYPT_HASH =
  "$2b$12$8K1p/a0dL1LXMIgoEDFrwOfMQbLg9d1/xR4t7j6/h8uY5vI9K1y2O";

export function normalizeUsername(raw: string): string {
  return raw.trim().normalize("NFC").toLowerCase();
}

export function computeSha256Hex(password: string): string {
  return createHash("sha256").update(password, "utf8").digest("hex");
}

export function verifyTimingSafeSha256(password: string, storedHex: string): boolean {
  if (!SHA256_HEX_REGEX.test(storedHex)) return false;
  const computedHex = computeSha256Hex(password);
  const a = Buffer.from(computedHex, "utf8");
  const b = Buffer.from(storedHex.toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const LoginPayloadSchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(1).max(128),
});

const SignupPayloadSchema = z.object({
  username: z.string().min(1).max(60),
  password: z.string().min(4).max(128),
});

function invalidCredentialsResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      authenticated: false,
      error: "Invalid username or password",
      code: "INVALID_CREDENTIALS",
    },
    { status: 401, headers: { "Cache-Control": "no-store" } }
  );
}

export async function handleLoginRequest(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);
    const rate = await checkRateLimit(`auth:login:${ip}`, 10, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Too many login attempts. Please try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = LoginPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Please fill in all fields",
          code: "VALIDATION_ERROR",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const { password } = parsed.data;
    const normalizedUsername = normalizeUsername(parsed.data.username);

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      return invalidCredentialsResponse();
    }

    const escapedLike = normalizedUsername.replace(/[\\%_]/g, "\\$&");
    const { data: candidates, error: dbError } = await supabaseAdmin
      .from("users")
      .select("id, username, password_hash, created_at")
      .ilike("username", escapedLike)
      .limit(5);

    if (dbError) {
      console.error("[Auth Login] Database error:", dbError.message);
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Server error",
          code: "SERVER_ERROR",
        },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const user = candidates?.find(
      (u) => normalizeUsername(u.username) === normalizedUsername
    );

    if (!user) {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      return invalidCredentialsResponse();
    }

    let isPasswordValid = false;

    if (SHA256_HEX_REGEX.test(user.password_hash)) {
      const legacyMatch = verifyTimingSafeSha256(password, user.password_hash);
      if (legacyMatch) {
        isPasswordValid = true;
        // Transparent zero-downtime upgrade from unsalted SHA-256 to bcrypt (cost = 12)
        const upgradedHash = await bcrypt.hash(password, 12);
        const { error: upgradeErr } = await supabaseAdmin
          .from("users")
          .update({
            password_hash: upgradedHash,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)
          .eq("password_hash", user.password_hash);

        if (upgradeErr) {
          console.error("[Auth Login] Failed to persist bcrypt upgrade:", upgradeErr.message);
        }
      } else {
        await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
      }
    } else if (user.password_hash.startsWith("$2")) {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
    } else {
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH);
    }

    if (!isPasswordValid) {
      return invalidCredentialsResponse();
    }

    const token = await signSessionToken({
      userId: user.id,
      username: user.username,
    });

    const response = NextResponse.json(
      {
        success: true,
        authenticated: true,
        user: {
          id: user.id,
          userId: user.id,
          username: user.username,
          createdAt: user.created_at,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );

    return attachSessionCookie(response, token);
  } catch (error) {
    console.error("[Auth Login] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "Something went wrong",
        code: "INTERNAL_ERROR",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function handleSignupRequest(request: Request): Promise<NextResponse> {
  try {
    const ip = getClientIp(request);
    const rate = await checkRateLimit(`auth:signup:${ip}`, 10, 15 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Too many sign-up attempts. Please try again later.",
          code: "RATE_LIMITED",
        },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = SignupPayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Invalid username or password format",
          code: "VALIDATION_ERROR",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const normalizedUsername = normalizeUsername(parsed.data.username);
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Username must be 3-20 characters (Arabic, English, numbers, or underscore)",
          code: "INVALID_USERNAME",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const escapedLike = normalizedUsername.replace(/[\\%_]/g, "\\$&");
    const { data: existingCandidates, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id, username")
      .ilike("username", escapedLike)
      .limit(5);

    if (checkError) {
      console.error("[Auth Signup] Check error:", checkError.message);
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Server error",
          code: "SERVER_ERROR",
        },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    const duplicate = existingCandidates?.find(
      (u) => normalizeUsername(u.username) === normalizedUsername
    );
    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Username already taken",
          code: "USERNAME_TAKEN",
        },
        { status: 409, headers: { "Cache-Control": "no-store" } }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const { data: createdUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        username: normalizedUsername,
        password_hash: passwordHash,
      })
      .select("id, username, created_at")
      .single();

    if (createError || !createdUser) {
      if (createError?.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            authenticated: false,
            error: "Username already taken",
            code: "USERNAME_TAKEN",
          },
          { status: 409, headers: { "Cache-Control": "no-store" } }
        );
      }
      console.error("[Auth Signup] Create error:", createError?.message);
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Failed to create account",
          code: "CREATE_FAILED",
        },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    await supabaseAdmin.from("user_settings").upsert(
      {
        user_id: createdUser.id,
        theme: "dark",
        notifications: true,
        reminder_time: "21:00",
        language: "en",
        export_format: "json",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    const token = await signSessionToken({
      userId: createdUser.id,
      username: createdUser.username,
    });

    const response = NextResponse.json(
      {
        success: true,
        authenticated: true,
        user: {
          id: createdUser.id,
          userId: createdUser.id,
          username: createdUser.username,
          createdAt: createdUser.created_at,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );

    return attachSessionCookie(response, token);
  } catch (error) {
    console.error("[Auth Signup] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "Failed to create account",
        code: "INTERNAL_ERROR",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function handleLogoutRequest(): Promise<NextResponse> {
  const response = NextResponse.json(
    {
      success: true,
      authenticated: false,
      user: null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
  return clearSessionCookie(response);
}

export async function handleSessionRequest(request: Request): Promise<NextResponse> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        user: null,
        error: "Not authenticated",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data: dbUser, error } = await supabaseAdmin
    .from("users")
    .select("id, username, created_at")
    .eq("id", session.userId)
    .maybeSingle();

  if (error) {
    console.error("[Auth Session] Database error:", error.message);
    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        user: null,
        error: "Server error",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!dbUser) {
    const unauthRes = NextResponse.json(
      {
        success: false,
        authenticated: false,
        user: null,
        error: "Not authenticated",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
    return clearSessionCookie(unauthRes);
  }

  return NextResponse.json(
    {
      success: true,
      authenticated: true,
      user: {
        id: dbUser.id,
        userId: dbUser.id,
        username: dbUser.username,
        createdAt: dbUser.created_at,
      },
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
