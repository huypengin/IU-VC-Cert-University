# IU VC Issuer: Issuance & Anchoring Process

This document explains the technical flow of the Phase 2 system, focusing on why we use two different "keys" and how the blockchain anchoring provides a cryptographic timestamp.

## 1. The Two-Layer Security Model

The system uses two distinct layers of cryptography to ensure the Verifiable Credential (VC) is both **authentic** and **indisputable**.

### Layer A: The Issuer's Identity (Ed25519 Private Key)
*   **Location**: Configured in `.env` as `ISSUER_ED25519_PRIVATE_KEY`.
*   **Purpose**: To sign the JSON data of the VC.
*   **Why a local private key?**: According to the W3C Verifiable Credentials standard, an issuer must sign the credential so that a holder can prove *who* issued it. This key represents the "Institutional Identity" (e.g., the University).
*   **Mechanism**: The app takes the VC JSON, canonicalizes it (via stable stringify), and generates a `DataIntegrityProof` using the `eddsa-rdfc-2022` cryptosuite.

### Layer B: Proof of Existence (MetaMask / Ethereum)
*   **Location**: Accessed via your browser's injected provider (MetaMask).
*   **Purpose**: To "anchor" the Merkle Root of the credential data on a public blockchain.
*   **Mechanism**: A transaction is sent to the `anchorRoot(bytes32)` function of a smart contract on Sepolia.

---

## 2. The Step-by-Step Data Flow

### Step 1: Component Hashing
Each part of the degree (e.g., Degree Certificate, Transcript) is hashed individually using **SHA-256**. This turns raw data into a fixed-length fingerprint.

### Step 2: Merkle Tree Construction
These component hashes are combined into a **Merkle Tree**. 
*   The **Merkle Root** is a single 32-byte hash that representing the *entire set* of components.
*   **Benefit**: In the future (Phase 3), as a student, you can show just the "Degree Certificate" and a Merkle Proof to a verifier. The verifier can check the proof against the anchored root without seeing your private transcript.

### Step 3: Blockchain Anchoring (The "Timestamp")
This is where MetaMask comes in.
1.  The app sends the **Merkle Root** to the smart contract.
2.  The blockchain records this root in a block.
3.  **The Result**: Because the blockchain is immutable and has a block time, the `anchorTx` serves as a **Permanent Cryptographic Timestamp**. It proves that these specific hashes (and therefore the degree data) existed at this exact point in time.

### Step 4: VC Assembly
The app combines the following into one `vc.json`:
*   The original degree data.
*   The Merkle Root.
*   The `anchorTx` (pointing to the on-chain record).
*   The Merkle Proofs for each component.

### Step 5: Final Signing
The whole package is signed with the `ISSUER_ED25519_PRIVATE_KEY` described in Layer A. This "seals" the document.

---

## 3. Why not use MetaMask for everything?
You might ask: *"Why not sign the VC with my Ethereum wallet?"*

1.  **Standard Compliance**: The VC ecosystem (W3C) widely uses Ed25519 (Data Integrity Proofs) for identity, which is more gas-efficient for verifiers to check than Ethereum-style signatures.
2.  **Decoupling**: The Issuer ID (DID) is separate from the technical anchoring account. The university can change its anchoring contract or blockchain network without changing its main Issuer Private Key.
3.  **Privacy**: If you signed the whole VC with an EOA (Externally Owned Account) on-chain for every student, every student's degree data would be public. By only anchoring the **Merkle Root**, we keep the actual data private while still proving its validity.
