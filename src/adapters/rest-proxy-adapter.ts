/**
 * REST proxy adapter: forwards HTTP request to target URL from action payload.
 */

import type { ExecutionAdapter } from "./types.js";
import type { VerifiedGrant, ExecutionResult } from "../types.js";
import { appendEvent } from "../audit/index.js";

export interface RestActionPayload {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

const DEFAULT_METHOD = "GET";

export class RestProxyAdapter implements ExecutionAdapter {
  readonly targetType = "rest";

  async execute(
    verifiedGrant: VerifiedGrant,
    actionPayload: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const payload = actionPayload as unknown as RestActionPayload;
    const { url, method = DEFAULT_METHOD, body, headers } = payload;
    if (!url || typeof url !== "string") {
      return { success: false, error: "action payload must include 'url'" };
    }

    const allowedMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];
    const m = (method as string).toUpperCase();
    if (!allowedMethods.includes(m)) {
      return { success: false, error: `method not allowed: ${method}` };
    }

    try {
      const res = await fetch(url, {
        method: m,
        headers: {
          "Content-Type": "application/json",
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
        payload: { targetType: "rest", url, method: m, statusCode: res.status },
      });

      return {
        success: res.ok,
        data,
        statusCode: res.status,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await appendEvent({
        type: "execution_error",
        agentId: verifiedGrant.agentId,
        grantId: verifiedGrant.grantId,
        payload: { targetType: "rest", url, method: (method as string) ?? DEFAULT_METHOD, error: message },
      });
      return { success: false, error: message };
    }
  }
}
