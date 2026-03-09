/**
 * Verifier types for IU-SmartCert two-phase verification
 */

/**
 * Result of standard W3C VC verification (Phase 1)
 */
export type StandardVerificationResult = {
    valid: boolean;
    /** Whether the VC proof signature is valid */
    signatureValid: boolean;
    /** Whether the issuer DID is valid/resolvable */
    issuerValid: boolean;
    /** Whether validFrom/validUntil are satisfied */
    temporalValid: boolean;
    /** Error message if verification failed */
    error?: string;
};

/**
 * Result of Merkle proof verification
 */
export type MerkleVerificationResult = {
    valid: boolean;
    /** Number of components successfully verified */
    componentsVerified: number;
    /** Total number of components in the credential */
    totalComponents: number;
    /** Computed Merkle root from disclosed components */
    computedRoot?: string;
    /** Receipt Merkle root to compare against */
    receiptRoot?: string;
    /** Error message if verification failed */
    error?: string;
};

/**
 * Result of on-chain anchoring verification
 */
export type ChainVerificationResult = {
    valid: boolean;
    /** Whether the anchor transaction was confirmed on-chain */
    anchorTxConfirmed: boolean;
    /** Chain ID where verification was performed */
    chainId?: string;
    /** Contract address used for verification */
    contractAddress?: string;
    /** Whether the credential is explicitly revoked in the contract revocation list */
    revoked?: boolean;
    /** Human-readable revocation reason returned by the contract */
    revocationReason?: string;
    /** The bytes32-compatible component hash used as the revocation lookup key */
    revocationKey?: string;
    /** Error message if verification failed */
    error?: string;
};

/**
 * Where the receipt was found
 */
export type ReceiptSource = "evidence" | "legacy" | "external";

/**
 * Combined result of full verification pipeline
 */
export type VerificationResult = {
    /** Overall verification result */
    valid: boolean;
    /** Which phase completed (standard = Phase 1 only, advanced = Phase 1 + 2) */
    phase: "standard" | "advanced";
    /** Standard VC verification result */
    standard: StandardVerificationResult;
    /** Merkle proof verification result (if advanced) */
    merkle?: MerkleVerificationResult;
    /** On-chain verification result (if advanced) */
    chain?: ChainVerificationResult;
    /** Where receipt was found */
    receiptSource?: ReceiptSource;
};

/**
 * Options for verification
 */
export type VerifyOptions = {
    /** RPC URL for blockchain verification (optional, uses public endpoint if not provided) */
    rpcUrl?: string;
    /** Whether to perform advanced IU-SmartCert verification (default: true) */
    advancedVerification?: boolean;
    /** Skip chain verification (useful for offline testing) */
    skipChainVerification?: boolean;
};
