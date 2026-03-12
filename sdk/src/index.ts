/**
 * @vouch/sdk — Client for requestDelegation and executeWithGrant.
 */

export { VouchClient } from "./client.js";
export type { VouchClientOptions } from "./client.js";
/** @deprecated Use VouchClient */
export { VouchClient as GatekeeperClient } from "./client.js";
/** @deprecated Use VouchClientOptions */
export type { VouchClientOptions as GatekeeperClientOptions } from "./client.js";
export type { ActionRequest, Grant, DelegateSuccess, ExecuteSuccess } from "./types.js";
