/**
 * In-memory trust signal and score store.
 * Aggregates signals into a tier (low/medium/high) per agent/tool/peer.
 */
import type { TrustSignal, TrustScore, TrustTier, TrustSignalType } from '@vouch/types';
import * as crypto from 'node:crypto';

function now(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class TrustStore {
  private readonly signals = new Map<string, TrustSignal>();
  private readonly scores = new Map<string, TrustScore>();

  private scoreKey(subjectType: TrustScore['subjectType'], subjectId: string): string {
    return `${subjectType}:${subjectId}`;
  }

  async recordSignal(input: {
    subjectType: 'agent' | 'tool' | 'peer';
    subjectId: string;
    signalType: TrustSignalType;
    weight?: number;
    ref?: string;
  }): Promise<TrustSignal> {
    const id = newId('tsig');
    const signal: TrustSignal = {
      id,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      signalType: input.signalType,
      weight: input.weight,
      ref: input.ref,
      createdAt: now(),
    };
    this.signals.set(id, signal);
    await this.updateScore(input.subjectType, input.subjectId);
    return signal;
  }

  private async updateScore(subjectType: 'agent' | 'tool' | 'peer', subjectId: string): Promise<void> {
    const key = this.scoreKey(subjectType, subjectId);
    const subjectSignals = Array.from(this.signals.values()).filter(
      (s) => s.subjectType === subjectType && s.subjectId === subjectId
    );
    const recent = subjectSignals.filter(
      (s) => Date.now() - new Date(s.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
    );
    let positives = 0;
    let negatives = 0;
    for (const s of recent) {
      if (s.signalType === 'execution_success' || s.signalType === 'approval_granted' || s.signalType === 'attestation_fresh')
        positives += s.weight ?? 1;
      if (s.signalType === 'execution_failure' || s.signalType === 'policy_violation' || s.signalType === 'anomaly' || s.signalType === 'rollback')
        negatives += s.weight ?? 1;
    }
    const total = positives + negatives;
    const score = total === 0 ? 0.5 : positives / total;
    let tier: TrustTier = 'medium';
    if (score >= 0.8) tier = 'high';
    else if (score >= 0.6) tier = 'medium';
    else if (score >= 0.3) tier = 'low';
    else tier = 'low';
    const existing = this.scores.get(key);
    const updated: TrustScore = {
      subjectType,
      subjectId,
      tier,
      score,
      window: '30d',
      updatedAt: now(),
    };
    this.scores.set(key, updated);
  }

  async getScore(subjectType: 'agent' | 'tool' | 'peer', subjectId: string): Promise<TrustScore | null> {
    return this.scores.get(this.scoreKey(subjectType, subjectId)) ?? null;
  }

  async listSignals(filter: { subjectId?: string; subjectType?: string; limit?: number }): Promise<TrustSignal[]> {
    let list = Array.from(this.signals.values());
    if (filter.subjectId) list = list.filter((s) => s.subjectId === filter.subjectId);
    if (filter.subjectType) list = list.filter((s) => s.subjectType === filter.subjectType);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const limit = filter.limit ?? 100;
    return list.slice(0, limit);
  }
}
