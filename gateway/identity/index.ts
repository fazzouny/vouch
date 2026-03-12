/**
 * Identity layer: store, CRUD/lookup, and auth resolution.
 * Export for use by the gateway and other packages.
 */
export { IdentityStore } from './store.js';
export { IdentityStoreSqlite } from './store-sqlite.js';
export type { IdentityStoreConfig } from './store.js';
export { resolveCallerIdentity } from './auth.js';
export type {
  ResolveCallerIdentityOutcome,
  ResolveCallerIdentityResult,
  ResolveCallerIdentityError,
} from './auth.js';
export type {
  IncomingRequestLike,
  CallerIdentity,
  OnBehalfOf,
  ResolvedIdentityContext,
} from './types.js';
