import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/jwt";

const PUBLIC_PATHS = new Set([
  "/login",
  "/privacy",
  "/terms",
  "/offline",
  "/feedback",
  "/manifest.json",
  "/sw.js",
  "/favicon.ico",
]);

const PROTECTED_PAGE_PREFIXES = ["/history", "/settings"];
const PROTECTED_API_PREFIXES = ["/api/entries", "/api/settings"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedPage =
    pathname === "/" ||
    PROTECTED_PAGE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

  const isProtectedApi = PROTECTED_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Always allow Next.js internals, static assets (outside protected routes/APIs), and public API routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/api/keep-alive") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/feedback") ||
    pathname.startsWith("/preview") ||
    (!isProtectedPage &&
      !pathname.startsWith("/api/") &&
      /\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|css|txt|woff2?)$/i.test(pathname))
  ) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  if (isProtectedApi && !session) {
    return NextResponse.json(
      { error: "Not authenticated", code: "UNAUTHORIZED" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (isProtectedPage && !session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js).*)",
  ],
};
