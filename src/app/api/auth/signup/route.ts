import { handleSignupRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleSignupRequest(request);
}
