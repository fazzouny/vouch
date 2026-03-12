/**
 * Sign and verify grant payloads (signed JSON with HMAC-SHA256).
 * Phase 1: symmetric key; issuer provides secret.
 */

import type { GrantPayload, SignedGrant } from '@delegation-gatekeeper/types';
import * as crypto from 'node:crypto';

const ALG = 'HS256';
const DEFAULT_TTL_SECONDS = 15 * 60; // 15 min

export interface SigningOptions {
  /** Secret for HMAC (min 32 bytes recommended) */
  secret: string;
  /** Issuer identifier (e.g. gatekeeper instance id) */
  issuer: string;
  /** Key id for verification (optional) */
  kid?: string;
}

/**
 * Sign a grant payload and return a SignedGrant.
 */
export function signGrant(payload: GrantPayload, options: SigningOptions): SignedGrant {
  const kid = options.kid ?? 'default';
  const message = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', options.secret).update(message).digest();
  const signature = sig.toString('base64url');
  return {
    payload,
    alg: ALG,
    signature,
    kid,
  };
}

/**
 * Verify signature and return the payload if valid.
 */
export function verifySignature(signed: SignedGrant, secret: string): GrantPayload | null {
  if (signed.alg !== ALG) return null;
  const message = JSON.stringify(signed.payload);
  const expected = crypto.createHmac('sha256', secret).update(message).digest().toString('base64url');
  if (expected !== signed.signature) return null;
  return signed.payload;
}

export function defaultExpiresAt(ttlSeconds: number = DEFAULT_TTL_SECONDS): string {
  const d = new Date();
  d.setSeconds(d.getSeconds() + ttlSeconds);
  return d.toISOString();
}
