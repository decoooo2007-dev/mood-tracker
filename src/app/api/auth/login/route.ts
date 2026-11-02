import { handleLoginRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleLoginRequest(request);
}
