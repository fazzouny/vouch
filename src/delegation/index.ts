/**
 * Delegation layer stub: mint, verify, revocation check.
 */

import type { Grant, ActionRequest, CallerIdentity, PolicyDecision } from "../types.js";

const revocationSet = new Set<string>();

export async function mintGrant(
  identity: CallerIdentity,
  actionRequest: ActionRequest,
  policyDecision: PolicyDecision
): Promise<Grant | null> {
  if (!policyDecision.allowed) return null;
  const grantId = `grant-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
  const grant: Grant = {
    grantId,
    agentId: identity.agentId,
    scope: actionRequest.scope ?? "default",
    expiresAt,
    policyDecisionId: policyDecision.policyDecisionId,
    targetType: actionRequest.targetType,
  };
  // Stub: signed form is JSON string (production would use JWT or signed struct)
  (grant as Grant & { signed: string }).signed = JSON.stringify(grant);
  return grant;
}

export async function verifyGrant(signedGrant: string): Promise<Grant | null> {
  try {
    const parsed = JSON.parse(signedGrant) as Grant;
    if (!parsed.grantId || !parsed.agentId || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt) <= new Date()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function isRevoked(grantId: string): Promise<boolean> {
  return revocationSet.has(grantId);
}

export function revokeGrant(grantId: string): void {
  revocationSet.add(grantId);
}
