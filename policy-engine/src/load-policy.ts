/**
 * Load policy from structured config (JSON). Phase 1: scope is string only (no RegExp in JSON).
 */

import type { PolicyConfig, PolicyRule } from './policy-config.js';

export interface PolicyRuleJson {
  id?: string;
  agentId?: string;
  agentGroup?: string;
  trustTier?: string;
  toolType?: string;
  targetService?: string;
  scope?: string;
  effect: 'allow' | 'deny' | 'require_approval';
  reason?: string;
}

export interface PolicyConfigJson {
  defaultEffect?: 'allow' | 'deny';
  rules: PolicyRuleJson[];
}

/** Policy pack: named bundle for verticals (e.g. healthcare, finance) */
export interface PolicyPack {
  name: string;
  description?: string;
  config: PolicyConfigJson;
}

/**
 * Parse JSON policy config into PolicyConfig (scope remains string; RegExp not supported in JSON).
 */
export function loadPolicyFromJson(json: string): PolicyConfig {
  const parsed = JSON.parse(json) as PolicyConfigJson;
  const rules: PolicyRule[] = (parsed.rules ?? []).map((r) => ({
    id: r.id,
    agentId: r.agentId,
    agentGroup: r.agentGroup,
    trustTier: r.trustTier,
    toolType: r.toolType,
    targetService: r.targetService,
    scope: r.scope,
    effect: r.effect as PolicyRule['effect'],
    reason: r.reason,
  }));
  return {
    defaultEffect: parsed.defaultEffect,
    rules,
  };
}
