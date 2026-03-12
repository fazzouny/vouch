/**
 * Delegation layer: temporary, scope-bound authority issued after policy evaluation.
 * Grant schema and signed payload shape for mint/verify/revoke.
 */

/** Scope of authority: target system, actions, and optional resource constraints */
export interface GrantScope {
  /** Target system (e.g. mcp, api, a2a, browser, payment) */
  target: string;
  /** Allowed action types or tool names */
  actions: string[];
  /** Optional resource or path constraints */
  resources?: string[];
  /** Optional TTL in seconds for this scope */
  ttlSeconds?: number;
}

/** Core grant payload (content that is signed) */
export interface GrantPayload {
  grantId: string;
  agentId: string;
  /** Runtime that requested the grant */
  runtimeId?: string;
  scope: GrantScope;
  /** Intended audience (e.g. MCP server id, API base URL) */
  audience: string;
  /** ISO 8601 expiry */
  expiresAt: string;
  /** Policy decision that authorized this grant */
  policyDecisionId: string;
  /** Revocation id; checked on every use */
  revocationId: string;
  /** Task/run context for audit lineage */
  taskId?: string;
  runId?: string;
  /** On-behalf-of identity when acting for a user/department */
  onBehalfOf?: string;
  /** Issued at (ISO 8601) */
  iat: string;
  /** Issuer identifier */
  iss: string;
}

/** Signed grant: payload + signature for verification */
export interface SignedGrant {
  payload: GrantPayload;
  /** Signature algorithm (e.g. RS256, ES256) */
  alg: string;
  /** Base64url-encoded signature */
  signature: string;
  /** Optional JWK kid or key id */
  kid?: string;
}
