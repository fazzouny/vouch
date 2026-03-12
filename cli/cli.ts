#!/usr/bin/env node
/**
 * Delegation Gatekeeper CLI: request grant, execute, query audit, list approvals, revoke grant.
 * Usage: dg <command> [options]
 *   dg delegate --base-url URL --token TOKEN --target rest [--scope SCOPE]
 *   dg execute --base-url URL --grant-file FILE --action '{"url":"..."}'
 *   dg audit --base-url URL [--agent-id ID] [--limit N]
 *   dg approvals --base-url URL [--status pending]
 *   dg revoke --base-url URL --grant-id ID
 */
const BASE_URL = process.env.GATEKEEPER_BASE_URL ?? "http://localhost:3040";

async function delegate(args: string[]): Promise<void> {
  const token = args.indexOf("--token") >= 0 ? args[args.indexOf("--token") + 1] : process.env.GATEKEEPER_TOKEN ?? "agent-1";
  const baseUrl = args.indexOf("--base-url") >= 0 ? args[args.indexOf("--base-url") + 1] : BASE_URL;
  const target = args.indexOf("--target") >= 0 ? args[args.indexOf("--target") + 1] : "rest";
  const scope = args.indexOf("--scope") >= 0 ? args[args.indexOf("--scope") + 1] : "default";
  const res = await fetch(`${baseUrl}/delegate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ targetType: target, scope, intendedAction: target }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Delegate failed:", data.reason ?? data.error ?? res.status);
    process.exit(1);
  }
  if (data.pending_approval) {
    console.log("Pending approval:", data.approvalRequestId, "Expires:", data.expiresAt);
    return;
  }
  console.log(JSON.stringify(data.grant, null, 2));
}

async function execute(args: string[]): Promise<void> {
  const baseUrl = args.indexOf("--base-url") >= 0 ? args[args.indexOf("--base-url") + 1] : BASE_URL;
  const grantFile = args.indexOf("--grant-file") >= 0 ? args[args.indexOf("--grant-file") + 1] : null;
  const actionStr = args.indexOf("--action") >= 0 ? args[args.indexOf("--action") + 1] : "{}";
  if (!grantFile) {
    console.error("Usage: dg execute --base-url URL --grant-file FILE --action '{\"url\":\"...\"}'");
    process.exit(1);
  }
  const fs = await import("node:fs/promises");
  const grantContent = await fs.readFile(grantFile, "utf8");
  const grant = JSON.parse(grantContent);
  const action = typeof actionStr === "string" ? JSON.parse(actionStr) : actionStr;
  const signed = grant.signed ?? JSON.stringify(grant);
  const res = await fetch(`${baseUrl}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant: signed, action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Execute failed:", data.reason ?? data.error ?? res.status);
    process.exit(1);
  }
  console.log(JSON.stringify(data.result ?? data, null, 2));
}

async function audit(args: string[]): Promise<void> {
  const baseUrl = args.indexOf("--base-url") >= 0 ? args[args.indexOf("--base-url") + 1] : BASE_URL;
  const agentId = args.indexOf("--agent-id") >= 0 ? args[args.indexOf("--agent-id") + 1] : undefined;
  const limit = args.indexOf("--limit") >= 0 ? args[args.indexOf("--limit") + 1] : undefined;
  const params = new URLSearchParams();
  if (agentId) params.set("agentId", agentId);
  if (limit) params.set("limit", limit);
  const res = await fetch(`${baseUrl}/audit/events?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Audit query failed:", data.reason ?? res.status);
    process.exit(1);
  }
  console.log(JSON.stringify(data.events ?? [], null, 2));
}

async function approvals(args: string[]): Promise<void> {
  const baseUrl = args.indexOf("--base-url") >= 0 ? args[args.indexOf("--base-url") + 1] : BASE_URL;
  const status = args.indexOf("--status") >= 0 ? args[args.indexOf("--status") + 1] : undefined;
  const params = status ? `?status=${status}` : "";
  const res = await fetch(`${baseUrl}/approvals${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Approvals list failed:", data.reason ?? res.status);
    process.exit(1);
  }
  console.log(JSON.stringify(data.approvals ?? [], null, 2));
}

async function revoke(args: string[]): Promise<void> {
  const baseUrl = args.indexOf("--base-url") >= 0 ? args[args.indexOf("--base-url") + 1] : BASE_URL;
  const grantId = args.indexOf("--grant-id") >= 0 ? args[args.indexOf("--grant-id") + 1] : null;
  if (!grantId) {
    console.error("Usage: dg revoke --base-url URL --grant-id ID");
    process.exit(1);
  }
  const res = await fetch(`${baseUrl}/grants/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grantId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Revoke failed:", data.reason ?? res.status);
    process.exit(1);
  }
  console.log("Revoked:", data.grantId);
}

const commands: Record<string, (args: string[]) => Promise<void>> = {
  delegate,
  execute,
  audit,
  approvals,
  revoke,
};

const argv = process.argv.slice(2);
const cmd = argv[0];
if (!cmd || !commands[cmd]) {
  console.log("Delegation Gatekeeper CLI");
  console.log("Commands:", Object.keys(commands).join(", "));
  console.log("Env: GATEKEEPER_BASE_URL, GATEKEEPER_TOKEN");
  process.exit(0);
}
commands[cmd]!(argv.slice(1)).catch((err) => {
  console.error(err);
  process.exit(1);
});
