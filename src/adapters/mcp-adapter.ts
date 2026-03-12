/**
 * MCP adapter: gates MCP tool invocations. Execution is not implemented here;
 * agents use the Vouch MCP server (integrations/mcp-vouch) to request delegation
 * and execute via the gateway. This adapter allows policy to allow/deny/require_approval
 * for targetType "mcp" and returns a clear message if execute is called (e.g. from a future MCP relay).
 */

import type { ExecutionAdapter } from "./types.js";
import type { VerifiedGrant, ExecutionResult } from "../types.js";

export interface McpActionPayload {
  serverName?: string;
  toolName?: string;
  params?: Record<string, unknown>;
}

export class McpAdapter implements ExecutionAdapter {
  readonly targetType = "mcp";

  async execute(
    _verifiedGrant: VerifiedGrant,
    actionPayload: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const payload = actionPayload as McpActionPayload;
    const serverName = payload?.serverName ?? "unknown";
    const toolName = payload?.toolName ?? "unknown";
    return {
      success: false,
      error: `MCP execution not implemented in gateway: server=${serverName} tool=${toolName}. Use the Vouch MCP server (integrations/mcp-vouch) to request delegation and execute; the gateway gates targetType "mcp" by policy.`,
    };
  }
}
