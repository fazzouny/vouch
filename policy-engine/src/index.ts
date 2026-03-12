/**
 * @vouch/policy-engine
 * Evaluate action requests against policy rules. Default: deny unless a rule allows.
 */

export { evaluatePolicy, type AgentIdentity } from './evaluate.js';
export { DEFAULT_POLICY, type PolicyConfig, type PolicyRule, type PolicyRuleEffect } from './policy-config.js';
export {
  loadPolicyFromJson,
  type PolicyRuleJson,
  type PolicyConfigJson,
  type PolicyPack,
} from './load-policy.js';
