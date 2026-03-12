// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * IU-SmartCert Anchor Registry (Full Version)
 *
 * Deploy this contract via Remix + MetaMask on Sepolia.
 * It supports:
 *   - anchorRoot(bytes32)  → store + emit (used by Issuer UI)
 *   - MTRoot()             → read stored root
 *   - verify(proof, leaf)  → on-chain Merkle proof verification
 *   - isValid(component)   → revocation check
 *
 * Copy this entire file into Remix (remix.ethereum.org):
 *   1. Create new file: AnchorRegistry.sol
 *   2. Paste this code
 *   3. Compile with Solidity 0.8.20+
 *   4. Deploy via "Injected Provider - MetaMask" on Sepolia
 *   5. Copy the deployed address into your .env CONTRACT_ADDRESS
 */

contract AnchorRegistry {

    // ── State ──────────────────────────────────────────────
    address public owner;
    bytes32 public MTRoot;
    mapping(bytes32 => string) private revocationList;

    // ── Events ─────────────────────────────────────────────
    event RootAnchored(bytes32 indexed merkleRoot, address indexed sender);
    event CertificateRevoked(bytes32 indexed component, string reason);

    // ── Modifiers ──────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ── Constructor ────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ── Anchor ─────────────────────────────────────────────

    /**
     * Store a new Merkle root and emit an event.
     * Called by the Issuer UI during credential issuance.
     */
    function anchorRoot(bytes32 merkleRoot) external onlyOwner {
        require(MTRoot == bytes32(0), "Root already anchored");
        MTRoot = merkleRoot;
        emit RootAnchored(merkleRoot, msg.sender);
    }

    // ── Verification ───────────────────────────────────────

    /**
     * Verify a Merkle proof against the stored root.
     * Pairs are sorted lexicographically (smaller hash first)
     * to match the JavaScript MerkleTree implementation.
     */
    function verify(bytes32[] memory proof, bytes32 leaf)
        public view
        returns (bool)
    {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == MTRoot;
    }

    // ── Revocation ─────────────────────────────────────────

    /**
     * Revoke a credential component.
     */
    function revokeCertificate(
        bytes32 credentialMandatoryComponent,
        string memory reason
    ) external onlyOwner {
        revocationList[credentialMandatoryComponent] = reason;
        emit CertificateRevoked(credentialMandatoryComponent, reason);
    }

    /**
     * Check if a credential component is still valid (not revoked).
     */
    function isValid(bytes32 credentialMandatoryComponent)
        public view
        returns (bool, string memory)
    {
        if (bytes(revocationList[credentialMandatoryComponent]).length > 0) {
            return (false, revocationList[credentialMandatoryComponent]);
        }
        return (true, "valid");
    }
}
