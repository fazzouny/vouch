/**
 * Policy engine output: allow, deny, or require_approval with reason and conditions.
 * Every decision has a stable id for audit linkage.
 */

export type PolicyDecisionResult = 'allow' | 'deny' | 'require_approval';

/** Conditions that were evaluated (e.g. agent, tool, scope, environment) */
export interface PolicyConditions {
  agentId?: string;
  tool?: string;
  target?: string;
  scope?: string;
  environment?: string;
  trustLevel?: string;
  /** Additional key-value conditions */
  [key: string]: unknown;
}

export interface PolicyDecision {
  decisionId: string;
  result: PolicyDecisionResult;
  /** Human or machine-readable reason */
  reason: string;
  /** Conditions that led to this decision (for audit and debugging) */
  conditions: PolicyConditions;
  /** Optional approval request id when result is require_approval */
  approvalRequestId?: string;
  /** Timestamp (ISO 8601) */
  evaluatedAt: string;
}
