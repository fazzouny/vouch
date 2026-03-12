/**
 * A2A relay adapter: forwards action to an Agent-to-Agent peer endpoint.
 * Action payload: peerUrl, method (default POST), body (forwarded to peer).
 * Adds Gatekeeper grant context in headers for the peer to verify.
 */
import type { ExecutionAdapter } from "./types.js";
import type { VerifiedGrant, ExecutionResult } from "../types.js";
import { appendEvent } from "../audit/index.js";

export interface A2AActionPayload {
  peerUrl: string;
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

const DEFAULT_METHOD = "POST";

export class A2ARelayAdapter implements ExecutionAdapter {
  readonly targetType = "a2a";

  async execute(
    verifiedGrant: VerifiedGrant,
    actionPayload: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const payload = actionPayload as unknown as A2AActionPayload;
    const { peerUrl, method = DEFAULT_METHOD, body, headers } = payload;
    if (!peerUrl || typeof peerUrl !== "string") {
      return { success: false, error: "action payload must include 'peerUrl'" };
    }

    const m = (method as string).toUpperCase();
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(m)) {
      return { success: false, error: `method not allowed: ${method}` };
    }

    try {
      const res = await fetch(peerUrl, {
        method: m,
        headers: {
          "Content-Type": "application/json",
          "X-Gatekeeper-Grant-Id": verifiedGrant.grantId,
          "X-Gatekeeper-Agent-Id": verifiedGrant.agentId,
          "X-Gatekeeper-Scope": verifiedGrant.scope ?? "",
          ...(headers as Record<string, string> | undefined),
        },
        body: body != null ? JSON.stringify(body) : undefined,
      });

      let data: unknown;
      const ct = res.headers.get("content-type");
      if (ct?.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = await res.text();
        }
      } else {
        data = await res.text();
      }

      await appendEvent({
        type: "execution",
        agentId: verifiedGrant.agentId,
        grantId: verifiedGrant.grantId,
        payload: { targetType: "a2a", peerUrl, method: m, statusCode: res.status },
      });

      return {
        success: res.ok,
        data,
        statusCode: res.status,
        error: res.ok ? undefined : `A2A peer returned ${res.status}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await appendEvent({
        type: "execution_error",
        agentId: verifiedGrant.agentId,
        grantId: verifiedGrant.grantId,
        payload: { targetType: "a2a", peerUrl, error: message },
      });
      return { success: false, error: message };
    }
  }
}
