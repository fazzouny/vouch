# OpenClaw skill: Vouch

This folder is an **OpenClaw skill** that lets your agent perform gated actions through Vouch (delegate → execute with policy and audit).

## Install

Copy this folder into your OpenClaw workspace skills directory:

```bash
cp -r integrations/openclaw ~/.openclaw/workspace/skills/vouch
# or on Windows (PowerShell):
# Copy-Item -Recurse integrations\openclaw $env:USERPROFILE\.openclaw\workspace\skills\vouch
```

## Configuration

Set in your environment or OpenClaw config:

- **VOUCH_BASE_URL** — Vouch gateway URL (default: `http://localhost:3040`)
- **VOUCH_TOKEN** — Bearer token (gateway uses this as agent id; e.g. `agent-1`)

## Contents

- **SKILL.md** — Skill description and when/how to use Vouch. The OpenClaw agent reads this to know when to call the tool.
- **vouch_request.mjs** — Runnable script: delegate then execute. Use for REST actions.

## Using the tool from the agent

The agent can run the script via bash, for example:

```bash
node ~/.openclaw/workspace/skills/vouch/vouch_request.mjs --action "GET example" --url "https://httpbin.org/get" --method GET
```

Optional: `--body '{"key":"value"}'` for POST/PUT bodies.

Output is JSON: `{ "result": ..., "statusCode": ... }` or an error object.
