/**
 * Auth resolution: given an incoming request (API key or JWT in header),
 * resolve to (identity, onBehalfOf) and return a context object.
 */
import type { IdentityStore } from './store.js';
import type { IncomingRequestLike, ResolvedIdentityContext, OnBehalfOf } from './types.js';

export interface ResolveCallerIdentityResult {
  ok: true;
  context: ResolvedIdentityContext;
}

export interface ResolveCallerIdentityError {
  ok: false;
  code: 'UNAUTHENTICATED' | 'AGENT_NOT_FOUND' | 'AGENT_REVOKED' | 'USER_NOT_FOUND' | 'SERVICE_ACCOUNT_NOT_FOUND' | 'INVALID_ON_BEHALF_OF';
  message: string;
}

export type ResolveCallerIdentityOutcome = ResolveCallerIdentityResult | ResolveCallerIdentityError;

/**
 * Resolve caller identity from request headers.
 * Supports:
 * - x-api-key: lookup in store (agent, user, or service account)
 * - authorization: Bearer <token> — token mapped to agent id (or future JWT verify)
 * - x-agent-id: optional override when using API key for agent
 * - x-on-behalf-of: optional user/role/department the agent is acting for
 *
 * Returns a context with agentId (or userId/serviceAccountId), orgId, onBehalfOf.
 */
export async function resolveCallerIdentity(
  store: IdentityStore,
  request: IncomingRequestLike
): Promise<ResolveCallerIdentityOutcome> {
  const headers = request.headers ?? {};
  const apiKey = headers['x-api-key'];
  const authHeader = headers['authorization'];
  const agentIdOverride = headers['x-agent-id'];
  const onBehalfOfRaw = headers['x-on-behalf-of'];

  let resolvedAgentId: string | null = null;
  let resolvedUserId: string | null = null;
  let resolvedServiceId: string | null = null;

  if (apiKey) {
    if (agentIdOverride) {
      resolvedAgentId = agentIdOverride;
    } else {
      resolvedAgentId = await store.resolveAgentIdByApiKey(apiKey);
      if (!resolvedAgentId) {
        resolvedUserId = await store.resolveUserIdByApiKey(apiKey);
        if (!resolvedUserId) {
          resolvedServiceId = await store.resolveServiceAccountIdByApiKey(apiKey);
        }
      }
    }
  }

  if (!resolvedAgentId && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) resolvedAgentId = await store.resolveAgentIdByToken(token);
  }

  if (resolvedAgentId) {
    const agent = await store.getAgent(resolvedAgentId);
    if (!agent) {
      return { ok: false, code: 'AGENT_NOT_FOUND', message: `Agent not found: ${resolvedAgentId}` };
    }
    if (agent.status === 'revoked' || agent.revocationId) {
      return { ok: false, code: 'AGENT_REVOKED', message: `Agent revoked: ${resolvedAgentId}` };
    }

    let onBehalfOf: OnBehalfOf | undefined;
    if (onBehalfOfRaw) {
      const allowed = await store.resolveOnBehalfOf(agent.id, onBehalfOfRaw);
      if (!allowed) {
        return { ok: false, code: 'INVALID_ON_BEHALF_OF', message: `Agent not allowed to act on behalf of: ${onBehalfOfRaw}` };
      }
      onBehalfOf = { subject: onBehalfOfRaw, type: 'user' };
    }

    const context: ResolvedIdentityContext = {
      agentId: agent.id,
      orgId: agent.orgId,
      workspaceId: agent.workspaceId,
      onBehalfOf,
      trustLevel: agent.defaultTrustLevel,
      identity: { kind: 'agent', agent },
    };
    return { ok: true, context };
  }

  if (resolvedUserId) {
    const user = await store.getUser(resolvedUserId);
    if (!user) {
      return { ok: false, code: 'USER_NOT_FOUND', message: `User not found: ${resolvedUserId}` };
    }
    if (user.status !== 'active') {
      return { ok: false, code: 'UNAUTHENTICATED', message: `User not active: ${resolvedUserId}` };
    }
    const context: ResolvedIdentityContext = {
      userId: user.id,
      orgId: user.orgId,
      identity: { kind: 'user', userId: user.id, orgId: user.orgId, displayName: user.displayName },
    };
    return { ok: true, context };
  }

  if (resolvedServiceId) {
    const sa = await store.getServiceAccount(resolvedServiceId);
    if (!sa) {
      return { ok: false, code: 'SERVICE_ACCOUNT_NOT_FOUND', message: `Service account not found: ${resolvedServiceId}` };
    }
    if (sa.status !== 'active') {
      return { ok: false, code: 'UNAUTHENTICATED', message: `Service account not active: ${resolvedServiceId}` };
    }
    const context: ResolvedIdentityContext = {
      serviceAccountId: sa.id,
      orgId: sa.orgId,
      identity: { kind: 'service', serviceAccountId: sa.id, orgId: sa.orgId, displayName: sa.displayName },
    };
    return { ok: true, context };
  }

  return { ok: false, code: 'UNAUTHENTICATED', message: 'Missing or invalid API key or Bearer token' };
}
