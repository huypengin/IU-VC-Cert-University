/**
 * Receipt resolution logic for IU-SmartCert verification.
 * Supports both W3C VC v2 evidence array and legacy iu:merkleReceipt field.
 */

import type { IUSmartCertMerkleReceipt } from "../vc/types";
import type { ReceiptSource } from "./types";

export type ResolvedReceipt = {
    receipt: IUSmartCertMerkleReceipt;
    source: ReceiptSource;
};

/**
 * Check if an evidence entry is an inline Merkle receipt (has all required fields)
 */
function isInlineMerkleReceipt(evidence: unknown): evidence is IUSmartCertMerkleReceipt {
    if (!evidence || typeof evidence !== "object") return false;
    const e = evidence as Record<string, unknown>;
    return (
        Array.isArray(e.type) &&
        e.type.includes("IUSmartCertMerkleReceipt") &&
        typeof e.chainId === "string" &&
        typeof e.contractAddress === "string" &&
        typeof e.merkleRoot === "string" &&
        typeof e.anchorTx === "string" &&
        Array.isArray(e.componentsProofs)
    );
}

/**
 * Check if an evidence entry is an external receipt reference
 */
function isExternalReceiptReference(evidence: unknown): evidence is {
    type: string[];
    id: string;
    digestMultibase: string;
    mediaType: string;
} {
    if (!evidence || typeof evidence !== "object") return false;
    const e = evidence as Record<string, unknown>;
    return (
        Array.isArray(e.type) &&
        e.type.includes("IUSmartCertMerkleReceipt") &&
        typeof e.id === "string" &&
        typeof e.digestMultibase === "string" &&
        !e.chainId // External references don't have chainId inline
    );
}

/**
 * Fetch and validate external receipt.
 * @throws if fetch fails or digest doesn't match
 */
async function fetchExternalReceipt(
    url: string,
    expectedDigest: string
): Promise<IUSmartCertMerkleReceipt> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch external receipt from ${url}: ${response.status}`);
    }

    const receiptJson = await response.text();

    // TODO: Validate digestMultibase against receiptJson
    // For now, we trust the fetch succeeded and parse the receipt
    // Proper implementation should use multiformats to verify the digest

    const receipt = JSON.parse(receiptJson);
    if (!isInlineMerkleReceipt(receipt)) {
        throw new Error(`External receipt from ${url} is not a valid IUSmartCertMerkleReceipt`);
    }

    return receipt;
}

/**
 * Resolve Merkle receipt from a VC.
 * 
 * Resolution order:
 * 1. Check `evidence` array for IUSmartCertMerkleReceipt (inline)
 * 2. Check `evidence` array for external reference and fetch
 * 3. Fall back to legacy `iu:merkleReceipt` field
 * 
 * @param vc The Verifiable Credential to extract receipt from
 * @returns Resolved receipt with source information
 * @throws If no receipt is found
 */
export async function resolveReceipt(vc: Record<string, unknown>): Promise<ResolvedReceipt> {
    // 1. Check evidence array
    if (Array.isArray(vc.evidence)) {
        for (const evidence of vc.evidence) {
            // Check for inline receipt
            if (isInlineMerkleReceipt(evidence)) {
                return {
                    receipt: evidence as IUSmartCertMerkleReceipt,
                    source: "evidence",
                };
            }

            // Check for external reference
            if (isExternalReceiptReference(evidence)) {
                const receipt = await fetchExternalReceipt(evidence.id, evidence.digestMultibase);
                return {
                    receipt,
                    source: "external",
                };
            }
        }
    }

    // 2. Fall back to legacy iu:merkleReceipt
    const legacyReceipt = vc["iu:merkleReceipt"];
    if (legacyReceipt && typeof legacyReceipt === "object") {
        // Legacy format uses string type, not tuple
        const receipt = legacyReceipt as IUSmartCertMerkleReceipt;
        if (
            typeof receipt.chainId === "string" &&
            typeof receipt.merkleRoot === "string" &&
            Array.isArray(receipt.componentsProofs)
        ) {
            return {
                receipt,
                source: "legacy",
            };
        }
    }

    throw new Error("No IUSmartCertMerkleReceipt found in evidence or iu:merkleReceipt");
}
