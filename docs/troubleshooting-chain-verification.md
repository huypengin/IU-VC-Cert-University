# Troubleshooting Phase 2: Chain Anchoring

Phase 2 verification checks if the **Merkle Root** in your credential matches the immutable record stored on the Ethereum Sepolia blockchain.

## How Verification Works
1.  **Connect**: The verifier connects to a Sepolia RPC node (a gateway to the blockchain).
2.  **Call Contract**: It sends a request to your smart contract address (`0x058...`).
3.  **Verify Root**: It calls the `MTRoot()` function to read the currently stored Merkle Root from the blockchain.
4.  **Compare**: It checks if the `MTRoot` from the blockchain matches the `merkleRoot` in your `vc.json`.

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

3.  **Or... Just Skip It**
    *   If you just want to verify the **Data Integrity** (that the diploma matches the receipt), check **"Skip chain verification"**.
    *   The "Anchor Confirmed" check will be skipped, but the mathematical proofs (Merkle) will still be validated.
