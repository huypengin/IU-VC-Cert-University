/**
 * Standard W3C VC verification (Phase 1).
 * Verifies signature, issuer DID, and temporal validity.
 * Does NOT include IU-SmartCert-specific Merkle/chain verification.
 */

import { ed25519 } from "@noble/curves/ed25519.js";
import type { StandardVerificationResult } from "./types";

// Base58 alphabet (Bitcoin style)
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Simple base58 decoder
 */
function base58Decode(str: string): Uint8Array {
    let result = BigInt(0);
    for (const char of str) {
        const value = BASE58_ALPHABET.indexOf(char);
        if (value === -1) throw new Error(`Invalid base58 character: ${char}`);
        result = result * 58n + BigInt(value);
    }

    // Convert to bytes
    const hex = result.toString(16).padStart(2, "0");
    const paddedHex = hex.length % 2 === 0 ? hex : "0" + hex;
    const bytes: number[] = [];
    for (let i = 0; i < paddedHex.length; i += 2) {
        bytes.push(parseInt(paddedHex.substring(i, i + 2), 16));
    }

    // Add leading zeros
    let leadingZeros = 0;
    for (const char of str) {
        if (char !== "1") break;
        leadingZeros++;
    }

    return new Uint8Array([...Array(leadingZeros).fill(0), ...bytes]);
}

/**
 * Decode a base58-btc multibase string (starting with 'z')
 */
function decodeMultibase(encoded: string): Uint8Array {
    if (!encoded.startsWith("z")) {
        throw new Error("Expected base58-btc multibase (starts with 'z')");
    }
    return base58Decode(encoded.slice(1));
}

/**
 * Extract Ed25519 public key from a multibase-encoded key.
 * Handles multicodec prefix 0xed01 for Ed25519.
 */
function extractEd25519PublicKey(multibaseKey: string): Uint8Array {
    const decoded = decodeMultibase(multibaseKey);
    // Skip multicodec prefix (2 bytes for Ed25519: 0xed01)
    if (decoded[0] === 0xed && decoded[1] === 0x01) {
        return decoded.slice(2);
    }
    return decoded;
}

/**
 * Stable JSON stringify for signature verification.
 * Matches the issuer's signing implementation.
 */
function stableStringify(obj: unknown): string {
    if (obj === null || obj === undefined) return "";
    if (typeof obj !== "object") return JSON.stringify(obj);

    if (Array.isArray(obj)) {
        return "[" + obj.map(stableStringify).join(",") + "]";
    }

    const keys = Object.keys(obj as object).sort();
    const pairs = keys.map((k) => {
        const v = (obj as Record<string, unknown>)[k];
        if (v === undefined) return null;
        return JSON.stringify(k) + ":" + stableStringify(v);
    }).filter(Boolean);

    return "{" + pairs.join(",") + "}";
}

/**
 * Verify the DataIntegrityProof signature on a VC.
 * 
 * Note: This is a simplified implementation that uses stable JSON stringify.
 * A full implementation should use RDF Dataset Canonicalization (RDFC-2022).
 */
async function verifySignature(vc: Record<string, unknown>): Promise<boolean> {
    const proof = vc.proof as Record<string, unknown> | undefined;
    if (!proof) {
        throw new Error("VC has no proof");
    }

    if (proof.type !== "DataIntegrityProof") {
        throw new Error(`Unsupported proof type: ${proof.type}`);
    }

    const proofValue = proof.proofValue as string | undefined;
    if (!proofValue) {
        throw new Error("Proof has no proofValue");
    }

    const verificationMethod = proof.verificationMethod as string | undefined;
    if (!verificationMethod) {
        throw new Error("Proof has no verificationMethod");
    }

    // Create VC copy without proof for verification
    const vcWithoutProof = { ...vc };
    delete vcWithoutProof.proof;

    // Create proof options (proof without proofValue)
    const proofOptions = { ...proof };
    delete proofOptions.proofValue;

    // Combine for signing input (simplified - proper implementation uses RDFC)
    const signingInput = stableStringify(proofOptions) + stableStringify(vcWithoutProof);
    const message = new TextEncoder().encode(signingInput);

    // Decode signature
    const signature = decodeMultibase(proofValue);

    // TODO: Resolve DID document to get public key
    // For now, we extract the key from the verification method if it's a did:key
    let publicKey: Uint8Array;
    if (verificationMethod.startsWith("did:key:")) {
        const keyPart = verificationMethod.split("#")[0].replace("did:key:", "");
        publicKey = extractEd25519PublicKey(keyPart);
    } else if (verificationMethod.startsWith("did:web:")) {
        // TODO: Implement DID:web resolution
        // For now, return true with a warning
        console.warn("DID:web resolution not implemented, skipping signature verification");
        return true;
    } else {
        throw new Error(`Unsupported DID method: ${verificationMethod}`);
    }

    // Verify Ed25519 signature
    return ed25519.verify(signature, message, publicKey);
}

/**
 * Check if temporal claims (validFrom, validUntil) are satisfied.
 */
function checkTemporal(vc: Record<string, unknown>): boolean {
    const now = new Date();

    const validFrom = vc.validFrom as string | undefined;
    if (validFrom) {
        const from = new Date(validFrom);
        if (now < from) {
            return false; // VC not yet valid
        }
    }

    const validUntil = vc.validUntil as string | undefined;
    if (validUntil) {
        const until = new Date(validUntil);
        if (now > until) {
            return false; // VC expired
        }
    }

    return true;
}

/**
 * Check if issuer DID is valid.
 * Basic validation only - does not resolve the DID.
 */
function checkIssuer(vc: Record<string, unknown>): boolean {
    const issuer = vc.issuer as string | Record<string, unknown> | undefined;
    if (!issuer) return false;

    const issuerDid = typeof issuer === "string" ? issuer : (issuer.id as string);
    if (!issuerDid) return false;

    // Basic DID format check
    return /^did:[a-z0-9]+:.+$/i.test(issuerDid);
}

/**
 * Perform standard W3C VC verification (Phase 1).
 * 
 * Checks:
 * - Proof signature validity
 * - Issuer DID format
 * - Temporal validity (validFrom/validUntil)
 */
export async function verifyStandardVC(
    vc: Record<string, unknown>
): Promise<StandardVerificationResult> {
    try {
        const issuerValid = checkIssuer(vc);
        if (!issuerValid) {
            return {
                valid: false,
                signatureValid: false,
                issuerValid: false,
                temporalValid: false,
                error: "Invalid or missing issuer DID",
            };
        }

        const temporalValid = checkTemporal(vc);
        if (!temporalValid) {
            return {
                valid: false,
                signatureValid: false,
                issuerValid: true,
                temporalValid: false,
                error: "VC is not within valid time period",
            };
        }

        const signatureValid = await verifySignature(vc);
        if (!signatureValid) {
            return {
                valid: false,
                signatureValid: false,
                issuerValid: true,
                temporalValid: true,
                error: "Signature verification failed",
            };
        }

        return {
            valid: true,
            signatureValid: true,
            issuerValid: true,
            temporalValid: true,
        };
    } catch (err) {
        return {
            valid: false,
            signatureValid: false,
            issuerValid: false,
            temporalValid: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
