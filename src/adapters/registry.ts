/**
 * Adapter registry: dispatch by target type.
 */

import type { ExecutionAdapter } from "./types.js";
import { RestProxyAdapter } from "./rest-proxy-adapter.js";
import { A2ARelayAdapter } from "./a2a-relay-adapter.js";
import { BrowserSessionAdapter } from "./browser-session-adapter.js";

const adapters = new Map<string, ExecutionAdapter>();

function registerDefaultAdapters(): void {
  const rest = new RestProxyAdapter();
  adapters.set("rest", rest);
  adapters.set("http", rest); // alias
  adapters.set("a2a", new A2ARelayAdapter());
  adapters.set("browser", new BrowserSessionAdapter());
}

registerDefaultAdapters();

export function registerAdapter(adapter: ExecutionAdapter): void {
  adapters.set(adapter.targetType, adapter);
}

export function getAdapter(targetType: string): ExecutionAdapter | undefined {
  return adapters.get(targetType);
}
