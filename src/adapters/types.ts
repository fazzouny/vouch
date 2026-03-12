/**
 * Execution adapter contract.
 */

import type { VerifiedGrant, ExecutionResult } from "../types.js";

export interface ExecutionAdapter {
  /** Target type this adapter handles (e.g. "http", "rest") */
  readonly targetType: string;
  /**
   * Execute the action with the verified grant.
   * Caller must ensure isRevoked(grantId) was checked before invoking.
   */
  execute(verifiedGrant: VerifiedGrant, actionPayload: Record<string, unknown>): Promise<ExecutionResult>;
}
