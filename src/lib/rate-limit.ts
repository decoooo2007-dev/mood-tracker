// Hybrid Upstash Redis REST / Bounded In-Memory Sliding-Window Rate Limiter

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 5000;
const memoryBuckets = new Map<string, BucketEntry>();

function pruneBuckets(now: number): void {
  if (memoryBuckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of memoryBuckets.entries()) {
    if (now > bucket.resetAt) {
      memoryBuckets.delete(key);
    }
  }
  if (memoryBuckets.size >= MAX_BUCKETS) {
    const oldestKey = memoryBuckets.keys().next().value;
    if (oldestKey !== undefined) {
      memoryBuckets.delete(oldestKey);
    }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || now > existing.resetAt) {
    pruneBuckets(now);
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt,
    };
  }

  // Refresh LRU order
  memoryBuckets.delete(key);
  if (existing.count >= limit) {
    memoryBuckets.set(key, existing);
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  memoryBuckets.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export async function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 15 * 60_000
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const now = Date.now();
      const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;
      const ttlSeconds = Math.ceil(windowMs / 1000);

      const res = await fetch(`${upstashUrl.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", windowKey],
          ["EXPIRE", windowKey, ttlSeconds, "NX"],
        ]),
        cache: "no-store",
      });

      if (res.ok) {
        const results = (await res.json()) as Array<{ result?: number }>;
        const count = Number(results?.[0]?.result ?? 1);
        const resetAt = (Math.floor(now / windowMs) + 1) * windowMs;
        return {
          allowed: count <= limit,
          remaining: Math.max(0, limit - count),
          resetAt,
        };
      }
    } catch {
      // Fall back to bounded in-memory sliding-window limiter on network failure
    }
  }

  return checkMemoryRateLimit(key, limit, windowMs);
}

export function clearRateLimitBuckets(): void {
  memoryBuckets.clear();
}
