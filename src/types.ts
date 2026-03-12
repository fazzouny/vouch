/**
 * Core types for Vouch.
 */

export interface CallerIdentity {
  agentId: string;
  userId?: string;
  orgId?: string;
  onBehalfOf?: string;
}

export interface ActionRequest {
  intendedAction: string;
  targetType: string;
  scope?: string;
  taskId?: string;
  runId?: string;
  justification?: string;
  actionPayload?: Record<string, unknown>;
}

export interface Grant {
  grantId: string;
  agentId: string;
  scope: string;
  audience?: string;
  expiresAt: string; // ISO8601
  policyDecisionId?: string;
  revocationId?: string;
  targetType: string;
  /** Serialized/signed form for sending to execute */
  signed?: string;
}

export interface VerifiedGrant extends Grant {
  verifiedAt: string;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  policyDecisionId: string;
  requireApproval?: boolean;
}

export interface AuditEvent {
  eventId: string;
  type: string;
  timestamp: string;
  agentId?: string;
  grantId?: string;
  taskId?: string;
  payload?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  statusCode?: number;
  error?: string;
}
