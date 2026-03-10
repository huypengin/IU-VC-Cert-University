import type { ChainVerificationResult } from "../verifier/types";

export function describeChainStatus(result: ChainVerificationResult): string {
  if (result.revoked) {
    return result.revocationReason
      ? `Revoked on-chain: ${result.revocationReason}`
      : "Revoked on-chain";
  }

  if (!result.anchorTxConfirmed) {
    return result.error ?? "Chain anchoring could not be confirmed";
  }

  return "Anchor confirmed and not revoked";
}
