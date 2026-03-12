/**
 * Policy engine stub: evaluate allow/deny by agent and target type.
 */

import type { ActionRequest, CallerIdentity, PolicyDecision } from "../types.js";

export async function evaluatePolicy(
  identity: CallerIdentity,
  actionRequest: ActionRequest
): Promise<PolicyDecision> {
  const policyDecisionId = `pol-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  // Stub: allow if targetType is http/rest, else deny
  const allowed = ["http", "rest"].includes(actionRequest.targetType);
  return {
    allowed,
    reason: allowed ? "allowed" : "target type not allowed",
    policyDecisionId,
  };
}
