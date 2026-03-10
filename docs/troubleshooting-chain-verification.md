# Troubleshooting Phase 2: Chain Anchoring and Revocation

Phase 2 verification checks two things:

1. whether the **Merkle Root** in your credential matches the immutable record anchored on Ethereum Sepolia
2. whether the credential's smart-contract revocation key is still marked valid on-chain

## How Verification Works
1.  **Connect**: The verifier connects to a Sepolia RPC node (a gateway to the blockchain).
2.  **Call Contract**: It sends a request to your smart contract address (`0x058...`).
3.  **Verify Root**: It validates the anchored transaction and calls `verify(proof, leaf)` for each disclosed component.
4.  **Check Revocation**: It derives the revocation key from the **first mandatory component hash** in the receipt and calls `isValid(bytes32)`.
5.  **Compare**: The VC is valid only if anchoring succeeds and the contract does not report that key as revoked.

---

## ❌ Why "Failed to fetch"?

The error `Failed to fetch` is a **Network Connection Error**, not a verification failure. It means the verifier couldn't even reach the blockchain to ask the question.

**Common Causes:**
1.  **Public RPC Overload**: The default public endpoint (`https://rpc.sepolia.org`) is often unstable or rate-limited.
2.  **Network Blocking**: Corporate or university firewalls often block crypto interactions.
3.  **Bad Connection**: Temporary internet glitch.

## ❌ Why "execution reverted"?

This error means the blockchain received your request but **rejected it**.

**Common Causes:**
1.  **Wrong Network**: You are connected to **Ethereum Mainnet** or a local node, but the contract is on **Sepolia**.
2.  **Bad Address**: The contract address `0x058...` is empty (no code deployed) on the network you are connected to.
3.  **Empty Contract**: You are calling a contract that hasn't been initialized with a Merkle Root yet.

## ❌ Why does the VC say "never expires" but still fail verification?

Temporal validity and revocation are separate checks.

- `never expires` means the VC has no `validUntil`
- `revoked` means the smart contract returned `isValid(...) = false`

So a VC can remain temporally valid and still be rejected by the custom verifier because it has been revoked on-chain.

## ❌ Why does revoke fail in MetaMask?

Common causes:
1.  **Wrong Wallet Account**: `revokeCertificate(bytes32,string)` must be sent by the contract owner or an authorized account.
2.  **Wrong Network**: The UI chain ID and the connected MetaMask chain must match the VC receipt, typically Sepolia `11155111`.
3.  **Bad Contract Address**: The VC points at a contract that does not expose `revokeCertificate`.
4.  **Malformed VC Input**: The pasted VC does not include a valid receipt or has no mandatory component proof, so the revocation key cannot be derived.

## ✅ How to Validate It
To get this to pass, you need a stable connection to Sepolia:


1.  **Use a Custom RPC URL (Recommended)**
    *   If you have an **Alchemy** or **Infura** account, get your Sepolia HTTPS URL (e.g., `https://eth-sepolia.g.alchemy.com/v2/...`).
    *   Paste it into the **"RPC URL"** field in the Verify tab.
    *   Click "Verify VC" again.

2.  **Check Contract Deployment**
    *   Copy your contract address from `vc.json`: `0x0582770bea93B40807D422F22eF8FC4288c81Cb4`
    *   Go to **[Sepolia Etherscan](https://sepolia.etherscan.io/)** and paste the address.
    *   If you see the contract code and a "verify" method in the "Read Contract" tab, the contract is live.

3.  **Check Revocation State**
    *   Use the first mandatory component hash from the receipt as the lookup key.
    *   In the contract's read methods, call `isValid(bytes32)` with that hash.
    *   If it returns `(false, "issuer revoked")`, the verifier should reject the VC.

4.  **Or... Just Skip It**
    *   If you just want to verify the **Data Integrity** (that the diploma matches the receipt), check **"Skip chain verification"**.
    *   The chain anchoring and revocation checks will be skipped, but the mathematical proofs (Merkle) will still be validated.
