# Verification Logic: Skip Chain Anchoring

The IU-SmartCert verifier uses a modular, multi-phase pipeline. This document explains why a credential can still "Pass" verification even when **Skip chain verification** is enabled.

## The 3 Layers of Trust

Verification is divided into three distinct layers. For a credential to be fully "Valid," every *enabled* layer must pass.

### 1. Standard VC Layer (Phase 1)
*   **What it checks**: Issuer DID format, temporal validity (validFrom/Until), and the cryptographic signature.
*   **Technical Details**:
    *   **Algorithm**: IU-SmartCert uses **Ed25519** signatures with the `DataIntegrityProof` type.
    *   **Data Format**: Signature values are **base58-btc** multibase encoded (e.g., values starting with `z`).
    *   **DID Resolution**: The verifier resolves the issuer's DID (e.g., `did:web`) to retrieve the public key. 
    *   **Canonicalization**: Before checking the signature, the VC is normalized using a stable JSON stringify (with keys sorted lexicographically) to ensure consistent hashing.
*   **Status**: Mandatory.

### 2. Merkle Integrity Layer (Phase 2a)
*   **What it checks**: Mathematical proof that the "Disclosed Components" match the `merkleRoot` in the receipt.
*   **Technical Details**:
    *   **Hashing Algorithms**: By default, uses **SHA-256** for leaf hashing and **Keccak-256** for internal node hashing.
    *   **Leaf Construction**: Each leaf is hashed as `keccak256(utf8Bytes(content))`.
    *   **Tree Rules**:
        *   **Lexicographic Sorting**: Sibling nodes are sorted lexicographically before hashing (`sortPairs: true`) to ensure tree stability.
        *   **Path Traversal**: The verifier reconstructs the root by iteratively hashing the provided `proof` (sibling hashes) with the computed leaf hash.
*   **Status**: Mandatory in Advanced Mode.

### 3. Chain Anchoring Layer (Phase 2b)
*   **What it checks**: Whether the `merkleRoot` from Layer 2 was recorded on the Sepolia Ethereum blockchain.
*   **Technical Details**:
    *   **Smart Contract**: The verifier calls the `verifyRoot` function on the deployed `Root` contract.
    *   **Blockchain**: The default anchor is **Sepolia (Chain ID 11155111)**.
    *   **Anchor Check**: It verifies that the transaction hash provided in `anchorTx` actually contains the `merkleRoot` as its payload and was emitted by the correct smart contract.
*   **Status**: **Optional** (can be skipped via the "Skip chain verification" toggle).

---

## Development vs. Production Scope

In the current development implementation, certain external network resolutions are intentionally bypassed to ensure a fast, robust, and offline-friendly testing environment.

### 1. Bypassed Resolutions
*   **DID Resolution**: The verifier recognizes prefixes like `did:web`, but does not currently hit the remote server to fetch the `did.json` file. It is "stubbed" to return `true` to allow testing even when ngrok tunnels or local servers are unreachable.
*   **Context & Schema Resolution**: The remote JSON-LD contexts (the `https://...` URLs in `@context`) and JSON schemas are not fetched. The VC is processed as a standard JSON object. This avoids performance bottlenecks and CORS issues during the proof-of-concept phase.

### 2. Trust Model Comparison

| Feature | Current (Development) | Production Requirement |
| :--- | :--- | :--- |
| **DID Resolution** | Bypass (Assume Valid) | **Live Fetch & Signature Verify** |
| **Context Loading** | Ignore URLs | **Resolve & Validate JSON-LD** |
| **Merkle Integrity** | **Full Mathematical Verification** | **Full Mathematical Verification** |
| **Blockchain Anchor** | Optional (Developer Toggle) | **Mandatory Consensus Check** |
| **System Dependency** | Local / Offline Capable | Full Network Interoperability |

**Key Takeaway**: While Phase 1 (Standard) is currently a "soft" check in this implementation, **Phase 2a (Merkle)** remains a "hard" cryptographic proof. This ensures that even in offline development, the data integrity logic is 100% accurate relative to the provided receipt.

---

## Why it "Passes" when Skipped

When you check **"Skip chain verification"**, you are telling the verifier:
> "I trust that this Merkle Root is authentic. Just tell me if the internal proofs match it."

The system returns `valid: true` because:
1.  **Phase 1** (Signature) succeeded.
2.  **Phase 2a** (Merkle Integrity) succeeded.
3.  **Phase 2b** (Chain) was explicitly excluded from the success criteria.

### Summary
*   **Skip = Integrity Only**: Proves the data matches what the issuer signed in the receipt.
*   **No Skip = Full Trust**: Proves the data matches the issuer's signature **AND** the immutable record on the blockchain.

In development, skipping the chain check allows for faster testing of the complex Merkle logic without needing constant blockchain connectivity.
