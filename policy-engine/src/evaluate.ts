/**
 * Policy engine: evaluate(actionRequest, agentIdentity) → PolicyDecision.
 * Default: deny unless a rule allows. Emits stable policy_decision_id for audit.
 */

import type { ActionRequest, Agent, PolicyDecision, PolicyConditions } from '@vouch/types';
import { DEFAULT_POLICY, type PolicyConfig, type PolicyRule } from './policy-config.js';

/** Resolved agent identity (Agent from identity layer or minimal view) */
export type AgentIdentity = Pick<Agent, 'id' | 'approvedTools' | 'status'> & {
  /** Optional group for rule matching */
  agentGroup?: string;
  /** Trust tier from reputation layer (low/medium/high); influences policy */
  trustTier?: string;
};

function randomDecisionId(): string {
  return `pol_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

function scopeMatches(ruleScope: string | RegExp | undefined, requestScope: string): boolean {
  if (ruleScope === undefined) return true;
  if (typeof ruleScope === 'string') return requestScope === ruleScope || requestScope.startsWith(ruleScope);
  return ruleScope.test(requestScope);
}

function ruleMatches(rule: PolicyRule, request: ActionRequest, identity: AgentIdentity): boolean {
  if (rule.agentId !== undefined && rule.agentId !== identity.id) return false;
  if (rule.agentGroup !== undefined && rule.agentGroup !== identity.agentGroup) return false;
  if (rule.trustTier !== undefined && rule.trustTier !== identity.trustTier) return false;
  const toolType = request.toolType ?? request.targetSystem;
  if (rule.toolType !== undefined && rule.toolType !== toolType) return false;
  if (rule.targetService !== undefined && rule.targetService !== request.targetSystem) return false;
  if (!scopeMatches(rule.scope, request.scope)) return false;
  return true;
}

/**
 * Evaluate policy for an action request and agent identity.
 * Returns a stable policy decision (allow | deny | require_approval) with decisionId and reason.
 */
export function evaluatePolicy(
  actionRequest: ActionRequest,
  agentIdentity: AgentIdentity,
  config: PolicyConfig = DEFAULT_POLICY
): PolicyDecision {
  const decisionId = randomDecisionId();
  const conditions: PolicyConditions = {
    agentId: agentIdentity.id,
    agentGroup: agentIdentity.agentGroup,
    tool: actionRequest.intendedAction,
    target: actionRequest.targetSystem,
    scope: actionRequest.scope,
  };

  if (agentIdentity.status === 'revoked' || agentIdentity.status === 'suspended') {
    return {
      decisionId,
      result: 'deny',
      reason: 'Agent or runtime is revoked or suspended',
      conditions,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const approvedTools = agentIdentity.approvedTools ?? [];
  if (approvedTools.length > 0) {
    const toolKey = actionRequest.toolType ?? actionRequest.targetSystem;
    const allowed = approvedTools.some(
      (t) => t === actionRequest.intendedAction || t === toolKey || t === `${actionRequest.targetSystem}:${actionRequest.scope}`
    );
    if (!allowed) {
      return {
        decisionId,
        result: 'deny',
        reason: 'Requested action or tool not in agent approved tools',
        conditions,
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  let explicitAllow = false;
  let explicitDeny = false;
  let explicitRequireApproval = false;
  let matchedReason: string | undefined;

  for (const rule of config.rules) {
    if (!ruleMatches(rule, actionRequest, agentIdentity)) continue;
    matchedReason = rule.reason;
    if (rule.effect === 'deny') {
      explicitDeny = true;
      break;
    }
    if (rule.effect === 'allow') {
      explicitAllow = true;
    }
    if (rule.effect === 'require_approval') {
      explicitRequireApproval = true;
    }
  }

  if (explicitDeny) {
    return {
      decisionId,
      result: 'deny',
      reason: matchedReason ?? 'Denied by policy rule',
      conditions,
      evaluatedAt: new Date().toISOString(),
    };
  }

  if (explicitRequireApproval) {
    return {
      decisionId,
      result: 'require_approval',
      reason: matchedReason ?? 'Human approval required by policy',
      conditions,
      evaluatedAt: new Date().toISOString(),
    };
  }

  if (explicitAllow) {
    return {
      decisionId,
      result: 'allow',
      reason: matchedReason ?? 'Allowed by policy rule',
      conditions,
      evaluatedAt: new Date().toISOString(),
    };
  }

  const defaultEffect = config.defaultEffect ?? 'deny';
  return {
    decisionId,
    result: defaultEffect === 'allow' ? 'allow' : 'deny',
    reason: defaultEffect === 'allow' ? 'Default allow' : 'Denied by default (no matching allow rule)',
    conditions,
    evaluatedAt: new Date().toISOString(),
  };
}
