#!/usr/bin/env node
/**
 * Vouch delegate → execute flow for OpenClaw (or any script caller).
 * Required: --url
 * Optional: --action, --method (default GET), --body
 * All JSON output (success and error) is on stdout.
 * Env: VOUCH_BASE_URL (default http://localhost:3040), VOUCH_TOKEN (e.g. agent-1)
 */
const baseUrl = (process.env.VOUCH_BASE_URL || "http://localhost:3040").replace(/\/$/, "");
const token = process.env.VOUCH_TOKEN || "agent-1";

function out(obj) {
  console.log(JSON.stringify(obj));
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { intendedAction: "", targetType: "rest", url: "", method: "GET", body: undefined };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--action" && args[i + 1]) out.intendedAction = args[++i];
    else if (args[i] === "--url" && args[i + 1]) out.url = args[++i];
    else if (args[i] === "--method" && args[i + 1]) out.method = args[++i];
    else if (args[i] === "--body" && args[i + 1]) {
      try { out.body = JSON.parse(args[++i]); } catch { out.body = args[i]; }
    }
  }
  return out;
}

async function main() {
  const { intendedAction, targetType, url, method, body } = parseArgs();
  if (!url) {
    out({ error: "Missing --url" });
    process.exit(1);
  }
  const actionPayload = { url, method };
  if (body !== undefined) actionPayload.body = body;

  const resDelegate = await fetch(`${baseUrl}/delegate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      targetType,
      intendedAction: intendedAction || `${method} ${url}`,
      actionPayload,
    }),
  });

  const delegateData = await resDelegate.json().catch(() => ({}));

  if (resDelegate.status === 202 || delegateData.pending_approval) {
    out({
      error: "approval_required",
      approvalRequestId: delegateData.approvalRequestId,
      expiresAt: delegateData.expiresAt,
      message: delegateData.message || "Action requires approval.",
    });
    process.exit(1);
  }

  if (!resDelegate.ok) {
    out({ error: delegateData.reason || delegateData.error || `delegate failed: ${resDelegate.status}` });
    process.exit(1);
  }

  const { grant } = delegateData;
  const signed = typeof grant?.signed === "string" ? grant.signed : JSON.stringify(grant);

  const resExecute = await fetch(`${baseUrl}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant: signed, action: actionPayload }),
  });
  const executeData = await resExecute.json().catch(() => ({}));

  if (!resExecute.ok) {
    out({ error: executeData.error || `execute failed: ${resExecute.status}` });
    process.exit(1);
  }

  out(executeData);
}

main().catch((err) => {
  const cause = err.cause;
  const code = cause?.code ?? cause?.errors?.[0]?.code;
  if (code === "ECONNREFUSED" || (typeof err.message === "string" && err.message.includes("ECONNREFUSED"))) {
    out({
      error: "gateway_unreachable",
      cause: "ECONNREFUSED",
      hint: "Ensure the Vouch gateway is running (e.g. npm start in the Vouch repo).",
    });
  } else {
    out({ error: "request_failed", cause: err.message || String(err) });
  }
  process.exit(1);
});
