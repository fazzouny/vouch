#!/usr/bin/env node
/**
 * Vouch delegate → execute flow for OpenClaw (or any script caller).
 * Usage: node vouch_request.mjs --action "GET example" --url "https://httpbin.org/get" [--method GET] [--body '{}']
 * Env: VOUCH_BASE_URL (default http://localhost:3040), VOUCH_TOKEN (e.g. agent-1)
 */
const baseUrl = (process.env.VOUCH_BASE_URL || "http://localhost:3040").replace(/\/$/, "");
const token = process.env.VOUCH_TOKEN || "agent-1";

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
    console.error(JSON.stringify({ error: "Missing --url" }));
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
  if (!resDelegate.ok) {
    const err = await resDelegate.json().catch(() => ({}));
    console.error(JSON.stringify({ error: err.reason || err.error || `delegate failed: ${resDelegate.status}` }));
    process.exit(1);
  }
  const { grant } = await resDelegate.json();
  const signed = typeof grant?.signed === "string" ? grant.signed : JSON.stringify(grant);

  const resExecute = await fetch(`${baseUrl}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grant: signed, action: actionPayload }),
  });
  if (!resExecute.ok) {
    const err = await resExecute.json().catch(() => ({}));
    console.error(JSON.stringify({ error: err.error || `execute failed: ${resExecute.status}` }));
    process.exit(1);
  }
  const data = await resExecute.json();
  console.log(JSON.stringify(data));
}

main();
