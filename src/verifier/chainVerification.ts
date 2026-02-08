/**
 * On-chain verification for IU-SmartCert.
 * Calls existing Cert.sol verify() function to validate Merkle proofs.
 */

import { ethers } from "ethers";
import type { IUSmartCertMerkleReceipt } from "../vc/types";
import type { ChainVerificationResult } from "./types";

// ABI for the verify function in Cert.sol
const CERT_ABI = [
    {
        type: "function",
        name: "verify",
        stateMutability: "view",
        inputs: [
            { name: "proof", type: "bytes32[]" },
            { name: "leaf", type: "bytes32" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        type: "function",
        name: "MTRoot",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "bytes32" }],
    },
    {
        type: "function",
        name: "isValid",
        stateMutability: "view",
        inputs: [{ name: "credentialMandatoryComponent", type: "bytes32" }],
        outputs: [
            { name: "", type: "bool" },
            { name: "", type: "string" },
        ],
    },
];

// Default public RPC endpoints by chain ID
const DEFAULT_RPC_URLS: Record<string, string> = {
    "eip155:1": "https://eth.llamarpc.com",
    "eip155:11155111": "https://rpc.sepolia.org",
    "eip155:5": "https://rpc.goerli.mudit.blog",
};

/**
 * Parse CAIP-2 chain ID to extract network number.
 */
function parseChainId(chainId: string): number {
    // Format: eip155:<number>
    const parts = chainId.split(":");
    if (parts.length !== 2 || parts[0] !== "eip155") {
        throw new Error(`Invalid chain ID format: ${chainId}`);
    }
    return parseInt(parts[1], 10);
}

/**
 * Get RPC URL for a chain.
 */
function getRpcUrl(chainId: string, rpcUrl?: string): string {
    if (rpcUrl) return rpcUrl;
    const defaultUrl = DEFAULT_RPC_URLS[chainId];
    if (!defaultUrl) {
        throw new Error(`No default RPC URL for chain: ${chainId}`);
    }
    return defaultUrl;
}

/**
 * Convert component hash to bytes32 for smart contract.
 */
function hashToBytes32(hash: string): string {
    // Ensure 0x prefix and 32 bytes
    const cleanHash = hash.startsWith("0x") ? hash : `0x${hash}`;
    if (cleanHash.length !== 66) {
        throw new Error(`Invalid hash length: ${cleanHash}`);
    }
    return cleanHash;
}

/**
 * Verify Merkle proofs on-chain using the existing Cert.sol contract.
 * 
 * @param receipt The Merkle receipt containing proofs
 * @param rpcUrl Optional RPC URL (uses public endpoint if not provided)
 * @returns Chain verification result
 */
export async function verifyChainAnchoring(
    receipt: IUSmartCertMerkleReceipt,
    rpcUrl?: string
): Promise<ChainVerificationResult> {
    try {
        const { chainId, contractAddress, componentsProofs, merkleRoot } = receipt;

        // Get RPC provider
        const url = getRpcUrl(chainId, rpcUrl);
        const provider = new ethers.JsonRpcProvider(url);

        // Create contract instance
        const contract = new ethers.Contract(contractAddress, CERT_ABI, provider);

        // Verify the contract has the expected Merkle root
        const onChainRoot = await contract.MTRoot();
        const expectedRoot = hashToBytes32(merkleRoot);

        if (onChainRoot.toLowerCase() !== expectedRoot.toLowerCase()) {
            return {
                valid: false,
                anchorTxConfirmed: false,
                chainId,
                contractAddress,
                error: `Merkle root mismatch: on-chain ${onChainRoot} vs receipt ${expectedRoot}`,
            };
        }

        // Verify each component proof on-chain
        for (const componentProof of componentsProofs) {
            const leaf = hashToBytes32(componentProof.hash);
            const proof = componentProof.proof.map(hashToBytes32);

            const isValid = await contract.verify(proof, leaf);
            if (!isValid) {
                return {
                    valid: false,
                    anchorTxConfirmed: true,
                    chainId,
                    contractAddress,
                    error: `On-chain verification failed for component: ${componentProof.name}`,
                };
            }
        }

        return {
            valid: true,
            anchorTxConfirmed: true,
            chainId,
            contractAddress,
        };
    } catch (err) {
        return {
            valid: false,
            anchorTxConfirmed: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
