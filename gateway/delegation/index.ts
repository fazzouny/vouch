/**
 * Gateway delegation layer: mint, verify, revoke grants; re-export policy evaluation.
 */

import { evaluatePolicy } from '@delegation-gatekeeper/policy-engine';

export { mintGrant, type MintGrantInput, type MintGrantResult, type MintGrantSuccess, type MintGrantDenial } from './mint.js';
export { verifyGrant, type VerifyGrantResult, type VerifyGrantOptions } from './verify.js';
export { revokeGrant, revokeGrantsByAgent, revokeGrantsByAgentList, registerGrant, isRevoked, clearRevocations } from './revocation.js';
export { signGrant, verifySignature, defaultExpiresAt, type SigningOptions } from './sign.js';

export { evaluatePolicy };
export type { AgentIdentity } from '@delegation-gatekeeper/policy-engine';
