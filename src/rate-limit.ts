/**
 * In-memory per-agent (and optional per-scope) rate limit for POST /delegate.
 * Fixed window: max N requests per window (e.g. per minute).
 */

const windowMs = 60 * 1000; // 1 minute
const entries = new Map<string, { count: number; windowStart: number }>();

function getKey(agentId: string, scope?: string): string {
  return scope ? `${agentId}:${scope}` : agentId;
}

function prune(key: string, now: number, windowMs: number): void {
  const entry = entries.get(key);
  if (!entry) return;
  if (now - entry.windowStart >= windowMs) {
    entries.delete(key);
  }
}

/**
 * Check if the agent (and optional scope) is within the rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterSeconds }.
 */
export function checkRateLimit(
  agentId: string,
  limit: number,
  scope?: string
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  if (limit <= 0) return { allowed: true };
  const now = Date.now();
  const key = getKey(agentId, scope);
  prune(key, now, windowMs);
  const entry = entries.get(key);
  if (!entry) {
    entries.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (now - entry.windowStart >= windowMs) {
    entries.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }
  if (entry.count >= limit) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }
  entry.count += 1;
  return { allowed: true };
}
