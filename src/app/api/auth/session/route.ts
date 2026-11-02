import { handleSessionRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleSessionRequest(request);
}
