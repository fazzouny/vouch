/**
 * Browser session controller adapter (Phase 2 stub).
 * For production: integrate Playwright or Puppeteer with sandbox, masked secrets,
 * and scoped permissions (e.g. no file download, allowed origins only).
 * Action payload: url (to open), options (navigation options). This stub returns
 * a message that the integration is not yet implemented.
 */
import type { ExecutionAdapter } from "./types.js";
import type { VerifiedGrant, ExecutionResult } from "../types.js";

export class BrowserSessionAdapter implements ExecutionAdapter {
  readonly targetType = "browser";

  async execute(
    verifiedGrant: VerifiedGrant,
    actionPayload: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const url = actionPayload.url as string | undefined;
    if (!url || typeof url !== "string") {
      return { success: false, error: "action payload must include 'url' (page to open)" };
    }

    return {
      success: false,
      error:
        "Browser session controller is not implemented in this build. " +
        "Integrate Playwright or Puppeteer behind Gatekeeper with sandbox and scoped permissions.",
      data: {
        message: "Stub: browser adapter. Add Playwright/Puppeteer for real browser automation.",
        requestedUrl: url,
        grantId: verifiedGrant.grantId,
      },
    };
  }
}
