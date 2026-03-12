/**
 * Trust and reputation layer: signals and scores for agents, tools, peers.
 */

export type TrustTier = "low" | "medium" | "high" | "elevated";

export type TrustSignalType =
  | "approval_granted"
  | "approval_denied"
  | "execution_success"
  | "execution_failure"
  | "policy_violation"
  | "anomaly"
  | "rollback"
  | "attestation_fresh";

export interface TrustSignal {
  id: string;
  subjectType: "agent" | "tool" | "peer";
  subjectId: string;
  signalType: TrustSignalType;
  /** Optional weight or severity (e.g. 1 = normal, 2 = high impact) */
  weight?: number;
  /** Optional reference (e.g. grant id, run id) */
  ref?: string;
  createdAt: string;
}

export interface TrustScore {
  subjectType: "agent" | "tool" | "peer";
  subjectId: string;
  tier: TrustTier;
  /** 0–1 score (optional) */
  score?: number;
  /** Aggregation window (e.g. "30d") */
  window?: string;
  updatedAt: string;
}
