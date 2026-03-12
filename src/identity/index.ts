/**
 * Identity resolution stub.
 * Resolves caller from auth header to CallerIdentity.
 */

import type { CallerIdentity } from "../types.js";

export async function resolveCallerIdentity(authHeader: string | undefined): Promise<CallerIdentity | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  // Stub: treat token as agent id for testing (e.g. "Bearer agent-1" -> agentId: "agent-1")
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  return {
    agentId: token,
    orgId: "org-default",
  };
}
