/**
 * SDK types aligned with gateway API.
 */

export interface ActionRequest {
  intendedAction?: string;
  targetType: string;
  scope?: string;
  taskId?: string;
  runId?: string;
  justification?: string;
  actionPayload?: Record<string, unknown>;
}

/** Legacy/stub grant shape (signed string) */
export interface StubGrant {
  grantId: string;
  agentId: string;
  scope: string;
  expiresAt: string;
  targetType: string;
  signed?: string;
}

/** Full signed grant from gateway (payload + signature) */
export interface SignedGrant {
  payload: Record<string, unknown>;
  alg: string;
  signature: string;
  kid?: string;
}

/** Grant returned from requestDelegation (either shape) */
export type Grant = StubGrant | SignedGrant;

export interface DelegateSuccess {
  grant: Grant;
}

export interface ExecuteSuccess {
  result?: unknown;
  statusCode?: number;
}
