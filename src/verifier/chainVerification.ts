/**
 * On-chain verification for IU-SmartCert.
 *
 * The deployed AnchorRegistry contract supports:
 *   - anchorRoot(bytes32)  → stores root + emits RootAnchored event
 *   - MTRoot()             → reads stored root
 *   - verify(proof, leaf)  → on-chain Merkle proof verification
 *
 * Verification strategy:
 *   1. Look up anchorTx and confirm RootAnchored event matches merkleRoot
 *   2. Call verify(proof, leaf) for each component to prove on-chain
 */

import { ethers } from "ethers";
import { keccak_256 } from "@noble/hashes/sha3.js";
import type { IUSmartCertMerkleReceipt } from "../vc/types";
import { getRevocationKeyFromReceipt } from "../revocation/key";
import type { ChainVerificationResult } from "./types";

// Full ABI for the AnchorRegistry contract
const ANCHOR_REGISTRY_ABI = [
    {
        type: "function",
        name: "anchorRoot",
        stateMutability: "nonpayable",
        inputs: [{ name: "merkleRoot", type: "bytes32" }],
        outputs: [],
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
        name: "isValid",
        stateMutability: "view",
        inputs: [{ name: "credentialMandatoryComponent", type: "bytes32" }],
        outputs: [
            { name: "", type: "bool" },
            { name: "", type: "string" },
        ],
    },
    {
        type: "event",
        name: "RootAnchored",
        inputs: [
            { name: "merkleRoot", type: "bytes32", indexed: true },
            { name: "sender", type: "address", indexed: true },
        ],
    },
];

// Default public RPC endpoints by chain ID
const DEFAULT_RPC_URLS: Record<string, string> = {
    "eip155:1": "https://eth.llamarpc.com",
    "eip155:11155111": "https://ethereum-sepolia-rpc.publicnode.com",
    "eip155:5": "https://rpc.goerli.mudit.blog",
};

/**
 * Parse CAIP-2 chain ID to extract network number.
 */
