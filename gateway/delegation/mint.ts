/**
 * Delegation / grant minting: validate request → policy evaluation → mint signed grant or deny.
 */

import type {
  ActionRequest,
  Agent,
  GrantPayload,
  GrantScope,
  SignedGrant,
} from '@delegation-gatekeeper/types';
import { evaluatePolicy, type AgentIdentity } from '@delegation-gatekeeper/policy-engine';
import * as crypto from 'node:crypto';
import { signGrant, defaultExpiresAt, type SigningOptions } from './sign.js';
import { registerGrant } from './revocation.js';

const DEFAULT_TTL_SECONDS = 15 * 60; // 15 min

export interface MintGrantInput {
  /** Action request (intended action, target, scope, taskId, runId, onBehalfOf, cost estimate) */
  actionRequest: ActionRequest;
  /** Resolved identity from identity layer */
  resolvedIdentity: AgentIdentity;
  /** Optional runtime id */
  runtimeId?: string;
}

export type MintGrantSuccess = { granted: true; signedGrant: SignedGrant };
export type MintGrantDenial = { granted: false; reason: string; decisionId?: string };
export type MintGrantResult = MintGrantSuccess | MintGrantDenial;

/**
 * Mint a signed grant if policy allows. Otherwise return denial with reason and decisionId.
 */
export function mintGrant(
  input: MintGrantInput,
  signingOptions: SigningOptions
): MintGrantResult {
  const { actionRequest, resolvedIdentity, runtimeId } = input;

  const decision = evaluatePolicy(actionRequest, resolvedIdentity);

  if (decision.result === 'deny') {
    return {
      granted: false,
      reason: decision.reason,
      decisionId: decision.decisionId,
    };
  }

  if (decision.result === 'require_approval') {
    return {
      granted: false,
      reason: 'Approval required; not yet implemented',
      decisionId: decision.decisionId,
    };
  }

  const grantId = `grant_${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const expiresAt = defaultExpiresAt(DEFAULT_TTL_SECONDS);

  const scope: GrantScope = {
    target: actionRequest.targetSystem,
    actions: [actionRequest.intendedAction],
    resources: actionRequest.resources,
  };

  const payload: GrantPayload = {
    grantId,
    agentId: resolvedIdentity.id,
    runtimeId,
    scope,
    audience: `${actionRequest.targetSystem}:${actionRequest.scope}`,
    expiresAt,
    policyDecisionId: decision.decisionId,
    revocationId: grantId,
    taskId: actionRequest.taskId,
    runId: actionRequest.runId,
    onBehalfOf: actionRequest.onBehalfOf,
    iat: now,
    iss: signingOptions.issuer,
  };

  const signedGrant = signGrant(payload, signingOptions);
  registerGrant(grantId, resolvedIdentity.id);
  return { granted: true, signedGrant };
}
