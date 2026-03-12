/**
 * Append-only audit log: JSONL file or in-memory store.
 * No deletion; optional hash chain for tamper evidence.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AuditEvent } from '@delegation-gatekeeper/types';
import type { AuditLogOptions, AuditQueryFilter } from './types.js';

/** Canonical string for hashing (stable key order not required for our use; consistency is) */
function canonicalEventString(event: AuditEvent): string {
  return JSON.stringify(event);
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/** Normalize event: ensure id/eventId and timestamp */
function normalizeEvent(event: AuditEvent): AuditEvent {
  const eventId = event.eventId ?? (event as AuditEvent & { id?: string }).id ?? '';
  return {
    ...event,
    eventId,
    id: event.id ?? eventId,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };
}

export class AuditLog {
  private filePath: string | undefined;
  private computeHashChain: boolean;
  private inMemory: AuditEvent[] = [];

  constructor(options: AuditLogOptions = {}) {
    this.filePath = options.filePath;
    this.computeHashChain = options.computeHashChain ?? true;
  }

  /** Append a single event; optionally chain previousEventHash from last event */
  appendEvent(event: AuditEvent): void {
    const normalized = normalizeEvent(event);
    let toWrite: AuditEvent = normalized;
    if (this.computeHashChain) {
      const last = this.getLastEvent();
      if (last) {
        const prevHash = sha256Hex(canonicalEventString(last));
        toWrite = { ...normalized, previousEventHash: prevHash };
      }
    }

    const line = JSON.stringify(toWrite) + '\n';

    if (this.filePath) {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(this.filePath, line, 'utf8');
    } else {
      this.inMemory.push(toWrite);
    }
  }

  private getLastEvent(): AuditEvent | null {
    if (this.filePath && fs.existsSync(this.filePath)) {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      if (lines.length === 0) return null;
      try {
        return JSON.parse(lines[lines.length - 1]!) as AuditEvent;
      } catch {
        return null;
      }
    }
    if (this.inMemory.length > 0) {
      return this.inMemory[this.inMemory.length - 1]!;
    }
    return null;
  }

  /** Query events by filter (agentId, taskId, runId, actionType, startTime, endTime) */
  queryEvents(filter: AuditQueryFilter): AuditEvent[] {
    const events = this.readAll();
    return events.filter((e) => matchesFilter(e, filter));
  }

  private readAll(): AuditEvent[] {
    if (this.filePath && fs.existsSync(this.filePath)) {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      return lines.map((line) => {
        try {
          return JSON.parse(line) as AuditEvent;
        } catch {
          return null;
        }
      }).filter((e): e is AuditEvent => e != null);
    }
    return [...this.inMemory];
  }
}

function matchesFilter(event: AuditEvent, f: AuditQueryFilter): boolean {
  if (f.agentId != null && event.agentId !== f.agentId) return false;
  if (f.taskId != null && event.taskId !== f.taskId) return false;
  if (f.runId != null && event.runId !== f.runId) return false;
  if (f.actionType != null && event.eventType !== f.actionType) return false;
  const t = event.timestamp;
  if (f.startTime != null && t < f.startTime) return false;
  if (f.endTime != null && t > f.endTime) return false;
  return true;
}