function parseChainId(chainId: string): number {
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
 * Convert a hash string to bytes32 hex for smart contract calls.
 */
function hashToBytes32(hash: string): string {
    const cleanHash = hash.startsWith("0x") ? hash : `0x${hash}`;
    if (cleanHash.length !== 66) {
        throw new Error(`Invalid hash length: ${cleanHash}`);
    }
    return cleanHash;
}

/**
 * Hash a component hash to produce the Merkle leaf,
 * matching the JS tree builder: keccak256(utf8(componentHash)).
 *
 * The JS buildMerkle does: hashLeafValue(leaf.hash) = keccak256(utf8Bytes(leaf.hash))
 * where leaf.hash is a hex string like "0x16f1dc..."
 */
function computeLeafHash(componentHash: string): string {
    const encoder = new TextEncoder();
    const leafBytes = keccak_256(encoder.encode(componentHash));
    return "0x" + Array.from(leafBytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

type RevocationReadableContract = {
    isValid(revocationKey: string): Promise<[boolean, string] | { 0: boolean; 1: string }>;
};

type AnchorRegistryReadableContract = RevocationReadableContract & {
    verify(proof: string[], leaf: string): Promise<boolean>;
};

export async function checkRevocationStatus(
    contract: RevocationReadableContract,
    receipt: IUSmartCertMerkleReceipt,
    context: {
        anchorTxConfirmed?: boolean;
        chainId?: string;
        contractAddress?: string;
    } = {},
): Promise<ChainVerificationResult> {
    const revocationKey = getRevocationKeyFromReceipt(receipt);
    const result = await contract.isValid(hashToBytes32(revocationKey));
    const isValidResult = Array.isArray(result) ? result[0] : result[0];
    const reason = Array.isArray(result) ? result[1] : result[1];

    if (!isValidResult) {
        return {
            valid: false,
            anchorTxConfirmed: context.anchorTxConfirmed ?? true,
            chainId: context.chainId,
            contractAddress: context.contractAddress,
            revoked: true,
            revocationReason: reason,
            revocationKey,
            error: `Credential revoked on-chain: ${reason}`,
        };
    }

    return {
        valid: true,
        anchorTxConfirmed: context.anchorTxConfirmed ?? true,
        chainId: context.chainId,
        contractAddress: context.contractAddress,
        revoked: false,
        revocationReason: reason,
        revocationKey,
    };
}

/**
 * Verify on-chain anchoring by:
 *   1. Checking the anchorTx event logs
 *   2. Calling verify(proof, leaf) for each component
 *
 * @param receipt The Merkle receipt containing proofs
 * @param rpcUrl Optional RPC URL (uses MetaMask or public endpoint if not provided)
 * @returns Chain verification result
 */
export async function verifyChainAnchoring(
    receipt: IUSmartCertMerkleReceipt,
    rpcUrl?: string
): Promise<ChainVerificationResult> {
    try {
        const { chainId, contractAddress, merkleRoot, anchorTx, componentsProofs } = receipt;

        // Get RPC provider
        let provider: ethers.Provider;
        const requiredChainNum = parseChainId(chainId);

        if (rpcUrl) {
            provider = new ethers.JsonRpcProvider(rpcUrl);
        } else if (typeof window !== "undefined" && (window as any).ethereum) {
            // Use MetaMask/Injected provider
            const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
            await browserProvider.send("eth_requestAccounts", []);

            // Check if MetaMask is on the correct chain
            const network = await browserProvider.getNetwork();
            if (network.chainId !== BigInt(requiredChainNum)) {
                return {
                    valid: false,
                    anchorTxConfirmed: false,
                    chainId,
                    contractAddress,
                    error: `MetaMask is on chain ${network.chainId}, but the credential requires Sepolia (${requiredChainNum}). Please switch MetaMask to the Sepolia Test Network.`,
                };
            }

            provider = browserProvider;
        } else {
            // Fallback to public RPC
            const url = getRpcUrl(chainId);
            provider = new ethers.JsonRpcProvider(url);
        }

        // Log connected chain for debugging
        const connectedNetwork = await provider.getNetwork();
        console.log(`[Verifier] Connected to chain ${connectedNetwork.chainId}`);

        // ── Step 1: Verify anchorTx event ──────────────────────
        if (anchorTx) {
            console.log(`[Verifier] Checking anchorTx: ${anchorTx}`);
            const txReceipt = await provider.getTransactionReceipt(anchorTx);

            if (!txReceipt) {
                return {
                    valid: false,
                    anchorTxConfirmed: false,
                    chainId,
                    contractAddress,
                    error: `Transaction ${anchorTx} not found on chain ${connectedNetwork.chainId}.`,
                };
            }

            if (txReceipt.status !== 1) {
                return {
                    valid: false,
                    anchorTxConfirmed: false,
                    chainId,
                    contractAddress,
                    error: `Anchor transaction ${anchorTx} was reverted (failed).`,
                };
            }

            if (txReceipt.to?.toLowerCase() !== contractAddress.toLowerCase()) {
                return {
                    valid: false,
                    anchorTxConfirmed: false,
                    chainId,
                    contractAddress,
                    error: `Transaction was sent to ${txReceipt.to}, expected ${contractAddress}.`,
                };
            }

            // Parse RootAnchored event
            const iface = new ethers.Interface(ANCHOR_REGISTRY_ABI);
            const expectedRoot = merkleRoot.startsWith("0x") ? merkleRoot : `0x${merkleRoot}`;
            let rootFound = false;

            for (const log of txReceipt.logs) {
                try {
                    const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
                    if (parsed && parsed.name === "RootAnchored") {
                        const emittedRoot = parsed.args.merkleRoot as string;
                        if (emittedRoot.toLowerCase() === expectedRoot.toLowerCase()) {
                            rootFound = true;
                            console.log(`[Verifier] ✓ RootAnchored event confirmed`);
                            break;
                        }
                    }
                } catch {
                    // Not our event, skip
                }
            }

            if (!rootFound) {
                return {
                    valid: false,
                    anchorTxConfirmed: true,
                    chainId,
                    contractAddress,
                    error: `Transaction ${anchorTx} does not contain RootAnchored event with merkleRoot ${expectedRoot}.`,
                };
            }
        }

        // ── Step 2: Verify each component proof on-chain ──────
        const contract = new ethers.Contract(
            contractAddress,
            ANCHOR_REGISTRY_ABI,
            provider,
        ) as unknown as AnchorRegistryReadableContract;

        for (const componentProof of componentsProofs) {
            // The JS tree hashes leaves as: keccak256(utf8(componentHash))
            // We must do the same before passing to the contract's verify()
            const leaf = computeLeafHash(componentProof.hash);
            const proof = componentProof.proof.map(hashToBytes32);

            try {
                console.log(`[Verifier] Calling verify() for "${componentProof.name}" with leaf=${leaf}`);
                const isValid = await contract.verify(proof, leaf);
                if (!isValid) {
                    return {
                        valid: false,
                        anchorTxConfirmed: true,
                        chainId,
                        contractAddress,
                        error: `On-chain verify() failed for component: ${componentProof.name}`,
                    };
                }
                console.log(`[Verifier] ✓ ${componentProof.name} verified on-chain`);
            } catch (err) {
                return {
                    valid: false,
                    anchorTxConfirmed: true,
                    chainId,
                    contractAddress,
                    error: `Contract verify() call failed for ${componentProof.name}: ${err instanceof Error ? err.message : String(err)}`,
                };
            }
        }

        const revocationResult = await checkRevocationStatus(contract, receipt, {
            anchorTxConfirmed: true,
            chainId,
            contractAddress,
        });

        if (!revocationResult.valid) {
            return revocationResult;
        }

        return revocationResult;
    } catch (err) {
        return {
            valid: false,
            anchorTxConfirmed: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}
