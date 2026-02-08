/**
 * Merkle proof verification for IU-SmartCert.
 * Verifies that disclosed components match the receipt's Merkle root.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { concatBytes, utf8ToBytes } from "../core/utils/bytes";
import { bytes32ToHex } from "../core/utils/hex";
import type { ComponentProof, IUSmartCertMerkleReceipt, MerkleTreeSpec } from "../vc/types";
import type { MerkleVerificationResult } from "./types";

/**
 * Hash a leaf value using the algorithm specified in the receipt.
 */
function hashLeaf(value: string, spec: MerkleTreeSpec): Uint8Array {
    const valueBytes = utf8ToBytes(value);
    if (spec.leafHashAlg === "sha256") {
        return sha256(valueBytes);
    }
    throw new Error(`Unsupported leaf hash algorithm: ${spec.leafHashAlg}`);
}

/**
 * Hash two nodes together using the node hash algorithm.
 */
function hashNodes(a: Uint8Array, b: Uint8Array, spec: MerkleTreeSpec): Uint8Array {
    // Sort if sortPairs is enabled
    let left = a;
    let right = b;
    if (spec.sortPairs) {
        const compare = compareBytesLex(a, b);
        if (compare > 0) {
            left = b;
            right = a;
        }
    }

    const combined = concatBytes(left, right);
    if (spec.nodeHashAlg === "keccak256") {
        return keccak_256(combined);
    }
    throw new Error(`Unsupported node hash algorithm: ${spec.nodeHashAlg}`);
}

/**
 * Lexicographic comparison of byte arrays.
 */
function compareBytesLex(a: Uint8Array, b: Uint8Array): number {
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        if (a[i] !== b[i]) {
            return a[i] < b[i] ? -1 : 1;
        }
    }
    return a.length - b.length;
}

/**
 * Verify a single Merkle proof.
 */
function verifySingleProof(
    leafHash: string,
    proof: string[],
    expectedRoot: string,
    spec: MerkleTreeSpec
): boolean {
    // Hash the leaf value as the tree building does
    let computedHash = keccak_256(utf8ToBytes(leafHash));

    for (const siblingHex of proof) {
        const sibling = hexToBytes(siblingHex);
        computedHash = hashNodes(computedHash, sibling, spec);
    }

    const computedRoot = bytes32ToHex(computedHash);
    return computedRoot.toLowerCase() === expectedRoot.toLowerCase();
}

/**
 * Convert hex string to Uint8Array.
 */
function hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
}

/**
 * Default Merkle tree spec for legacy receipts without merkleTreeSpec.
 */
const DEFAULT_SPEC: MerkleTreeSpec = {
    leafHashAlg: "sha256",
    nodeHashAlg: "keccak256",
    sortPairs: true,
    sortLeaves: true,
};

/**
 * Verify all Merkle proofs in a receipt against disclosed components.
 * 
 * @param vc The Verifiable Credential with disclosed components
 * @param receipt The Merkle receipt containing proofs
 * @returns Verification result
 */
export async function verifyMerkleProofs(
    vc: Record<string, unknown>,
    receipt: IUSmartCertMerkleReceipt
): Promise<MerkleVerificationResult> {
    try {
        const spec = receipt.merkleTreeSpec ?? DEFAULT_SPEC;
        const { merkleRoot, componentsProofs } = receipt;

        if (!componentsProofs || componentsProofs.length === 0) {
            return {
                valid: false,
                componentsVerified: 0,
                totalComponents: 0,
                error: "No component proofs in receipt",
            };
        }

        let verifiedCount = 0;

        for (const componentProof of componentsProofs) {
            const { hash, proof, name } = componentProof;

            const isValid = verifySingleProof(hash, proof, merkleRoot, spec);
            if (isValid) {
                verifiedCount++;
            } else {
                return {
                    valid: false,
                    componentsVerified: verifiedCount,
                    totalComponents: componentsProofs.length,
                    error: `Merkle proof verification failed for component: ${name}`,
                };
            }
        }

        return {
            valid: true,
            componentsVerified: verifiedCount,
            totalComponents: componentsProofs.length,
            computedRoot: merkleRoot,
            receiptRoot: merkleRoot,
        };
    } catch (err) {
        return {
            valid: false,
            componentsVerified: 0,
            totalComponents: 0,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
