/**
 * IU-SmartCert Verifier Module
 * 
 * Two-phase verification pipeline:
 * - Phase 1: Standard W3C VC verification (signature, issuer, temporal)
 * - Phase 2: IU-SmartCert advanced verification (Merkle proofs, on-chain anchoring)
 */

export { resolveReceipt, type ResolvedReceipt } from "./receiptResolver";
export { verifyStandardVC } from "./standardVerification";
export { verifyMerkleProofs } from "./merkleVerification";
export { verifyChainAnchoring } from "./chainVerification";
export type {
    VerificationResult,
    VerifyOptions,
    StandardVerificationResult,
    MerkleVerificationResult,
    ChainVerificationResult,
    ReceiptSource,
} from "./types";

import { resolveReceipt } from "./receiptResolver";
import { verifyStandardVC } from "./standardVerification";
import { verifyMerkleProofs } from "./merkleVerification";
import { verifyChainAnchoring } from "./chainVerification";
import type { VerificationResult, VerifyOptions } from "./types";

/**
 * Full two-phase verification pipeline for IU-SmartCert credentials.
 * 
 * Phase 1 (Standard):
 * - Verify VC proof signature
 * - Validate issuer DID
 * - Check temporal validity (validFrom/validUntil)
 * 
 * Phase 2 (Advanced - IU-SmartCert specific):
 * - Resolve Merkle receipt (from evidence or legacy field)
 * - Verify Merkle proofs for all disclosed components
 * - Verify on-chain anchoring via smart contract
 * 
 * @param vc The Verifiable Credential to verify
 * @param options Verification options
 * @returns Verification result with detailed breakdown
 */
export async function verifyVC(
    vc: Record<string, unknown>,
    options: VerifyOptions = {}
): Promise<VerificationResult> {
    const { advancedVerification = true, skipChainVerification = false, rpcUrl } = options;

    // Phase 1: Standard VC verification
    const standardResult = await verifyStandardVC(vc);
    if (!standardResult.valid) {
        return {
            valid: false,
            phase: "standard",
            standard: standardResult,
        };
    }

    // If advanced verification is disabled, return standard result
    if (!advancedVerification) {
        return {
            valid: true,
            phase: "standard",
            standard: standardResult,
        };
    }

    // Phase 2: IU-SmartCert advanced verification
    try {
        // Resolve receipt
        const { receipt, source } = await resolveReceipt(vc);

        // Verify Merkle proofs
        const merkleResult = await verifyMerkleProofs(vc, receipt);
        if (!merkleResult.valid) {
            return {
                valid: false,
                phase: "advanced",
                standard: standardResult,
                merkle: merkleResult,
                receiptSource: source,
            };
        }

        // Verify on-chain anchoring (optional)
        if (!skipChainVerification) {
            const chainResult = await verifyChainAnchoring(receipt, rpcUrl);
            if (!chainResult.valid) {
                return {
                    valid: false,
                    phase: "advanced",
                    standard: standardResult,
                    merkle: merkleResult,
                    chain: chainResult,
                    receiptSource: source,
                };
            }

            return {
                valid: true,
                phase: "advanced",
                standard: standardResult,
                merkle: merkleResult,
                chain: chainResult,
                receiptSource: source,
            };
        }

        // Return without chain verification
        return {
            valid: true,
            phase: "advanced",
            standard: standardResult,
            merkle: merkleResult,
            receiptSource: source,
        };
    } catch (err) {
        return {
            valid: false,
            phase: "advanced",
            standard: standardResult,
            merkle: {
                valid: false,
                componentsVerified: 0,
                totalComponents: 0,
                error: err instanceof Error ? err.message : String(err),
            },
        };
    }
}
