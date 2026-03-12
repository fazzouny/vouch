/**
 * Execution mediation: verify grant, check revocation, dispatch to adapter, audit.
 */

import { verifyGrant, isRevoked } from "../delegation/index.js";
import { getAdapter } from "../adapters/registry.js";
import type { VerifiedGrant, ExecutionResult } from "../types.js";

export interface ExecuteInput {
  grant: string; // signed grant (JSON or JWT)
  action: Record<string, unknown>;
}

export async function executeWithGrant(input: ExecuteInput): Promise<ExecutionResult> {
  const verified = await verifyGrant(input.grant);
  if (!verified) {
    return { success: false, error: "invalid or expired grant" };
  }

  const revoked = await isRevoked(verified.grantId);
  if (revoked) {
    return { success: false, error: "grant has been revoked" };
  }

  const adapter = getAdapter(verified.targetType);
  if (!adapter) {
    return { success: false, error: `no adapter for target type: ${verified.targetType}` };
  }

  const verifiedGrant: VerifiedGrant = {
    ...verified,
    verifiedAt: new Date().toISOString(),
  };

  return adapter.execute(verifiedGrant, input.action);
}
