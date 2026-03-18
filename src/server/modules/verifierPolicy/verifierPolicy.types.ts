import type { IUSmartCertMerkleReceipt } from "../../../vc/types.js";
import type {
  ChainVerificationResult,
  MerkleVerificationResult,
  ReceiptSource,
} from "../../../verifier/types.js";

export type VerifierPolicyCheckState =
  | "active"
  | "failed"
  | "indeterminate"
  | "passed"
  | "revoked"
  | "skipped"
  | "trusted"
  | "untrusted";

export type VerifierPolicyChecks = {
  merkle: VerifierPolicyCheckState;
  chain: VerifierPolicyCheckState;
  revocation: VerifierPolicyCheckState;
  issuerTrust: VerifierPolicyCheckState;
};

export type VerifierPolicyBody = {
  decision: "accept" | "reject";
  reason?: string;
  checks: VerifierPolicyChecks;
};

export type VerifierPolicyLogCategory =
  | "accept"
  | "dependency_failure"
  | "input_error"
  | "policy_reject";

export type VerifierPolicyDecision = {
  httpStatus: number;
  body: VerifierPolicyBody;
  logCategory: VerifierPolicyLogCategory;
};

export type VerifierPolicyDependencies = {
  resolveReceipt: (
    vc: Record<string, unknown>,
  ) => Promise<{ receipt: IUSmartCertMerkleReceipt; source: ReceiptSource }>;
  verifyMerkleProofs: (
    vc: Record<string, unknown>,
    receipt: IUSmartCertMerkleReceipt,
  ) => Promise<MerkleVerificationResult>;
  verifyChainAnchoring: (
    receipt: IUSmartCertMerkleReceipt,
    rpcUrl?: string,
  ) => Promise<ChainVerificationResult>;
};

export type EvaluateVerifierPolicyOptions = {
  rpcUrl?: string;
  trustedIssuers?: string[];
  deps?: Partial<VerifierPolicyDependencies>;
};
