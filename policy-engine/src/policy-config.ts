/**
 * Policy rule configuration: allow/deny by agent, group, tool type, target service, scope.
 * Default behavior: deny unless a rule allows.
 */

export type PolicyRuleEffect = 'allow' | 'deny' | 'require_approval';

export interface PolicyRule {
  /** Rule id for audit (optional; can be generated) */
  id?: string;
  /** Match: agent id (exact) */
  agentId?: string;
  /** Match: agent group (e.g. "internal-agents") */
  agentGroup?: string;
  /** Match: trust tier (e.g. low, medium, high) */
  trustTier?: string;
  /** Match: tool type (e.g. mcp, api) */
  toolType?: string;
  /** Match: target service (e.g. mcp, api, a2a) */
  targetService?: string;
  /** Match: scope pattern (e.g. prefix or exact) */
  scope?: string | RegExp;
  /** Effect when this rule matches */
  effect: PolicyRuleEffect;
  /** Optional reason for audit */
  reason?: string;
}

/** Structured policy config (can be loaded from YAML/JSON later) */
export interface PolicyConfig {
  /** Default effect when no rule matches */
  defaultEffect?: PolicyRuleEffect;
  /** Ordered rules; first match wins (or we aggregate allow/deny) */
  rules: PolicyRule[];
}

/** Phase 1: simple in-code default policy — deny unless allowed */
export const DEFAULT_POLICY: PolicyConfig = {
  defaultEffect: 'deny',
  rules: [
    {
      id: 'allow-internal-mcp',
      agentGroup: 'internal-agents',
      toolType: 'mcp',
      targetService: 'mcp',
      effect: 'allow',
      reason: 'Internal agent MCP access',
    },
    {
      id: 'allow-internal-api',
      agentGroup: 'internal-agents',
      toolType: 'api',
      targetService: 'api',
      effect: 'allow',
      reason: 'Internal agent API access',
    },
    {
      id: 'deny-low-trust-payment',
      trustTier: 'low',
      targetService: 'payment',
      effect: 'deny',
      reason: 'Low-trust agents cannot perform payment actions',
    },
    {
      id: 'require-approval-payment',
      targetService: 'payment',
      effect: 'require_approval',
      reason: 'Payment actions require human approval',
    },
    {
      id: 'allow-rest-default',
      targetService: 'rest',
      effect: 'allow',
      reason: 'REST proxy allowed',
    },
    {
      id: 'allow-http-default',
      targetService: 'http',
      effect: 'allow',
      reason: 'HTTP proxy allowed',
    },
    {
      id: 'allow-a2a-default',
      targetService: 'a2a',
      effect: 'allow',
      reason: 'A2A relay allowed',
    },
    {
      id: 'allow-browser-default',
      targetService: 'browser',
      effect: 'allow',
      reason: 'Browser session allowed (stub)',
    },
  ],
};
