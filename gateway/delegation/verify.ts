/**
 * Grant verification: verifyGrant(signedGrant) → { valid, grant, error }.
 * Checks signature and expiry; optionally revocation (via isRevoked).
 */

import type { GrantPayload, SignedGrant } from '@delegation-gatekeeper/types';
import { verifySignature } from './sign.js';
import { isRevoked } from './revocation.js';

export interface VerifyGrantOptions {
  /** Secret used to sign grants (must match minting secret) */
  secret: string;
  /** If true, check revocation store (default true) */
  checkRevocation?: boolean;
}

export type VerifyGrantOk = { valid: true; grant: GrantPayload };
export type VerifyGrantErr = { valid: false; grant?: undefined; error: string };
export type VerifyGrantResult = VerifyGrantOk | VerifyGrantErr;

/**
 * Verify a signed grant: signature and expiry. Optionally check revocation.
 */
export function verifyGrant(
  signedGrant: SignedGrant,
  options: VerifyGrantOptions
): VerifyGrantResult {
  const { secret, checkRevocation = true } = options;

  const payload = verifySignature(signedGrant, secret);
  if (!payload) {
    return { valid: false, error: 'Invalid signature' };
  }

  const now = new Date();
  const expiresAt = new Date(payload.expiresAt);
  if (expiresAt <= now) {
    return { valid: false, error: 'Grant expired' };
  }

  if (checkRevocation && isRevoked(payload.grantId)) {
    return { valid: false, error: 'Grant revoked' };
  }

  return { valid: true, grant: payload };
}
