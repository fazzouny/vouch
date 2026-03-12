#!/usr/bin/env node
/**
 * Vouch MCP server — exposes request_delegation and execute_with_grant for Claude Code / Cursor.
 * Env: VOUCH_BASE_URL (default http://localhost:3040), VOUCH_TOKEN (e.g. agent-1)
 * Transport: stdio (newline-delimited JSON-RPC). Log to stderr only.
 */
import * as readline from "node:readline";

const baseUrl = (process.env.VOUCH_BASE_URL ?? "http://localhost:3040").replace(/\/$/, "");
const token = process.env.VOUCH_TOKEN ?? "agent-1";

function log(msg: string): void {
  process.stderr.write(`[vouch-mcp] ${msg}\n`);
}

const TOOLS = [
  {
    name: "request_delegation",
    description: "Request a delegation grant from Vouch for the given action. Use before executing sensitive or gated actions (REST, etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {
        targetType: { type: "string", enum: ["http", "rest"], description: "Target system type" },
        intendedAction: { type: "string", description: "Human-readable description of the action" },
        scope: { type: "string", description: "Optional scope identifier" },
        actionPayload: { type: "object", description: "Adapter payload, e.g. for rest: { url, method, body }" },
      },
      required: ["targetType"],
    },
  },
  {
    name: "execute_with_grant",
    description: "Execute an action using a signed grant from request_delegation. Pass the grant (string) and the action payload (e.g. url, method, body for REST).",
    inputSchema: {
      type: "object" as const,
      properties: {
        grant: { type: "string", description: "Signed grant from request_delegation" },
        action: { type: "object", description: "Action payload, e.g. { url, method, body } for REST" },
      },
      required: ["grant", "action"],
    },
  },
];

function send(obj: object): void {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

async function handleRequest(req: { id?: string | number; method: string; params?: unknown }): Promise<void> {
  const { id, method, params } = req;
  const sendResult = (result: unknown) => id !== undefined && send({ jsonrpc: "2.0", id, result });
  const sendError = (code: number, message: string) =>
    id !== undefined && send({ jsonrpc: "2.0", id, error: { code, message } });

  try {
    if (method === "initialize") {
      sendResult({
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "vouch", version: "0.1.0" },
      });
      return;
    }
    if (method === "notifications/initialized") {
      return;
    }
    if (method === "tools/list") {
      sendResult({ tools: TOOLS });
      return;
    }
    if (method === "tools/call") {
      const p = params as { name?: string; arguments?: unknown };
      const name = p?.name;
      const args = (p?.arguments as Record<string, unknown>) ?? {};
      if (name === "request_delegation") {
        const targetType = (args.targetType as string) ?? "rest";
        const intendedAction = (args.intendedAction as string) ?? `${targetType} request`;
        const scope = args.scope as string | undefined;
        const actionPayload = (args.actionPayload as Record<string, unknown>) ?? {};
        const res = await fetch(`${baseUrl}/delegate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            targetType,
            intendedAction,
            scope,
            actionPayload,
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { reason?: string; error?: string };
          sendResult({
            content: [{ type: "text", text: `Delegate failed: ${err.reason ?? err.error ?? res.status}` }],
            isError: true,
          });
          return;
        }
        const data = (await res.json()) as { grant: { signed?: string } };
        const grant =
          typeof data.grant?.signed === "string" ? data.grant.signed : JSON.stringify(data.grant);
        sendResult({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                grant,
                message: "Use execute_with_grant with this grant and the action payload.",
              }),
            },
          ],
        });
        return;
      }
      if (name === "execute_with_grant") {
        const grant = args.grant as string;
        const action = (args.action as Record<string, unknown>) ?? {};
        const res = await fetch(`${baseUrl}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grant, action }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          sendResult({
            content: [{ type: "text", text: `Execute failed: ${err.error ?? res.status}` }],
            isError: true,
          });
          return;
        }
        const data = (await res.json()) as { result?: unknown; statusCode?: number };
        sendResult({
          content: [
            { type: "text", text: JSON.stringify({ result: data.result, statusCode: data.statusCode }) },
          ],
        });
        return;
      }
      sendError(-32602, `Unknown tool: ${name}`);
      return;
    }
    if (id !== undefined) sendError(-32601, `Method not found: ${method}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`Error: ${msg}`);
    sendError(-32603, msg);
  }
}

async function main(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const req = JSON.parse(trimmed) as { id?: string | number; method: string; params?: unknown };
      await handleRequest(req);
    } catch (e) {
      log(`Parse error: ${e}`);
    }
  }
}

main().catch((e) => {
  log(String(e));
  process.exit(1);
});
