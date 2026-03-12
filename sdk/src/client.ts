/**
 * Vouch client: requestDelegation and executeWithGrant.
 */

import type { ActionRequest, Grant, DelegateSuccess, ExecuteSuccess } from "./types.js";

export interface VouchClientOptions {
  baseUrl: string;
  /** Bearer token (e.g. agent id for stub auth) */
  token: string;
}

export class VouchClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(options: VouchClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
  }

  /**
   * Request a delegation grant for the given action.
   * @throws on non-2xx (e.g. 401, 403 with reason)
   */
  async requestDelegation(actionRequest: ActionRequest): Promise<Grant> {
    const res = await fetch(`${this.baseUrl}/delegate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(actionRequest),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string; reason?: string };
      throw new Error(body.reason ?? body.error ?? `delegate failed: ${res.status}`);
    }

    const data = (await res.json()) as DelegateSuccess;
    return data.grant;
  }

  /**
   * Execute an action using a signed grant.
   * @returns result (and optional statusCode for REST)
   * @throws on non-2xx or execution failure
   */
  async executeWithGrant(
    grant: Grant,
    action: Record<string, unknown>
  ): Promise<ExecuteSuccess> {
    const signed =
      "signed" in grant && typeof grant.signed === "string"
        ? grant.signed
        : JSON.stringify(grant);
    const res = await fetch(`${this.baseUrl}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant: signed, action }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? `execute failed: ${res.status}`);
    }

    return (await res.json()) as ExecuteSuccess;
  }
}
